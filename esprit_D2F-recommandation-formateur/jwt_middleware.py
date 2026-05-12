"""JWT validation middleware for Python microservices.
Validates HS512 JWT tokens from the Gateway Authorization header."""

import os
import logging
import jwt
from fastapi import Request
from starlette.middleware.base import BaseHTTPMiddleware
from starlette.responses import JSONResponse

logger = logging.getLogger(__name__)

JWT_SECRET = os.getenv("JWT_SECRET", "")
JWT_ALGORITHM = "HS512"
JWT_AUTH_ENABLED = os.getenv("JWT_AUTH_ENABLED", "true").lower() == "true"

PUBLIC_PATHS = {"/health", "/docs", "/redoc", "/openapi.json"}


class JWTAuthMiddleware(BaseHTTPMiddleware):
    async def dispatch(self, request: Request, call_next):
        if not JWT_AUTH_ENABLED:
            return await call_next(request)

        path = request.url.path
        if any(path.startswith(p) for p in PUBLIC_PATHS):
            return await call_next(request)
        if request.method == "OPTIONS":
            return await call_next(request)

        auth_header = request.headers.get("Authorization", "")
        if not auth_header.startswith("Bearer "):
            return JSONResponse(status_code=401, content={
                "timestamp": None, "status": 401, "errorCode": "AUTH-401",
                "message": "Missing or invalid authorization token",
                "path": path, "traceId": None,
            })

        token = auth_header[7:]
        try:
            payload = jwt.decode(token, JWT_SECRET, algorithms=[JWT_ALGORITHM])
            request.state.user_id = payload.get("sub")
            request.state.user_role = payload.get("scope", "")
            request.state.user_email = payload.get("email", "")
        except jwt.ExpiredSignatureError:
            return JSONResponse(status_code=401, content={
                "timestamp": None, "status": 401, "errorCode": "AUTH-401",
                "message": "Token expired", "path": path, "traceId": None,
            })
        except jwt.InvalidTokenError:
            return JSONResponse(status_code=401, content={
                "timestamp": None, "status": 401, "errorCode": "AUTH-401",
                "message": "Invalid token", "path": path, "traceId": None,
            })

        return await call_next(request)
