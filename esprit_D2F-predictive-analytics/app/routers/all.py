"""All API routers for the predictive analytics service."""

from datetime import date
from typing import Annotated, Any, Optional

from fastapi import APIRouter, Depends, Query, status
from sqlalchemy import text
from sqlalchemy.orm import Session

from app.config import settings
from app.core.db import get_db
from app.core.exceptions import TeacherNotFoundError
from app.core.auth import require_roles

ReadAuth = Annotated[dict, Depends(require_roles("ADMIN", "CUP"))]
from app.models.schemas import (
    AtRiskTeachersResponse, DashboardResponse, GapPredictionRequest,
    GapPredictionResponse, HealthResponse, PathRecommendationRequest,
    PathRecommendationResponse,
)
from app.ml.gap_predictor import gap_predictor
from app.models.db_models import TrainingPath, TrainingPathItem
from app.services.data_service import DataService

router = APIRouter()

DBSession = Annotated[Session, Depends(get_db)]
OptStrQuery = Annotated[Optional[str], Query(alias="deptId")]
# Le ré-entraînement du modèle est une action sensible (rollback, artefacts) :
# réservée à l'ADMIN. Les autres endpoints legacy restent ouverts au niveau du
# service car le gateway applique déjà le RBAC sur /api/analyse/** (cf.
# insights.py docstring) ; un garde supplémentaire ici doublerait la
# logique et risquerait de casser l'analyse de profil par un ENSEIGNANT.
AdminAuth = Annotated[dict, Depends(require_roles("ADMIN"))]


@router.get("/health", tags=["Health"])
async def health_check(db: DBSession) -> HealthResponse:
    """Health check endpoint for Docker and monitoring.

    Verifies both the service and the database connectivity.
    """
    db_status = "healthy"
    try:
        db.execute(text("SELECT 1"))
    except Exception:
        db_status = "unhealthy"

    overall = "healthy" if db_status == "healthy" else "degraded"
    return HealthResponse(status=overall, service="d2f-predictive-analytics")


# ── Predict ────────────────────────────────────

@router.post("/predict/gaps/{teacher_id}", tags=["Prediction"])
async def predict_gaps(
    teacher_id: str,
    request: GapPredictionRequest,
    db: DBSession,
) -> GapPredictionResponse:
    """Predict competency gaps for a teacher in N months."""
    data = DataService(db)

    teacher = data.get_teacher_profile(teacher_id)
    if not teacher:
        raise TeacherNotFoundError(teacher_id)

    comp_levels = data.get_competency_levels(teacher_id)
    req_levels = data.get_required_levels()

    result = gap_predictor.predict(
        teacher_profiles=teacher,
        competency_levels=comp_levels,
        required_levels=req_levels,
        top_n=request.top_n,
    )

    return GapPredictionResponse(
        teacher_id=teacher_id,
        prediction_date=date.today(),
        horizon_months=request.horizon_months or 6,
        gaps=result["gaps"],
        avg_predicted_gap=result["avg_predicted_gap"],
        explanation=result["explanation"],
    )


@router.post("/predict/train", tags=["Prediction"])
async def train_gap_model(auth: AdminAuth, db: DBSession) -> dict[str, Any]:
    """Trigger model retraining on current database snapshot.

    Returns training metrics if successful, or a helpful diagnostic message
    if there is insufficient data (instead of a raw 422 error).
    """
    from app.core.exceptions import InsufficientDataError

    data = DataService(db)
    teachers = data.get_teacher_profile()
    comp_levels = data.get_competency_levels()
    req_levels = data.get_required_levels()

    # Surface row counts so the caller can diagnose the root cause without
    # querying the DB themselves.
    diagnostic = {
        "nb_enseignants":           len(teachers),
        "nb_competency_levels":     len(comp_levels),
        "nb_required_levels":       len(req_levels),
        "min_training_samples":     settings.min_training_samples,
    }

    if not teachers or not comp_levels or not req_levels:
        return {
            "status": "no_data",
            "message": "Données insuffisantes : voir 'diagnostic' pour la table vide.",
            "diagnostic": diagnostic,
            "metrics": None,
            "hint": "Le modèle utilise un fallback heuristique en attendant suffisamment de données.",
        }

    try:
        metrics = gap_predictor.train(teachers, comp_levels, req_levels)
        return {"status": "trained", "metrics": metrics, "diagnostic": diagnostic}
    except InsufficientDataError as e:
        return {
            "status": "insufficient_data",
            "message": str(e.detail) if hasattr(e, "detail") else str(e),
            "diagnostic": diagnostic,
            "metrics": None,
            "hint": "Le modèle utilise un fallback heuristique en attendant suffisamment de données.",
        }


