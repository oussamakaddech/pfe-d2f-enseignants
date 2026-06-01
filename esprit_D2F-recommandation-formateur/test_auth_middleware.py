"""Tests pour JWTAuthMiddleware (blocker DSI #8)."""

import os

os.environ.setdefault("JWT_SECRET", "test-secret-key-for-unit-tests-only-do-not-use-in-prod")
os.environ.setdefault("JWT_AUTH_ENABLED", "true")

import jwt
from fastapi import FastAPI
from fastapi.testclient import TestClient

from auth_middleware import JWT_ALGORITHM, JWT_SECRET, JWTAuthMiddleware


def _build_client() -> TestClient:
    app = FastAPI()
    app.add_middleware(JWTAuthMiddleware)

    @app.get("/health")
    def health():
        return {"status": "ok"}

    @app.post("/api/recommend")
    def recommend():
        return {"ok": True}

    return TestClient(app)


def _valid_token() -> str:
    return jwt.encode({"sub": "42", "scope": "ROLE_ADMIN", "email": "a@b.tn"},
                      JWT_SECRET, algorithm=JWT_ALGORITHM)


def test_health_is_public():
    assert _build_client().get("/health").status_code == 200


def test_recommend_without_token_is_unauthorized():
    assert _build_client().post("/api/recommend").status_code == 401


def test_recommend_with_invalid_token_is_unauthorized():
    client = _build_client()
    resp = client.post("/api/recommend", headers={"Authorization": "Bearer not-a-jwt"})
    assert resp.status_code == 401


def test_recommend_with_valid_token_is_allowed():
    client = _build_client()
    resp = client.post("/api/recommend", headers={"Authorization": f"Bearer {_valid_token()}"})
    assert resp.status_code == 200
