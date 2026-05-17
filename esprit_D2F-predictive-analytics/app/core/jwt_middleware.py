"""JWT validation middleware for Python microservices.
Validates HS512 JWT tokens from the Gateway Authorization header."""

import logging
import os

import jwt
from fastapi import Request
from starlette.middleware.base import BaseHTTPMiddleware
from starlette.responses import JSONResponse

from app.config import settings
from app.core.observability import dsi_error_body

logger = logging.getLogger(__name__)

JWT_ALGORITHM = "HS512"

# Feature flag to disable enforcement (tests, local dev). Default: enabled.
JWT_AUTH_ENABLED = os.getenv("JWT_AUTH_ENABLED", "true").lower() not in (
    "false", "0", "no",
)

JWT_SECRET = os.getenv("JWT_SECRET", "")
if JWT_AUTH_ENABLED and not JWT_SECRET:
    raise RuntimeError(
        "JWT_SECRET environment variable is required when JWT_AUTH_ENABLED=true. "
        "Provide it via the .env file or container environment, or set "
        "JWT_AUTH_ENABLED=false for local/test runs."
    )

# Paths that bypass JWT verification. startswith-matched, so "/health" also
# covers "/api/health" via the prefix expansion below.
_BASE_PUBLIC_PATHS = {
    "/health",
    "/metrics",
    "/api/health",
    "/api/v1/analytics/health",
}
if not settings.is_production:
    _BASE_PUBLIC_PATHS.update({"/docs", "/redoc", "/openapi.json"})

PUBLIC_PATHS = _BASE_PUBLIC_PATHS


def _unauthorized(path: str, message: str) -> JSONResponse:
    return JSONResponse(
        status_code=401,
        content=dsi_error_body(
            status=401,
            error_code="AUTH-401",
            message=message,
            path=path,
        ),
    )


class JWTAuthMiddleware(BaseHTTPMiddleware):
    async def dispatch(self, request: Request, call_next):
        path = request.url.path

        # Always allow CORS preflight, public paths, and when auth is disabled.
        if request.method == "OPTIONS":
            return await call_next(request)
        if any(path.startswith(p) for p in PUBLIC_PATHS):
            return await call_next(request)
        if not JWT_AUTH_ENABLED:
            return await call_next(request)

        auth_header = request.headers.get("Authorization", "")
        if not auth_header.startswith("Bearer "):
            return _unauthorized(path, "Missing or invalid authorization token")

        token = auth_header[7:]
        try:
            payload = jwt.decode(token, JWT_SECRET, algorithms=[JWT_ALGORITHM])
            request.state.user_id = payload.get("sub")
            request.state.user_role = payload.get("scope", "")
            request.state.user_email = payload.get("email", "")
        except jwt.ExpiredSignatureError:
            return _unauthorized(path, "Token expired")
        except jwt.InvalidTokenError:
            return _unauthorized(path, "Invalid token")

        return await call_next(request)
