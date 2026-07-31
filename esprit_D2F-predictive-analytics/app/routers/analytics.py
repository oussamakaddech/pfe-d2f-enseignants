"""Endpoints /api/v1/analytics/* — pipeline analyse prédictive complet."""

import asyncio
import logging
import os
import time
from datetime import date, datetime, timedelta, timezone
from typing import Annotated, Any, Optional

from fastapi import APIRouter, Depends, HTTPException, Query, Request, status
from sqlalchemy import text as sa_text
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

from app.config import settings
from app.core.auth import require_roles
from app.core.observability import dsi_error_body
from app.engines.alert_engine import AlertEngine
from app.engines.anomaly_engine import AnomalyEngine
from app.engines.benchmark_engine import PeerBenchmarkEngine
from app.engines.collaborative import CollaborativeFilter
from app.engines.dashboard_engine import DashboardEngine
from app.engines.feature_engine import FeatureEngine
from app.engines.forecast_engine import SkillForecastEngine
from app.engines.gap_engine import GapEngine
from app.engines.impact_engine import TrainingImpactEngine, WhatIfEngine
from app.engines.pilotage_dashboard_engine import PilotageDashboardEngine
from app.engines.recommendation_engine import RecommendationEngine
from app.engines.risk_scoring import build_factors_from_gaps, compute_risk_score
from app.models.db_models import (
    AlertEvent, PredictionResult, Recommendation,
    SkillGap, TeacherRiskProfile, TeacherRiskSnapshot, TrainingPath, TrainingPathItem,
)
from app.models.schemas import (
    TrainingImpactResponse,
    TrainingImpactTopFormationsResponse,
    WhatIfRequest,
    WhatIfResponse,
)
from app.services.analysis_collection_service import collect_analysis_data, build_domaine_demand as _build_domaine_demand
from app.services.data_service import DataService
from app.core.id_policy import validate_canonical_id, is_legacy_t
from app.core.response_envelope import (
    ready as env_ready,
    data_incomplete as env_data_incomplete,
    not_found as env_not_found,
    model_fallback as env_model_fallback,
    DATA_INCOMPLETE, NOT_FOUND, MODEL_FALLBACK, READY,
    SRC_DB, SRC_CSV, SRC_HEURISTIC, SRC_ML,
)

# Dépendance d'autorisation en lecture (dashboards/analyse). ADMIN ou CUP.
ReadAuth = Annotated[dict, Depends(require_roles("ADMIN", "CUP"))]


def _resolve_object_scope(auth: dict, db: Session) -> set[str] | None:
    """Retourne le périmètre d'accès objet pour un enseignant.

    - ADMIN : ``None`` (accès total).
    - CUP : ensemble des ``enseignant_id`` de SON département/UP.
    - Autre rôle : ``set()`` vide → accès refusé (403).

    Évite le BOLA/IDOR : un utilisateur ne peut pas analyser le profil d'un
    enseignant hors de son périmètre via l'URL (P0-2).
    """
    from app.core.jwt_middleware import JWT_AUTH_ENABLED

    if not JWT_AUTH_ENABLED:
        return None  # mode test : pas de restriction
    role = (auth.get("role") or "").upper()
    if "ADMIN" in role:
        return None
    if "CUP" in role:
        scope = DataService(db).get_enseignant_scope(auth.get("user_id"))
        if not scope:
            raise HTTPException(status_code=403, detail="Périmètre CUP introuvable.")
        dept = scope.get("departement_id")
        if dept is None:
            return set()
        rows = db.execute(
            sa_text("SELECT id FROM enseignants WHERE dept_id = :d AND deleted_at IS NULL"),
            {"d": dept},
        ).fetchall()
        return {str(r[0]) for r in rows}
    raise HTTPException(status_code=403, detail="Rôle non autorisé pour cet accès.")


def _enforce_teacher_access(auth: dict, enseignant_id: str, db: Session) -> None:
    scope = _resolve_object_scope(auth, db)
    if scope is None:
        return
    # ENSEIGNANT (ou CUP) : accès à son propre id, sinon au périmètre département.
    if enseignant_id == str(auth.get("user_id")):
        return
    if enseignant_id in scope:
        return
    raise HTTPException(
        status_code=403,
        detail="Accès refusé : ce profil n'appartient pas à votre périmètre.",
    )


router = APIRouter(prefix="/v1/analytics", tags=["Analytics v1"])
logger = logging.getLogger(__name__)


def _dsi_error(status_code: int, code: str, message: str, path: str) -> dict:
    return dsi_error_body(
        status=status_code,
        error_code=code,
        message=message,
        path=path,
    )


# ── POST /api/v1/analytics/analyze/{enseignantId} ───────────
@router.post(
    "/analyze/{enseignant_id}",
    summary="Lancer une analyse complète pour un enseignant",
    response_model=dict,
    status_code=status.HTTP_202_ACCEPTED,
    responses={
        403: {"description": "Accès refusé : hors périmètre autorisé"},
        404: {"description": "Enseignant introuvable"},
        500: {"description": "Erreur lors de l'analyse"},
        504: {"description": "Analyse en timeout"},
    },
)
async def analyze_enseignant(
    enseignant_id: str,
    request: Request,
    auth: ReadAuth,
    db: DbSession,
) -> dict[str, Any]:
    """
    Déclenche le pipeline complet :
    FeatureEngine → GapEngine → RecommendationEngine → AlertEngine
    Rôles autorisés : ADMIN (tout profil), CUP (son département), ENSEIGNANT
    (son propre profil uniquement). Garde d'accès objet (BOLA) côté serveur.
    """
    t_start = time.time()

    # Normalize teacher ID at API boundary
    enseignant_id = validate_canonical_id(enseignant_id, path=request.url.path)
    svc = DataService(db)

    profile = _get_teacher_or_404(svc, enseignant_id, request)
    _enforce_teacher_access(auth, enseignant_id, db)

    pred = PredictionResult(enseignant_id=enseignant_id, statut="EN_COURS")
    db.add(pred)
    db.flush()

    try:
        data = collect_analysis_data(svc, enseignant_id)
        try:
            gaps, recommendations, alerts, snapshot = await asyncio.wait_for(
                asyncio.to_thread(
                    _run_pipeline, db, svc, enseignant_id, profile, data, pred.id,
                ),
                timeout=settings.analytics_pipeline_timeout_s,
            )
        except asyncio.TimeoutError:
            pred.statut = "ERREUR"
            pred.message_erreur = f"Pipeline timeout ({settings.analytics_pipeline_timeout_s}s)"
            db.commit()
            logger.error(
                "Pipeline timeout pour %s après %ds",
                enseignant_id,
                settings.analytics_pipeline_timeout_s,
            )
            raise HTTPException(
                status_code=504,
                detail=_dsi_error(
                    504, "ANA-504",
                    f"Analyse timeout — le pipeline a dépassé {settings.analytics_pipeline_timeout_s}s",
                    request.url.path,
                ),
            )
        _finalize_prediction(pred, data["req_levels"], gaps, recommendations, alerts, snapshot=snapshot, t_start=t_start)
        db.commit()
        logger.info("Analyse terminée pour %s en %dms", enseignant_id, pred.duree_analyse_ms)
    except Exception as exc:
        pred.statut = "ERREUR"
        pred.message_erreur = str(exc)[:500]
        db.commit()
        logger.exception("Analyse échouée pour %s : %s", enseignant_id, exc)
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


def _get_teacher_or_404(svc: DataService, enseignant_id: str, request: Request) -> dict:
    profiles = svc.get_teacher_profile(enseignant_id)
    if profiles:
        return profiles[0]
    csv_profile = _load_csv_teacher_profile(enseignant_id)
    if csv_profile:
        return csv_profile
    raise HTTPException(
        status_code=404,
        detail=_dsi_error(404, "ENS-404", f"Enseignant {enseignant_id} introuvable", request.url.path),
    )


