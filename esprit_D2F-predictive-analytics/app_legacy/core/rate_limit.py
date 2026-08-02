"""In-memory token-bucket rate limiter middleware.

Active only when ``settings.is_production`` is True. In dev/test the middleware
is a no-op so tests and local development are never throttled.

Endpoint-specific limits are defined in ``ENDPOINT_LIMITS``. Each entry maps
a path prefix to ``(max_tokens, refill_per_second)``. The bucket refills
continuously; requests consume one token. When the bucket is empty the
middleware returns 429 Too Many Requests.
"""

from __future__ import annotations

import logging
import time
from collections import defaultdict
from typing import Callable

from fastapi import Request
from starlette.middleware.base import BaseHTTPMiddleware
from starlette.responses import JSONResponse

logger = logging.getLogger(__name__)

# path_prefix → (max_tokens, refill_per_second)
ENDPOINT_LIMITS: dict[str, tuple[int, float]] = {
    "/api/v1/analytics/analyze/":             (10, 0.2),   # 10 req / min
    "/api/v1/analytics/trigger-batch":        (2,  0.033), # 2 req / min
    "/api/v1/analytics/recommendations/batch":(10, 0.167), # 10 req / min
}


class _TokenBucket:
    __slots__ = ("capacity", "refill_rate", "tokens", "last_refill")

    def __init__(self, capacity: int, refill_rate: float) -> None:
        self.capacity = capacity
        self.refill_rate = refill_rate
        self.tokens = float(capacity)
        self.last_refill = time.monotonic()

    def consume(self) -> bool:
        now = time.monotonic()
        elapsed = now - self.last_refill
        self.tokens = min(self.capacity, self.tokens + elapsed * self.refill_rate)
        self.last_refill = now
        if self.tokens >= 1.0:
            self.tokens -= 1.0
            return True
        return False


class RateLimitMiddleware(BaseHTTPMiddleware):
    """Simple per-path-prefix token-bucket rate limiter."""

    def __init__(self, app, limits: dict[str, tuple[int, float]] | None = None) -> None:
        super().__init__(app)
        self._limits = limits or ENDPOINT_LIMITS
        self._buckets: dict[str, _TokenBucket] = defaultdict(
            lambda: _TokenBucket(1, 1)  # placeholder, overwritten on match
        )

    async def dispatch(self, request: Request, call_next):
        path = request.url.path
        for prefix, (capacity, refill_rate) in self._limits.items():
            if path.startswith(prefix):
                bucket = self._buckets[prefix]
                # Re-initialise if capacity changed (e.g. config reload).
                if bucket.capacity != capacity:
                    bucket.__init__(capacity, refill_rate)
                if not bucket.consume():
                    return JSONResponse(
                        status_code=429,
                        content={
                            "error": "rate_limit_exceeded",
                            "message": f"Trop de requêtes sur {prefix}. Réessayez plus tard.",
                            "retry_after_seconds": int(1 / max(refill_rate, 0.001)),
                        },
                    )
                break  # first matching prefix wins
        return await call_next(request)
