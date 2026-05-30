"""JWT validation middleware for the recommendation microservice.

Blocker DSI #8 : l'endpoint /api/recommend était totalement ouvert. Cette
middleware valide le JWT HS512 émis par le service d'authentification (le même
jeton que la gateway relaie via l'en-tête Authorization), assurant une défense
en profondeur même si le service est joignable directement (hors gateway).

Désactivable via JWT_AUTH_ENABLED=false pour le dev/local et les tests.
"""

import logging
import os

import jwt
from starlette.middleware.base import BaseHTTPMiddleware
from starlette.requests import Request
from starlette.responses import JSONResponse

logger = logging.getLogger(__name__)

JWT_ALGORITHM = "HS512"

# Drapeau pour désactiver l'enforcement (tests, dev local). Activé par défaut.
JWT_AUTH_ENABLED = os.getenv("JWT_AUTH_ENABLED", "true").lower() not in (
    "false",
    "0",
    "no",
)

JWT_SECRET = os.getenv("JWT_SECRET", "")
if JWT_AUTH_ENABLED and not JWT_SECRET:
    raise RuntimeError(
        "JWT_SECRET est obligatoire quand JWT_AUTH_ENABLED=true. "
        "Fournir la variable via .env / l'environnement du conteneur, ou "
        "définir JWT_AUTH_ENABLED=false pour les exécutions locales/tests."
    )

# Chemins accessibles sans authentification (préfixe).
PUBLIC_PATHS = ("/health", "/docs", "/redoc", "/openapi.json")


def _unauthorized(path: str, message: str) -> JSONResponse:
    return JSONResponse(
        status_code=401,
        content={"status": 401, "error": "Unauthorized", "message": message, "path": path},
    )


class JWTAuthMiddleware(BaseHTTPMiddleware):
    async def dispatch(self, request: Request, call_next):
        path = request.url.path

        if request.method == "OPTIONS" or any(path.startswith(p) for p in PUBLIC_PATHS):
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
