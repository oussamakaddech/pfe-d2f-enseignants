"""DSI-standard global exception handlers for FastAPI.

Produces a normalized error envelope expected by the frontend :

    {
        "timestamp": "2026-05-15T10:00:00.123Z",
        "status": 500,
        "errorCode": "RECO-500",
        "message": "...",
        "path": "/recommend",
        "traceId": "uuid..."
    }

Never leaks stack traces to the client; stack traces are logged server-side
with the same traceId for correlation.
"""
from __future__ import annotations

import logging
import uuid
from datetime import datetime, timezone

from fastapi import FastAPI, HTTPException, Request
from fastapi.exceptions import RequestValidationError
from fastapi.responses import JSONResponse

logger = logging.getLogger("error_handlers")


def _envelope(status: int, error_code: str, message: str, path: str, trace_id: str) -> dict:
    return {
        "timestamp": datetime.now(timezone.utc).isoformat(),
        "status": status,
        "errorCode": error_code,
        "message": message,
        "path": path,
        "traceId": trace_id,
    }


def _trace_id(request: Request) -> str:
    return (
        request.headers.get("X-Trace-Id")
        or getattr(request.state, "trace_id", None)
        or str(uuid.uuid4())
    )


def register_exception_handlers(app: FastAPI, service_prefix: str = "RECO") -> None:
    """Register DSI-standard error handlers on the given FastAPI app.

    `service_prefix` is used to build errorCode (e.g. RECO-400, RICE-500).
    """

    @app.exception_handler(HTTPException)
    async def http_exception_handler(request: Request, exc: HTTPException):
        trace_id = _trace_id(request)
        logger.warning(
            "HTTPException %s on %s: %s (traceId=%s)",
            exc.status_code, request.url.path, exc.detail, trace_id,
        )
        return JSONResponse(
            status_code=exc.status_code,
            content=_envelope(
                status=exc.status_code,
                error_code=f"{service_prefix}-{exc.status_code}",
                message=str(exc.detail),
                path=request.url.path,
                trace_id=trace_id,
            ),
        )

    @app.exception_handler(RequestValidationError)
    async def validation_exception_handler(request: Request, exc: RequestValidationError):
        trace_id = _trace_id(request)
        # Aggregate Pydantic errors into a single readable string.
        details = "; ".join(
            f"{'.'.join(str(p) for p in err.get('loc', []))}: {err.get('msg', '')}"
            for err in exc.errors()
        )
        logger.warning(
            "Validation error on %s: %s (traceId=%s)",
            request.url.path, details, trace_id,
        )
        return JSONResponse(
            status_code=422,
            content=_envelope(
                status=422,
                error_code=f"{service_prefix}-422",
                message=f"Validation failed: {details}",
                path=request.url.path,
                trace_id=trace_id,
            ),
        )

    @app.exception_handler(Exception)
    async def generic_exception_handler(request: Request, exc: Exception):
        # Catch-all : never leak stack traces, but log them.
        trace_id = _trace_id(request)
        logger.exception(
            "Unhandled exception on %s (traceId=%s)", request.url.path, trace_id,
        )
        return JSONResponse(
            status_code=500,
            content=_envelope(
                status=500,
                error_code=f"{service_prefix}-500",
                message="Internal server error. Reference traceId for support.",
                path=request.url.path,
                trace_id=trace_id,
            ),
        )
