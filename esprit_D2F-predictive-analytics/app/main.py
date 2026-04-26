"""FastAPI application entry point for D2F Predictive Analytics."""

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.config import settings
from app.core.exceptions import (
    InsufficientDataError, ModelNotTrainedError, TeacherNotFoundError,
    insufficient_data_handler, model_not_trained_handler, teacher_not_found_handler,
)
from app.core.logging_config import configure_logging
from app.routers.all import router

# Configure structured logging
configure_logging()

app = FastAPI(
    title="D2F Predictive Analytics API",
    description="Machine Learning microservice for competency gap prediction, "
                "training path recommendation, at-risk teacher detection, and predictive dashboards.",
    version="1.0.0",
    docs_url="/docs" if not settings.is_production else None,
    redoc_url="/redoc" if not settings.is_production else None,
)

# CORS (allow gateway and webapp — externalisé via CORS_ORIGINS)
import os
_cors_raw = os.getenv("CORS_ORIGINS", "http://localhost:3000,http://localhost:8222")
_cors_origins = [o.strip() for o in _cors_raw.split(",") if o.strip()]
app.add_middleware(
    CORSMiddleware,
    allow_origins=_cors_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Exception handlers
app.add_exception_handler(ModelNotTrainedError, model_not_trained_handler)
app.add_exception_handler(InsufficientDataError, insufficient_data_handler)
app.add_exception_handler(TeacherNotFoundError, teacher_not_found_handler)

# Include routers with API prefix
app.include_router(router, prefix="/api")


@app.on_event("startup")
async def startup_event():
    """Load persisted models on startup."""
    from app.ml.gap_predictor import gap_predictor
    if gap_predictor.model is not None:
        print(f"Loaded gap predictor model (feature importances available)")
    else:
        print("No pre-trained model found. Call POST /api/predict/train to train.")


@app.on_event("shutdown")
async def shutdown_event():
    """Cleanup on shutdown."""
    pass
