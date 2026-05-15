"""Tests for app.core.jwt_middleware — global JWT validation."""
from __future__ import annotations

import time

import jwt
import pytest
from fastapi import FastAPI
from fastapi.testclient import TestClient

from app.core.jwt_middleware import JWT_ALGORITHM, JWTAuthMiddleware, PUBLIC_PATHS
from app.config import settings


def _build_app() -> FastAPI:
    app = FastAPI()
    app.add_middleware(JWTAuthMiddleware)

    @app.get("/health")
    def health():
        return {"status": "ok"}

    @app.get("/api/v1/protected")
    def protected():
        return {"protected": True}

    return app


def _token(role: str = "ROLE_ADMIN", exp_offset: int = 3600) -> str:
    return jwt.encode(
        {"sub": "u1", "scope": role, "exp": int(time.time()) + exp_offset},
        settings.jwt_secret,
        algorithm=JWT_ALGORITHM,
    )


def test_public_paths_set_contains_health_and_metrics():
    assert "/health" in PUBLIC_PATHS
    assert "/metrics" in PUBLIC_PATHS


def test_health_endpoint_does_not_require_auth():
    client = TestClient(_build_app(), raise_server_exceptions=False)
    r = client.get("/health")
    assert r.status_code == 200


def test_protected_endpoint_rejects_missing_token():
    client = TestClient(_build_app(), raise_server_exceptions=False)
    r = client.get("/api/v1/protected")
    assert r.status_code == 401
    body = r.json()
    assert body["errorCode"] == "AUTH-401"


def test_protected_endpoint_rejects_non_bearer():
    client = TestClient(_build_app(), raise_server_exceptions=False)
    r = client.get("/api/v1/protected", headers={"Authorization": "Token foo"})
    assert r.status_code == 401


def test_protected_endpoint_rejects_invalid_token():
    client = TestClient(_build_app(), raise_server_exceptions=False)
    r = client.get("/api/v1/protected", headers={"Authorization": "Bearer not.a.jwt"})
    assert r.status_code == 401
    assert "Invalid token" in r.json()["message"]


def test_protected_endpoint_rejects_expired_token():
    client = TestClient(_build_app(), raise_server_exceptions=False)
    token = _token(exp_offset=-60)
    r = client.get("/api/v1/protected", headers={"Authorization": f"Bearer {token}"})
    assert r.status_code == 401
    assert "expired" in r.json()["message"].lower()


def test_protected_endpoint_accepts_valid_token():
    client = TestClient(_build_app(), raise_server_exceptions=False)
    token = _token()
    r = client.get("/api/v1/protected", headers={"Authorization": f"Bearer {token}"})
    assert r.status_code == 200


def test_options_request_bypasses_auth():
    client = TestClient(_build_app(), raise_server_exceptions=False)
    r = client.options("/api/v1/protected")
    # CORS preflight ne doit pas etre bloque par 401
    assert r.status_code != 401
