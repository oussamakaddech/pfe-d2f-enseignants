"""Tests for app.core.auth.require_metrics_auth dependency."""
from __future__ import annotations

import time
from unittest.mock import MagicMock, patch

import jwt
import pytest
from fastapi import HTTPException

from app.core.auth import require_metrics_auth, require_roles
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


# ── Tests for require_roles dependency ────────────────────────────────────


def test_require_roles_missing_jwt_auth_enabled_environment():
    """When JWT_AUTH_ENABLED=false, require_roles should pass through."""
    dep = require_roles("ROLE_ADMIN")
    req = MagicMock()
    req.state = MagicMock()
    req.state.user_id = "test-123"
    req.state.user_role = "ROLE_ADMIN"

    with patch("app.core.jwt_middleware.JWT_AUTH_ENABLED", False):
        result = dep(req)
        assert result["user_id"] == "test-123"
        assert result["role"] == "ROLE_ADMIN"


def test_require_roles_admin_only():
    """require_roles("ROLE_ADMIN") should deny non-admin."""
    dep = require_roles("ROLE_ADMIN")
    req = MagicMock()
    req.state = MagicMock()
    req.state.user_id = "test-456"
    req.state.user_role = "ROLE_ENSEIGNANT"

    with patch("app.core.jwt_middleware.JWT_AUTH_ENABLED", True):
        with pytest.raises(HTTPException) as ctx:
            dep(req)
        assert ctx.value.status_code == 403


def test_require_roles_admin_passes():
    """require_roles("ROLE_ADMIN") should accept admin role."""
    dep = require_roles("ROLE_ADMIN")
    req = MagicMock()
    req.state = MagicMock()
    req.state.user_id = "test-789"
    req.state.user_role = "ROLE_ADMIN"

    with patch("app.core.jwt_middleware.JWT_AUTH_ENABLED", True):
        result = dep(req)
        assert result["user_id"] == "test-789"
        assert result["role"] == "ROLE_ADMIN"


def test_require_roles_multiple_allowed():
    """require_roles accepts one of multiple roles."""
    dep = require_roles("ROLE_ADMIN", "ROLE_CHEF_DEP")
    req = MagicMock()
    req.state = MagicMock()
    req.state.user_id = "test-999"
    req.state.user_role = "ROLE_CHEF_DEP"

    with patch("app.core.jwt_middleware.JWT_AUTH_ENABLED", True):
        result = dep(req)
        assert result["user_id"] == "test-999"
        assert result["role"] == "ROLE_CHEF_DEP"


def test_require_roles_case_insensitive():
    """Role checking should be case-insensitive."""
    dep = require_roles("ROLE_ADMIN")
    req = MagicMock()
    req.state = MagicMock()
    req.state.user_id = "test-555"
    req.state.user_role = "role_admin"

    with patch("app.core.jwt_middleware.JWT_AUTH_ENABLED", True):
        result = dep(req)
        assert result["user_id"] == "test-555"


def test_require_metrics_auth_no_jwt_secret():
    """require_metrics_auth should return 503 if jwt_secret is not configured."""
    with patch("app.config.settings.jwt_secret", None):
        with pytest.raises(HTTPException) as ctx:
            require_metrics_auth(_make_request({"Authorization": "Bearer valid"}))
        assert ctx.value.status_code == 503


def test_require_roles_empty_role():
    """require_roles should deny requests with empty role."""
    dep = require_roles("ROLE_ADMIN")
    req = MagicMock()
    req.state = MagicMock()
    req.state.user_id = "test-empty"
    req.state.user_role = ""

    with patch("app.core.jwt_middleware.JWT_AUTH_ENABLED", True):
        with pytest.raises(HTTPException) as ctx:
            dep(req)
        assert ctx.value.status_code == 403


def test_require_roles_missing_user_id():
    """require_roles should still work with missing user_id."""
    dep = require_roles("ROLE_ADMIN")
    req = MagicMock()
    req.state = MagicMock(spec=[])  # Empty state

    with patch("app.core.jwt_middleware.JWT_AUTH_ENABLED", False):
        result = dep(req)
        assert result["user_id"] is None
        assert result["role"] == ""


def test_require_roles_compound_role_match():
    """require_roles should match role substring in compound roles."""
    dep = require_roles("CHEF_DEP")
    req = MagicMock()
    req.state = MagicMock()
    req.state.user_id = "test-compound"
    req.state.user_role = "ROLE_CHEF_DEPARTEMENT ROLE_USER"

    with patch("app.core.jwt_middleware.JWT_AUTH_ENABLED", True):
        result = dep(req)
        assert result["user_id"] == "test-compound"
