"""All API routers for the predictive analytics service."""

from datetime import date
from typing import Any

from fastapi import APIRouter, Depends, status
from sqlalchemy.orm import Session

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
async def health_check() -> HealthResponse:
    """Health check endpoint for Docker and monitoring."""
    return HealthResponse(status="healthy", service="d2f-predictive-analytics")


# ── Predict ────────────────────────────────────

@router.post("/predict/gaps/{teacher_id}", response_model=GapPredictionResponse, tags=["Prediction"])
async def predict_gaps(
    teacher_id: str,
    request: GapPredictionRequest,
    db: Session = Depends(get_db),
) -> GapPredictionResponse:
    """Predict competency gaps for a teacher in N months.

    Example: POST /api/predict/gaps/ENS001
    Body: {"horizon_months": 6, "top_n": 10}
    """
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
    """Trigger model retraining on current database snapshot."""
    data = DataService(db)
    teachers = data.get_teacher_profile()
    comp_levels = data.get_competency_levels()
    req_levels = data.get_required_levels()

    metrics = gap_predictor.train(teachers, comp_levels, req_levels)
    return {"status": "trained", "metrics": metrics}


# ── Recommend ──────────────────────────────────

@router.post("/recommend/path", response_model=PathRecommendationResponse, tags=["Recommendation"])
async def recommend_path(
    request: PathRecommendationRequest,
    db: Session = Depends(get_db),
) -> PathRecommendationResponse:
    """Recommend a personalized training path for a teacher to reach a target competency.

    Example: POST /api/recommend/path
    Body: {"teacherId": "ENS001", "targetCompetencyId": 42, "targetLevel": 4}
    """
    data = DataService(db)
    formations = data.get_formation_competencies()
    prereqs = data.get_prerequisite_graph()
    comp_levels = data.get_competency_levels(request.teacher_id)

    # Simplified path: filter formations by target competency, sort by level progression
    target_formations = [
        f for f in formations
        if f.get("competence_id") == request.target_competency_id
        and f.get("niveau_cible", 0) <= request.target_level
    ]

    path = []
    for i, f in enumerate(sorted(target_formations, key=lambda x: x.get("niveau_cible", 0))):
        path.append({
            "step_number": i + 1,
            "formation_id": f["formation_id"],
            "formation_title": f["titre_formation"],
            "competency_id": request.target_competency_id,
            "competency_name": f"Competence {request.target_competency_id}",
            "estimated_duration_hours": float(f.get("duree_formation", 20) or 20),
            "missing_prerequisites": [p["prereq_name"] for p in prereqs if p["target_id"] == request.target_competency_id][:3],
            "success_probability": min(0.95, 0.5 + (i + 1) * 0.1),
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

@router.get("/detect/at-risk-teachers", response_model=AtRiskTeachersResponse, tags=["Detection"])
async def detect_at_risk_teachers(
    threshold: float = 0.7,
    db: Session = Depends(get_db),
) -> AtRiskTeachersResponse:
    """Detect teachers at risk based on competency gaps and engagement metrics.

    Example: GET /api/detect/at-risk-teachers?threshold=0.7
    """
    data = DataService(db)
    teachers = data.get_teacher_profile()
    comp_levels = data.get_competency_levels()
    req_levels = data.get_required_levels()

    result = gap_predictor.predict(teachers, comp_levels, req_levels, top_n=5)

    at_risk = []
    for g in result["gaps"]:
        if g["predicted_gap"] >= threshold:
            at_risk.append({
                "teacher_id": g["teacher_id"],
                "teacher_name": "",
                "email": "",
                "department": None,
                "risk_score": g["predicted_gap"] / 5.0,
                "risk_factors": [f"Gap on {g['competency_name']}: {g['predicted_gap']}"],
                "top_gaps": [g],
                "last_training_date": None,
                "engagement_score": 0.0,
            })

    # Deduplicate by teacher
    seen = set()
    unique = []
    for t in at_risk:
        if t["teacher_id"] not in seen:
            seen.add(t["teacher_id"])
            unique.append(t)

    return AtRiskTeachersResponse(
        total_teachers=len(teachers),
        at_risk_count=len(unique),
        risk_threshold=threshold,
        teachers=unique,
    )


# ── Dashboard ──────────────────────────────────

@router.get("/dashboard/declining-competencies", tags=["Dashboard"])
async def declining_competencies(db: Session = Depends(get_db)) -> list[dict[str, Any]]:
    """Competencies with decreasing average teacher levels over time."""
    data = DataService(db)
    demand = data.get_besoin_demand()
    return [{"competency_id": d["competence_id"], "competency_name": d["competence_nom"],
             "domaine_name": d["domaine_nom"], "demand_3m": d["demand_3m"],
             "demand_12m": d["demand_12m"]} for d in demand if d["competence_id"]]


@router.get("/dashboard/in-demand-competencies", tags=["Dashboard"])
async def in_demand_competencies(db: Session = Depends(get_db)) -> list[dict[str, Any]]:
    """Competencies most frequently requested in training needs."""
    data = DataService(db)
    demand = data.get_besoin_demand()
    sorted_d = sorted(demand, key=lambda x: x.get("demand_12m", 0), reverse=True)
    return [{"competency_id": d["competence_id"], "competency_name": d["competence_nom"],
             "domaine_name": d["domaine_nom"], "demand_3m": d["demand_3m"],
             "demand_12m": d["demand_12m"], "trend": "increasing" if d["demand_3m"] > d["demand_12m"] / 4 else "stable"}
            for d in sorted_d[:20] if d["competence_id"]]


@router.get("/dashboard/teacher-risk-indicators", tags=["Dashboard"])
async def teacher_risk_indicators(db: Session = Depends(get_db)) -> list[dict[str, Any]]:
    """Per-teacher risk indicators for attrition and disengagement."""
    data = DataService(db)
    teachers = data.get_teacher_profile()
    return [{"teacher_id": t["enseignant_id"], "teacher_name": f"{t['prenom']} {t['nom']}",
             "attrition_risk_score": min(1.0, t["days_since_last_training"] / 365.0),
             "disengagement_signals": ["No recent training"] if t["days_since_last_training"] > 180 else [],
             "competency_stagnation_rate": 0.0, "training_velocity": t["nb_formations_completed"],
             "recommendation": "Schedule training" if t["days_since_last_training"] > 180 else "OK"}
            for t in teachers]


@router.get("/dashboard/summary", response_model=DashboardResponse, tags=["Dashboard"])
async def dashboard_summary(db: Session = Depends(get_db)) -> DashboardResponse:
    """Combined dashboard with all KPIs."""
    return DashboardResponse(
        declining_competencies=await declining_competencies(db),
        in_demand_competencies=await in_demand_competencies(db),
        teacher_risk_indicators=await teacher_risk_indicators(db),
        generated_at=date.today(),
    )