def _load_csv_teacher_profile(enseignant_id: str) -> dict | None:
    """Fallback: load teacher profile from the master CSV dataset when the DB has no record."""
    import csv, pathlib, os
    csv_dir = os.getenv("CSV_DATA_DIR", str(pathlib.Path(__file__).resolve().parents[2] / "data" / "clean"))
    csv_path = pathlib.Path(csv_dir) / "teachers.csv"
    if not csv_path.exists():
        return None
    with open(csv_path, newline="", encoding="utf-8") as f:
        for row in csv.DictReader(f):
            if row.get("teacher_id") == enseignant_id:
                return {
                    "enseignant_id": enseignant_id,
                    "nom": row.get("full_name", ""),
                    "prenom": "",
                    "email": "",
                    "departement_id": row.get("department_code", ""),
                    "up_id": row.get("up_code", ""),
                    "nb_formations_completed": 0,
                    "nb_formations_in_progress": 0,
                    "taux_assiduite": 0.0,
                    "nb_besoins_exprimes": 0,
                    "nb_besoins_approuves": 0,
                    "avg_eval_score": 0.0,
                    "nb_evaluations": 0,
                    "days_since_last_training": None,
                    "avg_days_between_trainings": None,
                }
    return None


def _load_csv_risk_score(enseignant_id: str) -> dict | None:
    """Load risk score from risk_scores.csv for teachers not yet in teacher_risk_profiles."""
    import csv, pathlib, os
    csv_dir = os.getenv("CSV_DATA_DIR", str(pathlib.Path(__file__).resolve().parents[2] / "data" / "clean"))
    csv_path = pathlib.Path(csv_dir) / "risk_scores.csv"
    if not csv_path.exists():
        return None
    with open(csv_path, newline="", encoding="utf-8") as f:
        for row in csv.DictReader(f):
            if row.get("teacher_id") == enseignant_id:
                return {
                    "score": float(row.get("risk_score", 0)),
                    "niveau": row.get("risk_level", "FAIBLE"),
                    "avg_gap": float(row.get("avg_gap", 0)),
                    "n_critical_gaps": int(row.get("n_critical_gaps", 0)),
                    "n_active_alerts": int(row.get("n_active_alerts", 0)),
                }
    return None


def _reco_to_dict(r: "Recommendation", competence_nom: str | None = None, niveau_actuel: float | None = None) -> dict[str, Any]:
    """Normalise une Recommandation en dict (scoring avancé complet).

    Expose le détail MSAS déjà persisté (pertinence, taux de réussite,
    disponibilité, facteurs collaboratifs) pour le front — et non plus
    seulement ``score_global`` + ``probabilite_reussite``.
    """
    return {
        "id":                   r.id,
        "formation_id":         r.formation_id,
        "formation_titre":      r.formation_titre,
        "formation_type":       r.formation_type,
        "competence_id":        r.competence_id,
        "competence_nom":       competence_nom,
        "score_global":         float(r.score_global),
        "score_pertinence":     float(r.score_pertinence),
        "score_reussite":       float(r.score_taux_reussite),
        "score_disponibilite":  float(r.score_disponibilite),
        "probabilite_reussite": float(r.probabilite_reussite),
        "facteurs_score":       r.facteurs_score or {},
        "rang_dans_parcours":   r.rang_dans_parcours,
        "justification":        r.justification,
        "niveau_actuel":        float(niveau_actuel) if niveau_actuel is not None else None,
        "niveau_apres":         float(r.niveau_apres) if getattr(r, "niveau_apres", None) is not None else None,
        "est_prerequis":        getattr(r, "est_prerequis", False),
        "prerequis_satisfaits": getattr(r, "prerequis_satisfaits", True),
        "statut":               r.statut,
    }


def _group_key_label(rec: dict, group_by: str) -> tuple[str, str]:
    """Calcule (clé, libellé) de regroupement pour une recommandation."""
    if group_by == "type":
        return rec["formation_type"] or "AUTRE", rec["formation_type"] or "Autre"
    if group_by == "urgence":
        s = rec["score_global"]
        if s >= 0.75:
            return "CRITIQUE", "Critique (≥0.75)"
        if s >= 0.50:
            return "ELEVE", "Élevée (≥0.50)"
        if s >= 0.25:
            return "MODERE", "Modérée (≥0.25)"
        return "FAIBLE", "Faible (<0.25)"
    # competence (défaut)
    cid = rec["competence_id"]
    return str(cid), rec["competence_nom"] or f"Compétence {cid}"


def _aggregate_group(g: dict[str, Any]) -> dict[str, Any]:
    """Agrège une groupe de recommandations (scores + nb acceptées)."""
    items = g["items"]
    scores = [it["score_global"] for it in items]
    g["nb"] = len(items)
    g["score_moyen"] = round(sum(scores) / len(scores), 4) if scores else 0.0
    g["score_max"] = round(max(scores), 4) if scores else 0.0
    g["nb_acceptees"] = sum(1 for it in items if it["statut"] == "ACCEPTEE")
    return g


def _group_recommendations(recs: list[dict], group_by: str) -> list[dict]:
    """Regroupe les recommandations par compétence, type ou urgence (regroupement)."""
    groups: dict[str, dict[str, Any]] = {}
    for rec in recs:
        key, label = _group_key_label(rec, group_by)
        g = groups.setdefault(key, {
            "group_key": key,
            "group_label": label,
            "items": [],
        })
        g["items"].append(rec)

    result = [_aggregate_group(g) for g in groups.values()]
    result.sort(key=lambda x: x["score_max"], reverse=True)
    return result


def _persist_gaps(db: Session, enseignant_id: str, gaps: list, pred_id: int) -> list:
    """Persist gap dicts/adapters as SkillGap rows and return the ORM objects.

    Gap scores are differentiated per teacher based on:
      - knowledge_difficulty_level (base)
      - gap_type weight (NOT_ASSIGNED > STALE > COLLECTIVE)
      - assignment_status (NOT_ASSIGNED is worse)
    """
    from app.engines.gap_engine import classify_priority, _knowledge_difficulty_score

    GAP_TYPE_WEIGHTS = {
        "GAP_NOT_ASSIGNED": 1.0,
        "GAP_EXPLICIT_NEED": 0.9,
        "GAP_PREREQUISITE_MISSING": 0.85,
        "GAP_TRAINING_NOT_COMPLETED": 0.75,
        "GAP_COLLECTIVE_NEED": 0.65,
        "GAP_STALE_ASSIGNMENT": 0.55,
        "GAP_STRATEGIC_COVERAGE": 0.50,
        "GAP_DEMAND_TREND": 0.40,
    }

    persisted: list = []
    for g in gaps:
        d = g._d if hasattr(g, "_d") else g
        diff = d.get("knowledge_difficulty_level", 1)
        gap_type = d.get("gap_type", "GAP_NOT_ASSIGNED")
        assignment = d.get("assignment_status", "NOT_ASSIGNED")

        current = d.get("current_level", 0)
        base = _knowledge_difficulty_score(diff)
        type_weight = GAP_TYPE_WEIGHTS.get(gap_type, 0.5)
        assignment_penalty = 0.0 if assignment == "NOT_ASSIGNED" else 0.15

        # Adjust gap score based on the teacher's actual current_level.
        # A teacher with partial coverage (level < required) should have a
        # lower gap score than one with no coverage at all.
        if current > 0 and current < diff:
            level_gap = (diff - current) / max(diff, 1)
            gap_score = round(min(1.0, base * type_weight * level_gap + assignment_penalty), 4)
        else:
            gap_score = round(min(1.0, base * type_weight + assignment_penalty), 4)
        impact_score = round(gap_score * 0.8, 4)
        urgence_score = round(gap_score * 0.6, 4)
        niveau_urgence = classify_priority(gap_score)

        niveau_actuel = d.get("current_level", max(0, diff - 1) if assignment == "NOT_ASSIGNED" else diff)
        niveau_requis = d.get("required_level", diff + 1)
        niveau_vise = min(5, niveau_requis + 1)

        sg = SkillGap(
            enseignant_id=enseignant_id,
            competence_id=int(d.get("competency_id") or 0) or 1,
            competence_code=d.get("competency_code") or d.get("competency_id", ""),
            competence_nom=d.get("competency_name") or d.get("knowledge_name", ""),
            domaine_id=None,
            domaine_nom=None,
            niveau_actuel=niveau_actuel,
            niveau_requis=niveau_requis,
            niveau_vise=niveau_vise,
            gap_score=gap_score,
            impact_score=impact_score,
            urgence_score=urgence_score,
            priorite_score=gap_score,
            niveau_urgence=niveau_urgence,
            mois_stagnation=0,
            en_regression=False,
            nb_besoins_exprimes=1 if gap_type == "GAP_EXPLICIT_NEED" else 0,
            justification=d.get("explanation_fr") or gap_type,
            prediction_result_id=pred_id,
        )
        db.add(sg)
        persisted.append(sg)
    db.flush()
    return persisted