@router.get("/predict/drift", tags=["Prediction"])
async def check_model_drift(db: DBSession) -> dict[str, Any]:
    """Check for data/model drift by comparing current data against training metadata."""
    data = DataService(db)
    teachers = data.get_teacher_profile()
    comp_levels = data.get_competency_levels()

    drift_report = gap_predictor.check_drift(teachers, comp_levels)
    return drift_report


# ── Recommend ──────────────────────────────────

def _formation_target_level(formation: dict) -> int:
    """Extract the target competency level reached by a formation.

    Supports both legacy `niveau_cible` and current `niveau_vise` fields.
    """
    return int(formation.get("niveau_vise") or formation.get("niveau_cible") or 0)


def _formation_duration(formation: dict) -> float:
    """Extract the formation's duration in hours, supporting both naming conventions."""
    return float(
        formation.get("charge_horaire_global")
        or formation.get("duree_formation")
        or 20
    )


def _compute_relevance_score(formation: dict, current_level: float, target_level: float) -> float:
    """Compute a relevance score for a formation based on multiple criteria.

    Score = w1*progression + w2*level_match + w3*duration_efficiency
    """
    niveau_cible = _formation_target_level(formation)
    duree = _formation_duration(formation)

    # Progression match: how well this formation bridges the gap
    if target_level > current_level:
        progression = min(1.0, max(0.0, (niveau_cible - current_level) / (target_level - current_level)))
    else:
        progression = 0.5

    # Duration efficiency: shorter formations with good output score higher
    efficiency = 1.0 / (1.0 + duree / 40.0)

    # Level appropriateness: penalize too advanced or too basic
    level_match = 1.0 - abs(niveau_cible - (current_level + 1)) / 5.0
    level_match = max(0.0, min(1.0, level_match))

    score = 0.45 * progression + 0.30 * level_match + 0.25 * efficiency
    return round(min(1.0, max(0.0, score)), 3)


def _get_current_level(comp_levels: list[dict], target_competency_id: int) -> float:
    current_level = 0.0
    for cl in comp_levels:
        if cl.get("competence_id") == target_competency_id:
            current_level = max(current_level, float(cl.get("current_level", 0) or 0))
    return current_level


def _filter_target_formations(
    formations: list[dict], target_competency_id: int, target_level: int,
    current_level: float,
) -> list[dict]:
    target_formations = [
        f for f in formations
        if f.get("competence_id") == target_competency_id
        and _formation_target_level(f) <= target_level
    ]
    for f in target_formations:
        f["_score"] = _compute_relevance_score(f, current_level, target_level)
    target_formations.sort(key=lambda x: (_formation_target_level(x), -x["_score"]))
    return target_formations


def _deduplicate_formations(formations: list[dict]) -> list[dict]:
    seen_ids: set = set()
    unique = []
    for f in formations:
        fid = f.get("formation_id") or f.get("id_formation")
        if fid is None or fid in seen_ids:
            continue
        seen_ids.add(fid)
        unique.append(f)
    return unique


def _build_path(
    unique_formations: list[dict],
    max_hours: float | None,
    missing_prereqs: list[str],
    target_competency_id: int,
) -> list[dict]:
    path = []
    cumulative_hours = 0.0
    for i, f in enumerate(unique_formations):
        hours = _formation_duration(f)
        if max_hours and cumulative_hours + hours > max_hours:
            break
        cumulative_hours += hours
        base_prob = 0.55 + f["_score"] * 0.3
        step_bonus = min(0.1, (i + 1) * 0.02)
        prob = min(0.95, base_prob + step_bonus)
        path.append({
            "step_number": i + 1,
            "formation_id": int(f.get("formation_id") or f.get("id_formation", 0)),
            "formation_title": f.get("titre_formation", "Formation"),
            "competency_id": target_competency_id,
            "competency_name": f.get("competence_nom") or f"Competence {target_competency_id}",
            "estimated_duration_hours": hours,
            "missing_prerequisites": missing_prereqs,
            "success_probability": round(prob, 2),
        })
    return path


