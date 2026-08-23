from functools import lru_cache
from typing import Any

from pydantic import Field, field_validator
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        extra="ignore",
    )

    app_name: str = "d2f-predictive-analytics"
    app_version: str = "0.1.0"
    app_env: str = Field(default="development")
    debug: bool = False
    log_level: str = "INFO"

    database_url: str = Field(default="postgresql://d2f:d2f@localhost:7432/d2f")
    db_connect_timeout: int = 5

    jwt_secret: str = ""
    jwt_algorithm: str = "HS512"
    jwt_auth_enabled: bool = True
    public_paths: list[str] = ["/api/v1/analytics/health", "/api/v1/analytics/ready", "/docs", "/redoc", "/openapi.json", "/metrics"]

    @field_validator("jwt_secret")
    @classmethod
    def _jwt_secret_strong_in_prod(cls, v: str) -> str:
        """P0 sécurité (CDC DSI §IV.1) — fail fast en production si le secret
        JWT est absent, trop court pour HS512 (< 64 chars) ou un placeholder."""
        import os

        env = os.getenv("APP_ENV", "development").lower()
        if env in ("prod", "production"):
            if not v or not v.strip():
                raise ValueError(
                    "JWT_SECRET is required in production. Set it via env var or .env file."
                )
            if len(v.strip()) < 64:
                raise ValueError(
                    f"JWT_SECRET too short ({len(v.strip())} chars). Minimum 64 chars for HS512."
                )
            lowered = v.lower()
            if "change-me" in lowered or "change_me" in lowered or "changeme" in lowered:
                raise ValueError(
                    "JWT_SECRET contains a placeholder (CHANGE_ME). Configure a real secret."
                )
        return v

    cors_origins: str = "http://localhost:3000,http://localhost:5173"

    pagination_default_size: int = 20
    pagination_max_size: int = 100

    seuil_gap_critique: float = 0.75
    seuil_gap_haute: float = 0.5
    seuil_gap_moyenne: float = 0.25
    risk_threshold_high: float = 70.0
    risk_threshold_medium: float = 30.0
    collective_min_teachers: int = 3
    stagnation_ref_months: int = 12
    engagement_ref_days: int = 180

    risk_weights: dict[str, float] = Field(
        default_factory=lambda: {
            "stagnation": 0.25,
            "decline": 0.20,
            "attendance": 0.20,
            "low_eval": 0.15,
            "repeated_need": 0.10,
            "low_engagement": 0.10,
        }
    )

    models_dir: str = "ml/artifacts"
    gap_model_artifact: str = "gap_predictor_temporal.joblib"
    # Kill-switch global du ML (audit DSI 3.3) : à false, AUCUN artefact ML
    # n'est chargé ni utilisé — l'API retombe sur les règles métier déterministes.
    ml_enabled: bool = True

    # ── Modes d'exécution ML ──────────────────────────────────────────────
    # Mode demandé par l'opérateur. Ce n'est qu'une REQUÊTE : le serveur
    # applique les contrôles et peut refuser l'activation (fallback).
    ml_serving_mode: str = "PRODUCTION_ML"

    # Politique de provenance : seuil maximal de lignes synthétiques
    # dans le corpus d'entraînement. Calculé depuis les lignes du dataset,
    # jamais depuis une variable arbitraire.
    ml_synthetic_tolerance_pct: float = 50.0
    ml_require_real_data: bool = True
    ml_min_real_rows: int = 50

    # Seuils de promotion du modèle (validation des métriques).
    ml_min_r2: float = 0.0
    ml_max_rmse: float = 2.0
    ml_max_mae: float = 1.5
    ml_max_train_test_gap_pct: float = 50.0

    # Chemin de l'artefact (chemin relatif au models_dir ou chemin absolu).
    ml_artifact_path: str = "gap_predictor_temporal.joblib"
    ml_metadata_path: str = "temporal_training_metadata.json"
    ml_registry_path: str = "model_registry.json"
    ml_feature_schema_path: str = "feature_schema.json"

    analysis_cache_ttl_hours: int = 24

    need_detection_threshold: float = 0.5
    need_detection_min_teachers: int = 3
    alert_recompute_days: int = 7

    scheduler_enabled: bool = False
    scheduler_batch_interval_minutes: int = 60
    scheduler_alerts_interval_minutes: int = 15
    scheduler_needs_interval_minutes: int = 30

    message_broker_type: str = "none"
    rabbitmq_url: str = "amqp://guest:guest@localhost:5672/"
    rabbitmq_exchange: str = "d2f.events"
    rabbitmq_queue: str = "d2f.predictive.analytics"
    rabbitmq_routing_key: str = "analyse.#"
    rabbitmq_consumer_enabled: bool = False
    throttling_max_threads: int = 4

    @property
    def cors_origins_list(self) -> list[str]:
        return [origin.strip() for origin in self.cors_origins.split(",") if origin.strip()]

    @field_validator("risk_weights", mode="before")
    @classmethod
    def parse_risk_weights(cls, value: Any) -> dict[str, float]:
        if isinstance(value, str):
            import json

            return json.loads(value)
        return value

    @property
    def total_risk_weight(self) -> float:
        return sum(self.risk_weights.values())


@lru_cache
def get_settings() -> Settings:
    return Settings()
