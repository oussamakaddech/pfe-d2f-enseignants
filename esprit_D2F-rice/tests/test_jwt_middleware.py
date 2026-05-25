"""
tests/test_jwt_middleware.py — Unit tests for rice.jwt_middleware.
"""
import sys
import os
import time
import jwt
import pytest

sys.path.insert(0, os.path.dirname(os.path.dirname(__file__)))

# Ensure non-production env so JWT_SECRET checks are relaxed
os.environ.setdefault("APP_ENV", "development")
os.environ.setdefault("DB_NAME", "test")
os.environ.setdefault("DB_USER", "test")
os.environ.setdefault("DB_PASS", "test")
os.environ.setdefault("DB_HOST", "localhost")
os.environ.setdefault("DB_PORT", "5432")
os.environ.setdefault("JWT_SECRET", "a" * 64)
os.environ.setdefault("JWT_AUTH_ENABLED", "true")

from rice.jwt_middleware import (
    JWTAuthMiddleware,
    JWT_SECRET,
    JWT_ALGORITHM,
    JWT_AUTH_ENABLED,
    PUBLIC_PATHS,
)


def _make_token(payload: dict) -> str:
    """Create a valid HS512 JWT for testing."""
    return jwt.encode(payload, JWT_SECRET, algorithm=JWT_ALGORITHM)


# ── JWT Validation ──────────────────────────────────────────────────────────

class TestJWTValidation:
    def _make_app(self, auth_enabled=True):
        from fastapi import FastAPI
        from fastapi.testclient import TestClient

        # Temporarily override JWT_AUTH_ENABLED
        import rice.jwt_middleware as _mod
        original = _mod.JWT_AUTH_ENABLED
        _mod.JWT_AUTH_ENABLED = auth_enabled

        app = FastAPI()
        app.add_middleware(JWTAuthMiddleware)

        @app.get("/protected")
        def protected():
            return {"status": "ok"}

        @app.get("/health")
        def health():
            return {"status": "ok"}

        return app, original, _mod

    def test_valid_token_passes(self):
        from fastapi.testclient import TestClient

        app, original, _mod = self._make_app(auth_enabled=True)
        try:
            token = _make_token({"sub": "user1", "scope": "ADMIN", "email": "u@e.com"})
            client = TestClient(app)
            r = client.get("/protected", headers={"Authorization": f"Bearer {token}"})
            assert r.status_code == 200
        finally:
            _mod.JWT_AUTH_ENABLED = original

    def test_missing_token_returns_401(self):
        from fastapi.testclient import TestClient

        app, original, _mod = self._make_app(auth_enabled=True)
        try:
            client = TestClient(app, raise_server_exceptions=False)
            r = client.get("/protected")
            assert r.status_code == 401
        finally:
            _mod.JWT_AUTH_ENABLED = original

    def test_expired_token_returns_401(self):
        from fastapi.testclient import TestClient

        app, original, _mod = self._make_app(auth_enabled=True)
        try:
            expired_payload = {
                "sub": "user1",
                "scope": "ADMIN",
                "exp": int(time.time()) - 3600,  # expired 1h ago
            }
            token = _make_token(expired_payload)
            client = TestClient(app, raise_server_exceptions=False)
            r = client.get("/protected", headers={"Authorization": f"Bearer {token}"})
            assert r.status_code == 401
            assert "expired" in r.json()["message"].lower()
        finally:
            _mod.JWT_AUTH_ENABLED = original

    def test_invalid_token_returns_401(self):
        from fastapi.testclient import TestClient

        app, original, _mod = self._make_app(auth_enabled=True)
        try:
            client = TestClient(app, raise_server_exceptions=False)
            r = client.get("/protected", headers={"Authorization": "Bearer invalid.token.here"})
            assert r.status_code == 401
        finally:
            _mod.JWT_AUTH_ENABLED = original

    def test_public_path_skips_auth(self):
        from fastapi.testclient import TestClient

        app, original, _mod = self._make_app(auth_enabled=True)
        try:
            client = TestClient(app)
            r = client.get("/health")
            assert r.status_code == 200
        finally:
            _mod.JWT_AUTH_ENABLED = original

    def test_options_skips_auth(self):
        from fastapi.testclient import TestClient

        app, original, _mod = self._make_app(auth_enabled=True)
        try:
            client = TestClient(app)
            r = client.options("/protected")
            # OPTIONS passes through JWT middleware (no 401),
            # but FastAPI may return 405 if route doesn't handle OPTIONS
            assert r.status_code != 401
        finally:
            _mod.JWT_AUTH_ENABLED = original

    def test_auth_disabled_passes(self):
        from fastapi.testclient import TestClient

        app, original, _mod = self._make_app(auth_enabled=False)
        try:
            client = TestClient(app)
            r = client.get("/protected")
            assert r.status_code == 200
        finally:
            _mod.JWT_AUTH_ENABLED = original

    def test_cookie_token_accepted(self):
        from fastapi.testclient import TestClient

        app, original, _mod = self._make_app(auth_enabled=True)
        try:
            token = _make_token({"sub": "user1", "scope": "ENSEIGNANT", "email": "u@e.com"})
            client = TestClient(app)
            r = client.get("/protected", cookies={"d2f_auth_token": token})
            assert r.status_code == 200
        finally:
            _mod.JWT_AUTH_ENABLED = original

    def test_token_injects_user_state(self):
        from fastapi import FastAPI, Request
        from fastapi.testclient import TestClient

        app, original, _mod = self._make_app(auth_enabled=True)
        try:

            @app.get("/check-state")
            def check_state(request: Request):
                return {
                    "user_id": getattr(request.state, "user_id", None),
                    "user_role": getattr(request.state, "user_role", None),
                    "user_email": getattr(request.state, "user_email", None),
                }

            token = _make_token({"sub": "user42", "scope": "CUP", "email": "cup@esprit.tn"})
            client = TestClient(app)
            r = client.get("/check-state", headers={"Authorization": f"Bearer {token}"})
            assert r.status_code == 200
            data = r.json()
            assert data["user_id"] == "user42"
            assert data["user_role"] == "CUP"
            assert data["user_email"] == "cup@esprit.tn"
        finally:
            _mod.JWT_AUTH_ENABLED = original


# ── Public paths ────────────────────────────────────────────────────────────

class TestPublicPaths:
    def test_health_is_public(self):
        assert "/health" in PUBLIC_PATHS

    def test_docs_public_in_dev(self):
        if os.getenv("APP_ENV", "development").lower() not in ("production", "prod"):
            assert "/docs" in PUBLIC_PATHS
            assert "/redoc" in PUBLIC_PATHS
            assert "/openapi.json" in PUBLIC_PATHS