def _run_pipeline(
    db: Session, svc: DataService, enseignant_id: str, profile: dict,
    data: dict, pred_id: int,
):
    feat_eng = FeatureEngine(db)
    snapshot = feat_eng.build_snapshot(
        enseignant_id, data["comp_levels"], profile, data["besoins"], data["certificats"],
    )
    dept_id = str(profile.get("departement_id") or "")
    gap_eng = GapEngine(db)
    db.query(SkillGap).filter_by(enseignant_id=enseignant_id).delete()
    db.query(Recommendation).filter_by(enseignant_id=enseignant_id).delete()
    db.flush()
    raw_gaps = gap_eng.compute_gaps(
        enseignant_id, data["comp_levels"], data["req_levels"],
        data["besoins"], pred_id, data["dom_demand"], dept_id,
    )
    persisted_gaps = _persist_gaps(db, enseignant_id, raw_gaps, pred_id)
    collaborative = CollaborativeFilter(
        svc.get_competency_levels(),
        svc.get_inscriptions(),
    )
    reco_eng = RecommendationEngine(db)
    all_evals = data["evaluations"] + data["eval_glob"]
    recommendations, _ = reco_eng.generate(
        enseignant_id, persisted_gaps, data["formations"], data["form_comps"],
        data["inscriptions"], all_evals, data["prereqs"],
        float(snapshot.taux_completion_formations),
        float(snapshot.taux_presence_moyen),
        collaborative=collaborative,
    )
    alert_eng = AlertEngine(db)
    alerts = alert_eng.detect_and_save(
        enseignant_id, persisted_gaps, profile, data["besoins"], dept_id,
    )
    _upsert_risk_profile(db, enseignant_id, persisted_gaps, snapshot)
    return persisted_gaps, recommendations, alerts, snapshot


def _finalize_prediction(
    pred: PredictionResult, req_levels: list, gaps: list,
    recommendations: list, alerts: list,
    snapshot: Any, t_start: float,
):
    nb_crit = sum(1 for g in gaps if g.niveau_urgence == "CRITIQUE")
    niveau_moy = (
        float(snapshot.niveau_moyen_competences)
        if snapshot.niveau_moyen_competences else 0.0
    )
    pred.statut = "TERMINE"
    pred.nb_competences_analysees = len({r.get("competence_id") for r in req_levels})
    pred.nb_gaps_detectes = len(gaps)
    pred.nb_gaps_critiques = nb_crit
    pred.nb_recommendations = len(recommendations)
    pred.nb_alertes_generees = len(alerts)
    pred.score_global_competences = round(niveau_moy / 5.0, 4)
    pred.score_progression = round(min(1.0, niveau_moy / 5.0), 4)
    pred.duree_analyse_ms = int((time.time() - t_start) * 1000)


def _upsert_risk_profile(db: Session, enseignant_id: str, gaps: list, snapshot: Any):
    """Calcule et persiste le profil de risque (score multi-facteurs configurable)."""
    nb_crit = sum(1 for g in gaps if g.niveau_urgence == "CRITIQUE")
    nb_mod  = sum(1 for g in gaps if g.niveau_urgence == "HAUTE")
    nb_fai  = sum(1 for g in gaps if g.niveau_urgence in ("MODEREE", "FAIBLE"))
    mois_stag_max = max((g.mois_stagnation for g in gaps), default=0)
    taux_comp     = float(snapshot.taux_completion_formations or 0.0)

    # Score de risque pondéré (poids w1..w5 issus de la config, jamais codés en dur).
    factors = build_factors_from_gaps(
        gaps,
        taux_completion=taux_comp,
        nb_besoins_exprimes=int(getattr(snapshot, "nb_besoins_exprimes", 0) or 0),
        nb_besoins_approuves=int(getattr(snapshot, "nb_besoins_approuves", 0) or 0),
    )
    risk = compute_risk_score(factors)
    score_risque = risk["score_risque"]
    niveau       = risk["niveau_risque"]

    tendance = "REGRESSION" if any(g.en_regression for g in gaps) else "STABLE"
    facteurs_risque = {
        "factors":       {k: round(v, 4) for k, v in factors.items()},
        "contributions": risk["contributions"],
        "weights":       risk["weights"],
    }

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
        existing.facteurs_risque            = facteurs_risque
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
            facteurs_risque            = facteurs_risque,
        ))
    # F3 — point d'historique à chaque recalcul de profil.
    db.add(TeacherRiskSnapshot(
        enseignant_id = enseignant_id,
        score_risque  = score_risque,
        niveau_risque = niveau,
        tendance      = tendance,
    ))
    db.flush()


