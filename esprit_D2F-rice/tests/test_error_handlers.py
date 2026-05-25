"""
tests/test_error_handlers.py — Unit tests for rice.error_handlers.
"""
import sys
import os
import pytest

sys.path.insert(0, os.path.dirname(os.path.dirname(__file__)))

os.environ.setdefault("DB_NAME", "test")
os.environ.setdefault("DB_USER", "test")
os.environ.setdefault("DB_PASS", "test")
os.environ.setdefault("DB_HOST", "localhost")
os.environ.setdefault("DB_PORT", "5432")

from fastapi import FastAPI, HTTPException
from fastapi.testclient import TestClient
from fastapi.exceptions import RequestValidationError
from rice.error_handlers import register_exception_handlers, _envelope, _trace_id


# ── _envelope helper ────────────────────────────────────────────────────────

class TestEnvelope:
    def test_envelope_structure(self):
        env = _envelope(500, "RICE-500", "Internal error", "/rice/analyze", "trace-123")
        assert env["status"] == 500
        assert env["errorCode"] == "RICE-500"
        assert env["message"] == "Internal error"
        assert env["path"] == "/rice/analyze"
        assert env["traceId"] == "trace-123"
        assert "timestamp" in env

    def test_envelope_422(self):
        env = _envelope(422, "RICE-422", "Validation failed", "/rice/validate", "t-456")
        assert env["status"] == 422
        assert env["errorCode"] == "RICE-422"


# ── _trace_id helper ────────────────────────────────────────────────────────

class TestTraceId:
    def test_trace_id_from_header(self):
        from starlette.requests import Request
        from starlette.datastructures import Headers

        scope = {
            "type": "http",
            "method": "GET",
            "path": "/test",
            "query_string": b"",
            "headers": [(b"x-trace-id", b"my-trace-42")],
        }
        req = Request(scope)
        assert _trace_id(req) == "my-trace-42"

    def test_trace_id_from_state(self):
        from starlette.requests import Request

        scope = {
            "type": "http",
            "method": "GET",
            "path": "/test",
            "query_string": b"",
            "headers": [],
        }
        req = Request(scope)
        req.state.trace_id = "state-trace-99"
        tid = _trace_id(req)
        assert tid == "state-trace-99"

    def test_trace_id_generates_uuid(self):
        from starlette.requests import Request

        scope = {
            "type": "http",
            "method": "GET",
            "path": "/test",
            "query_string": b"",
            "headers": [],
        }
        req = Request(scope)
        tid = _trace_id(req)
        assert isinstance(tid, str)
        assert len(tid) > 0


# ── HTTP exception handler ──────────────────────────────────────────────────

class TestHTTPExceptionHandler:
    def _make_app(self):
        app = FastAPI()
        register_exception_handlers(app, service_prefix="RICE")

        @app.get("/raise-http-404")
        async def raise_404():
            raise HTTPException(status_code=404, detail="Not found")

        @app.get("/raise-http-403")
        async def raise_403():
            raise HTTPException(status_code=403, detail="Forbidden")

        return app

    def test_http_404(self):
        client = TestClient(self._make_app(), raise_server_exceptions=False)
        r = client.get("/raise-http-404")
        assert r.status_code == 404
        body = r.json()
        assert body["status"] == 404
        assert body["errorCode"] == "RICE-404"
        assert body["message"] == "Not found"
        assert "traceId" in body

    def test_http_403(self):
        client = TestClient(self._make_app(), raise_server_exceptions=False)
        r = client.get("/raise-http-403")
        assert r.status_code == 403
        body = r.json()
        assert body["errorCode"] == "RICE-403"


# ── Validation exception handler ────────────────────────────────────────────

class TestValidationExceptionHandler:
    def _make_app(self):
        app = FastAPI()
        register_exception_handlers(app, service_prefix="RICE")

        from pydantic import BaseModel

        class Item(BaseModel):
            name: str
            value: int

        @app.post("/validate-item")
        async def validate_item(item: Item):
            return item

        return app

    def test_validation_error_returns_422(self):
        client = TestClient(self._make_app(), raise_server_exceptions=False)
        r = client.post("/validate-item", json={"name": 123, "value": "not_int"})
        assert r.status_code == 422
        body = r.json()
        assert body["errorCode"] == "RICE-422"
        assert "Validation failed" in body["message"]


# ── Generic exception handler ───────────────────────────────────────────────

class TestGenericExceptionHandler:
    def _make_app(self):
        app = FastAPI()
        register_exception_handlers(app, service_prefix="RICE")

        @app.get("/raise-generic")
        async def raise_generic():
            raise RuntimeError("Something broke")

        return app

    def test_generic_exception_returns_500(self):
        client = TestClient(self._make_app(), raise_server_exceptions=False)
        r = client.get("/raise-generic")
        assert r.status_code == 500
        body = r.json()
        assert body["errorCode"] == "RICE-500"
        assert "traceId" in body
        # Should NOT leak stack trace
        assert "RuntimeError" not in body["message"]
