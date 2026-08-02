"""Tests for routers/ab_testing.py — A/B testing endpoints."""

import pytest
from unittest.mock import patch, MagicMock
from fastapi.testclient import TestClient

from app.main import app
from app.core.db import get_db

BASE = "/api/v1/analytics/ab"


def _mock_db():
    return MagicMock()


class TestABTestingRoutes:
    def test_assign_variant(self, client: TestClient):
        mock_db = MagicMock()
        app.dependency_overrides[get_db] = lambda: mock_db
        try:
            with patch("app.routers.ab_testing.get_variant", return_value="A"):
                resp = client.post(f"{BASE}/assign", json={
                    "teacher_id": "T1",
                    "experiment_name": "test_exp",
                })
            assert resp.status_code == 200
            data = resp.json()
            assert data["variant"] == "A"
            assert data["teacher_id"] == "T1"
        finally:
            app.dependency_overrides.pop(get_db, None)

    def test_log_event(self, client: TestClient):
        mock_db = MagicMock()
        app.dependency_overrides[get_db] = lambda: mock_db
        try:
            with patch("app.routers.ab_testing.record_event") as mock_rec:
                resp = client.post(f"{BASE}/event", json={
                    "teacher_id": "T1",
                    "variant": "B",
                    "event_type": "accepted",
                })
            assert resp.status_code == 200
            assert resp.json()["status"] == "recorded"
            mock_rec.assert_called_once()
        finally:
            app.dependency_overrides.pop(get_db, None)

    def test_get_results(self, client: TestClient):
        mock_db = MagicMock()
        app.dependency_overrides[get_db] = lambda: mock_db
        try:
            with patch("app.routers.ab_testing.compute_results", return_value=[]):
                resp = client.get(f"{BASE}/results/test_exp")
            assert resp.status_code == 200
            assert isinstance(resp.json(), list)
        finally:
            app.dependency_overrides.pop(get_db, None)

    def test_get_winner_found(self, client: TestClient):
        mock_db = MagicMock()
        app.dependency_overrides[get_db] = lambda: mock_db
        try:
            with patch("app.routers.ab_testing.compute_results", return_value=[{"variant": "A"}]), \
                 patch("app.routers.ab_testing.get_winner", return_value={"variant": "A", "win_rate": 0.6}):
                resp = client.get(f"{BASE}/winner/test_exp")
            assert resp.status_code == 200
            assert resp.json()["variant"] == "A"
        finally:
            app.dependency_overrides.pop(get_db, None)

    def test_get_winner_not_found(self, client: TestClient):
        mock_db = MagicMock()
        app.dependency_overrides[get_db] = lambda: mock_db
        try:
            with patch("app.routers.ab_testing.compute_results", return_value=[]), \
                 patch("app.routers.ab_testing.get_winner", return_value=None):
                resp = client.get(f"{BASE}/winner/test_exp")
            assert resp.status_code == 404
        finally:
            app.dependency_overrides.pop(get_db, None)
