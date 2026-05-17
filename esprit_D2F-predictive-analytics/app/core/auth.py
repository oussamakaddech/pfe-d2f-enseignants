"""Authentication helpers for protected endpoints.

The /metrics endpoint must only be reachable by an authenticated ADMIN. We
piggy-back on the same JWT issued by the auth service.
"""

import logging

import jwt
from fastapi import HTTPException, Request

from app.config import settings

logger = logging.getLogger(__name__)


def require_metrics_auth(request: Request) -> None:
    """FastAPI dependency: require a valid ADMIN JWT to access /metrics."""
    if not settings.jwt_secret:
        # Mis-configuration is operator error, not a 401.
        raise HTTPException(status_code=503, detail="Metrics endpoint not configured")

    auth_header = request.headers.get("Authorization", "")
    if not auth_header.startswith("Bearer "):
        raise HTTPException(status_code=401, detail="Missing or invalid authorization token")

    token = auth_header[7:]
    try:
        payload = jwt.decode(
            token,
            settings.jwt_secret,
            algorithms=[settings.jwt_algorithm],
        )
    except jwt.ExpiredSignatureError:
        raise HTTPException(status_code=401, detail="Token expired")
    except jwt.InvalidTokenError:
        raise HTTPException(status_code=401, detail="Invalid token")

    role = payload.get("scope", "") or ""
    if "ADMIN" not in role.upper():
        raise HTTPException(status_code=403, detail="Forbidden: ADMIN role required")
