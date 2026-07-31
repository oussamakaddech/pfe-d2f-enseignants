"""Tests unitaires du RecommendationEngine."""

from __future__ import annotations

from datetime import date, timedelta

import pytest

from app.domain.enums.gap import GapSeverity
from app.domain.enums.training import RecommendationPriority
from app.engines.gap_engine import GapEngine
from app.engines.recommendation_engine import (
    EligibilityRules,
    RecommendationEngine,
    RecommendationWeights,
)
from tests.fixtures import (
    build_context,
    completed_enrollment,
    record,
    training,
)


def _engine(ctx) -> RecommendationEngine:
    gap_result = GapEngine().analyze(ctx)
    return RecommendationEngine(), gap_result


def test_weights_must_sum_to_one():
    with pytest.raises(ValueError):
        RecommendationWeights(gap_relevance=1.0, severity_priority=1.0)
    RecommendationWeights()


def test_incomplete_profile_blocks_recommendation():
    ctx = build_context(records=[])
    engine, gaps = _engine(ctx)
    result = engine.recommend(ctx, gaps)
    assert result.no_eligible_reason == "DATA_INCOMPLETE"
    assert result.recommendations == []


def test_no_active_gaps_blocks_recommendation():
    ctx = build_context(
        records=[
            record("KN-ALGO-1", level=5),
            record("KN-ALGO-2", level=5),
        ],
        trainings=[training("TR-001")],
    )
    engine, gaps = _engine(ctx)
    result = engine.recommend(ctx, gaps)
    assert result.no_eligible_reason == "NO_ACTIVE_GAPS"


def test_ineligible_training_excluded():
    ctx = build_context(
        records=[
            record("KN-ALGO-1", level=1),
            record("KN-ALGO-2", level=1),
        ],
        trainings=[
            training("TR-INACTIVE", active=False),
            training("TR-CANCELLED", cancelled=True),
            training("TR-CLOSED", registration_open=False),
            training("TR-ENDED", end=date.today() - timedelta(days=1)),
        ],
    )
    engine, gaps = _engine(ctx)
    result = engine.recommend(ctx, gaps)
    assert result.recommendations == []
    assert result.no_eligible_reason == "NO_ELIGIBLE_TRAINING"
    reasons = {e["training_id"]: e["reason"] for e in result.excluded_trainings}
    assert reasons["TR-INACTIVE"] == "NOT_ACTIVE"
    assert reasons["TR-CANCELLED"] == "CANCELLED"
    assert reasons["TR-CLOSED"] == "REGISTRATION_CLOSED"
    assert reasons["TR-ENDED"] == "ENDED"


def test_already_completed_training_excluded():
    ctx = build_context(
        records=[
            record("KN-ALGO-1", level=1),
            record("KN-ALGO-2", level=1),
        ],
        trainings=[training("TR-001")],
        enrollments=[completed_enrollment("TR-001")],
    )
    engine, gaps = _engine(ctx)
    result = engine.recommend(ctx, gaps)
    assert result.recommendations == []
    assert result.no_eligible_reason == "NO_ELIGIBLE_TRAINING"


def test_training_not_linked_to_active_gap_excluded():
    ctx = build_context(
        records=[
            record("KN-ALGO-1", level=1),
            record("KN-ALGO-2", level=1),
        ],
        trainings=[training("TR-UNLINKED", knowledge_ids=["KN-OTHER"])],
    )
    engine, gaps = _engine(ctx)
    result = engine.recommend(ctx, gaps)
    assert result.no_eligible_reason == "NO_ELIGIBLE_TRAINING"


def test_department_mismatch_excluded():
    ctx = build_context(
        records=[
            record("KN-ALGO-1", level=1),
            record("KN-ALGO-2", level=1),
        ],
        trainings=[
            training("TR-001", department_code="RT"),
            training("TR-002", department_code="GL"),
        ],
    )
    engine, gaps = _engine(ctx)
    result = engine.recommend(ctx, gaps)
    ids = {r.training_id for r in result.recommendations}
    assert ids == {"TR-002"}


