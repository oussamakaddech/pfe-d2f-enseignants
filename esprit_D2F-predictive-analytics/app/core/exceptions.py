"""Custom exceptions and FastAPI exception handlers."""

import logging
import traceback

from fastapi import HTTPException, Request, status
from fastapi.responses import JSONResponse
from pydantic import ValidationError

logger = logging.getLogger(__name__)


class ModelNotTrainedError(HTTPException):
    """Raised when a prediction is requested but the model is not trained."""

    def __init__(self, model_name: str):
        super().__init__(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail=f"Model '{model_name}' is not trained yet. Run training first.",
        )


class InsufficientDataError(HTTPException):
    """Raised when insufficient data is available for training or prediction."""

    def __init__(self, message: str):
        super().__init__(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail=message,
        )


class TeacherNotFoundError(HTTPException):
    """Raised when a teacher ID is not found in the database."""

    def __init__(self, teacher_id: str):
        super().__init__(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Teacher with ID '{teacher_id}' not found.",
        )


class DatabaseError(HTTPException):
    """Raised when a database query fails."""

    def __init__(self, detail: str = "Database query failed"):
        super().__init__(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail=detail,
        )


# ── Exception Handlers ─────────────────────────
async def model_not_trained_handler(request: Request, exc: ModelNotTrainedError):
    return JSONResponse(
        status_code=exc.status_code,
        content={"error": "MODEL_NOT_TRAINED", "detail": exc.detail},
    )


async def insufficient_data_handler(request: Request, exc: InsufficientDataError):
    return JSONResponse(
        status_code=exc.status_code,
        content={"error": "INSUFFICIENT_DATA", "detail": exc.detail},
    )


async def teacher_not_found_handler(request: Request, exc: TeacherNotFoundError):
    return JSONResponse(
        status_code=exc.status_code,
        content={"error": "TEACHER_NOT_FOUND", "detail": exc.detail},
    )


async def database_error_handler(request: Request, exc: DatabaseError):
    return JSONResponse(
        status_code=exc.status_code,
        content={"error": "DATABASE_ERROR", "detail": exc.detail},
    )


async def generic_exception_handler(request: Request, exc: Exception):
    """Catch-all handler for unhandled exceptions — returns 500 with useful info."""
    logger.error(
        "Unhandled exception on %s %s: %s\n%s",
        request.method, request.url, str(exc), traceback.format_exc(),
    )
    return JSONResponse(
        status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
        content={
            "error": "INTERNAL_SERVER_ERROR",
            "detail": "An unexpected error occurred. Please try again later.",
            "path": str(request.url),
        },
    )


async def validation_exception_handler(request: Request, exc: ValidationError):
    """Handle Pydantic validation errors with a clean 422 response."""
    logger.warning("Validation error on %s %s: %s", request.method, request.url, str(exc))
    return JSONResponse(
        status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
        content={
            "error": "VALIDATION_ERROR",
            "detail": str(exc),
            "path": str(request.url),
        },
    )
