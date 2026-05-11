"""FastAPI application entry point for D2F Predictive Analytics."""

import logging
import os
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
from app.core.logging_config import configure_logging
from app.routers.all import router

logger = logging.getLogger(__name__)

# Configure structured logging
configure_logging()


@asynccontextmanager
async def lifespan(application: FastAPI):
    """Application lifespan: startup and shutdown logic."""
    # ── Startup ──
    from app.ml.gap_predictor import gap_predictor
    if gap_predictor.model is not None:
        logger.info("Loaded gap predictor model (feature importances available)")
    else:
        logger.info("No pre-trained model found. Call POST /api/predict/train to train.")
    yield
    # ── Shutdown ──
    logger.info("Shutting down predictive analytics service")


app = FastAPI(
    title="D2F Predictive Analytics API",
    description="Machine Learning microservice for competency gap prediction, "
                "training path recommendation, at-risk teacher detection, and predictive dashboards.",
    version="1.0.0",
    docs_url="/docs" if not settings.is_production else None,
    redoc_url="/redoc" if not settings.is_production else None,
    lifespan=lifespan,
)

# CORS (allow gateway and webapp — externalisé via CORS_ORIGINS)
_cors_raw = os.getenv("CORS_ORIGINS", "http://localhost:3000,http://localhost:8080")
_cors_origins = [o.strip() for o in _cors_raw.split(",") if o.strip()]
app.add_middleware(
    CORSMiddleware,
    allow_origins=_cors_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ── Exception handlers ──
app.add_exception_handler(ModelNotTrainedError, model_not_trained_handler)
app.add_exception_handler(InsufficientDataError, insufficient_data_handler)
app.add_exception_handler(TeacherNotFoundError, teacher_not_found_handler)
app.add_exception_handler(DatabaseError, database_error_handler)
app.add_exception_handler(ValidationError, validation_exception_handler)
app.add_exception_handler(Exception, generic_exception_handler)

# Include routers with API prefix
app.include_router(router, prefix="/api")