@router.post("/recommend/path", tags=["Recommendation"])
async def recommend_path(
    request: PathRecommendationRequest,
    db: DBSession,
) -> PathRecommendationResponse:
    """Recommend a personalized training path for a teacher to reach a target competency.

    The computed path is persisted as a TrainingPath + TrainingPathItems
    so it can be retrieved later via GET /training-path/{id}/{competence_id}.
    """
    data = DataService(db)
    formations = data.get_formation_competencies()
    prereqs = data.get_prerequisite_graph()
    comp_levels = data.get_competency_levels(request.teacher_id)

    current_level = _get_current_level(comp_levels, request.target_competency_id)
    target_formations = _filter_target_formations(
        formations, request.target_competency_id, request.target_level, current_level
    )
    unique_formations = _deduplicate_formations(target_formations)

    missing_prereqs = [
        p["prereq_name"] for p in prereqs
        if p.get("target_id") == request.target_competency_id
    ][:3]

    path = _build_path(
        unique_formations, request.max_duration_hours,
        missing_prereqs, request.target_competency_id,
    )

    total_hours = sum(s["estimated_duration_hours"] for s in path)
    overall_prob = path[-1]["success_probability"] if path else 0.0

    # ── Persistence ──────────────────────────────────────────
    # Look up the competency name from prerequisite data or formations.
    comp_nom = next(
        (p["prereq_name"] for p in prereqs if p.get("target_id") == request.target_competency_id),
        f"Compétence {request.target_competency_id}",
    )

    # Deactivate previous active path for same teacher+competency.
    previous = (
        db.query(TrainingPath)
        .filter_by(
            enseignant_id=request.teacher_id,
            competence_id=request.target_competency_id,
            statut="ACTIF",
        )
        .all()
    )
    for p in previous:
        p.statut = "ARCHIVE"

    tp = TrainingPath(
        enseignant_id=request.teacher_id,
        competence_id=request.target_competency_id,
        competence_nom=comp_nom,
        niveau_depart=current_level,
        niveau_vise=request.target_level,
        nb_formations=len(path),
        duree_totale_heures=round(total_hours, 1),
        probabilite_reussite_globale=round(overall_prob, 2),
        statut="ACTIF",
    )
    db.add(tp)
    db.flush()

    for step in path:
        db.add(TrainingPathItem(
            training_path_id=tp.id,
            rang=step["step_number"],
            formation_id=step["formation_id"],
            formation_titre=step["formation_title"],
            duree_heures=step["estimated_duration_hours"],
            niveau_avant=current_level,
            niveau_apres=min(current_level + step["step_number"], request.target_level),
            est_obligatoire=True,
            prerequis_satisfaits=len(step.get("missing_prerequisites", [])) == 0,
            deja_suivie=False,
            score_formation=step["success_probability"],
            justification=f"Probabilité de réussite: {step['success_probability']:.0%}",
        ))
    db.commit()

    return PathRecommendationResponse(
        teacher_id=request.teacher_id,
        target_competency_id=request.target_competency_id,
        target_level=request.target_level,
        total_estimated_hours=round(total_hours, 1),
        overall_success_probability=round(overall_prob, 2),
        path=path,
        alternative_paths=None,
    )


# ── Detect ─────────────────────────────────────


def _fetch_teacher_info(db: Session, ids: list[str]) -> dict[str, dict[str, Any]]:
    """Batch-resolve enseignant_id -> {name, email, department} (parameterized).

    Source unique pour enrichir les indicateurs de risque avec les vraies
    valeurs métier (nom, mail, département réel), au lieu des placeholders
    trompeurs (``email=""``, ``department=<filtre>``).
    """
    if not ids:
        return {}
    rows = db.execute(
        text(
            "SELECT id, nom, prenom, mail, dept_id, up_id FROM enseignants "
            "WHERE id = ANY(:ids) AND deleted_at IS NULL"
        ),
        {"ids": ids},
    ).fetchall()
    return {
        str(r[0]): {
            "teacher_name": f"{r[2]} {r[1]}".strip(),
            "email": r[3] or "",
            "department": str(r[4]) if r[4] is not None else None,
            "up": str(r[5]) if r[5] is not None else None,
        }
        for r in rows
    }


