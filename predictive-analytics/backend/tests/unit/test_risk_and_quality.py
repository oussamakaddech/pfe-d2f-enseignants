"""Tests unitaires du RiskEngine et du DataQualityEngine."""

from __future__ import annotations

from app.engines.data_quality_engine import DataQualityEngine
from app.engines.gap_engine import GapEngine
from app.engines.risk_engine import RiskEngine
from app.domain.enums.quality import DataQualityStatus
from tests.fixtures import build_context, need, record


def test_risk_score_bounds():
    ctx = build_context(
        records=[
            record("KN-ALGO-1", level=1),
            record("KN-ALGO-2", level=1),
        ]
    )
    gaps = GapEngine().analyze(ctx)
    risk = RiskEngine().evaluate(ctx, gaps)
    assert 0.0 <= risk.risk_score <= 1.0
    assert risk.risk_level in {"LOW", "MEDIUM", "HIGH", "CRITICAL"}
    assert risk.factors


def test_risk_high_for_critical_profile():
    ctx = build_context(
        records=[
            record("KN-ALGO-1", level=1, assessed_days_ago=500),
            record("KN-ALGO-2", level=1, assessed_days_ago=500),
        ],
        needs=[need("KN-ALGO-1")],
    )
    gaps = GapEngine().analyze(ctx)
    risk = RiskEngine().evaluate(ctx, gaps)
    assert risk.risk_score >= 0.5
    assert risk.risk_level in {"HIGH", "CRITICAL"}


def test_risk_low_for_healthy_profile():
    ctx = build_context(
        records=[
            record("KN-ALGO-1", level=5, assessed_days_ago=10),
            record("KN-ALGO-2", level=4, assessed_days_ago=10),
        ]
    )
    gaps = GapEngine().analyze(ctx)
    risk = RiskEngine().evaluate(ctx, gaps)
    assert risk.risk_score < 0.3
    assert risk.risk_level == "LOW"


def test_risk_ml_probability_blend():
    ctx = build_context(
        records=[
            record("KN-ALGO-1", level=1),
            record("KN-ALGO-2", level=1),
        ]
    )
    gaps = GapEngine().analyze(ctx)
    base = RiskEngine().evaluate(ctx, gaps)
    blended = RiskEngine().evaluate(ctx, gaps, ml_probability=1.0, model_version="v1")
    assert blended.ml_stagnation_probability == 1.0
    assert blended.model_version == "v1"
    assert blended.risk_score >= base.risk_score


def test_data_quality_complete_profile():
    ctx = build_context(
        records=[
            record("KN-ALGO-1", level=3, assessed_days_ago=10),
            record("KN-ALGO-2", level=2, assessed_days_ago=10),
        ]
    )
    report = DataQualityEngine().audit(ctx)
    assert report.overall_status == DataQualityStatus.COMPLETE
    assert report.overall_score == 1.0


def test_data_quality_missing_competencies():
    ctx = build_context(records=[])
    report = DataQualityEngine().audit(ctx)
    assert report.overall_status == DataQualityStatus.MISSING_COMPETENCIES
    assert report.missing_competency_ids


def test_data_quality_detects_stale_and_missing():
    ctx = build_context(
        records=[
            record("KN-ALGO-1", level=3, assessed_days_ago=500),
            record("KN-ALGO-2", level=None, assessed_days_ago=None),
        ]
    )
    report = DataQualityEngine().audit(ctx)
    assert report.overall_status == DataQualityStatus.STALE
    assert report.stale_assessment_ids
