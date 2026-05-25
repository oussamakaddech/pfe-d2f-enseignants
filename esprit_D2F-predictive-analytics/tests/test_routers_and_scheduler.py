import contextlib
from types import SimpleNamespace
from unittest.mock import MagicMock

import pytest


def test_health_endpoint(client):
    r = client.get("/api/health")
    assert r.status_code == 200
    j = r.json()
    assert "status" in j and "service" in j


def test_detect_at_risk_teachers_endpoint(client):
    # With mocked DB returning empty lists, should return 0 teachers
    r = client.get("/api/detect/at-risk-teachers")
    assert r.status_code == 200
    j = r.json()
    assert j.get("at_risk_count") == 0


def test_job_alert_cleanup_and_stop(monkeypatch):
    # Patch db_session to yield a mock DB with .query(...).filter(...).delete() -> 0
    mock_db = MagicMock()
    mock_db.query.return_value.filter.return_value.delete.return_value = 0

    @contextlib.contextmanager
    def fake_db_session():
        yield mock_db

    from app.scheduler import jobs

    monkeypatch.setattr(jobs, "db_session", fake_db_session)
    # Should run without error
    jobs.job_alert_cleanup()

    # stop_scheduler when scheduler not started should be no-op
    jobs.stop_scheduler()