def _fetch_teacher_names(db: Session, ids: list[str]) -> dict[str, str]:
    """Batch-resolve enseignant_id -> full name (compat helper)."""
    return {eid: info["teacher_name"] for eid, info in _fetch_teacher_info(db, ids).items()}


def _build_signals_from_factors(
    no_training: float,
    stagnation: float,
    nb_gaps_critiques: int,
    unmet_needs: float = 0.0,
) -> list[str]:
    """Build disengagement signals from pipeline risk factors.

    Single source of truth for signal detection across all dashboard endpoints.
    """
    signals: list[str] = []
    if no_training > 0.8:
        signals.append("Absence prolongée de formation")
    if stagnation > 0.5:
        signals.append("Stagnation des compétences")
    if nb_gaps_critiques > 3:
        signals.append(f"{nb_gaps_critiques} gaps critiques")
    if unmet_needs > 0.5:
        signals.append("Besoins non satisfaits")
    return signals


def _compute_disengagement_signals(
    no_training: float, taux_assiduite: float, stagnation: float,
    nb_completed: int, nb_exprimes: int,
) -> list[str]:
    """DEPRECATED — use _build_signals_from_factors() for new code.

    Legacy version retained for _compute_teacher_risk tests only.
    """
    signals = []
    if no_training > 0.8:
        signals.append("Absence prolongée de formation")
    if taux_assiduite < settings.risk_engagement_percentile / 100.0:
        signals.append("Baisse d'assiduité")
    if stagnation > 0.5:
        signals.append("Stagnation des compétences")
    if nb_completed == 0 and nb_exprimes == 0:
        signals.append("Aucun engagement détecté")
    return signals


def _risk_recommendation(score_risque: float) -> str:
    """Map risk score to an action recommendation."""
    if score_risque >= settings.risk_score_critique:
        return "Planifier entretien"
    if score_risque >= settings.risk_score_eleve:
        return "Proposer formation"
    return "OK"


def _compute_teacher_risk(t: dict) -> dict:
    """Compute risk score and signals for a single teacher.

    Delegates factor building and weighted score to risk_scoring.py's
    configurable multi-factor model (w1..w5, spec §3).
    """
    from app.engines.risk_scoring import build_factors_from_teacher_profile, compute_risk_score

    factors = build_factors_from_teacher_profile(t)
    result = compute_risk_score(factors)
    signals = _compute_disengagement_signals(
        factors["no_training"],
        t.get("taux_assiduite") or 1.0,
        factors["stagnation"],
        t.get("nb_formations_completed") or 0,
        t.get("nb_besoins_exprimes") or 0,
    )

    return {
        "teacher_id": t["enseignant_id"],
        "teacher_name": f"{t.get('prenom', '')} {t.get('nom', '')}".strip(),
        "email": t.get("email", ""),
        "department": t.get("departement_id"),
        "attrition_risk_score": round(result["score_risque"], 2),
        "disengagement_signals": signals,
        "competency_stagnation_rate": round(factors["stagnation"], 2),
        "training_velocity": t.get("nb_formations_completed") or 0,
        "recommendation": _risk_recommendation(result["score_risque"]),
    }


