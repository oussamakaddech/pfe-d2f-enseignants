"""Simple in-memory rate-limiting middleware (no external dependencies).

Uses a fixed-window counter per client IP.  Configurable via env vars:

* ``RICE_RATE_LIMIT``        – max requests per window (default **20**)
* ``RICE_RATE_LIMIT_WINDOW`` – window size in seconds  (default **60**)
* ``RICE_RATE_LIMIT_PATHS``  – comma-separated path prefixes to protect
                               (default ``/rice/analyze,/rice/validate``)

Requests that exceed the limit receive **HTTP 429 Too Many Requests**.
"""

from __future__ import annotations

import logging
import os
import threading
import time
from typing import Dict, Tuple

from starlette.middleware.base import BaseHTTPMiddleware
from starlette.requests import Request
from starlette.responses import JSONResponse

logger = logging.getLogger("rice_analyzer")

# ── Configuration ────────────────────────────────────────────────────────────

RATE_LIMIT: int        = int(os.getenv("RICE_RATE_LIMIT", "20"))
RATE_WINDOW: int       = int(os.getenv("RICE_RATE_LIMIT_WINDOW", "60"))
RATE_LIMIT_PATHS: list = [
    p.strip()
    for p in os.getenv("RICE_RATE_LIMIT_PATHS", "/rice/analyze,/rice/validate").split(",")
    if p.strip()
]

# ── Sliding-window store ─────────────────────────────────────────────────────

_lock = threading.Lock()
# key = client_ip → (count, window_start_timestamp)
_counters: Dict[str, Tuple[int, float]] = {}


def _get_client_ip(request: Request) -> str:
    """Return the real client IP, respecting ``X-Forwarded-For`` behind a proxy."""
    forwarded = request.headers.get("x-forwarded-for")
    if forwarded:
        return forwarded.split(",")[0].strip()
    return request.client.host if request.client else "unknown"


def _check_rate(ip: str) -> Tuple[bool, int, int]:
    """Return ``(allowed, remaining, reset_seconds)``."""
    now = time.monotonic()
    with _lock:
        count, window_start = _counters.get(ip, (0, now))
        elapsed = now - window_start
        if elapsed >= RATE_WINDOW:
            # new window
            _counters[ip] = (1, now)
            return True, RATE_LIMIT - 1, RATE_WINDOW
        if count < RATE_LIMIT:
            _counters[ip] = (count + 1, window_start)
            remaining = RATE_LIMIT - count - 1
            reset = int(RATE_WINDOW - elapsed)
            return True, remaining, reset
        # exceeded
        reset = int(RATE_WINDOW - elapsed)
        return False, 0, reset


# ── Periodic cleanup of stale entries ────────────────────────────────────────

_CLEANUP_INTERVAL = 300  # every 5 min
_last_cleanup: float = 0.0


def _cleanup_stale() -> None:
    """Remove counters whose window has long passed (> 2× RATE_WINDOW)."""
    global _last_cleanup
    now = time.monotonic()
    if now - _last_cleanup < _CLEANUP_INTERVAL:
        return
    _last_cleanup = now
    cutoff = now - 2 * RATE_WINDOW
    stale = [ip for ip, (_, ws) in _counters.items() if ws < cutoff]
    for ip in stale:
        _counters.pop(ip, None)


# ── Starlette middleware ─────────────────────────────────────────────────────

class RateLimitMiddleware(BaseHTTPMiddleware):
    """Fixed-window rate limiter applied to configured path prefixes."""

    async def dispatch(self, request: Request, call_next):  # type: ignore[override]
        path = request.url.path

        # Only rate-limit configured paths
        if not any(path.startswith(p) for p in RATE_LIMIT_PATHS):
            return await call_next(request)

        ip = _get_client_ip(request)
        allowed, remaining, reset = _check_rate(ip)

        # Housekeeping
        _cleanup_stale()

        if not allowed:
            logger.warning(f"Rate limit exceeded for {ip} on {path}")
            return JSONResponse(
                status_code=429,
                content={"detail": "Too many requests – please try again later."},
                headers={
                    "Retry-After": str(reset),
                    "X-RateLimit-Limit": str(RATE_LIMIT),
                    "X-RateLimit-Remaining": "0",
                    "X-RateLimit-Reset": str(reset),
                },
            )

        response = await call_next(request)
        response.headers["X-RateLimit-Limit"] = str(RATE_LIMIT)
        response.headers["X-RateLimit-Remaining"] = str(remaining)
        response.headers["X-RateLimit-Reset"] = str(reset)
        return response
