from __future__ import annotations

from typing import Any

import pandas as pd


class InMemoryCache:
    """Cache TTL simple en mémoire (clé -> (expiry, valeur))."""

    def __init__(self, default_ttl_seconds: int = 60) -> None:
        self._default_ttl = default_ttl_seconds
        self._store: dict[str, tuple[float, Any]] = {}
        self._clock = __import__("time").time

    def get(self, key: str) -> Any | None:
        entry = self._store.get(key)
        if entry is None:
            return None
        expires_at, value = entry
        if self._clock() > expires_at:
            self._store.pop(key, None)
            return None
        return value

    def set(self, key: str, value: Any, ttl_seconds: int | None = None) -> None:
        ttl = ttl_seconds if ttl_seconds is not None else self._default_ttl
        self._store[key] = (self._clock() + ttl, value)

    def invalidate(self, prefix: str) -> None:
        for key in list(self._store):
            if key.startswith(prefix):
                self._store.pop(key, None)

    def clear(self) -> None:
        self._store.clear()
