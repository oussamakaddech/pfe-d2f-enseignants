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
    # Moyenne des écarts de compétence prédits (échelle 0–5, normalisée), et NON
    # un score de risque normalisé [0,1]. Renommé depuis ``overall_risk_score``
    # (P0-1) pour lever l'ambiguïté avec ``teacher_risk_profiles.score_risque``
    # (échelle 0–1). L'alias préserve la compatibilité ascendante.
    avg_predicted_gap: float
    overall_risk_score: float = Field(default=..., alias="avg_predicted_gap", deprecated=True)
    explanation: dict[str, Any]

    model_config = {"populate_by_name": True}


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
    alternative_paths: Optional[list[list[TrainingStep]]] = None


class AtRiskTeacher(BaseModel):
    teacher_id: str
    teacher_name: str
    email: str
    department: Optional[str] = None
    risk_score: float
    risk_factors: list[str]
    top_gaps: list[CompetencyGap]
    last_training_date: Optional[date] = None
    engagement_score: float


class AtRiskTeachersResponse(BaseModel):
    total_teachers: int
    at_risk_count: int
    risk_threshold: float
    teachers: list[AtRiskTeacher]


class DecliningCompetency(BaseModel):
    competency_id: Optional[int] = None
    competency_name: str = ""
    domaine_name: str = ""
    demand_3m: int = 0
    demand_12m: int = 0

    model_config = {"extra": "ignore"}


class InDemandCompetency(BaseModel):
    competency_id: Optional[int] = None
    competency_name: str = ""
    domaine_name: str = ""
    demand_3m: int = 0
    demand_12m: int = 0
    trend: str = "stable"  # increasing, stable, decreasing

    model_config = {"extra": "ignore"}


class TeacherRiskIndicator(BaseModel):
    teacher_id: str = ""
    teacher_name: str = ""
    attrition_risk_score: float = 0.0
    disengagement_signals: list[str] = []
    competency_stagnation_rate: float = 0.0
    training_velocity: Optional[float] = None
    recommendation: str = "OK"
    email: Optional[str] = None
    department: Optional[str] = None
    computed_at: Optional[str] = None
    algorithm_version: str = "v2-pipeline"
    data_quality: Optional[dict[str, str]] = None

    model_config = {"extra": "ignore"}


class DashboardResponse(BaseModel):
    declining_competencies: list[DecliningCompetency] = []
    in_demand_competencies: list[InDemandCompetency] = []
    teacher_risk_indicators: list[TeacherRiskIndicator] = []
    generated_at: date = date.today()


# ── Action Center (alertes intelligentes & recommandations) ──

class BulkAlertUpdateRequest(BaseModel):
    """Triage de masse d'alertes (PATCH /v1/analytics/alerts/bulk)."""
    alert_ids: list[int] = Field(..., min_length=1, description="IDs des alertes à mettre à jour")
    statut: str = Field(..., description="NOUVELLE|LUE|TRAITEE|IGNOREE|ESCALADEE")
    traite_par: Optional[str] = Field(default=None, description="Identifiant de l'agent traitant")
    commentaire: Optional[str] = Field(default=None, description="Commentaire de traitement")


class BatchRecommendationRequest(BaseModel):
    """Recommandations agrégées sur une cohorte (POST /v1/analytics/recommendations/batch).

    `teacher_ids` est prioritaire ; à défaut on filtre par `departement_id` ;
    sinon on agrège les recommandations des 90 derniers jours.
    """
    teacher_ids: Optional[list[str]] = Field(default=None)
    departement_id: Optional[str] = Field(default=None)
    top_n: int = Field(default=20, ge=1, le=100)


# ── Impact des formations & simulation what-if ──

class FormationImpactRow(BaseModel):
    formation_id: int
    formation_titre: str = ""
    formation_type: Optional[str] = None
    nb_enseignants: int = 0
    gain_niveau_moyen: float = 0.0
    niveau_moyen_avant: float = 0.0
    niveau_moyen_apres: float = 0.0


class TrainingImpactResponse(BaseModel):
    """Agrégats historiques de l'impact réel des formations suivies."""
    nb_enseignants_suivis: int = 0
    nb_chemins_termines: int = 0
    nb_formations_suivies: int = 0
    gain_niveau_moyen: float = 0.0
    reduction_risque_moyenne: float = 0.0
    nb_risque_reduit: int = 0
    nb_risque_augmente: int = 0


class TrainingImpactTopFormationsResponse(BaseModel):
    total: int
    page: int
    size: int
    formations: list[FormationImpactRow] = []


class WhatIfAction(BaseModel):
    competence_id: int = Field(..., description="Compétence cible par la formation")
    niveau_vise: int = Field(..., ge=1, le=5, description="Niveau visé après formation")
    formation_id: Optional[int] = Field(default=None, description="Formation projetée (lien visuel)")


class WhatIfRequest(BaseModel):
    enseignant_id: str = Field(..., description="Enseignant à simuler")
    plan: list[WhatIfAction] = Field(..., min_length=1, description="Plan de formations projeté")
    horizon_mois: int = Field(default=6, ge=1, le=24)


class WhatIfDetail(BaseModel):
    competence_id: int
    formation_id: Optional[int] = None
    niveau_actuel: int
    niveau_requis: int
    niveau_vise: int
    gap_avant: float
    gap_apres: float
    urgence_apres: str
    resolu: bool


class WhatIfResponse(BaseModel):
    enseignant_id: str
    horizon_mois: int
    risk_before: dict[str, Any]
    risk_after: dict[str, Any]
    risk_reduction: float
    nb_gaps_before: int
    nb_gaps_after: int
    nb_gaps_resolus: int
    details: list[WhatIfDetail] = []
