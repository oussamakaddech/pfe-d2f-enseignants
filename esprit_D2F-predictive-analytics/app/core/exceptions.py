"""Custom exceptions and FastAPI exception handlers."""

from fastapi import HTTPException, Request, status
from fastapi.responses import JSONResponse


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
