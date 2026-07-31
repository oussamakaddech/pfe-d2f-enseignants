"""API FastAPI."""

from __future__ import annotations

from app.api.routers import (
    dashboard,
    data_quality,
    gaps,
    ml,
    paths,
    recommendations,
    risk,
)
from app.core.config import settings
from app.core.exceptions import AppError
from app.core.logging import RequestContextMiddleware, setup_logging
from fastapi import FastAPI, HTTPException, Request
from fastapi.responses import JSONResponse

setup_logging(debug=settings.debug)

app = FastAPI(
    title=settings.app_name,
    version=settings.api_version,
    openapi_url="/api/v1/openapi.json",
    docs_url="/api/v1/docs",
    redoc_url="/api/v1/redoc",
)


def error_response(request: Request, status_code: int, code: str, message: str, details: list | None = None) -> JSONResponse:
    return JSONResponse(
        status_code=status_code,
        content={
            "data": None,
            "meta": {
                "request_id": request.headers.get("X-Request-Id", ""),
                "code": code,
            },
            "errors": [{"code": code, "message": message, "details": details or []}],
        },
    )


@app.exception_handler(AppError)
async def app_error_handler(request: Request, exc: AppError):
    return error_response(request, exc.status_code, exc.code, exc.message, exc.details)


@app.exception_handler(HTTPException)
async def http_exception_handler(request: Request, exc: HTTPException):
    return error_response(request, exc.status_code, "HTTP_ERROR", str(exc.detail))


@app.exception_handler(Exception)
async def unhandled_error_handler(request: Request, exc: Exception):
    return error_response(request, 500, "INTERNAL_ERROR", str(exc))


app.add_middleware(RequestContextMiddleware)

API_PREFIX = f"/api/{settings.api_version}"

# Alias rétrocompatible : la gateway route /api/analyse/** -> /api/**
# (routes.yml, rewrite "/api/analyse/(?<segment>.*), /api/${segment}") et la
# webapp appelle /api/analyse/v1/analytics/... . On réexpose donc toutes les
# routes sous /api/v1/analytics pour que le nouveau module soit joignable via
# l'API Gateway sans modifier ni gateway ni frontend.
ANALYTICS_ALIAS_PREFIX = f"{API_PREFIX}/analytics"

ROUTERS = (
    gaps.router,
    recommendations.router,
    paths.router,
    risk.router,
    dashboard.router,
    data_quality.router,
    ml.router,
)

for _router in ROUTERS:
    app.include_router(_router, prefix=API_PREFIX)
    app.include_router(_router, prefix=ANALYTICS_ALIAS_PREFIX)


@app.get("/health", tags=["ops"])
def health():
    return {"status": "ok", "service": settings.app_name}
