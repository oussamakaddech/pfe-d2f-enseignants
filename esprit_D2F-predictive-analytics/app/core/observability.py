"""
Observabilité DSI — traçage par requête, métriques techniques, corrélation logs.

Conformité DSI §4 :
  - X-Trace-ID propagé sur chaque requête/réponse
  - Durée de traitement loggée (ms) sur chaque requête
  - Métriques en mémoire : nb requêtes, nb erreurs, durée p95
  - Format d'erreur normalisé : {timestamp, status, errorCode, message, path, traceId}
"""

import logging
import time
import uuid
from collections import deque
from contextvars import ContextVar
from datetime import datetime, timezone
from statistics import quantiles
from typing import Optional

from starlette.middleware.base import BaseHTTPMiddleware
from starlette.requests import Request
from starlette.responses import Response

logger = logging.getLogger(__name__)

# ── Contexte de traçage ───────────────────────────────────────────────────────
# Permet d'accéder au trace_id depuis n'importe quel log dans la même requête.
_trace_id_var: ContextVar[str] = ContextVar("trace_id", default="-")


def get_trace_id() -> str:
    """Retourne le trace ID de la requête courante (ou '-' hors requête)."""
    return _trace_id_var.get()


def set_trace_id(trace_id: str) -> None:
    _trace_id_var.set(trace_id)


# ── Compteurs en mémoire ──────────────────────────────────────────────────────
_counters: dict[str, int] = {
    "requests_total": 0,
    "requests_2xx":   0,
    "requests_4xx":   0,
    "requests_5xx":   0,
    "db_errors":      0,
}
_latencies: deque[float] = deque(maxlen=1000)   # dernières 1000 durées (ms)


def get_metrics_snapshot() -> dict:
    """Snapshot des métriques pour l'endpoint /metrics."""
    p95 = None
    if len(_latencies) >= 2:
        sorted_lat = sorted(_latencies)
        idx = int(len(sorted_lat) * 0.95)
        p95 = round(sorted_lat[min(idx, len(sorted_lat) - 1)], 1)

    return {
        **_counters,
        "latency_p95_ms":     p95,
        "latency_samples":    len(_latencies),
        "snapshot_at":        datetime.now(timezone.utc).isoformat(),
    }


def increment(key: str, n: int = 1) -> None:
    """Incrémenter un compteur de manière thread-safe (GIL suffit ici)."""
    if key in _counters:
        _counters[key] += n


# ── Middleware de traçage ─────────────────────────────────────────────────────
class TraceIDMiddleware(BaseHTTPMiddleware):
    """
    Pour chaque requête :
      1. Lit X-Request-ID (depuis la gateway) ou génère un UUID court
      2. Injecte le trace_id dans le contexte (contextvars) pour corrélation logs
      3. Ajoute X-Trace-ID dans la réponse
      4. Logue method, path, status, durée (ms)
      5. Met à jour les compteurs de métriques
    """

    SKIP_PATHS = {"/docs", "/redoc", "/openapi.json"}

    async def dispatch(self, request: Request, call_next) -> Response:
        # Récupérer ou générer un trace ID
        trace_id = (
            request.headers.get("X-Request-ID")
            or request.headers.get("X-Trace-ID")
            or uuid.uuid4().hex[:12]
        )
        set_trace_id(trace_id)

        path = request.url.path
        skip_log = path in self.SKIP_PATHS

        t_start = time.monotonic()
        try:
            response = await call_next(request)
            status_code = response.status_code
        except Exception as exc:
            elapsed = round((time.monotonic() - t_start) * 1000, 1)
            logger.error(
                "Unhandled exception | trace=%s method=%s path=%s duration_ms=%s error=%s",
                trace_id, request.method, path, elapsed, exc,
            )
            increment("requests_total")
            increment("requests_5xx")
            raise

        elapsed = round((time.monotonic() - t_start) * 1000, 1)
        _latencies.append(elapsed)
        increment("requests_total")

        if 200 <= status_code < 300:
            increment("requests_2xx")
        elif 400 <= status_code < 500:
            increment("requests_4xx")
        elif status_code >= 500:
            increment("requests_5xx")

        if not skip_log:
            logger.info(
                "HTTP %s %s → %s | %sms | trace=%s",
                request.method, path, status_code, elapsed, trace_id,
            )

        response.headers["X-Trace-ID"] = trace_id
        response.headers["X-Service"]  = "d2f-predictive-analytics"
        return response


# ── Helper format d'erreur DSI ────────────────────────────────────────────────
def dsi_error_body(
    status: int,
    error_code: str,
    message: str,
    path: str,
    trace_id: Optional[str] = None,
) -> dict:
    """
    Construit un corps d'erreur conforme au format DSI standard.

    {
      "timestamp": "2024-01-01T10:00:00Z",
      "status":    503,
      "errorCode": "ANA-503",
      "message":   "...",
      "path":      "/api/v1/analytics/...",
      "traceId":   "abc123def456"
    }
    """
    return {
        "timestamp": datetime.now(timezone.utc).isoformat(),
        "status":    status,
        "errorCode": error_code,
        "message":   message,
        "path":      path,
        "traceId":   trace_id or get_trace_id(),
    }
