"""Smoke tests for error_handlers.register_exception_handlers."""
from __future__ import annotations

from fastapi import FastAPI, HTTPException
from fastapi.testclient import TestClient
from pydantic import BaseModel

from error_handlers import register_exception_handlers


class _Payload(BaseModel):
    name: str


def _make_app() -> FastAPI:
    app = FastAPI()
    register_exception_handlers(app, service_prefix="TEST")

    @app.get("/boom")
    def boom():
        raise RuntimeError("kaboom")

    @app.get("/not-found")
    def not_found():
        raise HTTPException(404, "missing")

    @app.post("/echo")
    def echo(p: _Payload):
        return {"name": p.name}

    return app


def test_handler_returns_envelope_for_generic_exception():
    client = TestClient(_make_app(), raise_server_exceptions=False)
    r = client.get("/boom")
    assert r.status_code == 500
    body = r.json()
    assert body["status"] == 500
    assert body["errorCode"] == "TEST-500"
    assert body["path"] == "/boom"
    assert "kaboom" not in body["message"]  # never leak details
    assert body["traceId"]
    assert body["timestamp"]


def test_handler_returns_envelope_for_http_exception():
    client = TestClient(_make_app(), raise_server_exceptions=False)
    r = client.get("/not-found")
    assert r.status_code == 404
    body = r.json()
    assert body["status"] == 404
    assert body["errorCode"] == "TEST-404"
    assert body["message"] == "missing"


def test_handler_returns_envelope_for_validation_error():
    client = TestClient(_make_app(), raise_server_exceptions=False)
    r = client.post("/echo", json={"wrong": "field"})
    assert r.status_code == 422
    body = r.json()
    assert body["status"] == 422
    assert body["errorCode"] == "TEST-422"
    assert "Validation failed" in body["message"]


def test_handler_propagates_trace_id_header():
    client = TestClient(_make_app(), raise_server_exceptions=False)
    r = client.get("/not-found", headers={"X-Trace-Id": "abc-123"})
    assert r.json()["traceId"] == "abc-123"
