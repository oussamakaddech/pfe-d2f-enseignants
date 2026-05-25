"""Thread-safe cache wrapper and startup environment-variable validation."""

from __future__ import annotations

import os
import logging
import time as _time
import threading as _threading
from typing import Any, Dict

logger = logging.getLogger("rice_analyzer")

# Sentinel for detecting missing keys
_MISSING = object()

# ── Startup env-var validation ──────────────────────────────────────────────
_REQUIRED_ENV_VARS: Dict[str, str] = {
    "DB_NAME": "PostgreSQL database name",
    "DB_USER": "PostgreSQL user",
    "DB_PASS": "PostgreSQL password",
}


def _validate_env() -> None:
    """Warn at import-time when required environment variables are unset."""
    for var, desc in _REQUIRED_ENV_VARS.items():
        val = os.getenv(var)
        if not val:
            logger.warning("Environment variable %s (%s) is not set – using default", var, desc)


_validate_env()


# ── Thread-safe cache wrapper ───────────────────────────────────────────────
class _ThreadSafeCache:
    """A generic dict-like cache protected by a threading.Lock.

    All reads and writes go through the lock so concurrent FastAPI
    thread-pool workers never see a partially-updated dict.
    """

    def __init__(self) -> None:
        self._lock = _threading.Lock()
        self._data: Dict[str, Any] = {}
        self._ts: Dict[str, float] = {}  # per-key timestamps

    # --- read -----------------------------------------------------------------
    def get(self, key: str, *, ttl: float = 0) -> Any:
        """Return cached value if it exists and is fresher than *ttl* seconds."""
        with self._lock:
            if key not in self._data:
                return None
            if ttl > 0 and (_time.time() - self._ts.get(key, 0)) >= ttl:
                return None
            return self._data[key]

    # --- write ----------------------------------------------------------------
    def set(self, key: str, value: Any) -> None:
        with self._lock:
            self._data[key] = value
            self._ts[key] = _time.time()

    # --- invalidate -----------------------------------------------------------
    def pop(self, key: str, default: Any = None) -> Any:
        with self._lock:
            val = self._data.pop(key, _MISSING)
            self._ts.pop(key, None)
            if val is _MISSING:
                return default
            return val

    def clear(self) -> None:
        with self._lock:
            self._data.clear()
            self._ts.clear()

    # --- helpers --------------------------------------------------------------
    def keys(self) -> list:
        with self._lock:
            return list(self._data.keys())

    def __bool__(self) -> bool:
        with self._lock:
            return bool(self._data)

    # --- dictionary compatibility magic methods ------------------------------
    def __getitem__(self, key: str) -> Any:
        with self._lock:
            return self._data[key]

    def __setitem__(self, key: str, value: Any) -> None:
        self.set(key, value)

    def __delitem__(self, key: str) -> None:
        with self._lock:
            self._data.pop(key, None)
            self._ts.pop(key, None)

    def __contains__(self, key: str) -> bool:
        with self._lock:
            return key in self._data

    def __len__(self) -> int:
        with self._lock:
            return len(self._data)
