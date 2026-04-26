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
    port: int = Field(default=8080, alias="PORT")

    # ── Database (read-only access to existing d2f DB) ──
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

    # ── Risk Detection Thresholds ────────────────
    risk_gap_threshold: float = Field(default=2.0, alias="RISK_GAP_THRESHOLD")
    risk_absence_threshold_days: int = Field(default=365, alias="RISK_ABSENCE_THRESHOLD_DAYS")
    risk_engagement_percentile: float = Field(default=10.0, alias="RISK_ENGAGEMENT_PERCENTILE")

    # ── JWT (for validation if gateway forwards token) ──
    jwt_secret: Optional[str] = Field(default=None, alias="JWT_SECRET")
    jwt_algorithm: str = Field(default="HS256", alias="JWT_ALGORITHM")

    @property
    def is_production(self) -> bool:
        """Return True if running in production mode."""
        return self.app_env.lower() == "production"


# Global settings instance (singleton pattern)
settings = Settings()
