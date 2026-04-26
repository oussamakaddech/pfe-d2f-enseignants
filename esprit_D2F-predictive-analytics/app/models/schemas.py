"""Pydantic models for API request/response validation."""

from datetime import date
from typing import Any, Optional

from pydantic import BaseModel, Field


class HealthResponse(BaseModel):
    status: str
    service: str
    version: str = "1.0.0"


class GapPredictionRequest(BaseModel):
    teacher_id: str = Field(..., description="Unique teacher identifier")
    horizon_months: Optional[int] = Field(default=None, description="Prediction horizon in months")
    top_n: int = Field(default=10, ge=1, le=100, description="Number of top gaps to return")


class CompetencyGap(BaseModel):
    competency_id: int
    competency_name: str
    domaine_name: str
    current_level: float
    required_level: float
    predicted_gap: float
    confidence: float
    risk_level: str  # low, medium, high, critical


class GapPredictionResponse(BaseModel):
    teacher_id: str
    prediction_date: date
    horizon_months: int
    gaps: list[CompetencyGap]
    overall_risk_score: float
    explanation: dict[str, Any]


class PathRecommendationRequest(BaseModel):
    teacher_id: str
    target_competency_id: int
    target_level: int = Field(..., ge=1, le=5)
    max_duration_hours: Optional[int] = Field(default=None)


class TrainingStep(BaseModel):
    step_number: int
    formation_id: int
    formation_title: str
    competency_id: int
    competency_name: str
    estimated_duration_hours: float
    missing_prerequisites: list[str]
    success_probability: float


class PathRecommendationResponse(BaseModel):
    teacher_id: str
    target_competency_id: int
    target_level: int
    total_estimated_hours: float
    overall_success_probability: float
    path: list[TrainingStep]
    alternative_paths: Optional[list[list[TrainingStep]]]


class AtRiskTeacher(BaseModel):
    teacher_id: str
    teacher_name: str
    email: str
    department: Optional[str]
    risk_score: float
    risk_factors: list[str]
    top_gaps: list[CompetencyGap]
    last_training_date: Optional[date]
    engagement_score: float


class AtRiskTeachersResponse(BaseModel):
    total_teachers: int
    at_risk_count: int
    risk_threshold: float
    teachers: list[AtRiskTeacher]


class DecliningCompetency(BaseModel):
    competency_id: int
    competency_name: str
    domaine_name: str
    avg_level_previous: float
    avg_level_current: float
    decline_rate: float
    affected_teachers_count: int
    urgency: str


class InDemandCompetency(BaseModel):
    competency_id: int
    competency_name: str
    domaine_name: str
    demand_count_3m: int
    demand_count_12m: int
    trend: str  # increasing, stable, decreasing
    avg_gap: float


class TeacherRiskIndicator(BaseModel):
    teacher_id: str
    teacher_name: str
    attrition_risk_score: float
    disengagement_signals: list[str]
    competency_stagnation_rate: float
    training_velocity: float
    recommendation: str


class DashboardResponse(BaseModel):
    declining_competencies: list[DecliningCompetency]
    in_demand_competencies: list[InDemandCompetency]
    teacher_risk_indicators: list[TeacherRiskIndicator]
    generated_at: date
