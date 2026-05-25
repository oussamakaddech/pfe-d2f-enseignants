"""Endpoints /api/v1/analytics/* — pipeline analyse prédictive complet."""

import logging
import time
from datetime import date, datetime, timezone
from typing import Annotated, Any, Optional

from fastapi import APIRouter, Depends, HTTPException, Query, Request, status
from sqlalchemy.orm import Session

from app.core.db import get_db

# Reusable Annotated dependency types
DbSession = Annotated[Session, Depends(get_db)]
UrgenceFilter = Annotated[Optional[str], Query(description="Filtre: FAIBLE|MODEREE|HAUTE|CRITIQUE")]
PageParam = Annotated[int, Query(ge=0)]
SizeParam = Annotated[int, Query(ge=1, le=100)]
CompetenceIdFilter = Annotated[Optional[int], Query()]
TypeAlerteFilter = Annotated[Optional[str], Query()]
SeveriteFilter = Annotated[Optional[str], Query()]
StatutAlertFilter = Annotated[Optional[str], Query(description="NOUVELLE|LUE|TRAITEE|IGNOREE|ESCALADEE")]
EnseignantIdFilter = Annotated[Optional[str], Query()]
DepartementIdFilter = Annotated[Optional[str], Query()]
AlertStatutParam = Annotated[str, Query(description="NOUVELLE|LUE|TRAITEE|IGNOREE|ESCALADEE")]
TraiteParParam = Annotated[Optional[str], Query()]
CommentaireParam = Annotated[Optional[str], Query()]
SeuilParam = Annotated[float, Query(ge=0.0, le=1.0)]

from app.core.observability import dsi_error_body
from app.engines.alert_engine import AlertEngine
from app.engines.dashboard_engine import DashboardEngine
from app.engines.feature_engine import FeatureEngine
from app.engines.gap_engine import GapEngine
from app.engines.recommendation_engine import RecommendationEngine
from app.models.db_models import (
    AlertEvent, PredictionResult, Recommendation,
    SkillGap, TeacherRiskProfile, TrainingPath, TrainingPathItem,
)
from app.services.data_service import DataService

router = APIRouter(prefix="/v1/analytics", tags=["Analytics v1"])
logger = logging.getLogger(__name__)


def _dsi_error(status_code: int, code: str, message: str, path: str) -> dict:
    return dsi_error_body(
        status=status_code,
        error_code=code,
        message=message,
        path=path,
    )


# ── Helper : construire domaine_demand ──────────────────────
def _build_domaine_demand(besoins_demand: list[dict], total_besoins: int) -> dict[int, float]:
    index: dict[int, float] = {}
    for row in besoins_demand:
        cid = row.get("competence_id")
        if not cid:
            continue
        total_d = int(row.get("total_demand") or 0)
        index[int(cid)] = total_d / max(total_besoins, 1)
    return index