# ── GET /api/v1/analytics/gaps/{enseignantId} ────────────────
@router.get("/gaps/{enseignant_id}", summary="Gaps de compétences d'un enseignant")
async def get_gaps(
    enseignant_id: str,
    request: Request,
    db: DbSession,
    urgence: UrgenceFilter = None,
    page: PageParam = 0,
    size: SizeParam = 20,
) -> dict[str, Any]:
    enseignant_id = validate_canonical_id(enseignant_id, path=request.url.path)
    svc = DataService(db)
    
    # Check if teacher has competency data in enseignant_competences (competence schema)
    # or skill_gaps already computed. TeacherKnowledgeAssignment (analytics-owned) may be
    # empty, so we also check enseignant_competences which is the seeded source of truth.
    profile = svc.get_teacher_profile(enseignant_id)
    has_competency_data = False
    if profile:
        # Check enseignant_competences (seeded, competence schema)
        comp_levels = svc.get_competency_levels(enseignant_id)
        has_competency_data = len(comp_levels) > 0
        # Also check if skill_gaps already exist (from a previous analysis)
        if not has_competency_data:
            from sqlalchemy import func
            nb_gaps = (
                db.query(func.count(SkillGap.id))
                .filter(SkillGap.enseignant_id == enseignant_id)
                .scalar() or 0
            )
            has_competency_data = nb_gaps > 0
    
    if not has_competency_data:
        # 🔴 Retourne DATA_INCOMPLETE avec warnings explicites
        from app.core.response_envelope import data_incomplete, DATA_INCOMPLETE
        warnings = [
            f"Aucune affectation de compétence trouvée pour {enseignant_id}.",
            "Le profil est démarré mais sans savoirs/compétences évalués.",
            "Action requise : compléter les affectations via le CUP.",
        ]
        return data_incomplete(
            {
                "enseignant_id": enseignant_id,
                "total": 0,
                "page": page,
                "size": size,
                "gaps": [],
            },
            data_source="db_no_competencies",
            warnings=warnings,
        )
    
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
        "analysis_status": "READY",
        "data_source": "db",
        "gaps": [
            {
                "id":               g.id,
                "competence_id":    g.competence_id,
                "competence_code":  getattr(g, "competence_code", None),
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


# ── GET /api/v1/analytics/risk/{enseignantId} ───────────────
@router.get(
    "/risk/{enseignant_id}",
    summary="Score de risque explicabile d'un enseignant (facteurs pondérés)",
    responses={404: {"description": "Profil de risque introuvable"}},
)
async def get_risk(
    enseignant_id: str,
    db: DbSession,
) -> dict[str, Any]:
    """Retourne le score de risque + la décomposition explicative (F1).

    Lit ``TeacherRiskProfile.facteurs_risque`` (factors / contributions /
    weights) calculé par le pipeline et le mappe vers des ``RiskFactor``
    lisibles (libellé FR + explication vulgarisée)."""
    enseignant_id = validate_canonical_id(enseignant_id, path="/v1/analytics/teacher")
    svc = DataService(db)
    profile = (
        db.query(TeacherRiskProfile)
        .filter_by(enseignant_id=enseignant_id)
        .first()
    )

    # Demo mode: use CSV fallback only if explicitly enabled
    demo_mode = os.getenv("ANALYTICS_DEMO_DATA_MODE", "false").lower() == "true"
    if demo_mode:
        csv_risk = _load_csv_risk_score(enseignant_id)
        if csv_risk:
            csv_teacher = _load_csv_teacher_profile(enseignant_id)
            teacher_name = csv_teacher.get("nom") if csv_teacher else None
            return {
                "enseignant_id": enseignant_id,
                "enseignant_nom": teacher_name,
                "analysis_status": "DEMO_DATA",
                "data_source": "demo_dataset",
                "score": csv_risk["score"],
                "niveau": csv_risk["niveau"],
                "facteurs": [],
                "tendance": "STABLE",
                "precedent_score": None,
                "computed_at": None,
                "warnings": ["Score issu du jeu de démonstration (ANALYTICS_DEMO_DATA_MODE=true)"],
                "source": "DEMO_DATASET_RISK_SCORE",
            }

    # Production: use deterministic risk scoring from DB
    if not profile:
        raise HTTPException(
            status_code=404,
            detail=_dsi_error(404, "RISK-404", f"Profil de risque de {enseignant_id} introuvable", f"/v1/analytics/risk/{enseignant_id}"),
        )

    fr = profile.facteurs_risque if isinstance(profile.facteurs_risque, dict) else {}
    factors = fr.get("factors", {}) or {}
    contributions = fr.get("contributions", {}) or {}
    weights = fr.get("weights", {}) or {}

    labels = {
        "no_training":      "Absence de formation",
        "stagnation":       "Stagnation",
        "gap_count":        "Proportion de gaps critiques",
        "feedback_decline": "Régression",
        "unmet_needs":      "Besoins non satisfaits",
    }
    explications = {
        "no_training":      "Part du risque liée à l'absence prolongée de formation ou à une faible complétion.",
        "stagnation":       "Compétences sans progression notable depuis longtemps.",
        "gap_count":        "Part de gaps classés critiques (écart élevé vs niveau requis).",
        "feedback_decline": "Présence d'au moins un gap en régression (tendance à la baisse).",
        "unmet_needs":      "Besoins exprimés par l'enseignant encore non couverts.",
    }
    order = ("no_training", "stagnation", "gap_count", "feedback_decline", "unmet_needs")
    facteurs = [
        {
            "nom":          labels.get(k, k),
            "valeur_brute": round(float(factors.get(k, 0.0)), 4),
            "poids":        round(float(weights.get(k, 0.0)), 4),
            "contribution": round(float(contributions.get(k, 0.0)), 4),
            "explication":  explications.get(k, ""),
        }
        for k in order
    ]

    tendance = (profile.tendance or "STABLE").upper()
    if tendance == "REGRESSION":
        tendance_ui = "DEGRADATION"
    elif tendance == "AMELIORATION":
        tendance_ui = "AMELIORATION"
    else:
        tendance_ui = "STABLE"

    # Resolve teacher name from enseignants table, fallback to CSV
    teacher_name = None
    row = db.execute(
        sa_text("SELECT nom, prenom FROM enseignants WHERE id = :eid AND deleted_at IS NULL"),
        {"eid": enseignant_id},
    ).fetchone()
    if row:
        teacher_name = f"{row[1]} {row[0]}".strip()
    if not teacher_name:
        csv_teacher = _load_csv_teacher_profile(enseignant_id)
        if csv_teacher:
            teacher_name = csv_teacher.get("nom") or None

    return {
        "enseignant_id":    enseignant_id,
        "enseignant_nom":   teacher_name,
        "score":            round(float(profile.score_risque or 0.0), 4),
        "niveau":           profile.niveau_risque,
        "facteurs":         facteurs,
        "tendance":         tendance_ui,
        "precedent_score":  round(float(profile.precedent_score_risque), 4)
                            if profile.precedent_score_risque is not None else None,
        "computed_at":      profile.computed_at.isoformat() if profile.computed_at else None,
        "source":           "RULE_BASED_RISK_SCORING",
        "analysis_status":  "READY",
    }


# ── GET /api/v1/analytics/enseignants/{id}/historique-risque ─
@router.get(
    "/enseignants/{enseignant_id}/historique-risque",
    summary="Historique du score de risque dans le temps (F3)",
    responses={404: {"description": "Profil de risque introuvable"}},
)
async def historique_risque(
    enseignant_id: str,
    db: DbSession,
    mois: Annotated[int, Query(ge=1, le=60)] = 12,
) -> dict[str, Any]:
    """Série temporelle du score de risque (F3) pour identifier amélioration /
    stagnation / régression. Backfill de démonstration si aucun snapshot."""
    enseignant_id = validate_canonical_id(enseignant_id, path="/v1/analytics/teacher")
    svc = DataService(db)
    cutoff = date.today() - timedelta(days=mois * 31)
    rows = (
        db.query(TeacherRiskSnapshot)
        .filter(
            TeacherRiskSnapshot.enseignant_id == enseignant_id,
            TeacherRiskSnapshot.snapshot_date >= cutoff,
        )
        .order_by(TeacherRiskSnapshot.snapshot_date.asc(), TeacherRiskSnapshot.computed_at.asc())
        .all()
    )
    points: list[dict[str, Any]] = [
        {
            "date": r.snapshot_date.isoformat(),
            "score": round(float(r.score_risque), 4),
            "niveau": r.niveau_risque,
            "tendance": r.tendance,
        }
        for r in rows
    ]
    if not points:
        prof = db.query(TeacherRiskProfile).filter_by(enseignant_id=enseignant_id).first()
        if prof:
            today = date.today()
            if prof.precedent_score_risque is not None:
                points = [
                    {"date": (today - timedelta(days=180)).isoformat(), "score": round(float(prof.precedent_score_risque), 4), "niveau": prof.niveau_risque, "tendance": "STABLE"},
                    {"date": today.isoformat(), "score": round(float(prof.score_risque), 4), "niveau": prof.niveau_risque, "tendance": prof.tendance},
                ]
            else:
                points = [{"date": today.isoformat(), "score": round(float(prof.score_risque), 4), "niveau": prof.niveau_risque, "tendance": prof.tendance}]
    return {"enseignant_id": enseignant_id, "points": points}


# ── GET /api/v1/analytics/recommendations/{enseignantId} ────
@router.get("/recommendations/{enseignant_id}", summary="Recommandations de formations")
async def get_recommendations(
    enseignant_id: str,
    db: DbSession,
    competence_id: CompetenceIdFilter = None,
    page: PageParam = 0,
    size: SizeParam = 20,
) -> dict[str, Any]:
    enseignant_id = validate_canonical_id(enseignant_id, path="/v1/analytics/teacher")
    svc = DataService(db)
    q = (
        db.query(Recommendation, SkillGap.competence_nom, SkillGap.niveau_actuel)
        .outerjoin(SkillGap, Recommendation.skill_gap_id == SkillGap.id)
        .filter(
            Recommendation.enseignant_id == enseignant_id,
            Recommendation.statut.in_(["PROPOSEE", "ACCEPTEE"]),
        )
        .order_by(Recommendation.score_global.desc())
    )
    if competence_id:
        q = q.filter(Recommendation.competence_id == competence_id)

    total = q.count()
    rows = q.offset(page * size).limit(size).all()

    return {
        "enseignant_id": enseignant_id,
        "total":         total,
        "page":          page,
        "size":          size,
        "recommendations": [
            _reco_to_dict(r, nom, nv_act) for r, nom, nv_act in rows
        ],
    }


# ── GET /api/v1/analytics/recommendations/{enseignantId}/grouped ──
@router.get(
    "/recommendations/{enseignant_id}/grouped",
    summary="Recommandations regroupées (regroupement)",
    responses={400: {"description": "group_by invalide"}},
)
async def get_recommendations_grouped(
    enseignant_id: str,
    db: DbSession,
    group_by: Annotated[
        str,
        Query(description="Dimension de regroupement: competence|type|urgence")
    ] = "competence",
) -> dict[str, Any]:
    """Regroupe les recommandations (déjà scorées) par compétence, type ou
    urgence, avec agrégats par groupe (score moyen/max, nb acceptées)."""
    enseignant_id = validate_canonical_id(enseignant_id, path="/v1/analytics/teacher")
    svc = DataService(db)
    if group_by not in ("competence", "type", "urgence"):
        raise HTTPException(
            status_code=400,
            detail=_dsi_error(400, "REC-400", "group_by doit être: competence|type|urgence", f"/v1/analytics/recommendations/{enseignant_id}/grouped"),
        )

    rows = (
        db.query(Recommendation, SkillGap.competence_nom, SkillGap.niveau_actuel)
        .outerjoin(SkillGap, Recommendation.skill_gap_id == SkillGap.id)
        .filter(
            Recommendation.enseignant_id == enseignant_id,
            Recommendation.statut.in_(["PROPOSEE", "ACCEPTEE"]),
        )
        .order_by(Recommendation.score_global.desc())
        .all()
    )
    recs = [_reco_to_dict(r, nom, nv_act) for r, nom, nv_act in rows]
    groups = _group_recommendations(recs, group_by)
    return {
        "enseignant_id": enseignant_id,
        "group_by":      group_by,
        "total":         len(recs),
        "groups":        groups,
    }


# ── GET /api/v1/analytics/training-path/{enseignantId}/{competenceId} ──
@router.get(
    "/training-path/{enseignant_id}/{competence_id}",
    summary="Parcours de formation ordonné pour une compétence",
    responses={404: {"description": "Aucun parcours actif trouvé"}},
)
async def get_training_path(
    enseignant_id: str,
    competence_id: int,
    db: DbSession,
) -> dict[str, Any]:
    enseignant_id = validate_canonical_id(enseignant_id, path="/v1/analytics/teacher")
    svc = DataService(db)
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


# ── PATCH /api/v1/analytics/recommendations/{id}/status ──────
_VALID_RECO_STATUTS = {"PROPOSEE", "ACCEPTEE", "IGNOREE", "OBSOLETE"}
_RecoStatutParam = Annotated[str, Query(description="PROPOSEE|ACCEPTEE|IGNOREE|OBSOLETE")]


@router.patch(
    "/recommendations/{recommendation_id}/status",
    summary="Accepter ou rejeter une recommandation",
    responses={
        400: {"description": "Statut invalide"},
        404: {"description": "Recommandation introuvable"},
    },
)
async def update_recommendation_status(
    recommendation_id: int,
    db: DbSession,
    statut: _RecoStatutParam = ...,
) -> dict[str, Any]:
    statut_norm = statut.upper()
    if statut_norm not in _VALID_RECO_STATUTS:
        raise HTTPException(status_code=400, detail={"message": f"Statut invalide: {statut}"})

    reco = db.query(Recommendation).filter_by(id=recommendation_id).first()
    if not reco:
        raise HTTPException(status_code=404, detail={"message": f"Recommandation {recommendation_id} introuvable"})

    reco.statut = statut_norm
    db.commit()
    return {"id": recommendation_id, "statut": reco.statut, "formation_titre": reco.formation_titre}


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


@router.patch(
    "/alerts/{alert_id}",
    summary="Mettre à jour le statut d'une alerte",
    responses={
        400: {"description": "Statut invalide"},
        404: {"description": "Alerte introuvable"},
    },
)
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
async def dashboard_global(
    auth: ReadAuth,
    db: DbSession,
    periode_debut: Annotated[Optional[str], Query(description="ISO datetime début de fenêtre (filtre temporel)")] = None,
    periode_fin:   Annotated[Optional[str], Query(description="ISO datetime fin de fenêtre (filtre temporel)")] = None,
) -> dict[str, Any]:
    engine = DashboardEngine(db)
    # Fenêtre temporelle personnalisée → recalcul à la volée (pas de cache).
    if periode_debut or periode_fin:
        debut = datetime.fromisoformat(periode_debut) if periode_debut else None
        fin = datetime.fromisoformat(periode_fin) if periode_fin else None
        return engine.compute_all(periode_debut=debut, periode_fin=fin)
    # Sinon : sert le snapshot en cache (≤ 6 h) calculé par le scheduler.
    cached = engine.get_cached()
    return cached if cached is not None else engine.compute_all()


# ── GET /api/v1/analytics/dashboard/teachers-by-cell ─────────
@router.get("/dashboard/teachers-by-cell", summary="Drill-down heatmap : enseignants impactés par une cellule")
async def dashboard_teachers_by_cell(
    auth: ReadAuth,
    db: DbSession,
    departement: Annotated[str, Query(description="Département (code DEPT_*) ou 'non_affecte'")],
    competence_id: Annotated[int, Query(description="Identifiant de la compétence")],
    limit: Annotated[int, Query(ge=1, le=200)] = 50,
) -> list[dict]:
    return DashboardEngine(db).teachers_by_cell(departement, competence_id, limit)


# ── GET /api/v1/analytics/dashboard/competences-declining ────
@router.get("/dashboard/competences-declining", summary="Compétences en déclin (filtr. dept/UP)")
async def dashboard_competences_declining(
    db: DbSession,
    departement_id: DepartementIdFilter = None,
    up_id: Annotated[Optional[str], Query(description="Filtre par UP (ex. UP_INFO)")] = None,
) -> list[dict]:
    return DashboardEngine(db).competences_en_declin(
        departement_id=departement_id, up_id=up_id,
    )


# ── GET /api/v1/analytics/dashboard/teachers-at-risk ─────────
@router.get("/dashboard/teachers-at-risk", summary="Enseignants à risque")
async def dashboard_teachers_at_risk(
    auth: ReadAuth,
    db: DbSession,
    seuil: SeuilParam = settings.risk_score_eleve,
) -> list[dict]:
    return DashboardEngine(db).enseignants_a_risque(seuil=seuil)


# ── GET /api/v1/analytics/dashboard/gap-heatmap ──────────────
@router.get("/dashboard/gap-heatmap", summary="Heatmap des gaps département × compétence")
async def dashboard_gap_heatmap(auth: ReadAuth, db: DbSession) -> list[dict]:
    return DashboardEngine(db).department_gap_heatmap()


# ── GET /api/v1/analytics/dashboard/training-effectiveness ───
@router.get("/dashboard/training-effectiveness", summary="Efficacité des formations")
async def dashboard_training_effectiveness(auth: ReadAuth, db: DbSession) -> list[dict]:
    return DashboardEngine(db).training_effectiveness()


# ── GET /api/v1/analytics/dashboard/top-formations ──────────
@router.get("/dashboard/top-formations", summary="Top formations recommandées (KPI 5)")
async def dashboard_top_formations(auth: ReadAuth, db: DbSession) -> list[dict]:
    return DashboardEngine(db).top_formations_recommandees()


# ── GET /api/v1/analytics/dashboard/risk-evolution ───────────
@router.get("/dashboard/risk-evolution", summary="Évolution mensuelle du risque")
async def dashboard_risk_evolution(
    auth: ReadAuth,
    db: DbSession,
    months: Annotated[int, Query(ge=1, le=24)] = 6,
) -> list[dict]:
    return DashboardEngine(db).monthly_risk_evolution(months=months)


# ── GET /api/v1/analytics/dashboard/model-performance ────────
@router.get("/dashboard/model-performance", summary="Performance du modèle ML")
async def dashboard_model_performance(auth: ReadAuth, db: DbSession) -> dict[str, Any]:
    return DashboardEngine(db).model_performance()


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


# ── POST /api/v1/analytics/admin/retrain ─────────────────────
AdminAuth = Annotated[dict, Depends(require_roles("ADMIN"))]


@router.post(
    "/admin/retrain",
    summary="Ré-entraîner le modèle (ADMIN) — rollback auto si régression",
)
async def admin_retrain(auth: AdminAuth, db: DbSession) -> dict[str, Any]:
    """Ré-entraîne le gap predictor avec protection rollback (spec §5).

    Compare le R² test avant/après ; si la chute dépasse
    RETRAIN_MAX_ACCURACY_DROP, le modèle précédent est restauré. Chaque
    exécution est tracée dans `model_retraining_log`.
    """
    from app.services.model_trainer import retrain_with_rollback

    return retrain_with_rollback(db, triggered_by=auth.get("user_id"))


# ── POST /api/v1/analytics/admin/incremental-update ──────────
@router.post(
    "/admin/incremental-update",
    summary="Mise à jour incrémentale du modèle (ADMIN) — warm start",
)
async def admin_incremental_update(auth: AdminAuth, db: DbSession) -> dict[str, Any]:
    """Mise à jour incrémentale via warm start (60-80% plus rapide).

    Ajoute de nouvelles données au modèle existant sans ré-entraîner
    de zéro. Compatible GradientBoosting (warm_start), XGBoost (xgb_model),
    LightGBM (init_model). Rollback automatique si régression.
    """
    from app.services.model_trainer import incremental_update

    return incremental_update(db, triggered_by=auth.get("user_id"))


# ── GET /api/v1/analytics/admin/retraining-log ───────────────
@router.get("/admin/retraining-log", summary="Historique des ré-entraînements (ADMIN)")
async def retraining_log(
    auth: AdminAuth,
    db: DbSession,
    page: PageParam = 0,
    size: SizeParam = 20,
) -> dict[str, Any]:
    from app.models.db_models import ModelRetrainingLog

    q = db.query(ModelRetrainingLog).order_by(ModelRetrainingLog.retrained_at.desc())
    total = q.count()
    items = q.offset(page * size).limit(size).all()
    return {
        "total": total,
        "page":  page,
        "size":  size,
        "entries": [
            {
                "id":              e.id,
                "model_name":      e.model_name,
                "model_version":   e.model_version,
                "accuracy_before": float(e.accuracy_before) if e.accuracy_before is not None else None,
                "accuracy_after":  float(e.accuracy_after) if e.accuracy_after is not None else None,
                "accuracy_metric": e.accuracy_metric,
                "dataset_size":    e.dataset_size,
                "statut":          e.statut,
                "raison":          e.raison,
                "retrained_at":    e.retrained_at.isoformat() if e.retrained_at else None,
            }
            for e in items
        ],
    }


# ── GET /api/v1/analytics/dashboard/training-impact ──────────
@router.get(
    "/dashboard/training-impact",
    summary="Impact réel des formations suivies (ADMIN/CUP)",
)
async def dashboard_training_impact(auth: ReadAuth, db: DbSession) -> TrainingImpactResponse:
    """Agrégats historiques : gain de niveau moyen et réduction du risque
    après les formations effectiveness suivies."""
    data = TrainingImpactEngine(db).compute_global_impact()
    return TrainingImpactResponse(**data)


# ── GET /api/v1/analytics/dashboard/training-impact/formations ─
@router.get(
    "/dashboard/training-impact/formations",
    summary="Top formations par impact (ADMIN/CUP)",
)
async def dashboard_training_impact_formations(
    auth: ReadAuth,
    db: DbSession,
    page: PageParam = 0,
    size: SizeParam = 20,
) -> TrainingImpactTopFormationsResponse:
    """Classement paginé des formations selon le gain de niveau moyen qu'elles
    procurent (données réelles, formations déjà suivies)."""
    data = TrainingImpactEngine(db).top_formations_by_impact(page=page, size=size)
    return TrainingImpactTopFormationsResponse(**data)


# ── POST /api/v1/analytics/simulate/what-if ───────────────────
@router.post(
    "/simulate/what-if",
    summary="Simulation d'impact 'et si on formait X' (ADMIN/CUP)",
)
async def simulate_what_if(
    payload: WhatIfRequest,
    auth: ReadAuth,
    db: DbSession,
) -> WhatIfResponse:
    """Projette le score de risque et les gaps *comme si* le plan de formations
    fourni avait été suivi. Réutilise la chaîne de scoring de risque existante."""
    result = WhatIfEngine(db).simulate(
        enseignant_id=payload.enseignant_id,
        plan=[a.model_dump() for a in payload.plan],
        horizon_mois=payload.horizon_mois,
    )
    return WhatIfResponse(**result)


# ── GET /api/v1/analytics/forecast/{enseignantId} ───────────
@router.get(
    "/forecast/{enseignant_id}",
    summary="Prévision temporelle des niveaux de compétence (PFE)",
    responses={404: {"description": "Enseignant introuvable"}},
)
async def forecast_competences(
    enseignant_id: str,
    db: DbSession,
    horizon_mois: Annotated[int, Query(ge=1, le=36)] = settings.prediction_horizon_months,
    competence_id: CompetenceIdFilter = None,
) -> dict[str, Any]:
    """Projette sur N mois l'évolution des niveaux de compétence d'un enseignant
    (intervalle de confiance + drapeau de régression)."""
    enseignant_id = validate_canonical_id(enseignant_id, path="/v1/analytics/teacher")
    svc = DataService(db)
    if not svc.get_teacher_profile(enseignant_id):
        raise HTTPException(
            status_code=404,
            detail=_dsi_error(404, "ENS-404", f"Enseignant {enseignant_id} introuvable", f"/v1/analytics/forecast/{enseignant_id}"),
        )
    comps = [competence_id] if competence_id is not None else None
    return SkillForecastEngine(db).forecast(enseignant_id, horizon_mois=horizon_mois, competence_ids=comps)


# ── GET /api/v1/analytics/benchmark/{enseignantId} ──────────
@router.get(
    "/benchmark/{enseignant_id}",
    summary="Benchmark vs pairs (département/UP) (PFE)",
    responses={404: {"description": "Enseignant introuvable"}},
)
async def benchmark_enseignant(
    enseignant_id: str,
    db: DbSession,
    par_up: Annotated[bool, Query(description="Restreindre la cohorte à la même UP")] = False,
) -> dict[str, Any]:
    """Compare un enseignant à ses pairs (niveau moyen, complétion, risque, gaps)."""
    enseignant_id = validate_canonical_id(enseignant_id, path="/v1/analytics/teacher")
    svc = DataService(db)
    if not svc.get_teacher_profile(enseignant_id):
        raise HTTPException(
            status_code=404,
            detail=_dsi_error(404, "ENS-404", f"Enseignant {enseignant_id} introuvable", f"/v1/analytics/benchmark/{enseignant_id}"),
        )
    return PeerBenchmarkEngine(db).benchmark(enseignant_id, par_up=par_up)


# ── POST /api/v1/analytics/anomalies/{enseignantId} ─────────
@router.post(
    "/anomalies/{enseignant_id}",
    summary="Détecter les anomalies d'un enseignant (PFE)",
    status_code=status.HTTP_200_OK,
    responses={404: {"description": "Enseignant introuvable"}},
)
async def detect_anomalies_teacher(
    enseignant_id: str,
    db: DbSession,
) -> dict[str, Any]:
    """Lance les détecteurs d'anomalies et persiste les alertes (idempotent)."""
    enseignant_id = validate_canonical_id(enseignant_id, path="/v1/analytics/teacher")
    svc = DataService(db)
    profil = svc.get_teacher_profile(enseignant_id)
    if not profil:
        raise HTTPException(
            status_code=404,
            detail=_dsi_error(404, "ENS-404", f"Enseignant {enseignant_id} introuvable", f"/v1/analytics/anomalies/{enseignant_id}"),
        )
    dept = str(profil[0].get("departement_id")) if profil[0].get("departement_id") is not None else None
    result = AnomalyEngine(db).detect_for_teacher(enseignant_id, departement_id=dept)
    db.commit()
    return result


# ── POST /api/v1/analytics/anomalies/department/{departementId} ──
@router.post(
    "/anomalies/department/{departement_id}",
    summary="Détecter les anomalies d'un département (PFE, ADMIN/CUP)",
    status_code=status.HTTP_200_OK,
)
async def detect_anomalies_department(
    departement_id: str,
    auth: ReadAuth,
    db: DbSession,
) -> dict[str, Any]:
    """Scanne tous les enseignants d'un département et persiste les alertes."""
    result = AnomalyEngine(db).detect_department(departement_id)
    db.commit()
    return result


# ── POST /api/v1/analytics/analyse-batch ────────────
@router.post(
    "/analyse-batch",
    summary="Analyse batch de plusieurs enseignants (ADMIN/CUP)",
    response_model=dict,
)
async def analyse_batch(
    enseignant_ids: list[str],
    auth: ReadAuth,
    db: DbSession,
) -> dict[str, Any]:
    """Analyse prédictive par lot pour plusieurs enseignants.

    Utile pour les dashboards départementaux et les rapports de masse.
    Retourne les résultats par enseignant avec statut.
    """
    results: dict[str, Any] = {"success": [], "errors": [], "total": len(enseignant_ids)}
    svc = DataService(db)

    for eid in enseignant_ids:
        try:
            profile = svc.get_teacher_profile(teacher_id=eid)
            if not profile:
                results["errors"].append({"id": eid, "error": "Enseignant introuvable"})
                continue
            data = collect_analysis_data(svc, eid)
            gaps, recommendations, alerts, snapshot = _run_pipeline(
                db, svc, eid, profile[0] if profile else {}, data, None,
            )
            results["success"].append({
                "enseignant_id": eid,
                "nb_gaps": len(gaps),
                "nb_recommendations": len(recommendations),
                "nb_alerts": len(alerts),
            })
        except Exception as exc:
            results["errors"].append({"id": eid, "error": str(exc)})

    db.commit()
    return results


# ── GET /api/v1/analytics/pilotage ──────────────────────────
@router.get(
    "/pilotage",
    summary="Dashboard de pilotage (4 modules PFE)",
    response_model=dict,
)
async def pilotage_dashboard(
    auth: ReadAuth,
    db: DbSession,
    horizon_mois: Annotated[int, Query(ge=1, le=36)] = settings.prediction_horizon_months,
) -> dict[str, Any]:
    """Tableau de bord de pilotage agrégeant :
    - KPIs de prévision (forecast)
    - benchmark par département
    - anomalies live
    - corrélation besoins ↔ gaps"""
    return PilotageDashboardEngine(db).compute_all(horizon_mois=horizon_mois)


# ── GET /api/v1/analytics/model/health ────────────────────────
@router.get("/model/health", summary="ML model health status", include_in_schema=False)
async def model_health() -> dict[str, Any]:
    """Return ML model health status.

    WARNING: The GapPredictor model is DEPRECATED due to target leakage.
    The current gap is computed deterministically by GapEngine.
    """
    from app.ml.gap_predictor import gap_predictor
    import sklearn
    import sys
    python_version = f"{sys.version_info.major}.{sys.version_info.minor}.{sys.version_info.micro}"
    sklearn_version = sklearn.__version__

    # Get model health from the deprecated gap predictor
    health = gap_predictor.model_health()

    # Enrich with runtime info
    return {
        "gap_prediction_ml_status": "DEPRECATED_TARGET_LEAKAGE",
        "fallback_mode": True,
        "current_gap_source": "RULE_BASED_DIAGNOSTIC",
        "reason": "Current gap is deterministically derived from current and required levels. ML model caused target leakage (R²=1.0).",
        "future_ml_status": "DATA_COLLECTION_REQUIRED",
        "python_version": python_version,
        "sklearn_runtime_version": sklearn_version,
        "artifact_status": "deprecated",
        "model_health": health,
    }


# ── GET /api/v1/analytics/health ─────────────────────────────
@router.get("/health", summary="Health check analytics", include_in_schema=False)
async def health(db: DbSession) -> dict[str, Any]:
    try:
        db.execute(sa_text("SELECT 1"))
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


# ── GET /api/v1/analytics/integrity/teachers ───────────────────
@router.get("/integrity/teachers", summary="Integrity check: teacher canonical IDs & assignments")
async def integrity_teachers(
    auth: ReadAuth,
    db: DbSession,
) -> dict[str, Any]:
    """Verify all analyzed teachers have canonical ENS IDs and valid assignment references."""
    from app.models.db_models import TeacherIdMapping
    from sqlalchemy import func

    # Teachers in skill_gaps
    gap_teachers = db.execute(sa_text("""
        SELECT DISTINCT enseignant_id FROM skill_gaps
    """)).fetchall()
    gap_teacher_ids = {row[0] for row in gap_teachers}

    # Teachers in teacher_risk_profiles
    risk_teachers = db.execute(sa_text("""
        SELECT DISTINCT enseignant_id FROM teacher_risk_profiles
    """)).fetchall()
    risk_teacher_ids = {row[0] for row in risk_teachers}

    all_teacher_ids = gap_teacher_ids | risk_teacher_ids

    # Check canonical format
    non_canonical = [tid for tid in all_teacher_ids if not tid.startswith("ENS")]
    
    # Check mappings for any legacy IDs
    mapped = db.execute(sa_text("""
        SELECT legacy_id, canonical_id, verified FROM teacher_id_mapping
    """)).fetchall()
    legacy_map = {row[0]: {"canonical": row[1], "verified": row[2]} for row in mapped}

    # Check assignments reference valid knowledge
    invalid_assignments = db.execute(sa_text("""
        SELECT tka.teacher_id, tka.knowledge_id 
        FROM teacher_knowledge_assignments tka
        LEFT JOIN knowledge k ON k.id = tka.knowledge_id
        WHERE k.id IS NULL
    """)).fetchall()

    return {
        "timestamp": datetime.now(timezone.utc).isoformat(),
        "total_teachers_analyzed": len(all_teacher_ids),
        "non_canonical_ids": non_canonical,
        "legacy_mappings": legacy_map,
        "invalid_knowledge_references": [
            {"teacher_id": row[0], "knowledge_id": row[1]} for row in invalid_assignments
        ],
        "status": "OK" if not non_canonical and not invalid_assignments else "ISSUES_FOUND",
    }


# ── GET /api/v1/analytics/integrity/assignments ────────────────
@router.get("/integrity/assignments", summary="Integrity check: teacher-knowledge assignments")
async def integrity_assignments(
    auth: ReadAuth,
    db: DbSession,
) -> dict[str, Any]:
    """Verify assignment integrity: knowledge exists, statuses valid, no orphans."""
    # Assignments with invalid knowledge
    invalid_knowledge = db.execute(sa_text("""
        SELECT tka.id, tka.teacher_id, tka.knowledge_id, tka.assignment_status
        FROM teacher_knowledge_assignments tka
        LEFT JOIN knowledge k ON k.id = tka.knowledge_id
        WHERE k.id IS NULL
    """)).fetchall()

    # Assignments with invalid status
    valid_statuses = ("PROPOSED", "VALIDATED", "REJECTED", "ARCHIVED")
    invalid_status = db.execute(sa_text(f"""
        SELECT id, teacher_id, knowledge_id, assignment_status
        FROM teacher_knowledge_assignments
        WHERE assignment_status NOT IN {valid_statuses}
    """)).fetchall()

    # Orphan assignments (teacher doesn't exist in enseignants)
    orphan_teacher = db.execute(sa_text("""
        SELECT tka.id, tka.teacher_id
        FROM teacher_knowledge_assignments tka
        LEFT JOIN enseignants e ON e.id = tka.teacher_id
        WHERE e.id IS NULL
    """)).fetchall()

    return {
        "timestamp": datetime.now(timezone.utc).isoformat(),
        "invalid_knowledge_refs": len(invalid_knowledge),
        "details_invalid_knowledge": [
            {"id": r[0], "teacher_id": r[1], "knowledge_id": r[2], "status": r[3]} for r in invalid_knowledge
        ],
        "invalid_statuses": len(invalid_status),
        "details_invalid_status": [
            {"id": r[0], "teacher_id": r[1], "knowledge_id": r[2], "status": r[3]} for r in invalid_status
        ],
        "orphan_teacher_refs": len(orphan_teacher),
        "details_orphan_teacher": [
            {"id": r[0], "teacher_id": r[1]} for r in orphan_teacher
        ],
        "status": "OK" if not invalid_knowledge and not invalid_status and not orphan_teacher else "ISSUES_FOUND",
    }


# ── GET /api/v1/analytics/integrity/trainings ──────────────────
@router.get("/integrity/trainings", summary="Integrity check: recommended formations exist and are active")
async def integrity_trainings(
    auth: ReadAuth,
    db: DbSession,
) -> dict[str, Any]:
    """Verify all recommended formations exist, are not cancelled, and match gaps."""
    # Recommendations referencing non-existent formations
    missing_formations = db.execute(sa_text("""
        SELECT r.id, r.enseignant_id, r.formation_id, r.formation_titre
        FROM recommendations r
        LEFT JOIN formations f ON f.id_formation = r.formation_id
        WHERE f.id_formation IS NULL
    """)).fetchall()

    # Recommendations for cancelled formations
    cancelled_formations = db.execute(sa_text("""
        SELECT r.id, r.enseignant_id, r.formation_id, f.etat_formation
        FROM recommendations r
        JOIN formations f ON f.id_formation = r.formation_id
        WHERE f.etat_formation = 'ANNULE'
    """)).fetchall()

    # Recommendations for gaps that don't exist
    missing_gaps = db.execute(sa_text("""
        SELECT r.id, r.enseignant_id, r.skill_gap_id
        FROM recommendations r
        LEFT JOIN skill_gaps sg ON sg.id = r.skill_gap_id
        WHERE r.skill_gap_id IS NOT NULL AND sg.id IS NULL
    """)).fetchall()

    return {
        "timestamp": datetime.now(timezone.utc).isoformat(),
        "missing_formation_refs": len(missing_formations),
        "details_missing_formations": [
            {"reco_id": r[0], "teacher_id": r[1], "formation_id": r[2], "formation_titre": r[3]} for r in missing_formations
        ],
        "cancelled_formation_refs": len(cancelled_formations),
        "details_cancelled_formations": [
            {"reco_id": r[0], "teacher_id": r[1], "formation_id": r[2], "etat": r[3]} for r in cancelled_formations
        ],
        "missing_gap_refs": len(missing_gaps),
        "details_missing_gaps": [
            {"reco_id": r[0], "teacher_id": r[1], "gap_id": r[2]} for r in missing_gaps
        ],
        "status": "OK" if not missing_formations and not cancelled_formations and not missing_gaps else "ISSUES_FOUND",
    }


# ── GET /api/v1/analytics/integrity/summary ────────────────────
@router.get("/integrity/summary", summary="Integrity check: cross-service summary")
async def integrity_summary(
    auth: ReadAuth,
    db: DbSession,
) -> dict[str, Any]:
    """Aggregate integrity summary across all domains."""
    # Reuse the individual checks
    teachers = await integrity_teachers(auth, db)
    assignments = await integrity_assignments(auth, db)
    trainings = await integrity_trainings(auth, db)

    # Prerequisite graph cycle check (simplified)
    cycle_check = db.execute(sa_text("""
        WITH RECURSIVE prereq_path AS (
            SELECT cp.competence_id AS target_id, cp.prerequisite_id AS prereq_id, 
                   ARRAY[cp.competence_id] AS path
            FROM competence_prerequisite cp
            UNION ALL
            SELECT pp.target_id, cp.prerequisite_id, pp.path || cp.competence_id
            FROM prereq_path pp
            JOIN competence_prerequisite cp ON cp.competence_id = pp.prereq_id
            WHERE NOT cp.prerequisite_id = ANY(pp.path)
        )
        SELECT COUNT(*) FROM prereq_path WHERE prereq_id = ANY(path)
    """)).scalar() or 0

    # Department/UP scope consistency
    scope_check = db.execute(sa_text("""
        SELECT COUNT(*) FROM formations f
        WHERE f.departement_id IS NOT NULL 
        AND NOT EXISTS (SELECT 1 FROM departements d WHERE d.id = f.departement_id)
    """)).scalar() or 0

    return {
        "timestamp": datetime.now(timezone.utc).isoformat(),
        "teachers": teachers,
        "assignments": assignments,
        "trainings": trainings,
        "prerequisite_cycles": cycle_check,
        "orphan_department_refs": scope_check,
        "overall_status": "OK" if all(
            c.get("status") == "OK" for c in [teachers, assignments, trainings]
        ) and cycle_check == 0 and scope_check == 0 else "ISSUES_FOUND",
    }
