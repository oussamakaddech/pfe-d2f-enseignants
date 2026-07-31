"""Phase 3 — Missing data & quality envelope tests.

No absence of data may be silently interpreted as zero gap, low risk, or
healthy empty recommendation.
"""
import os
import pytest

os.environ.setdefault("JWT_AUTH_ENABLED", "false")
os.environ.setdefault("SCHEDULER_ENABLED", "false")
os.environ.setdefault("MESSAGING_ENABLED", "false")
os.environ.setdefault("APP_ENV", "test")
os.environ.setdefault("JWT_SECRET", "test-jwt-secret-" + "x" * 40)


class TestResponseEnvelope:
    def test_envelope_has_analysis_status(self):
        from app.core.response_envelope import ready, READY
        r = ready({"x": 1})
        assert r["analysis_status"] == READY
        assert "data_source" in r

    def test_data_incomplete_has_status_and_warnings(self):
        from app.core.response_envelope import data_incomplete, DATA_INCOMPLETE
        r = data_incomplete({"x": 1}, warnings=["Missing training history"])
        assert r["analysis_status"] == DATA_INCOMPLETE
        assert "Missing training history" in r["warnings"]

    def test_not_found_envelope(self):
        from app.core.response_envelope import not_found, NOT_FOUND
        r = not_found({}, message="Teacher not found")
        assert r["analysis_status"] == NOT_FOUND
        assert r["warnings"][0] == "Teacher not found"

    def test_envelope_has_no_half_defaults(self):
        """Missing data must not be replaced by 0.5 neutral scores."""
        from app.core.response_envelope import data_incomplete
        r = data_incomplete({"score": None})
        assert r.get("score") is None  # stays null, not coerced to 0.5


class TestMissingAssignmentsNotZeroGap:
    def test_gap_engine_with_no_assignment_creates_not_assigned_gap(self):
        """A knowledge with NO assignment row is a GAP_NOT_ASSIGNED — not a zero gap."""
        from app.engines.gap_engine import _classify_gap
        from app.engines.predictive_gap_diagnostic import GAP_NOT_ASSIGNED
        result = _classify_gap(
            is_assigned=False, is_active=False, is_validated=False, is_stale=False,
            prerequisite_missing=0, formation_completed=False,
            has_individual_need=False, has_collective_need=False, is_strategic=False,
        )
        assert result == GAP_NOT_ASSIGNED

    def test_fully_covered_knowledge_has_no_gap(self):
        """Assigned+validated+training completed → no gap (None)."""
        from app.engines.gap_engine import _classify_gap
        result = _classify_gap(
            is_assigned=True, is_active=True, is_validated=True, is_stale=False,
            prerequisite_missing=0, formation_completed=True,
            has_individual_need=False, has_collective_need=False, is_strategic=False,
        )
        assert result is None