# ── POST /api/v1/analytics/analyze/{enseignantId} ───────────
@router.post(
    "/analyze/{enseignant_id}",
    summary="Lancer une analyse complète pour un enseignant",
    response_model=dict,
    status_code=status.HTTP_202_ACCEPTED,
)
async def analyze_enseignant(
    enseignant_id: str,
    request: Request,
    db: DbSession,
) -> dict[str, Any]:
    """
    Déclenche le pipeline complet :
    FeatureEngine → GapEngine → RecommendationEngine → AlertEngine
    Rôles autorisés : ADMIN, CUP, ENSEIGNANT (son propre profil uniquement).
    """
    t_start = time.time()

    # Vérification d'existence
    svc = DataService(db)
    profiles = svc.get_teacher_profile(enseignant_id)
    if not profiles:
        raise HTTPException(
            status_code=404,
            detail=_dsi_error(404, "ENS-404", f"Enseignant {enseignant_id} introuvable", request.url.path),
        )
    profile = profiles[0]

    # Créer l'enregistrement PredictionResult en cours
    pred = PredictionResult(enseignant_id=enseignant_id, statut="EN_COURS")
    db.add(pred)
    db.flush()

    try:
        # Collecte des données
        comp_levels  = svc.get_competency_levels(enseignant_id)
        req_levels   = svc.get_required_levels()
        formations   = svc.get_all_formations()
        form_comps   = svc.get_formation_competencies()
        inscriptions = svc.get_inscriptions(enseignant_id)
        evaluations  = svc.get_evaluations(enseignant_id)
        eval_glob    = svc.get_evaluations_globales()
        besoins      = svc.get_besoins(enseignant_id)
        certificats  = svc.get_certificats(enseignant_id)
        prereqs      = svc.get_prerequisite_graph()
        demand       = svc.get_besoin_demand()

        all_demand  = sum(int(d.get("total_demand") or 0) for d in demand)
        dom_demand  = _build_domaine_demand(demand, all_demand)

        # ── 1. FeatureEngine ──────────────────────────────────
        feat_eng = FeatureEngine(db)
        snapshot = feat_eng.build_snapshot(
            enseignant_id, comp_levels, profile, besoins, certificats
        )

        # ── 2. GapEngine ─────────────────────────────────────
        gap_eng = GapEngine(db)
        gaps = gap_eng.compute_gaps(
            enseignant_id, comp_levels, req_levels,
            besoins, pred.id, dom_demand,
            total_enseignants=1,
        )

        # ── 3. RecommendationEngine ───────────────────────────
        reco_eng = RecommendationEngine(db)
        all_evals = evaluations + eval_glob
        recommendations, paths = reco_eng.generate(
            enseignant_id, gaps, formations, form_comps,
            inscriptions, all_evals, prereqs,
            float(snapshot.taux_completion_formations),
            float(snapshot.taux_presence_moyen),
        )

        # ── 4. AlertEngine ────────────────────────────────────
        dept_id = str(profile.get("departement_id") or "")
        alert_eng = AlertEngine(db)
        alerts = alert_eng.detect_and_save(
            enseignant_id, gaps, profile, besoins, dept_id
        )

        # ── 5. Mise à jour du risk profile ───────────────────
        _upsert_risk_profile(db, enseignant_id, gaps, snapshot)

        # ── 6. Finaliser PredictionResult ────────────────────
        nb_crit = sum(1 for g in gaps if g.niveau_urgence == "CRITIQUE")
        niveau_moy = (
            float(snapshot.niveau_moyen_competences)
            if snapshot.niveau_moyen_competences else 0.0
        )
        score_prog = min(1.0, niveau_moy / 5.0)

        pred.statut                   = "TERMINE"
        pred.nb_competences_analysees = len(set(r.get("competence_id") for r in req_levels))
        pred.nb_gaps_detectes         = len(gaps)
        pred.nb_gaps_critiques        = nb_crit
        pred.nb_recommendations       = len(recommendations)
        pred.nb_alertes_generees      = len(alerts)
        pred.score_global_competences = round(niveau_moy / 5.0, 4)
        pred.score_progression        = round(score_prog, 4)
        pred.duree_analyse_ms         = int((time.time() - t_start) * 1000)

        db.commit()
        logger.info("Analyse terminée pour %s en %dms", enseignant_id, pred.duree_analyse_ms)

    except Exception as exc:
        pred.statut         = "ERREUR"
        pred.message_erreur = str(exc)[:500]
        db.commit()
        logger.error("Analyse échouée pour %s : %s", enseignant_id, exc)
        raise HTTPException(
            status_code=500,
            detail=_dsi_error(500, "ANA-500", "Erreur lors de l'analyse", request.url.path),
        ) from exc

    return {
        "enseignant_id":        enseignant_id,
        "prediction_result_id": pred.id,
        "statut":               pred.statut,
        "nb_gaps_detectes":     pred.nb_gaps_detectes,
        "nb_gaps_critiques":    pred.nb_gaps_critiques,
        "nb_recommendations":   pred.nb_recommendations,
        "nb_alertes_generees":  pred.nb_alertes_generees,
        "duree_analyse_ms":     pred.duree_analyse_ms,
    }


