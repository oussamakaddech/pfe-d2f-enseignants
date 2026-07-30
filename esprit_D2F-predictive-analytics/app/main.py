"""FastAPI application entry point for D2F Predictive Analytics."""

import logging
import os
import time
from contextlib import asynccontextmanager

# Load .env file into OS environment so os.getenv() works for JWT_SECRET, etc.
try:
    from dotenv import load_dotenv
    load_dotenv()
except ImportError:
    pass

from fastapi import FastAPI, HTTPException
from fastapi.exceptions import RequestValidationError
from fastapi.middleware.cors import CORSMiddleware
from pydantic import ValidationError

from app.config import settings

from app.core.exceptions import (
    DatabaseError, InsufficientDataError, ModelNotTrainedError, TeacherNotFoundError,
    database_error_handler, generic_exception_handler, http_exception_handler,
    insufficient_data_handler, model_not_trained_handler,
    teacher_not_found_handler, validation_exception_handler,
)
from app.core.jwt_middleware import JWTAuthMiddleware
from app.core.logging_config import configure_logging
from app.core.observability import TraceIDMiddleware, get_metrics_snapshot
from app.core.auth import require_metrics_auth
from fastapi import Depends

configure_logging()
logger = logging.getLogger(__name__)

_start_time = time.time()


@asynccontextmanager
async def lifespan(application: FastAPI):
    # ── Startup ──────────────────────────────────
    logger.info("Démarrage du service predictive-analytics")

    # P0-1 — fail fast: JWT secret must be configured in production
    if settings.is_production and not settings.jwt_secret:
        logger.critical(
            "JWT_SECRET is not set — refus de démarrer en production. "
            "Configurez JWT_SECRET via la variable d'environnement."
        )
        raise RuntimeError("JWT_SECRET required in production")

    # Initialiser les tables analytics si elles n'existent pas
    _init_db_tables()

    # P1-3 — pg_trgm extension check (required for ILIKE / similarity queries)
    try:
        from app.core.db import SessionLocal
        with SessionLocal() as _db:
            _db.execute(__import__("sqlalchemy").text(
                "SELECT 1 FROM pg_extension WHERE extname = 'pg_trgm'"
            ))
            logger.info("pg_trgm extension verified")
    except Exception as exc:
        logger.warning("pg_trgm check failed (search features may degrade): %s", exc)

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
            logger.exception("Scheduler démarrage échoué : %s", exc)

    # Démarrer le consumer RabbitMQ (DSI §2 — standardise sur RabbitMQ)
    if settings.messaging_enabled:
        try:
            from app.messaging.consumer import start_consumer
            start_consumer()
        except Exception as exc:
            logger.warning("Consumer RabbitMQ démarrage échoué : %s", exc)

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
        logger.exception("Impossible de créer les tables analytics : %s", exc)


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


# ── Métriques techniques DSI ─────────────────────────────────
@app.get("/metrics", tags=["Monitoring"], include_in_schema=False, dependencies=[Depends(require_metrics_auth)])
def metrics():
    """
    Métriques techniques pour monitoring DSI (§4 observabilité).
    Compteurs en mémoire : requêtes totales, 2xx/4xx/5xx, erreurs DB, latence p95.
    """
    snap = get_metrics_snapshot()
    result: dict[str, Any] = {
        "service":          "d2f-predictive-analytics",
        "uptime_seconds":   round(time.time() - _start_time, 1),
        **snap,
    }
    # GPU monitoring (§4.6 — infrastructure DGX)
    try:
        import pynvml
        pynvml.nvmlInit()
        handle = pynvml.nvmlDeviceGetHandleByIndex(0)
        mem = pynvml.nvmlDeviceGetMemoryInfo(handle)
        result["gpu"] = {
            "utilization_percent": pynvml.nvmlDeviceGetUtilizationRates(handle).gpu,
            "memory_used_mb": mem.used // (1024 * 1024),
            "memory_total_mb": mem.total // (1024 * 1024),
            "temperature_c": pynvml.nvmlDeviceGetTemperature(handle, pynvml.NVML_TEMPERATURE_GPU),
        }
        pynvml.nvmlShutdown()
    except Exception:
        result["gpu"] = {"available": False}
    return result


# ── Middleware ───────────────────────────────────────────────
# TraceIDMiddleware en premier (externe) pour que le trace_id soit disponible
# dans tous les middlewares internes.
app.add_middleware(TraceIDMiddleware)
app.add_middleware(JWTAuthMiddleware)
if settings.is_production:
    from app.core.rate_limit import RateLimitMiddleware
    app.add_middleware(RateLimitMiddleware)

_cors_raw = os.getenv("CORS_ORIGINS", "https://localhost:3000,https://localhost:5173,https://localhost:8080")
_cors_origins = [o.strip() for o in _cors_raw.split(",") if o.strip()]
# CORS restreint : verbes HTTP et headers explicites (ne pas utiliser "*").
# Tout besoin supplementaire doit etre ajoute volontairement.
app.add_middleware(
    CORSMiddleware,
    allow_origins=_cors_origins,
    allow_credentials=True,
    allow_methods=["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    allow_headers=[
        "Authorization",
        "Content-Type",
        "Accept",
        "X-Request-Id",
        "X-Trace-Id",
    ],
    expose_headers=["X-Trace-Id"],
    max_age=3600,
)

# ── Exception handlers (format DSI standard) ────────────────
app.add_exception_handler(ModelNotTrainedError,   model_not_trained_handler)
app.add_exception_handler(InsufficientDataError,  insufficient_data_handler)
app.add_exception_handler(TeacherNotFoundError,   teacher_not_found_handler)
app.add_exception_handler(DatabaseError,          database_error_handler)
app.add_exception_handler(HTTPException,          http_exception_handler)
app.add_exception_handler(RequestValidationError, validation_exception_handler)
app.add_exception_handler(ValidationError,        validation_exception_handler)
app.add_exception_handler(Exception,              generic_exception_handler)

# ── Routers ──────────────────────────────────────────────────
# Ancien router (rétro-compatibilité predict/detect/dashboard)
from app.routers.all import router as legacy_router
app.include_router(legacy_router, prefix="/api")

# Router insights avancés (dashboards riches + centre d'action) — même préfixe
# /v1/analytics. Inclus AVANT analytics_router pour que les routes littérales
# (ex. PATCH /alerts/bulk) priment sur la route paramétrée /alerts/{alert_id}.
from app.routers.insights import router as insights_router
app.include_router(insights_router, prefix="/api")

# Nouveau router v1 analytics
from app.routers.analytics import router as analytics_router
app.include_router(analytics_router, prefix="/api")

# Router reporting descriptif (features 1-4 + export) — même préfixe /v1/analytics
from app.routers.reporting import router as reporting_router
app.include_router(reporting_router, prefix="/api")

# Router A/B testing — expose /api/v1/analytics/ab/* (assign/event/results/winner).
# Avant cette ligne, le router était défini mais JAMAIS monté : les endpoints
# A/B testing étaient du code mort non joignable en production.
from app.routers.ab_testing import router as ab_testing_router
app.include_router(ab_testing_router, prefix="/api")

# Router d'intégration d'événements inter-services (DSI §2 — event-driven sync).
# Endpoints REST pour simuler les événements RabbitMQ quand le broker n'est pas disponible.
from app.routers.integration_events import router as integration_router
app.include_router(integration_router)
