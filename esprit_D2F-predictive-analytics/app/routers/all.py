"""All API routers for the predictive analytics service."""

from datetime import date
from typing import Any, Optional

from fastapi import APIRouter, Depends, Query, status
from sqlalchemy import text
from sqlalchemy.orm import Session

from app.config import settings
from app.core.db import get_db
from app.core.exceptions import TeacherNotFoundError
from app.models.schemas import (
    AtRiskTeachersResponse, DashboardResponse, GapPredictionRequest,
    GapPredictionResponse, HealthResponse, PathRecommendationRequest,
    PathRecommendationResponse,
)
from app.ml.gap_predictor import gap_predictor
from app.services.data_service import DataService

router = APIRouter()


@router.get("/health", response_model=HealthResponse, tags=["Health"])
async def health_check(db: Session = Depends(get_db)) -> HealthResponse:
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

@router.post("/predict/gaps/{teacher_id}", response_model=GapPredictionResponse, tags=["Prediction"])
async def predict_gaps(
    teacher_id: str,
    request: GapPredictionRequest,
    db: Session = Depends(get_db),
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
        overall_risk_score=result["overall_risk_score"],
        explanation=result["explanation"],
    )


@router.post("/predict/train", tags=["Prediction"])
async def train_gap_model(db: Session = Depends(get_db)) -> dict[str, Any]:
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
async def check_model_drift(db: Session = Depends(get_db)) -> dict[str, Any]:
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


@router.post("/recommend/path", response_model=PathRecommendationResponse, tags=["Recommendation"])
async def recommend_path(
    request: PathRecommendationRequest,
    db: Session = Depends(get_db),
) -> PathRecommendationResponse:
    """Recommend a personalized training path for a teacher to reach a target competency."""
    data = DataService(db)
    formations = data.get_formation_competencies()
    prereqs = data.get_prerequisite_graph()
    comp_levels = data.get_competency_levels(request.teacher_id)

    # Get current level for this teacher on target competency
    current_level = 0.0
    for cl in comp_levels:
        if cl.get("competence_id") == request.target_competency_id:
            current_level = max(current_level, float(cl.get("current_level", 0) or 0))

    # Filter formations for target competency
    target_formations = [
        f for f in formations
        if f.get("competence_id") == request.target_competency_id
        and _formation_target_level(f) <= request.target_level
    ]

    # Score and sort formations
    for f in target_formations:
        f["_score"] = _compute_relevance_score(f, current_level, request.target_level)

    target_formations.sort(key=lambda x: (_formation_target_level(x), -x["_score"]))

    # Deduplicate by formation_id (legacy: id_formation), keep highest scored
    seen_ids: set = set()
    unique_formations = []
    for f in target_formations:
        fid = f.get("formation_id") or f.get("id_formation")
        if fid is None or fid in seen_ids:
            continue
        seen_ids.add(fid)
        unique_formations.append(f)

    # Apply max duration constraint
    max_hours = request.max_duration_hours
    path = []
    cumulative_hours = 0.0

    # Prerequisites for the target competency (once, outside the loop)
    missing_prereqs = [
        p["prereq_name"] for p in prereqs
        if p.get("target_id") == request.target_competency_id
    ][:3]

    for i, f in enumerate(unique_formations):
        hours = _formation_duration(f)
        if max_hours and cumulative_hours + hours > max_hours:
            break
        cumulative_hours += hours

        # Success probability based on position in path and relevance
        base_prob = 0.55 + f["_score"] * 0.3
        step_bonus = min(0.1, (i + 1) * 0.02)
        prob = min(0.95, base_prob + step_bonus)

        path.append({
            "step_number": i + 1,
            "formation_id": int(f.get("formation_id") or f.get("id_formation", 0)),
            "formation_title": f.get("titre_formation", "Formation"),
            "competency_id": request.target_competency_id,
            "competency_name": f.get("competence_nom") or f"Competence {request.target_competency_id}",
            "estimated_duration_hours": hours,
            "missing_prerequisites": missing_prereqs,
            "success_probability": round(prob, 2),
        })

    total_hours = sum(s["estimated_duration_hours"] for s in path)
    overall_prob = path[-1]["success_probability"] if path else 0.0

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

