"""Configuration centralisée du service (variables d'environnement)."""

from __future__ import annotations

from pathlib import Path

from pydantic_settings import BaseSettings, SettingsConfigDict

ROOT = Path(__file__).resolve().parents[3]


class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        env_file=str(ROOT / ".env"),
        env_prefix="D2F_",
        extra="ignore",
    )

    app_name: str = "D2F Predictive Analytics"
    api_version: str = "v1"
    debug: bool = False

    data_dir: str = str(ROOT / "data")
    curated_dir: str = "curated"
    model_dir: str = "models"
    features_dir: str = "features"
    reports_dir: str = "reports"

    cache_ttl_seconds: int = 60
    stale_assessment_days: int = 365

    ml_enabled: bool = True

    @property
    def curated_path(self) -> Path:
        return Path(self.data_dir) / self.curated_dir

    @property
    def model_path(self) -> Path:
        return Path(self.data_dir) / self.model_dir


settings = Settings()
