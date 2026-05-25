"""
tests/test_ratelimit.py — Unit tests for rice.ratelimit (rate limiting).
"""
import sys
import os
import time
import pytest

sys.path.insert(0, os.path.dirname(os.path.dirname(__file__)))

os.environ.setdefault("DB_NAME", "test")
os.environ.setdefault("DB_USER", "test")
os.environ.setdefault("DB_PASS", "test")
os.environ.setdefault("DB_HOST", "localhost")
os.environ.setdefault("DB_PORT", "5432")

from rice.ratelimit import (
    _get_client_ip,
    _check_rate,
    _counters,
    _cleanup_stale,
    RateLimitMiddleware,
    RATE_LIMIT,
    RATE_WINDOW,
    RATE_LIMIT_PATHS,
)


# ── _get_client_ip ──────────────────────────────────────────────────────────

class TestGetClientIp:
    def test_direct_client(self):
        from starlette.requests import Request
        scope = {
            "type": "http",
            "method": "GET",
            "path": "/test",
            "query_string": b"",
            "headers": [],
            "client": ("192.168.1.1", 12345),
        }
        req = Request(scope)
        assert _get_client_ip(req) == "192.168.1.1"

    def test_forwarded_for_header(self):
        from starlette.requests import Request
        scope = {
            "type": "http",
            "method": "GET",
            "path": "/test",
            "query_string": b"",
            "headers": [(b"x-forwarded-for", b"10.0.0.1, 172.16.0.1")],
            "client": ("192.168.1.1", 12345),
        }
        req = Request(scope)
        assert _get_client_ip(req) == "10.0.0.1"

    def test_no_client(self):
        from starlette.requests import Request
        scope = {
            "type": "http",
            "method": "GET",
            "path": "/test",
            "query_string": b"",
            "headers": [],
            "client": None,
        }
        req = Request(scope)
        assert _get_client_ip(req) == "unknown"


# ── _check_rate ─────────────────────────────────────────────────────────────

class TestCheckRate:
    def setup_method(self):
        _counters.clear()

    def test_first_request_allowed(self):
        allowed, remaining, reset = _check_rate("1.2.3.4")
        assert allowed is True
        assert remaining == RATE_LIMIT - 1

    def test_requests_within_limit(self):
        for i in range(RATE_LIMIT - 1):
            _check_rate("1.2.3.4")
        allowed, remaining, reset = _check_rate("1.2.3.4")
        assert allowed is True
        assert remaining == 0

    def test_request_exceeds_limit(self):
        for i in range(RATE_LIMIT):
            _check_rate("1.2.3.4")
        allowed, remaining, reset = _check_rate("1.2.3.4")
        assert allowed is False
        assert remaining == 0

    def test_different_ips_independent(self):
        _check_rate("1.1.1.1")
        allowed, _, _ = _check_rate("2.2.2.2")
        assert allowed is True

    def test_new_window_after_expiry(self):
        # Fill up the limit
        for i in range(RATE_LIMIT):
            _check_rate("1.2.3.4")
        # Backdate the window start so it expires
        count, window_start = _counters["1.2.3.4"]
        _counters["1.2.3.4"] = (count, time.monotonic() - RATE_WINDOW - 1)
        # Should be allowed in new window
        allowed, remaining, reset = _check_rate("1.2.3.4")
        assert allowed is True

    def test_reset_seconds_positive(self):
        _, _, reset = _check_rate("1.2.3.4")
        assert reset > 0


# ── _cleanup_stale ──────────────────────────────────────────────────────────

class TestCleanupStale:
    def setup_method(self):
        _counters.clear()
        import rice.ratelimit as _mod
        _mod._last_cleanup = 0.0  # force cleanup to run

    def test_removes_old_entries(self):
        # Add an entry with an old window start
        _counters["old_ip"] = (1, time.monotonic() - 2 * RATE_WINDOW - 100)
        _counters["new_ip"] = (1, time.monotonic())
        _cleanup_stale()
        assert "old_ip" not in _counters
        assert "new_ip" in _counters

    def test_no_cleanup_if_too_recent(self):
        import rice.ratelimit as _mod
        _mod._last_cleanup = time.monotonic()
        _counters["stale_ip"] = (1, time.monotonic() - 2 * RATE_WINDOW - 100)
        _cleanup_stale()
        # Should NOT be cleaned because cleanup interval not reached
        assert "stale_ip" in _counters


# ── RateLimitMiddleware ─────────────────────────────────────────────────────

class TestRateLimitMiddleware:
    def test_non_protected_path_passes_through(self):
        from fastapi import FastAPI
        from fastapi.testclient import TestClient

        app = FastAPI()
        app.add_middleware(RateLimitMiddleware)

        @app.get("/health")
        def health():
            return {"status": "ok"}

        client = TestClient(app)
        r = client.get("/health")
        assert r.status_code == 200

    def test_rate_limit_headers_on_protected_path(self):
        from fastapi import FastAPI
        from fastapi.testclient import TestClient

        app = FastAPI()
        app.add_middleware(RateLimitMiddleware)

        @app.post("/rice/analyze")
        def analyze():
            return {"ok": True}

        client = TestClient(app)
        r = client.post("/rice/analyze")
        assert r.status_code == 200
        assert "x-ratelimit-limit" in r.headers
        assert "x-ratelimit-remaining" in r.headers
