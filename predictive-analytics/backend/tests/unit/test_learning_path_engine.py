"""Tests unitaires du LearningPathEngine."""

from __future__ import annotations

from datetime import date, timedelta

from app.domain.enums.gap import GapSeverity, GapType
from app.engines.gap_engine import GapEngine
from app.engines.learning_path_engine import LearningPathEngine
from app.engines.recommendation_engine import RecommendationEngine
from tests.fixtures import (
    build_context,
    record,
    training,
)


def _path(ctx, trainings=None):
    gap_result = GapEngine().analyze(ctx)
    reco = RecommendationEngine().recommend(ctx, gap_result)
    return LearningPathEngine().build(ctx, reco)


def test_ordered_steps_and_total_duration():
    ctx = build_context(
        records=[
            record("KN-ALGO-1", level=1),
            record("KN-ALGO-2", level=1),
        ],
        trainings=[
            training("TR-001", knowledge_ids=["KN-ALGO-1"], duration_hours=20.0),
            training("TR-002", knowledge_ids=["KN-ALGO-2"], duration_hours=30.0),
        ],
    )
    path = _path(ctx)
    assert len(path.steps) == 2
    assert path.total_duration_hours == 50.0
    assert all(s.position >= 1 for s in path.steps)


def test_prerequisite_ordering():
    ctx = build_context(
        records=[
            record("KN-ALGO-1", level=1),
            record("KN-ALGO-2", level=1),
        ],
        trainings=[
            training("TR-002", knowledge_ids=["KN-ALGO-2"], prereq_training_ids=["TR-001"]),
            training("TR-001", knowledge_ids=["KN-ALGO-1"]),
        ],
    )
    path = _path(ctx)
    positions = {s.training_id: s.position for s in path.steps}
    assert positions["TR-001"] < positions["TR-002"]


def test_cycle_detection():
    ctx = build_context(
        records=[
            record("KN-ALGO-1", level=1),
            record("KN-ALGO-2", level=1),
        ],
        trainings=[
            training("TR-001", knowledge_ids=["KN-ALGO-1"], prereq_training_ids=["TR-002"]),
            training("TR-002", knowledge_ids=["KN-ALGO-2"], prereq_training_ids=["TR-001"]),
        ],
    )
    path = _path(ctx)
    assert path.cycles_detected, "le cycle A->B->A doit être détecté"


def test_blocking_step_marked():
    ctx = build_context(
        records=[
            record("KN-ALGO-1", level=1),
            record("KN-ALGO-2", level=1),
        ],
        trainings=[
            training("TR-002", knowledge_ids=["KN-ALGO-2"], prereq_training_ids=["TR-999"]),
            training("TR-001", knowledge_ids=["KN-ALGO-1"]),
        ],
    )
    path = _path(ctx)
    blocked = [s for s in path.steps if s.is_blocking]
    assert any(s.training_id == "TR-002" for s in blocked)
    assert path.blocking_steps
    assert any("TR-999" in s.blocked_by for s in blocked)


def test_future_suggestion_for_unavailable_training():
    future = date.today() + timedelta(days=90)
    ctx = build_context(
        records=[
            record("KN-ALGO-1", level=1),
            record("KN-ALGO-2", level=1),
        ],
        trainings=[
            training("TR-001", knowledge_ids=["KN-ALGO-1"]),
            training(
                "TR-002",
                knowledge_ids=["KN-ALGO-2"],
                available_from=future,
                registration_open=False,
            ),
        ],
    )
    path = _path(ctx)
    future_ids = {s.training_id for s in path.future_suggestions}
    assert "TR-002" in future_ids
    # TR-002 is not eligible (registration closed) so it must not be in steps
    assert "TR-002" not in {s.training_id for s in path.steps}


def test_optional_steps_non_blocking():
    ctx = build_context(
        records=[
            record("KN-ALGO-1", level=1),
            record("KN-ALGO-2", level=1),
        ],
        trainings=[
            training("TR-001", knowledge_ids=["KN-ALGO-1"]),
        ],
    )
    path = _path(ctx)
    assert path.optional_steps
    assert not path.blocking_steps
