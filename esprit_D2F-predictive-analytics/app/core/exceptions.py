"""
Exceptions personnalisées et handlers FastAPI.
Tous les handlers respectent le format d'erreur DSI standard :
  {timestamp, status, errorCode, message, path, traceId}
"""

import logging
import traceback

from fastapi import HTTPException, Request, status
from fastapi.responses import JSONResponse
from pydantic import ValidationError

from app.core.observability import dsi_error_body, increment

logger = logging.getLogger(__name__)


# ── Exceptions métier ─────────────────────────────────────────────────────────

class ModelNotTrainedError(HTTPException):
    def __init__(self, model_name: str):
        super().__init__(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail=f"Model '{model_name}' is not trained yet. Run training first.",
        )


class InsufficientDataError(HTTPException):
    def __init__(self, message: str):
        super().__init__(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail=message,
        )


class TeacherNotFoundError(HTTPException):
    def __init__(self, teacher_id: str):
        super().__init__(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Teacher with ID '{teacher_id}' not found.",
        )


class DatabaseError(HTTPException):
    def __init__(self, detail: str = "Database query failed"):
        super().__init__(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail=detail,
        )


# ── Handlers — format DSI sur tous les cas ────────────────────────────────────

def model_not_trained_handler(request: Request, exc: ModelNotTrainedError):
    return JSONResponse(
        status_code=exc.status_code,
        content=dsi_error_body(
            status=exc.status_code,
            error_code="ANA-503-MODEL",
            message=str(exc.detail),
            path=str(request.url.path),
        ),
    )


def insufficient_data_handler(request: Request, exc: InsufficientDataError):
    return JSONResponse(
        status_code=exc.status_code,
        content=dsi_error_body(
            status=exc.status_code,
            error_code="ANA-422-DATA",
            message=str(exc.detail),
            path=str(request.url.path),
        ),
    )


def teacher_not_found_handler(request: Request, exc: TeacherNotFoundError):
    return JSONResponse(
        status_code=exc.status_code,
        content=dsi_error_body(
            status=exc.status_code,
            error_code="ANA-404-ENS",
            message=str(exc.detail),
            path=str(request.url.path),
        ),
    )


def database_error_handler(request: Request, exc: DatabaseError):
    increment("db_errors")
    return JSONResponse(
        status_code=exc.status_code,
        content=dsi_error_body(
            status=exc.status_code,
            error_code="ANA-503-DB",
            message="Service de base de données temporairement indisponible",
            path=str(request.url.path),
        ),
    )


def http_exception_handler(request: Request, exc: HTTPException):
    """Handler pour toutes les HTTPException non capturées plus haut."""
    return JSONResponse(
        status_code=exc.status_code,
        content=dsi_error_body(
            status=exc.status_code,
            error_code=f"ANA-{exc.status_code}",
            message=str(exc.detail) if isinstance(exc.detail, str) else "Erreur de requête",
            path=str(request.url.path),
        ),
    )


def generic_exception_handler(request: Request, exc: Exception):
    """Catch-all — 500 avec format DSI, sans exposer la stacktrace."""
    logger.error(
        "Exception non gérée | path=%s error=%s\n%s",
        request.url.path, type(exc).__name__, traceback.format_exc(),
    )
    increment("requests_5xx")
    return JSONResponse(
        status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
        content=dsi_error_body(
            status=500,
            error_code="ANA-500",
            message="Une erreur interne est survenue. Réessayez ultérieurement.",
            path=str(request.url.path),
        ),
    )


def validation_exception_handler(request: Request, exc: ValidationError):
    logger.warning(
        "Validation error | path=%s error=%s",
        request.url.path, str(exc),
    )
    return JSONResponse(
        status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
        content=dsi_error_body(
            status=422,
            error_code="ANA-422-VALIDATION",
            message="Données de requête invalides",
            path=str(request.url.path),
        ),
    )
