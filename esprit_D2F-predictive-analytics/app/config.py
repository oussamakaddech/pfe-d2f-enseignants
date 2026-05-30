"""Application configuration using pydantic-settings."""

from typing import Optional

from pydantic import Field, PostgresDsn, field_validator
from pydantic_settings import BaseSettings, SettingsConfigDict

# DSI §11 — no credentials in source code. The DB URL must come from the
# DATABASE_URL env var. The dev placeholder below carries no real secret and
# triggers a startup validation error in any non-development environment.
_DEV_DATABASE_URL = "postgresql://app_user_analyse:CHANGE_ME_DEV_ONLY@localhost:7432/d2f"


class Settings(BaseSettings):
    """Centralized configuration for the predictive analytics service."""

    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        extra="ignore",
    )

    # ── Application ──────────────────────────────
    app_name: str = Field(default="d2f-predictive-analytics", alias="APP_NAME")
    app_env: str = Field(default="development", alias="APP_ENV")
    debug: bool = Field(default=False, alias="DEBUG")

    # ── Server ───────────────────────────────────
    host: str = Field(default="0.0.0.0", alias="HOST")
    port: int = Field(default=8000, alias="PORT")

    # ── Database ─────────────────────────────────
    database_url: PostgresDsn = Field(
        default=_DEV_DATABASE_URL,
        alias="DATABASE_URL",
    )
    db_pool_size: int = Field(default=10, alias="DB_POOL_SIZE")
    db_max_overflow: int = Field(default=20, alias="DB_MAX_OVERFLOW")
    # Délai max (s) pour établir une connexion. Sans cela, une base injoignable
    # bloque le worker indéfiniment (TCP connect sans timeout) au lieu de
    # renvoyer rapidement une 503. Borne aussi la durée des tests si la base
    # de dev n'est pas démarrée.
    db_connect_timeout: int = Field(default=10, alias="DB_CONNECT_TIMEOUT")
    db_statement_timeout_ms: int = Field(default=15000, alias="DB_STATEMENT_TIMEOUT_MS")

    # ── ML Model Paths ───────────────────────────
    models_dir: str = Field(default="data/models", alias="MODELS_DIR")
    gap_model_file: str = Field(default="gap_predictor.joblib", alias="GAP_MODEL_FILE")
    risk_model_file: str = Field(default="risk_detector.joblib", alias="RISK_MODEL_FILE")

    # ── Feature Engineering ──────────────────────
    prediction_horizon_months: int = Field(default=6, alias="PREDICTION_HORIZON_MONTHS")
    min_training_samples: int = Field(default=50, alias="MIN_TRAINING_SAMPLES")
    cv_folds: int = Field(default=5, alias="CV_FOLDS")

    # ── Gap Detection Thresholds ─────────────────
    seuil_gap_critique: float = Field(default=0.75, alias="SEUIL_GAP_CRITIQUE")
    seuil_gap_haute: float = Field(default=0.50, alias="SEUIL_GAP_HAUTE")
    seuil_stagnation_mois: int = Field(default=12, alias="SEUIL_STAGNATION_MOIS")
    seuil_completion_faible: float = Field(default=40.0, alias="SEUIL_COMPLETION_FAIBLE")
    seuil_dept_pct: float = Field(default=0.30, alias="SEUIL_DEPT_PCT")

    # ── Risk Detection ───────────────────────────
    risk_gap_threshold: float = Field(default=2.0, alias="RISK_GAP_THRESHOLD")
    risk_absence_threshold_days: int = Field(default=365, alias="RISK_ABSENCE_THRESHOLD_DAYS")
    risk_engagement_percentile: float = Field(default=10.0, alias="RISK_ENGAGEMENT_PERCENTILE")

    # ── Risk Scoring Weights (multi-factor, configurable — spec §3) ──────
    # Pondérations w1..w5 du score de risque. Elles sont normalisées à
    # l'exécution (somme ramenée à 1.0), donc seules les proportions comptent.
    risk_weight_no_training: float = Field(default=0.30, alias="RISK_WEIGHT_NO_TRAINING")
    risk_weight_stagnation: float = Field(default=0.25, alias="RISK_WEIGHT_STAGNATION")
    risk_weight_gap_count: float = Field(default=0.20, alias="RISK_WEIGHT_GAP_COUNT")
    risk_weight_feedback_decline: float = Field(default=0.10, alias="RISK_WEIGHT_FEEDBACK_DECLINE")
    risk_weight_unmet_needs: float = Field(default=0.15, alias="RISK_WEIGHT_UNMET_NEEDS")
    # Seuils de catégorisation du score (0-1) → FAIBLE / MODERE / ELEVE / CRITIQUE
    risk_score_critique: float = Field(default=0.75, alias="RISK_SCORE_CRITIQUE")
    risk_score_eleve: float = Field(default=0.50, alias="RISK_SCORE_ELEVE")
    risk_score_modere: float = Field(default=0.25, alias="RISK_SCORE_MODERE")
    # Fenêtre (mois) de saturation du facteur stagnation
    risk_stagnation_window_months: int = Field(default=24, alias="RISK_STAGNATION_WINDOW_MONTHS")
    # Nb de besoins non satisfaits saturant le facteur "unmet needs"
    risk_unmet_needs_saturation: int = Field(default=3, alias="RISK_UNMET_NEEDS_SATURATION")

    # ── Model Retraining (rollback protection — spec §5) ─────────────────
    # Chute de R² (sur le jeu de test) tolérée avant de déclencher un rollback.
    retrain_max_accuracy_drop: float = Field(default=0.05, alias="RETRAIN_MAX_ACCURACY_DROP")

    # ── Scheduler ────────────────────────────────
    scheduler_enabled: bool = Field(default=True, alias="SCHEDULER_ENABLED")
    batch_analysis_hour: int = Field(default=2, alias="BATCH_ANALYSIS_HOUR")
    dashboard_refresh_hour: int = Field(default=3, alias="DASHBOARD_REFRESH_HOUR")

    # ── Messaging ────────────────────────────────
    messaging_enabled: bool = Field(default=False, alias="MESSAGING_ENABLED")
    activemq_host: str = Field(default="localhost", alias="ACTIVEMQ_HOST")
    activemq_stomp_port: int = Field(default=61613, alias="ACTIVEMQ_STOMP_PORT")
    activemq_user: Optional[str] = Field(default=None, alias="ACTIVEMQ_USER")
    activemq_password: Optional[str] = Field(default=None, alias="ACTIVEMQ_PASSWORD")

    # ── JWT ──────────────────────────────────────
    jwt_secret: Optional[str] = Field(default=None, alias="JWT_SECRET")
    jwt_algorithm: str = Field(default="HS512", alias="JWT_ALGORITHM")

    @property
    def is_production(self) -> bool:
        return self.app_env.lower() == "production"

    @field_validator("database_url")
    @classmethod
    def _no_dev_secret_in_prod(cls, v):
        """DSI §11 — reject the dev placeholder DB URL in non-development environments."""
        if v is not None and "CHANGE_ME_DEV_ONLY" in str(v):
            import os
            env = os.getenv("APP_ENV", "development").lower()
            if env != "development":
                raise ValueError(
                    "DATABASE_URL must be set via env var in non-development "
                    "environments — dev placeholder credentials are forbidden."
                )
        return v


settings = Settings()
