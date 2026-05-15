"""Smoke tests for the JWT middleware contract.

These verify the public surface of jwt_middleware.py:
- It imports cleanly when JWT_SECRET is set.
- It exposes the expected symbols (JWTAuthMiddleware, JWT_ALGORITHM).
- HS512 is the configured algorithm.
"""
from __future__ import annotations


def test_jwt_middleware_imports_cleanly():
    import jwt_middleware  # noqa: F401
    assert hasattr(jwt_middleware, "JWTAuthMiddleware")


def test_jwt_algorithm_is_hs512():
    import jwt_middleware
    assert jwt_middleware.JWT_ALGORITHM == "HS512"


def test_public_paths_include_health():
    import jwt_middleware
    assert "/health" in jwt_middleware.PUBLIC_PATHS


def test_middleware_is_a_class():
    import jwt_middleware
    from starlette.middleware.base import BaseHTTPMiddleware
    assert issubclass(jwt_middleware.JWTAuthMiddleware, BaseHTTPMiddleware)
