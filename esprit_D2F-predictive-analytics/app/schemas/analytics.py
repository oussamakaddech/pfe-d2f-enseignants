from datetime import datetime

from pydantic import BaseModel, ConfigDict, Field

Cfg = ConfigDict(protected_namespaces=())


class RiskFactorOut(BaseModel):
    model_config = Cfg
    feature: str
    code: str
    label: str
    raw_value: float
    normalized_value: float
    weight: float
    contribution: float
    contribution_percent: float
    scope: str = "TEACHER"
    scope_type: str = "TEACHER"
    scope_id: str | None = None
    scope_label: str | None = None


class RiskOut(BaseModel):
    model_config = Cfg
    teacher_id: str
    risk_score: float
    risk_level: str
    score: float
    score_percent: float
    level: str
    level_label: str
    is_capped: bool
    uncapped_score: float
    factors: list[RiskFactorOut]
    computed_at: datetime


class GapOut(BaseModel):
    model_config = Cfg
    competence_id: int
    competence_code: str
    competence_nom: str
    observed_result: float
    knowledge_difficulty_level: float
    gap_score: float
    severity: str
    trend: str
    as_of: str


class RecommendationOut(BaseModel):
    model_config = Cfg
    formation_id: int
    titre: str
    competence_id: int | None
    rank_score: float
    reason: str
    matched_savoirs: list[str]


class AnalysisOut(BaseModel):
    model_config = Cfg
    teacher_id: str
    gaps: list[GapOut]
    risk: RiskOut | None
    recommendations: list[RecommendationOut]
    model_mode: str
    computed_at: datetime


class TeacherContextOut(BaseModel):
    model_config = Cfg
    teacher_id: str
    nom_complet: str
    mail: str
    specialite: str | None
    grade: str | None
    up_id: str | None
    up_libelle: str | None
    dept_id: str | None
    dept_libelle: str | None


class ScopeOut(BaseModel):
    model_config = Cfg
    type: str
    is_global: bool
    label: str


class TeacherScopeAnalysisOut(BaseModel):
    model_config = Cfg
    context: TeacherContextOut
    gaps: list[GapOut]
    recommendations: list[RecommendationOut]
    scoped_competencies_count: int
    total_competencies_count: int
    scope: ScopeOut
    computed_at: datetime


class HealthOut(BaseModel):
    model_config = Cfg
    status: str
    service: str
    version: str
    database: str
    model: str
    target_validity: str | None = None
    data_origin: str | None = None
    validation_scope: str | None = None
    # --- ML actif (etape 1-3 : serving des ecarts + risque) ---
    model_version: str | None = None
    # Serving des ecarts : "X/Y" enseignants servis par le modele (mode ML),
    # le reste en repli heuristique (fallback_reason documente).
    ml_serving_count: str | None = None
    ml_serving_teachers: int | None = None
    ml_heuristic_fallback_teachers: int | None = None
    # Modele de risque : ML actif ou repli heuristique fail-closed.
    risk_ml_active: bool | None = None
    risk_model_version: str | None = None
    risk_mode: str | None = None
    risk_ml_serving_count: int | None = None
    risk_heuristic_fallback_count: int | None = None
    risk_fallback_reason: str | None = None



class AnalysisAcceptedOut(BaseModel):
    model_config = Cfg
    analysis_id: str
    status: str = Field(default="ACCEPTED")