"""Tests for app.core.auth.require_metrics_auth dependency."""
from __future__ import annotations

import time
from unittest.mock import MagicMock

import jwt
import pytest
from fastapi import HTTPException

from app.core.auth import require_metrics_auth
from app.config import settings


def _make_request(headers: dict) -> MagicMock:
    req = MagicMock()
    req.headers = headers
    return req


def _make_token(role: str = "ROLE_ADMIN", exp_offset: int = 3600) -> str:
    payload = {
        "sub": "test-user",
        "scope": role,
        "exp": int(time.time()) + exp_offset,
    }
    return jwt.encode(payload, settings.jwt_secret, algorithm=settings.jwt_algorithm)


def test_missing_auth_header_returns_401():
    with pytest.raises(HTTPException) as ctx:
        require_metrics_auth(_make_request({}))
    assert ctx.value.status_code == 401


def test_non_bearer_auth_returns_401():
    with pytest.raises(HTTPException) as ctx:
        require_metrics_auth(_make_request({"Authorization": "Basic foo"}))
    assert ctx.value.status_code == 401


def test_invalid_token_returns_401():
    with pytest.raises(HTTPException) as ctx:
        require_metrics_auth(_make_request({"Authorization": "Bearer garbage.token.here"}))
    assert ctx.value.status_code == 401


def test_expired_token_returns_401():
    token = _make_token(exp_offset=-60)
    with pytest.raises(HTTPException) as ctx:
        require_metrics_auth(_make_request({"Authorization": f"Bearer {token}"}))
    assert ctx.value.status_code == 401


def test_non_admin_role_returns_403():
    token = _make_token(role="ROLE_ENSEIGNANT")
    with pytest.raises(HTTPException) as ctx:
        require_metrics_auth(_make_request({"Authorization": f"Bearer {token}"}))
    assert ctx.value.status_code == 403


def test_admin_role_passes():
    token = _make_token(role="ROLE_ADMIN")
    # Should not raise
    assert require_metrics_auth(_make_request({"Authorization": f"Bearer {token}"})) is None


def test_admin_in_compound_role_passes():
    token = _make_token(role="ROLE_ADMIN ROLE_USER")
    # Should not raise (substring check "ADMIN in role" suffit)
    assert require_metrics_auth(_make_request({"Authorization": f"Bearer {token}"})) is None
