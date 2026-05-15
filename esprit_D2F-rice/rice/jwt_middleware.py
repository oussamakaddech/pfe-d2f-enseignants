"""JWT validation middleware for Python microservices.
Validates HS512 JWT tokens from the Gateway Authorization header.
Provides defense-in-depth authentication for internal Python services."""

import os
import logging
import jwt
from fastapi import Request, HTTPException
from starlette.middleware.base import BaseHTTPMiddleware
from starlette.responses import JSONResponse

logger = logging.getLogger(__name__)

APP_ENV = os.getenv("APP_ENV", "development").lower()
JWT_SECRET = os.getenv("JWT_SECRET", "")
JWT_ALGORITHM = "HS512"
MIN_JWT_SECRET_LENGTH = 64

# JWT_AUTH_ENABLED garde un toggle pour les tests locaux uniquement.
# En environnement de production, l'authentification est forcee meme si le toggle vaut "false".
_AUTH_TOGGLE = os.getenv("JWT_AUTH_ENABLED", "true").lower() == "true"
JWT_AUTH_ENABLED = True if APP_ENV in ("production", "prod") else _AUTH_TOGGLE

if APP_ENV in ("production", "prod"):
    if not JWT_SECRET or not JWT_SECRET.strip():
        raise RuntimeError(
            "JWT_SECRET est obligatoire en production. Configurer via variable d'environnement.")
    if len(JWT_SECRET) < MIN_JWT_SECRET_LENGTH:
        raise RuntimeError(
            f"JWT_SECRET trop court ({len(JWT_SECRET)} chars). "
            f"Minimum requis : {MIN_JWT_SECRET_LENGTH} caracteres pour HS512.")
    if "CHANGE_ME" in JWT_SECRET or "change-me" in JWT_SECRET.lower():
        raise RuntimeError(
            "JWT_SECRET contient un placeholder (CHANGE_ME). Configurer une valeur reelle.")

PUBLIC_PATHS = {"/health"}
# /docs, /redoc et /openapi.json sont publics uniquement en environnement non-production
if APP_ENV not in ("production", "prod"):
    PUBLIC_PATHS |= {"/docs", "/redoc", "/openapi.json"}


class JWTAuthMiddleware(BaseHTTPMiddleware):
    """Middleware that validates JWT tokens on protected routes."""

    async def dispatch(self, request: Request, call_next):
        if not JWT_AUTH_ENABLED:
            return await call_next(request)

        path = request.url.path

        # Skip public endpoints
        if any(path.startswith(p) for p in PUBLIC_PATHS):
            return await call_next(request)

        # Skip OPTIONS (CORS preflight)
        if request.method == "OPTIONS":
            return await call_next(request)

        auth_header = request.headers.get("Authorization", "")
        if not auth_header.startswith("Bearer "):
            logger.warning(f"Missing or invalid Authorization header for {path}")
            return JSONResponse(
                status_code=401,
                content={
                    "timestamp": None,
                    "status": 401,
                    "errorCode": "AUTH-401",
                    "message": "Missing or invalid authorization token",
                    "path": path,
                    "traceId": None,
                },
            )

        token = auth_header[7:]
        try:
            payload = jwt.decode(token, JWT_SECRET, algorithms=[JWT_ALGORITHM])
            request.state.user_id = payload.get("sub")
            request.state.user_role = payload.get("scope", "")
            request.state.user_email = payload.get("email", "")
        except jwt.ExpiredSignatureError:
            logger.warning(f"Expired JWT token for {path}")
            return JSONResponse(status_code=401, content={
                "timestamp": None, "status": 401, "errorCode": "AUTH-401",
                "message": "Token expired", "path": path, "traceId": None,
            })
        except jwt.InvalidTokenError as e:
            logger.warning(f"Invalid JWT token for {path}: {e}")
            return JSONResponse(status_code=401, content={
                "timestamp": None, "status": 401, "errorCode": "AUTH-401",
                "message": "Invalid token", "path": path, "traceId": None,
            })

        return await call_next(request)