def test_eligible_training_scored_and_explicable():
    ctx = build_context(
        records=[
            record("KN-ALGO-1", level=1),
            record("KN-ALGO-2", level=1),
        ],
        trainings=[training("TR-001", knowledge_ids=["KN-ALGO-1"])],
    )
    engine, gaps = _engine(ctx)
    result = engine.recommend(ctx, gaps)
    assert len(result.recommendations) == 1
    rec = result.recommendations[0]
    assert 0.0 <= rec.recommendation_score <= 1.0
    assert rec.reason_codes
    assert rec.human_readable_explanation
    assert rec.target_gap_ids
    assert rec.expected_level_progression
    assert rec.priority in RecommendationPriority
    assert rec.score_breakdown


def test_different_teachers_get_different_recommendations():
    # teacher with critical gap vs teacher with low gap on different knowledge
    ctx_a = build_context(
        records=[
            record("KN-ALGO-1", level=1),
            record("KN-ALGO-2", level=1),
        ],
        trainings=[training("TR-ALGO", knowledge_ids=["KN-ALGO-1"])],
    )
    engine_a, gaps_a = _engine(ctx_a)
    result_a = engine_a.recommend(ctx_a, gaps_a)

    # second teacher: no gap on ALGO-1 (level 5), gap only on KN-ALGO-2
    ctx_b = build_context(
        records=[
            record("KN-ALGO-1", level=5),
            record("KN-ALGO-2", level=1),
        ],
        trainings=[training("TR-ALGO", knowledge_ids=["KN-ALGO-1"])],
    )
    engine_b, gaps_b = _engine(ctx_b)
    result_b = engine_b.recommend(ctx_b, gaps_b)

    # TR-ALGO only targets KN-ALGO-1: recommended for A, not for B
    ids_a = {r.training_id for r in result_a.recommendations}
    ids_b = {r.training_id for r in result_b.recommendations}
    assert "TR-ALGO" in ids_a
    assert "TR-ALGO" not in ids_b


def test_priority_bands():
    low = RecommendationEngine._priority_from_score
    assert low(0.3) == RecommendationPriority.LOW
    assert low(0.6) == RecommendationPriority.MEDIUM
    assert low(0.9) == RecommendationPriority.HIGH


def test_prerequisite_missing_blocks_but_recommends():
    ctx = build_context(
        records=[
            record("KN-ALGO-1", level=1),
            record("KN-ALGO-2", level=1),
        ],
        trainings=[
            training(
                "TR-001",
                knowledge_ids=["KN-ALGO-1"],
                prereq_training_ids=["TR-000"],  # jamais suivi / absent
            )
        ],
    )
    engine, gaps = _engine(ctx)
    result = engine.recommend(ctx, gaps)
    assert len(result.recommendations) == 1
    rec = result.recommendations[0]
    assert rec.prerequisite_status == "BLOCKED"


def test_capacity_full_excluded_when_rule_enforced():
    ctx = build_context(
        records=[
            record("KN-ALGO-1", level=1),
            record("KN-ALGO-2", level=1),
        ],
        trainings=[
            training("TR-001", capacity=30, registration_count=30),
        ],
    )
    engine, gaps = _engine(ctx)
    engine.rules = EligibilityRules(exclude_capacity_full=True)
    result = engine.recommend(ctx, gaps)
    reasons = {e["training_id"]: e["reason"] for e in result.excluded_trainings}
    assert reasons["TR-001"] == "CAPACITY_FULL"


def test_capacity_ignored_when_disabled():
    ctx = build_context(
        records=[
            record("KN-ALGO-1", level=1),
            record("KN-ALGO-2", level=1),
        ],
        trainings=[
            training("TR-001", capacity=30, registration_count=30),
        ],
    )
    engine, gaps = _engine(ctx)
    engine.rules = EligibilityRules(exclude_capacity_full=False)
    result = engine.recommend(ctx, gaps)
    assert len(result.recommendations) == 1


def test_need_alignment_adds_reason():
    from tests.fixtures import need

    ctx = build_context(
        records=[
            record("KN-ALGO-1", level=1),
            record("KN-ALGO-2", level=1),
        ],
        needs=[need("KN-ALGO-1")],
        trainings=[training("TR-001", knowledge_ids=["KN-ALGO-1"])],
    )
    engine, gaps = _engine(ctx)
    result = engine.recommend(ctx, gaps)
    assert len(result.recommendations) == 1
    rec = result.recommendations[0]
    assert "NEED_ALIGNED" in rec.reason_codes
    assert rec.score_breakdown["need_alignment"] == 1.0
