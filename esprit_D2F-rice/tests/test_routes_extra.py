"""
tests/test_routes_extra.py — Unit tests for rice.routes (export-csv, referential, match, refresh-cache, _get_current_user).
"""
import sys
import os
import io
import json
import pytest
from unittest.mock import patch, MagicMock

sys.path.insert(0, os.path.dirname(os.path.dirname(__file__)))

os.environ.setdefault("DB_NAME", "test")
os.environ.setdefault("DB_USER", "test")
os.environ.setdefault("DB_PASS", "test")
os.environ.setdefault("DB_HOST", "localhost")
os.environ.setdefault("DB_PORT", "5432")
os.environ.setdefault("APP_ENV", "development")
os.environ.setdefault("JWT_SECRET", "a" * 64)
os.environ.setdefault("JWT_AUTH_ENABLED", "false")

import rice.db as _rice_db
import rice.routes as _rice_routes
import rice.referential as _rice_ref

_noop_aff = lambda: {}
_noop_ens = lambda: {}

_rice_db._fetch_enseignant_affectations = _noop_aff
_rice_db._fetch_all_enseignants_info = _noop_ens
_rice_routes._fetch_enseignant_affectations = _noop_aff
_rice_ref._load_ref_from_db = lambda dept="gc": None
_rice_ref._fetch_enseignant_affectations = _noop_aff

from fastapi import FastAPI, Depends
from fastapi.testclient import TestClient
from rice.routes import rice_router, _get_current_user

# Disable auth for test app
import rice.routes as _rice_routes_mod
_rice_routes_mod._AUTH_ENABLED = False


def _make_app():
    app = FastAPI()
    app.include_router(rice_router)
    return app


# ── GET /rice/referential/{departement} ─────────────────────────────────────

class TestGetReferential:
    def test_gc_referential(self):
        client = TestClient(_make_app())
        r = client.get("/rice/referential/gc")
        assert r.status_code == 200
        data = r.json()
        assert "savoirs" in data or "departement" in data

    def test_info_referential(self):
        client = TestClient(_make_app())
        r = client.get("/rice/referential/info")
        assert r.status_code == 200

    def test_default_departement(self):
        client = TestClient(_make_app())
        r = client.get("/rice/referential/gc")
        assert r.status_code == 200


# ── POST /rice/match ───────────────────────────────────────────────────────

class TestMatchText:
    def test_match_gc_text(self):
        client = TestClient(_make_app())
        r = client.post("/rice/gc-match", data={"text": "dimensionner fondation superficielle"})
        assert r.status_code == 200
        data = r.json()
        assert "matched_savoirs" in data
        assert "matched_competence" in data
        assert "suggested_enseignants" in data

    def test_match_missing_text(self):
        client = TestClient(_make_app())
        r = client.post("/rice/gc-match", data={})
        assert r.status_code == 422


# ── POST /rice/export-csv ──────────────────────────────────────────────────

class TestExportCsv:
    def test_export_csv(self):
        client = TestClient(_make_app())
        payload = {
            "propositions": [{
                "tmpId": "D1",
                "code": "DOM1",
                "nom": "Genie Civil",
                "competences": [{
                    "tmpId": "C1",
                    "code": "C1a",
                    "nom": "Conception",
                    "savoirs": [{
                        "tmpId": "S1",
                        "code": "S1a",
                        "nom": "Calcul beton",
                        "type": "THEORIQUE",
                        "niveau": "N3_INTERMEDIAIRE",
                        "enseignantsSuggeres": ["E001"],
                        "refCodes": ["S1a"],
                    }],
                    "sousCompetences": [],
                }],
            }],
            "stats": {"totalDomaines": 1, "totalCompetences": 1, "totalSavoirs": 1},
        }
        r = client.post("/rice/export-csv", json=payload)
        assert r.status_code == 200
        assert r.headers["content-type"].startswith("text/csv")
        content = r.text
        assert "domaine_code" in content
        assert "Calcul beton" in content

    def test_export_csv_with_sous_competences(self):
        client = TestClient(_make_app())
        payload = {
            "propositions": [{
                "tmpId": "D1",
                "code": "DOM1",
                "nom": "GC",
                "competences": [{
                    "tmpId": "C1",
                    "code": "C1a",
                    "nom": "Analyse",
                    "savoirs": [],
                    "sousCompetences": [{
                        "tmpId": "SC1",
                        "code": "SC1a",
                        "nom": "Analyse structurale",
                        "savoirs": [{
                            "tmpId": "S1",
                            "code": "S2b",
                            "nom": "Analyse des charges",
                            "type": "PRATIQUE",
                            "niveau": "N4_AVANCE",
                            "enseignantsSuggeres": [],
                            "refCodes": [],
                        }],
                    }],
                }],
            }],
            "stats": {"totalDomaines": 1, "totalCompetences": 1, "totalSavoirs": 1},
        }
        r = client.post("/rice/export-csv", json=payload)
        assert r.status_code == 200
        assert "SC1a" in r.text
        assert "Analyse des charges" in r.text


# ── POST /rice/refresh-cache ───────────────────────────────────────────────

class TestRefreshCache:
    def test_refresh_cache(self):
        client = TestClient(_make_app())
        r = client.post("/rice/gc-refresh-cache")
        assert r.status_code == 200
        data = r.json()
        assert data["status"] == "ok"


# ── _get_current_user ──────────────────────────────────────────────────────

class TestGetCurrentUser:
    def test_auth_disabled_returns_none(self):
        import rice.routes as _mod
        original = _mod._AUTH_ENABLED
        _mod._AUTH_ENABLED = False
        try:
            from starlette.requests import Request
            scope = {"type": "http", "method": "GET", "path": "/test", "query_string": b"", "headers": []}
            req = Request(scope)
            result = _get_current_user(req, token=None)
            assert result is None
        finally:
            _mod._AUTH_ENABLED = original

    def test_auth_enabled_no_user_raises(self):
        import rice.routes as _mod
        original = _mod._AUTH_ENABLED
        _mod._AUTH_ENABLED = True
        try:
            from starlette.requests import Request
            from fastapi import HTTPException
            scope = {"type": "http", "method": "GET", "path": "/test", "query_string": b"", "headers": []}
            req = Request(scope)
            with pytest.raises(HTTPException) as exc_info:
                _get_current_user(req, token=None)
            assert exc_info.value.status_code == 401
        finally:
            _mod._AUTH_ENABLED = original

    def test_auth_enabled_with_user(self):
        import rice.routes as _mod
        original = _mod._AUTH_ENABLED
        _mod._AUTH_ENABLED = True
        try:
            from starlette.requests import Request
            scope = {"type": "http", "method": "GET", "path": "/test", "query_string": b"", "headers": []}
            req = Request(scope)
            req.state.user_id = "user42"
            req.state.user_email = "user@test.com"
            req.state.user_role = "ADMIN"
            result = _get_current_user(req, token=None)
            assert result["id"] == "user42"
            assert result["role"] == "ADMIN"
        finally:
            _mod._AUTH_ENABLED = original