@router.get("/detect/at-risk-teachers", tags=["Detection"])
async def detect_at_risk_teachers(
    db: DBSession,
    threshold: float = settings.risk_score_eleve,
    dept_id: OptStrQuery = None,
) -> AtRiskTeachersResponse:
    """Detect at-risk teachers — reads from teacher_risk_profiles (pipeline scores).

    Ensures a single source of truth for risk scores across all dashboards.
    Le seuil « à risque » par défaut est unifié sur ``settings.risk_score_eleve``
    (identique à /dashboard/teachers-at-risk et department_dashboard) afin que le
    même jeu de données produise le même décompte quel que soit l'endpoint.
    """
    from app.models.db_models import TeacherRiskProfile

    total_teachers = db.execute(
        text("SELECT COUNT(*) FROM enseignants WHERE deleted_at IS NULL")
    ).scalar() or 0

    q = db.query(TeacherRiskProfile).filter(
        TeacherRiskProfile.score_risque >= threshold
    )
    if dept_id:
        dept_ids = db.execute(
            text("SELECT id FROM enseignants WHERE dept_id = :dept AND deleted_at IS NULL"),
            {"dept": dept_id},
        ).fetchall()
        dept_id_set = {str(r[0]) for r in dept_ids}
        if dept_id_set:
            q = q.filter(TeacherRiskProfile.enseignant_id.in_(dept_id_set))

    profiles = q.order_by(TeacherRiskProfile.score_risque.desc()).all()

    teacher_info: dict[str, dict[str, Any]] = {}
    if profiles:
        ids = [p.enseignant_id for p in profiles]
        teacher_info = _fetch_teacher_info(db, ids)
        teacher_names = {eid: info["teacher_name"] for eid, info in teacher_info.items()}

    teachers: list[dict[str, Any]] = []
    for p in profiles:
        factors = p.facteurs_risque if isinstance(p.facteurs_risque, dict) else {}
        factor_details = factors.get("factors", {})
        score = float(p.score_risque)
        signals = _build_signals_from_factors(
            factor_details.get("no_training", 0),
            factor_details.get("stagnation", 0),
            p.nb_gaps_critiques,
            factor_details.get("unmet_needs", 0),
        )
        info = teacher_info.get(p.enseignant_id, {})
        teachers.append({
            "teacher_id": p.enseignant_id,
            "teacher_name": teacher_names.get(p.enseignant_id, p.enseignant_id),
            "email": info.get("email", ""),
            "department": info.get("department", dept_id),
            "risk_score": round(score, 2),
            "risk_factors": signals,
            "top_gaps": [],
            "last_training_date": None,
            "training_velocity": None,
            "engagement_score": round(
                1.0 - float(factor_details.get("stagnation", 0.0)), 2
            ),
        })

    return AtRiskTeachersResponse(
        total_teachers=total_teachers,
        at_risk_count=len(teachers),
        risk_threshold=threshold,
        teachers=teachers,
    )


# ── Dashboard ──────────────────────────────────

def _is_declining(d: dict) -> bool:
    """A competency is declining if recent (3m) demand is significantly lower
    than the proportional baseline of the last 12m. 12m baseline averaged on 3m
    windows = demand_12m / 4 ; we flag as declining if 3m is less than half of that.
    """
    d12 = d.get("demand_12m") or 0
    d3 = d.get("demand_3m") or 0
    return d12 > 0 and d3 < (d12 / 4) * 0.5


def _is_in_demand(d: dict) -> bool:
    """A competency is in demand if 3m activity is at least the proportional
    baseline of the last 12m (demand_12m / 4)."""
    d12 = d.get("demand_12m") or 0
    d3 = d.get("demand_3m") or 0
    return d12 > 0 and d3 >= d12 / 4


@router.get("/dashboard/declining-competencies", tags=["Dashboard"])
async def declining_competencies(db: DBSession) -> list[dict[str, Any]]:
    """Competencies whose recent demand has dropped vs the 12-month baseline.

    Note : non filtrable par département — la requête agrégée de demande ne
    joint pas la table enseignants (agrégation par compétence uniquement).
    Le filtre département s'applique aux enseignants à risque du dashboard.
    """
    data = DataService(db)
    demand = data.get_besoin_demand()
    return [{"competency_id": d["competence_id"], "competency_name": d["competence_nom"],
             "domaine_name": d["domaine_nom"], "demand_3m": d["demand_3m"],
             "demand_12m": d["demand_12m"]}
            for d in demand if d["competence_id"] and _is_declining(d)]


@router.get("/dashboard/in-demand-competencies", tags=["Dashboard"])
async def in_demand_competencies(db: DBSession) -> list[dict[str, Any]]:
    """Competencies most frequently requested in recent training needs."""
    data = DataService(db)
    demand = data.get_besoin_demand()
    filtered = [d for d in demand if d["competence_id"] and _is_in_demand(d)]
    sorted_d = sorted(filtered, key=lambda x: x.get("demand_12m", 0), reverse=True)
    return [{"competency_id": d["competence_id"], "competency_name": d["competence_nom"],
             "domaine_name": d["domaine_nom"], "demand_3m": d["demand_3m"],
             "demand_12m": d["demand_12m"],
             "trend": "increasing" if d["demand_3m"] > d["demand_12m"] / 4 else "stable"}
            for d in sorted_d[:20]]


