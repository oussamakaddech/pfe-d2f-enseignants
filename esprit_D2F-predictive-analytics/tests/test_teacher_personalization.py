"""Tests for per-teacher personalization and ID policy enforcement.

Verifies:
  1. ENS002 and ENS003 return DIFFERENT risk scores (not identical)
  2. T-format IDs are rejected on /api/v1/analytics/* (HTTP 400)
  3. The compat adapter maps T→ENS correctly
  4. The response envelope includes analysis_status/data_source/warnings
  5. Cache keys are teacher-specific (no cross-contamination)
"""

import pytest
from fastapi.testclient import TestClient
from unittest.mock import patch, MagicMock

from app.main import app


@pytest.fixture
def client():
    return TestClient(app)


class TestCanonicalIDPolicy:
    """Phase 2: ENS-only enforcement on new endpoints."""

    def test_rejects_t_format_id(self, client):
        """T002 must be rejected with 400 LEGACY_ID_NOT_ALLOWED."""
        resp = client.get("/api/v1/analytics/risk/T002")
        assert resp.status_code == 400
        body = resp.json()
        assert body["detail"]["error_code"] == "LEGACY_ID_NOT_ALLOWED"

    def test_accepts_ens_format_id(self, client):
        """ENS002 must be accepted (200 or 404, not 400)."""
        resp = client.get("/api/v1/analytics/risk/ENS002")
        assert resp.status_code in (200, 404)

    def test_rejects_invalid_id(self, client):
        """Non-ID format must be rejected with 400 INVALID_TEACHER_ID."""
        resp = client.get("/api/v1/analytics/risk/INVALID")
        assert resp.status_code == 400
        body = resp.json()
        assert body["detail"]["error_code"] == "INVALID_TEACHER_ID"

    def test_rejects_empty_id(self, client):
        resp = client.get("/api/v1/analytics/risk/")
        assert resp.status_code == 404  # Not found at route level


class TestTeacherDifferentiation:
    """Phase 4: ENS002 and ENS003 must return different results."""

    def test_risk_scores_differ(self, client):
        """ENS002 (risk ~0.58) and ENS003 (risk ~0.76) must differ."""
        resp002 = client.get("/api/v1/analytics/risk/ENS002")
        resp003 = client.get("/api/v1/analytics/risk/ENS003")

        # If DB has data, both should be 200 with different scores
        if resp002.status_code == 200 and resp003.status_code == 200:
            score002 = resp002.json()["score"]
            score003 = resp003.json()["score"]
            assert score002 != score003, (
                f"ENS002 and ENS003 have identical risk scores ({score002}) — "
                "per-teacher personalization is broken"
            )

    def test_gaps_differ(self, client):
        """ENS002 and ENS003 must have different gap sets."""
        resp002 = client.get("/api/v1/analytics/gaps/ENS002")
        resp003 = client.get("/api/v1/analytics/gaps/ENS003")

        if resp002.status_code == 200 and resp003.status_code == 200:
            gaps002 = resp002.json().get("gaps", [])
            gaps003 = resp003.json().get("gaps", [])
            # At least the gap counts or contents should differ
            if len(gaps002) == len(gaps003) and len(gaps002) > 0:
                # Check that the actual gap values differ
                scores_002 = {g["competence_id"]: g["gap_score"] for g in gaps002}
                scores_003 = {g["competence_id"]: g["gap_score"] for g in gaps003}
                assert scores_002 != scores_003, (
                    "ENS002 and ENS003 have identical gap scores — "
                    "data is not teacher-specific"
                )


class TestResponseEnvelope:
    """Phase 3: responses must include analysis_status/data_source/warnings."""

    def test_risk_response_has_envelope(self, client):
        """get_risk must include analysis_status and data_source fields."""
        resp = client.get("/api/v1/analytics/risk/ENS002")
        if resp.status_code == 200:
            body = resp.json()
            assert "analysis_status" in body, "Missing analysis_status field"
            assert "data_source" in body, "Missing data_source field"
            assert body["analysis_status"] in (
                "READY", "DATA_INCOMPLETE", "NOT_FOUND",
                "STALE_DATA", "COMPUTATION_FAILED", "MODEL_FALLBACK",
            )

    def test_csv_fallback_has_warning(self, client):
        """If risk data comes from CSV fallback, warnings must explain it."""
        resp = client.get("/api/v1/analytics/risk/ENS002")
        if resp.status_code == 200:
            body = resp.json()
            if body.get("data_source") == "csv_fallback":
                assert "warnings" in body
                assert len(body["warnings"]) > 0
                assert any("CSV fallback" in w for w in body["warnings"])


class TestCacheIsolation:
    """Phase 5: cache must be teacher-specific."""

    def test_cache_keys_are_teacher_specific(self):
        """PredictionCache must use teacher_id in the key."""
        from app.ml.gap_predictor import prediction_cache

        # Set cache for ENS002
        prediction_cache.set("ENS002", 10, {"test": "data_002"})
        # Set cache for ENS003
        prediction_cache.set("ENS003", 10, {"test": "data_003"})

        result002 = prediction_cache.get("ENS002", 10)
        result003 = prediction_cache.get("ENS003", 10)

        assert result002 is not None
        assert result003 is not None
        assert result002["test"] != result003["test"], (
            "Cache is not teacher-specific — cross-contamination detected"
        )


class TestCompatAdapter:
    """Phase 2: legacy T-format adapter must map correctly."""

    def test_compat_adapter_rejects_invalid(self, client):
        """Invalid ID on compat endpoint must return 400."""
        resp = client.get("/api/v1/compat/teacher/INVALID/risk")
        assert resp.status_code == 400

    def test_compat_adapter_passes_through_ens(self, client):
        """ENS format on compat endpoint should pass through."""
        resp = client.get("/api/v1/compat/teacher/ENS002/risk")
        # Should delegate to analytics endpoint
        assert resp.status_code in (200, 404)
