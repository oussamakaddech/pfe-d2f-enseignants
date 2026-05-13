"""FastAPI application entry point for D2F Predictive Analytics."""

import logging
import os
import time
from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from pydantic import ValidationError

from app.config import settings
from app.core.exceptions import (
    DatabaseError, InsufficientDataError, ModelNotTrainedError, TeacherNotFoundError,
    database_error_handler, generic_exception_handler, insufficient_data_handler,
    model_not_trained_handler, teacher_not_found_handler, validation_exception_handler,
)
from app.core.jwt_middleware import JWTAuthMiddleware
from app.core.logging_config import configure_logging

configure_logging()
logger = logging.getLogger(__name__)

_start_time = time.time()


@asynccontextmanager
async def lifespan(application: FastAPI):
    # ── Startup ──────────────────────────────────
    logger.info("Démarrage du service predictive-analytics")

    # Initialiser les tables analytics si elles n'existent pas
    _init_db_tables()

    # Charger le modèle ML (si disponible)
    try:
        from app.ml.gap_predictor import gap_predictor
        if gap_predictor.model is not None:
            logger.info("Modèle gap predictor chargé (%d features)", gap_predictor.n_features)
        else:
            logger.info("Aucun modèle pré-entraîné — appeler POST /api/predict/train")
    except Exception as exc:
        logger.warning("Impossible de charger le modèle ML : %s", exc)

    # Démarrer le scheduler
    if settings.scheduler_enabled:
        try:
            from app.scheduler.jobs import start_scheduler
            start_scheduler()
        except Exception as exc:
            logger.error("Scheduler démarrage échoué : %s", exc)

    # Démarrer le consumer ActiveMQ
    if settings.messaging_enabled:
        try:
            from app.messaging.consumer import start_consumer
            start_consumer()
        except Exception as exc:
            logger.warning("Consumer ActiveMQ démarrage échoué : %s", exc)

    yield

    # ── Shutdown ─────────────────────────────────
    logger.info("Arrêt du service predictive-analytics")
    try:
        from app.scheduler.jobs import stop_scheduler
        stop_scheduler()
    except Exception:
        pass
    try:
        from app.messaging.consumer import stop_consumer
        stop_consumer()
    except Exception:
        pass


def _init_db_tables():
    """Crée les tables analytics si elles n'existent pas (idempotent)."""
    try:
        from app.core.db import engine
        from app.models.db_models import Base
        Base.metadata.create_all(bind=engine, checkfirst=True)
        logger.info("Tables analytics vérifiées / créées")
    except Exception as exc:
        logger.error("Impossible de créer les tables analytics : %s", exc)


app = FastAPI(
    title="D2F Predictive Analytics API",
    description=(
        "Microservice d'analyse prédictive pour la plateforme D2F — "
        "gaps de compétences, recommandations de formations, alertes automatiques."
    ),
    version="1.0.0",
    docs_url="/docs" if not settings.is_production else None,
    redoc_url="/redoc" if not settings.is_production else None,
    lifespan=lifespan,
)


# ── Métriques techniques ─────────────────────────────────────
@app.get("/metrics", tags=["Monitoring"])
def metrics():
    """Métriques techniques pour monitoring DSI."""
    try:
        from app.ml.gap_predictor import gap_predictor
        model_loaded = gap_predictor.model is not None
        n_features   = gap_predictor.n_features if model_loaded else 0
    except Exception:
        model_loaded = False
        n_features   = 0

    return {
        "service":        "predictive-analytics",
        "uptime_seconds": round(time.time() - _start_time, 1),
        "model_loaded":   model_loaded,
        "model_n_features": n_features,
    }


# ── Middleware ───────────────────────────────────────────────
app.add_middleware(JWTAuthMiddleware)

_cors_raw = os.getenv("CORS_ORIGINS", "http://localhost:3000,http://localhost:5173,http://localhost:8080")
_cors_origins = [o.strip() for o in _cors_raw.split(",") if o.strip()]
app.add_middleware(
    CORSMiddleware,
    allow_origins=_cors_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ── Exception handlers (format DSI standard) ────────────────
app.add_exception_handler(ModelNotTrainedError, model_not_trained_handler)
app.add_exception_handler(InsufficientDataError, insufficient_data_handler)
app.add_exception_handler(TeacherNotFoundError, teacher_not_found_handler)
app.add_exception_handler(DatabaseError, database_error_handler)
app.add_exception_handler(ValidationError, validation_exception_handler)
app.add_exception_handler(Exception, generic_exception_handler)

# ── Routers ──────────────────────────────────────────────────
# Ancien router (rétro-compatibilité predict/detect/dashboard)
from app.routers.all import router as legacy_router
app.include_router(legacy_router, prefix="/api")

# Nouveau router v1 analytics
from app.routers.analytics import router as analytics_router
app.include_router(analytics_router, prefix="/api")