@router.get("/dashboard/teacher-risk-indicators", tags=["Dashboard"])
async def teacher_risk_indicators(
    db: DBSession,
    dept_id: OptStrQuery = None,
    auth: ReadAuth | None = None,
) -> list[dict[str, Any]]:
    """Per-teacher risk indicators — reads from teacher_risk_profiles (pipeline-computed scores).

    Ensures a single source of truth for risk scores across all dashboards.
    `auth` est optionnel pour permettre l'appel en tant que helper interne
    (le endpoint impose ReadAuth via la dépendance).
    """
    from sqlalchemy import func
    from app.models.db_models import TeacherRiskProfile, AlertEvent

    q = db.query(TeacherRiskProfile).order_by(TeacherRiskProfile.score_risque.desc())

    if dept_id:
        dept_ids = db.execute(
            text("SELECT id FROM enseignants WHERE dept_id = :dept AND deleted_at IS NULL"),
            {"dept": dept_id},
        ).fetchall()
        dept_id_set = {str(r[0]) for r in dept_ids}
        if not dept_id_set:
            return []
        q = q.filter(TeacherRiskProfile.enseignant_id.in_(dept_id_set))

    profiles = q.all()

    teacher_info: dict[str, dict[str, Any]] = {}
    if profiles:
        ids = [p.enseignant_id for p in profiles]
        teacher_info = _fetch_teacher_info(db, ids)
        teacher_names = {eid: info["teacher_name"] for eid, info in teacher_info.items()}

    alert_counts: dict[str, int] = {}
    if profiles:
        alert_q = (
            db.query(AlertEvent.enseignant_id, func.count(AlertEvent.id))
            .filter(AlertEvent.statut.in_(["NOUVELLE", "LUE"]))
            .group_by(AlertEvent.enseignant_id)
        )
        alert_counts = {str(r[0]): int(r[1]) for r in alert_q.all()}

    result: list[dict[str, Any]] = []
    for p in profiles:
        factors = p.facteurs_risque if isinstance(p.facteurs_risque, dict) else {}
        factor_details = factors.get("factors", {})
        contributions = factors.get("contributions", {})

        signals = _build_signals_from_factors(
            factor_details.get("no_training", 0),
            factor_details.get("stagnation", 0),
            p.nb_gaps_critiques,
            factor_details.get("unmet_needs", 0),
        )

        score = float(p.score_risque)
        recommendation = _risk_recommendation(score)

        data_quality_status = (
            "SUFFICIENT"
            if p.nb_gaps_critiques > 0 or score > 0
            else "INSUFFICIENT"
        )

        info = teacher_info.get(p.enseignant_id, {})
        result.append({
            "teacher_id": p.enseignant_id,
            "teacher_name": teacher_names.get(p.enseignant_id, p.enseignant_id),
            "attrition_risk_score": round(score, 2),
            "disengagement_signals": signals,
            "competency_stagnation_rate": round(
                factor_details.get("stagnation", 0.0), 2
            ),
            # ``training_velocity`` n'est pas calculable à partir du profil de
            # risque seul (besoin des formations suivies sur 6-12 mois). On
            # renvoie ``None`` au lieu de 0 trompeur (P1-2).
            "training_velocity": None,
            "recommendation": recommendation,
            "email": info.get("email", ""),
            "department": info.get("department", dept_id),
            "computed_at": (
                p.computed_at.isoformat() if p.computed_at else None
            ),
            "algorithm_version": "v2-pipeline",
            "data_quality": {"status": data_quality_status},
        })
    return result


