from typing import Any


class AppError(Exception):
    code: str = "INTERNAL_ERROR"
    http_status: int = 500

    def __init__(self, message: str, details: Any = None) -> None:
        super().__init__(message)
        self.message = message
        self.details = details

    def to_dict(self) -> dict[str, Any]:
        error: dict[str, Any] = {"code": self.code, "message": self.message}
        if self.details is not None:
            error["details"] = self.details
        return error


class UnauthorizedError(AppError):
    code = "UNAUTHORIZED"
    http_status = 401


class ForbiddenError(AppError):
    code = "FORBIDDEN"
    http_status = 403


class ForbiddenScopeError(AppError):
    code = "FORBIDDEN_SCOPE"
    http_status = 403


class NotFoundError(AppError):
    code = "NOT_FOUND"
    http_status = 404


class ConflictError(AppError):
    code = "CONFLICT"
    http_status = 409


class ValidationAppError(AppError):
    code = "VALIDATION_ERROR"
    http_status = 422


class ModelUnavailableError(AppError):
    code = "MODEL_NOT_READY"
    http_status = 503


class ServiceUnavailableError(AppError):
    code = "SERVICE_UNAVAILABLE"
    http_status = 503
