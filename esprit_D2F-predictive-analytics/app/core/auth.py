"""Authentication helpers for protected endpoints.

The /metrics endpoint must only be reachable by an authenticated ADMIN. We
piggy-back on the same JWT issued by the auth service.
"""

import logging
from typing import Callable

import jwt
from fastapi import HTTPException, Request

from app.config import settings

logger = logging.getLogger(__name__)


def require_roles(*allowed_roles: str) -> Callable[[Request], dict]:
    """Fabrique une dépendance FastAPI exigeant l'un des rôles indiqués.

    Le JWTAuthMiddleware a déjà validé le token et renseigné
    `request.state.user_role` (scope). Quand l'auth est désactivée (tests /
    dev local via JWT_AUTH_ENABLED=false), la garde laisse passer pour ne pas
    casser les exécutions sans secret.
    """
    allowed_upper = {r.upper() for r in allowed_roles}

    def _dependency(request: Request) -> dict:
        # Import tardif : évite un cycle d'import au chargement du module.
        from app.core.jwt_middleware import JWT_AUTH_ENABLED

        user_id = getattr(request.state, "user_id", None)
        role = getattr(request.state, "user_role", "") or ""

        if not JWT_AUTH_ENABLED:
            return {"user_id": user_id, "role": role}

        role_upper = role.upper()
        if not any(r in role_upper for r in allowed_upper):
            raise HTTPException(
                status_code=403,
                detail=f"Forbidden: rôle requis parmi {sorted(allowed_upper)}",
            )
        return {"user_id": user_id, "role": role}

    return _dependency


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