def _upsert_risk_profile(db: Session, enseignant_id: str, gaps: list, snapshot: Any):
    """Calcule et persiste le profil de risque."""
    nb_crit = sum(1 for g in gaps if g.niveau_urgence == "CRITIQUE")
    nb_mod  = sum(1 for g in gaps if g.niveau_urgence == "HAUTE")
    nb_fai  = sum(1 for g in gaps if g.niveau_urgence in ("MODEREE", "FAIBLE"))
    mois_stag_max = max((g.mois_stagnation for g in gaps), default=0)
    taux_comp     = float(snapshot.taux_completion_formations or 0.0)

    score_risque = round(
        (nb_crit / max(len(gaps), 1)) * 0.35
        + (mois_stag_max / 24)         * 0.25
        + (1 - taux_comp / 100)        * 0.25
        + (1.0 if any(g.en_regression for g in gaps) else 0.0) * 0.15,
        4,
    )
    score_risque = min(1.0, score_risque)

    if   score_risque >= 0.75: niveau = "CRITIQUE"
    elif score_risque >= 0.50: niveau = "ELEVE"
    elif score_risque >= 0.25: niveau = "MODERE"
    else:                      niveau = "FAIBLE"

    tendance = "REGRESSION" if any(g.en_regression for g in gaps) else "STABLE"

    existing = db.query(TeacherRiskProfile).filter_by(enseignant_id=enseignant_id).first()
    if existing:
        existing.precedent_score_risque     = existing.score_risque
        existing.score_risque               = score_risque
        existing.niveau_risque              = niveau
        existing.nb_gaps_critiques          = nb_crit
        existing.nb_gaps_moderes            = nb_mod
        existing.nb_gaps_faibles            = nb_fai
        existing.nb_mois_stagnation_max     = mois_stag_max
        existing.tendance                   = tendance
        existing.taux_completion_formations = taux_comp
    else:
        db.add(TeacherRiskProfile(
            enseignant_id              = enseignant_id,
            score_risque               = score_risque,
            niveau_risque              = niveau,
            nb_gaps_critiques          = nb_crit,
            nb_gaps_moderes            = nb_mod,
            nb_gaps_faibles            = nb_fai,
            nb_mois_stagnation_max     = mois_stag_max,
            tendance                   = tendance,
            taux_completion_formations = taux_comp,
        ))
    db.flush()


# ── GET /api/v1/analytics/gaps/{enseignantId} ────────────────
@router.get("/gaps/{enseignant_id}", summary="Gaps de compétences d'un enseignant")
async def get_gaps(
    enseignant_id: str,
    db: DbSession,
    urgence: UrgenceFilter = None,
    page: PageParam = 0,
    size: SizeParam = 20,
) -> dict[str, Any]:
    q = (
        db.query(SkillGap)
        .filter(SkillGap.enseignant_id == enseignant_id)
        .order_by(SkillGap.priorite_score.desc(), SkillGap.computed_at.desc())
    )
    if urgence:
        q = q.filter(SkillGap.niveau_urgence == urgence.upper())

    total = q.count()
    items = q.offset(page * size).limit(size).all()

    return {
        "enseignant_id": enseignant_id,
        "total":         total,
        "page":          page,
        "size":          size,
        "gaps": [
            {
                "id":               g.id,
                "competence_id":    g.competence_id,
                "competence_nom":   g.competence_nom,
                "domaine_nom":      g.domaine_nom,
                "niveau_actuel":    g.niveau_actuel,
                "niveau_requis":    g.niveau_requis,
                "niveau_vise":      g.niveau_vise,
                "gap_score":        float(g.gap_score),
                "priorite_score":   float(g.priorite_score),
                "niveau_urgence":   g.niveau_urgence,
                "mois_stagnation":  g.mois_stagnation,
                "en_regression":    g.en_regression,
                "justification":    g.justification,
                "computed_at":      g.computed_at.isoformat() if g.computed_at else None,
            }
            for g in items
        ],
    }