@router.get("/dashboard/summary", tags=["Dashboard"])
async def dashboard_summary(
    db: DBSession,
    dept_id: OptStrQuery = None,
) -> DashboardResponse:
    """Combined dashboard with all KPIs. Optional department filter.

    Resilient: if any sub-query fails, returns empty data for that section
    instead of crashing the entire dashboard.
    """
    import logging
    _log = logging.getLogger(__name__)

    _declining: list[dict[str, Any]] = []
    _in_demand: list[dict[str, Any]] = []
    _risk_indicators: list[dict[str, Any]] = []

    try:
        _declining = await declining_competencies(db=db)
    except Exception as e:
        _log.warning("Failed to load declining_competencies for dashboard: %s", e)

    try:
        _in_demand = await in_demand_competencies(db=db)
    except Exception as e:
        _log.warning("Failed to load in_demand_competencies for dashboard: %s", e)

    try:
        _risk_indicators = await teacher_risk_indicators(dept_id=dept_id, db=db)
    except Exception as e:
        _log.warning("Failed to load teacher_risk_indicators for dashboard: %s", e)

    return DashboardResponse(
        declining_competencies=_declining,
        in_demand_competencies=_in_demand,
        teacher_risk_indicators=_risk_indicators,
        generated_at=date.today(),
    )


@router.get("/dashboard/department/{dept_id}", tags=["Dashboard"])
async def department_dashboard(
    dept_id: str,
    db: DBSession,
    auth: ReadAuth | None = None,
) -> dict[str, Any]:
    """Dashboard filtered for a specific department — reads from teacher_risk_profiles."""
    from app.models.db_models import TeacherRiskProfile

    total_teachers = db.execute(
        text(
            "SELECT COUNT(*) FROM enseignants "
            "WHERE dept_id = :dept AND deleted_at IS NULL"
        ),
        {"dept": dept_id},
    ).scalar() or 0

    dept_ids = db.execute(
        text("SELECT id FROM enseignants WHERE dept_id = :dept AND deleted_at IS NULL"),
        {"dept": dept_id},
    ).fetchall()
    dept_id_set = {str(r[0]) for r in dept_ids}

    if not dept_id_set:
        return {
            "department_id": dept_id,
            "total_teachers": total_teachers,
            "at_risk_count": 0,
            "at_risk_percentage": 0.0,
            "risk_indicators": [],
            "avg_risk_score": 0.0,
            "top_signals": [],
        }

    profiles = (
        db.query(TeacherRiskProfile)
        .filter(TeacherRiskProfile.enseignant_id.in_(dept_id_set))
        .order_by(TeacherRiskProfile.score_risque.desc())
        .all()
    )

    teacher_info: dict[str, dict[str, Any]] = {}
    if profiles:
        ids = [p.enseignant_id for p in profiles]
        teacher_info = _fetch_teacher_info(db, ids)
        teacher_names = {eid: info["teacher_name"] for eid, info in teacher_info.items()}

    risk_results: list[dict[str, Any]] = []
    for p in profiles:
        factors = p.facteurs_risque if isinstance(p.facteurs_risque, dict) else {}
        factor_details = factors.get("factors", {})
        score = float(p.score_risque)
        signals = _build_signals_from_factors(
            factor_details.get("no_training", 0),
            factor_details.get("stagnation", 0),
            p.nb_gaps_critiques,
            factor_details.get("unmet_needs", 0),
        )

        info = teacher_info.get(p.enseignant_id, {})
        risk_results.append({
            "teacher_id": p.enseignant_id,
            "teacher_name": teacher_names.get(p.enseignant_id, p.enseignant_id),
            "attrition_risk_score": round(score, 2),
            "disengagement_signals": signals,
            "competency_stagnation_rate": round(
                factor_details.get("stagnation", 0.0), 2
            ),
            "training_velocity": None,
            "recommendation": _risk_recommendation(score),
            "email": info.get("email", ""),
            "department": info.get("department", dept_id),
        })

    at_risk = [r for r in risk_results if r["attrition_risk_score"] >= settings.risk_score_eleve]

    return {
        "department_id": dept_id,
        "total_teachers": total_teachers,
        "at_risk_count": len(at_risk),
        "at_risk_percentage": round(
            len(at_risk) / max(total_teachers, 1) * 100, 1
        ),
        "risk_indicators": risk_results,
        "avg_risk_score": round(
            sum(r["attrition_risk_score"] for r in risk_results)
            / max(len(risk_results), 1),
            2,
        ),
        "top_signals": list(
            {s for r in at_risk for s in r["disengagement_signals"]}
        )[:5],
    }