def _compute_teacher_risk(t: dict) -> dict:
    """Compute risk score and signals for a single teacher.

    Uses configurable thresholds from settings instead of hardcoded values.
    """
    from app.config import settings

    risk_gap_threshold = settings.risk_gap_threshold / 5.0  # Normalize to 0-1 scale
    risk_absence_days = settings.risk_absence_threshold_days
    risk_engagement_pct = settings.risk_engagement_percentile / 100.0

    time_factor = min(1.0, (t.get("days_since_last_training") or risk_absence_days) / float(risk_absence_days))
    engagement_factor = 1.0 - (t.get("taux_assiduite") or 1.0)
    stagnation_factor = 1.0 / (1.0 + (t.get("nb_formations_completed") or 0))

    risk_score = (0.5 * time_factor) + (0.2 * engagement_factor) + (0.3 * stagnation_factor)

    signals = []
    if time_factor > 0.8:
        signals.append("Absence prolongée de formation")
    if engagement_factor > risk_engagement_pct:
        signals.append("Baisse d'assiduité")
    if stagnation_factor > 0.5:
        signals.append("Stagnation des compétences")
    if (t.get("nb_besoins_exprimes") or 0) == 0 and (t.get("nb_formations_completed") or 0) == 0:
        signals.append("Aucun engagement détecté")

    # Use configurable thresholds from settings
    critical_threshold = settings.seuil_gap_critique
    high_threshold = settings.seuil_gap_haute

    if risk_score > critical_threshold:
        recommendation = "Planifier entretien"
    elif risk_score > high_threshold:
        recommendation = "Proposer formation"
    else:
        recommendation = "OK"

    return {
        "teacher_id": t["enseignant_id"],
        "teacher_name": f"{t.get('prenom', '')} {t.get('nom', '')}".strip(),
        "email": t.get("email", ""),
        "department": t.get("departement_id"),
        "attrition_risk_score": round(risk_score, 2),
        "disengagement_signals": signals,
        "competency_stagnation_rate": round(stagnation_factor, 2),
        "training_velocity": t.get("nb_formations_completed") or 0,
        "recommendation": recommendation,
    }


@router.get("/detect/at-risk-teachers", response_model=AtRiskTeachersResponse, tags=["Detection"])
async def detect_at_risk_teachers(
    threshold: float = 0.7,
    dept_id: Optional[str] = Query(default=None, alias="deptId"),
    db: Session = Depends(get_db),
) -> AtRiskTeachersResponse:
    """Detect teachers at risk based on competency gaps and engagement.

    Optional deptId filter for Chef de Département role.
    """
    data = DataService(db)
    teachers = data.get_teacher_profile()

    # Filter by department if specified
    if dept_id:
        teachers = [t for t in teachers if str(t.get("departement_id", "")) == str(dept_id)]

    risk_results = [_compute_teacher_risk(t) for t in teachers]

    at_risk = [r for r in risk_results if r["attrition_risk_score"] >= threshold]
    at_risk_as_teachers = []
    for r in at_risk:
        at_risk_as_teachers.append({
            "teacher_id": r["teacher_id"],
            "teacher_name": r["teacher_name"],
            "email": r.get("email", ""),
            "department": r.get("department"),
            "risk_score": r["attrition_risk_score"],
            "risk_factors": r["disengagement_signals"],
            "top_gaps": [],
            "last_training_date": None,
            "engagement_score": 1.0 - r["competency_stagnation_rate"],
        })

    return AtRiskTeachersResponse(
        total_teachers=len(teachers),
        at_risk_count=len(at_risk_as_teachers),
        risk_threshold=threshold,
        teachers=at_risk_as_teachers,
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
async def declining_competencies(db: Session = Depends(get_db)) -> list[dict[str, Any]]:
    """Competencies whose recent demand has dropped vs the 12-month baseline."""
    data = DataService(db)
    demand = data.get_besoin_demand()
    return [{"competency_id": d["competence_id"], "competency_name": d["competence_nom"],
             "domaine_name": d["domaine_nom"], "demand_3m": d["demand_3m"],
             "demand_12m": d["demand_12m"]}
            for d in demand if d["competence_id"] and _is_declining(d)]


@router.get("/dashboard/in-demand-competencies", tags=["Dashboard"])
async def in_demand_competencies(db: Session = Depends(get_db)) -> list[dict[str, Any]]:
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
    dept_id: Optional[str] = Query(default=None, alias="deptId"),
    db: Session = Depends(get_db),
) -> list[dict[str, Any]]:
    """Per-teacher risk indicators for attrition and disengagement."""
    data = DataService(db)
    teachers = data.get_teacher_profile()

    if dept_id:
        teachers = [t for t in teachers if str(t.get("departement_id", "")) == str(dept_id)]

    return [_compute_teacher_risk(t) for t in teachers]


@router.get("/dashboard/summary", response_model=DashboardResponse, tags=["Dashboard"])
async def dashboard_summary(
    dept_id: Optional[str] = Query(default=None, alias="deptId"),
    db: Session = Depends(get_db),
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
        _declining = await declining_competencies(db)
    except Exception as e:
        _log.warning("Failed to load declining_competencies for dashboard: %s", e)

    try:
        _in_demand = await in_demand_competencies(db)
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
    db: Session = Depends(get_db),
) -> dict[str, Any]:
    """Dashboard filtered for a specific department."""
    data = DataService(db)
    teachers = data.get_teacher_profile()
    dept_teachers = [t for t in teachers if str(t.get("departement_id", "")) == str(dept_id)]

    risk_results = [_compute_teacher_risk(t) for t in dept_teachers]
    at_risk = [r for r in risk_results if r["attrition_risk_score"] > 0.5]

    return {
        "department_id": dept_id,
        "total_teachers": len(dept_teachers),
        "at_risk_count": len(at_risk),
        "at_risk_percentage": round(len(at_risk) / max(len(dept_teachers), 1) * 100, 1),
        "risk_indicators": risk_results,
        "avg_risk_score": round(
            sum(r["attrition_risk_score"] for r in risk_results) / max(len(risk_results), 1), 2
        ),
        "top_signals": list({s for r in at_risk for s in r["disengagement_signals"]})[:5],
    }
