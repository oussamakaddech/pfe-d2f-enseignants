"""Tests for endpoints in app/routers/reporting.py."""

from types import SimpleNamespace
from unittest.mock import MagicMock, patch

from fastapi.testclient import TestClient

from app.main import app
from app.core.db import get_db

BASE = "/api/v1/analytics"


def _client_with(db):
    app.dependency_overrides[get_db] = lambda: db
    return TestClient(app)


class TestReportingEndpoints:
    def test_enseignants_sans_formation(self):
        db = MagicMock()
        c = _client_with(db)
        with patch("app.routers.reporting.ReportingEngine") as re:
            re.return_value.enseignants_sans_formation.return_value = {"total": 0, "items": []}
            r = c.get(f"{BASE}/enseignants-sans-formation")
        assert r.status_code == 200
        app.dependency_overrides.clear()

    def test_formations_par_periode_invalid_granularite(self):
        db = MagicMock()
        c = _client_with(db)
        r = c.get(f"{BASE}/formations-par-periode?granularite=FOO")
        assert r.status_code == 400
        app.dependency_overrides.clear()

    def test_formations_par_periode_ok(self):
        db = MagicMock()
        c = _client_with(db)
        with patch("app.routers.reporting.ReportingEngine") as re:
            re.return_value.formations_par_periode.return_value = {"periodes": []}
            r = c.get(f"{BASE}/formations-par-periode?granularite=MOIS")
        assert r.status_code == 200
        app.dependency_overrides.clear()

    def test_formations_par_up(self):
        db = MagicMock()
        c = _client_with(db)
        with patch("app.routers.reporting.ReportingEngine") as re:
            re.return_value.formations_par_up.return_value = []
            r = c.get(f"{BASE}/formations-par-up")
        assert r.status_code == 200
        app.dependency_overrides.clear()

    def test_formations_par_departement_admin(self):
        db = MagicMock()
        c = _client_with(db)
        with patch("app.routers.reporting.ReportingEngine") as re, \
                patch("app.routers.reporting.JWT_AUTH_ENABLED", False):
            re.return_value.formations_par_departement.return_value = {"departements": []}
            r = c.get(f"{BASE}/formations-par-departement")
        assert r.status_code == 200
        app.dependency_overrides.clear()

    def test_export_excel(self):
        db = MagicMock()
        c = _client_with(db)
        with patch("app.services.export_service.build_excel", return_value=(b"xlsx", "r.xlsx")):
            r = c.get(f"{BASE}/export/excel?type=INACTIFS")
        assert r.status_code == 200
        app.dependency_overrides.clear()

    def test_export_pdf_admin(self):
        db = MagicMock()
        c = _client_with(db)
        with patch("app.services.export_service.build_pdf", return_value=(b"pdf", "r.pdf")), \
                patch("app.routers.reporting.JWT_AUTH_ENABLED", False):
            r = c.get(f"{BASE}/export/pdf?type=RAPPORT_MENSUEL")
        assert r.status_code == 200
        app.dependency_overrides.clear()