# ── GET /api/v1/analytics/recommendations/{enseignantId} ────
@router.get("/recommendations/{enseignant_id}", summary="Recommandations de formations")
async def get_recommendations(
    enseignant_id: str,
    db: DbSession,
    competence_id: CompetenceIdFilter = None,
    page: PageParam = 0,
    size: SizeParam = 20,
) -> dict[str, Any]:
    q = (
        db.query(Recommendation)
        .filter(
            Recommendation.enseignant_id == enseignant_id,
            Recommendation.statut.in_(["PROPOSEE", "ACCEPTEE"]),
        )
        .order_by(Recommendation.score_global.desc())
    )
    if competence_id:
        q = q.filter(Recommendation.competence_id == competence_id)

    total = q.count()
    items = q.offset(page * size).limit(size).all()

    return {
        "enseignant_id": enseignant_id,
        "total":         total,
        "page":          page,
        "size":          size,
        "recommendations": [
            {
                "id":                  r.id,
                "formation_id":        r.formation_id,
                "formation_titre":     r.formation_titre,
                "formation_type":      r.formation_type,
                "competence_id":       r.competence_id,
                "score_global":        float(r.score_global),
                "probabilite_reussite":float(r.probabilite_reussite),
                "rang_dans_parcours":  r.rang_dans_parcours,
                "justification":       r.justification,
                "statut":              r.statut,
            }
            for r in items
        ],
    }


# ── GET /api/v1/analytics/training-path/{enseignantId}/{competenceId} ──
@router.get(
    "/training-path/{enseignant_id}/{competence_id}",
    summary="Parcours de formation ordonné pour une compétence",
)
async def get_training_path(
    enseignant_id: str,
    competence_id: int,
    db: DbSession,
) -> dict[str, Any]:
    path = (
        db.query(TrainingPath)
        .filter_by(enseignant_id=enseignant_id, competence_id=competence_id, statut="ACTIF")
        .order_by(TrainingPath.created_at.desc())
        .first()
    )
    if not path:
        raise HTTPException(
            status_code=404,
            detail={"message": f"Aucun parcours actif pour {enseignant_id} / compétence {competence_id}"},
        )

    items = (
        db.query(TrainingPathItem)
        .filter_by(training_path_id=path.id)
        .order_by(TrainingPathItem.rang)
        .all()
    )

    return {
        "training_path_id":           path.id,
        "enseignant_id":              path.enseignant_id,
        "competence_id":              path.competence_id,
        "competence_nom":             path.competence_nom,
        "niveau_depart":              path.niveau_depart,
        "niveau_vise":                path.niveau_vise,
        "nb_formations":              path.nb_formations,
        "duree_totale_heures":        path.duree_totale_heures,
        "probabilite_reussite_globale": float(path.probabilite_reussite_globale),
        "statut":                     path.statut,
        "etapes": [
            {
                "rang":               it.rang,
                "formation_id":       it.formation_id,
                "formation_titre":    it.formation_titre,
                "formation_type":     it.formation_type,
                "duree_heures":       it.duree_heures,
                "niveau_avant":       it.niveau_avant,
                "niveau_apres":       it.niveau_apres,
                "est_obligatoire":    it.est_obligatoire,
                "prerequis_satisfaits": it.prerequis_satisfaits,
                "deja_suivie":        it.deja_suivie,
                "score_formation":    float(it.score_formation),
                "justification":      it.justification,
            }
            for it in items
        ],
    }


# ── GET /api/v1/analytics/alerts ─────────────────────────────
@router.get("/alerts", summary="Liste des alertes (ADMIN/CUP)")
async def get_alerts(
    db: DbSession,
    type_alerte: TypeAlerteFilter = None,
    severite:    SeveriteFilter = None,
    statut:      StatutAlertFilter = None,
    enseignant_id: EnseignantIdFilter = None,
    departement_id: DepartementIdFilter = None,
    page: PageParam = 0,
    size: SizeParam = 20,
) -> dict[str, Any]:
    q = db.query(AlertEvent).order_by(AlertEvent.created_at.desc())

    if type_alerte:
        q = q.filter(AlertEvent.type_alerte == type_alerte.upper())
    if severite:
        q = q.filter(AlertEvent.severite == severite.upper())
    if statut:
        q = q.filter(AlertEvent.statut == statut.upper())
    if enseignant_id:
        q = q.filter(AlertEvent.enseignant_id == enseignant_id)
    if departement_id:
        q = q.filter(AlertEvent.departement_id == departement_id)

    total = q.count()
    items = q.offset(page * size).limit(size).all()

    return {
        "total": total,
        "page":  page,
        "size":  size,
        "alerts": [
            {
                "id":            a.id,
                "type_alerte":   a.type_alerte,
                "cible_type":    a.cible_type,
                "enseignant_id": a.enseignant_id,
                "departement_id":a.departement_id,
                "competence_id": a.competence_id,
                "severite":      a.severite,
                "titre":         a.titre,
                "message":       a.message,
                "statut":        a.statut,
                "created_at":    a.created_at.isoformat() if a.created_at else None,
            }
            for a in items
        ],
    }


