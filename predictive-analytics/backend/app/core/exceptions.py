"""Exceptions applicatives unifiées."""

from __future__ import annotations

from typing import Any


class AppError(Exception):
    status_code = 500
    code = "INTERNAL_ERROR"

    def __init__(self, message: str = "", details: list[Any] | None = None) -> None:
        self.message = message or self.code
        self.details = details or []
        super().__init__(self.message)


class NotFoundError(AppError):
    status_code = 404
    code = "NOT_FOUND"


class TeacherNotFoundError(NotFoundError):
    code = "TEACHER_NOT_FOUND"

    def __init__(self, teacher_id: str) -> None:
        super().__init__(f"Enseignant inconnu: {teacher_id}")


class ValidationError(AppError):
    status_code = 422
    code = "VALIDATION_ERROR"


class InvalidTeacherIdError(ValidationError):
    code = "INVALID_TEACHER_ID"


class LegacyIdNotAllowedError(ValidationError):
    code = "LEGACY_ID_NOT_ALLOWED"

    def __init__(self, teacher_id: str) -> None:
        super().__init__(
            f"ID legacy {teacher_id} non accepté: utiliser le format canonique ENSxxx"
        )


class InsufficientDataError(AppError):
    status_code = 409
    code = "INSUFFICIENT_HISTORICAL_DATA"


class ModelUnavailableError(AppError):
    status_code = 503
    code = "MODEL_UNAVAILABLE"


class PermissionDeniedError(AppError):
    status_code = 403
    code = "FORBIDDEN"


class UnauthorizedError(AppError):
    status_code = 401
    code = "UNAUTHORIZED"
