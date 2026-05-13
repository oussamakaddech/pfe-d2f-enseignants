"""Application configuration using pydantic-settings."""

from typing import Optional

from pydantic import Field, PostgresDsn
from pydantic_settings import BaseSettings, SettingsConfigDict


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
        default="postgresql://app_user_analyse:analyse_pass@localhost:7432/d2f",
        alias="DATABASE_URL",
    )
    db_pool_size: int = Field(default=10, alias="DB_POOL_SIZE")
    db_max_overflow: int = Field(default=20, alias="DB_MAX_OVERFLOW")

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

    # ── Scheduler ────────────────────────────────
    scheduler_enabled: bool = Field(default=True, alias="SCHEDULER_ENABLED")
    batch_analysis_hour: int = Field(default=2, alias="BATCH_ANALYSIS_HOUR")
    dashboard_refresh_hour: int = Field(default=3, alias="DASHBOARD_REFRESH_HOUR")

    # ── Messaging ────────────────────────────────
    messaging_enabled: bool = Field(default=False, alias="MESSAGING_ENABLED")
    activemq_host: str = Field(default="localhost", alias="ACTIVEMQ_HOST")
    activemq_stomp_port: int = Field(default=61613, alias="ACTIVEMQ_STOMP_PORT")
    activemq_user: str = Field(default="admin", alias="ACTIVEMQ_USER")
    activemq_password: str = Field(default="admin", alias="ACTIVEMQ_PASSWORD")

    # ── JWT ──────────────────────────────────────
    jwt_secret: Optional[str] = Field(default=None, alias="JWT_SECRET")
    jwt_algorithm: str = Field(default="HS512", alias="JWT_ALGORITHM")

    @property
    def is_production(self) -> bool:
        return self.app_env.lower() == "production"


settings = Settings()