# ── PATCH /api/v1/analytics/alerts/{alertId} ─────────────────
_VALID_ALERT_STATUTS = {"NOUVELLE", "LUE", "TRAITEE", "IGNOREE", "ESCALADEE"}


@router.patch("/alerts/{alert_id}", summary="Mettre à jour le statut d'une alerte")
async def update_alert(
    alert_id: int,
    db: DbSession,
    statut: AlertStatutParam = ...,
    traite_par: TraiteParParam = None,
    commentaire: CommentaireParam = None,
) -> dict[str, Any]:
    # Validate statut BEFORE the lookup so callers receive a deterministic 400.
    statut_norm = statut.upper()
    if statut_norm not in _VALID_ALERT_STATUTS:
        raise HTTPException(status_code=400, detail={"message": f"Statut invalide: {statut}"})

    alert = db.query(AlertEvent).filter_by(id=alert_id).first()
    if not alert:
        raise HTTPException(status_code=404, detail={"message": f"Alerte {alert_id} introuvable"})

    alert.statut                 = statut_norm
    alert.traite_par             = traite_par
    alert.commentaire_traitement = commentaire
    db.commit()
    return {"id": alert_id, "statut": alert.statut}


# ── GET /api/v1/analytics/dashboard/global ───────────────────
@router.get("/dashboard/global", summary="Tableau de bord global (ADMIN/CUP)")
async def dashboard_global(db: DbSession) -> dict[str, Any]:
    engine = DashboardEngine(db)
    return engine.compute_all()


# ── GET /api/v1/analytics/dashboard/competences-declining ────
@router.get("/dashboard/competences-declining", summary="Compétences en déclin")
async def dashboard_competences_declining(db: DbSession) -> list[dict]:
    return DashboardEngine(db).competences_en_declin()


# ── GET /api/v1/analytics/dashboard/teachers-at-risk ─────────
@router.get("/dashboard/teachers-at-risk", summary="Enseignants à risque")
async def dashboard_teachers_at_risk(
    db: DbSession,
    seuil: SeuilParam = 0.50,
) -> list[dict]:
    return DashboardEngine(db).enseignants_a_risque(seuil=seuil)


# ── POST /api/v1/analytics/trigger-batch-analysis ────────────
@router.post(
    "/trigger-batch-analysis",
    summary="Déclencher analyse batch (ADMIN)",
    status_code=status.HTTP_202_ACCEPTED,
)
async def trigger_batch(
    request: Request,
    db: DbSession,
) -> dict[str, Any]:
    """Déclenche l'analyse de tous les enseignants actifs (tâche longue — async)."""
    svc     = DataService(db)
    all_ens = svc.get_all_enseignants()

    if not all_ens:
        return {"message": "Aucun enseignant trouvé", "nb_queued": 0}

    logger.info("Batch analysis triggered for %d enseignants", len(all_ens))
    return {
        "message":    f"Analyse batch lancée pour {len(all_ens)} enseignants",
        "nb_queued":  len(all_ens),
        "note":       "Le scheduler exécute l'analyse complète cette nuit à 02h00",
    }


# ── GET /api/v1/analytics/health ─────────────────────────────
@router.get("/health", summary="Health check analytics", include_in_schema=False)
async def health(db: DbSession) -> dict[str, Any]:
    try:
        db.execute(__import__("sqlalchemy").text("SELECT 1"))
        db_ok = True
    except Exception:
        db_ok = False

    nb_gaps   = db.query(SkillGap).count()
    nb_alerts = db.query(AlertEvent).filter(AlertEvent.statut == "NOUVELLE").count()

    return {
        "status":         "healthy" if db_ok else "degraded",
        "service":        "d2f-predictive-analytics",
        "db":             "ok" if db_ok else "error",
        "nb_gaps_stored": nb_gaps,
        "nb_alerts_new":  nb_alerts,
        "timestamp":      datetime.now(timezone.utc).isoformat(),
    }
