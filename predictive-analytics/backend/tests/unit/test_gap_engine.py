"""Tests unitaires du GapEngine — moteur déterministe."""

from __future__ import annotations

from datetime import date, timedelta

import pytest

from app.domain.enums.gap import GapSeverity, GapType
from app.domain.enums.quality import DataQualityStatus
from app.engines.gap_engine import GapEngine
from tests.fixtures import (
    build_context,
    build_teacher,
    need,
    record,
)


def test_no_records_yields_incomplete_profile_not_no_gap():
    engine = GapEngine()
    result = engine.analyze(build_context(records=[]))
    assert result.gaps, "un enseignant sans compétences doit avoir au moins un gap"
    assert result.data_quality_status == DataQualityStatus.MISSING_COMPETENCIES
    assert result.has_competency_records is False
    assert result.gaps[0].gap_type == GapType.INCOMPLETE_PROFILE


def test_level_deficit_formula():
    engine = GapEngine()
    ctx = build_context(
        records=[
            record("KN-ALGO-1", level=2),
            record("KN-ALGO-2", level=2),
        ]
    )
    result = engine.analyze(ctx)
    deficit = [g for g in result.gaps if g.gap_type == GapType.LEVEL_DEFICIT]
    assert deficit, "doit détecter un LEVEL_DEFICIT"
    algo = next(g for g in deficit if g.knowledge_id == "KN-ALGO-1")
    assert algo.current_level == 2
    assert algo.required_level == 4
    assert algo.gap_level == 2  # max(4 - 2, 0)
    assert algo.severity == GapSeverity.MEDIUM


def test_no_deficit_when_level_met():
    engine = GapEngine()
    ctx = build_context(
        records=[
            record("KN-ALGO-1", level=5),
            record("KN-ALGO-2", level=3),
        ]
    )
    result = engine.analyze(ctx)
    assert not [
        g for g in result.gaps if g.gap_type == GapType.LEVEL_DEFICIT
    ], "niveau suffisant => pas de déficit"


def test_gap_level_never_negative():
    engine = GapEngine()
    ctx = build_context(
        records=[
            record("KN-ALGO-1", level=5),  # requis 4
            record("KN-ALGO-2", level=4),  # requis 3
        ]
    )
    result = engine.analyze(ctx)
    for g in result.gaps:
        assert g.gap_level >= 0


def test_missing_assignment_for_unknown_knowledge():
    engine = GapEngine()
    ctx = build_context(
        records=[record("KN-ALGO-1", level=3)]
    )  # KN-ALGO-2 absent
    result = engine.analyze(ctx)
    missing = [
        g for g in result.gaps if g.gap_type == GapType.MISSING_ASSIGNMENT
    ]
    assert missing
    assert {g.knowledge_id for g in missing} == {"KN-ALGO-2"}
    assert all(
        g.data_quality_status == DataQualityStatus.DATA_INCOMPLETE for g in missing
    )


def test_missing_prerequisite_detected():
    engine = GapEngine()
    ctx = build_context(
        records=[
            record("KN-ALGO-1", level=1),  # prereq requis 4, niveau 1
            record("KN-ALGO-2", level=1),
        ]
    )
    result = engine.analyze(ctx)
    prereq_gaps = [
        g for g in result.gaps if g.gap_type == GapType.MISSING_PREREQUISITE
    ]
    assert prereq_gaps
    assert all(g.knowledge_id == "KN-ALGO-2" for g in prereq_gaps)


def test_stale_assessment_detected():
    engine = GapEngine(config=None)
    ctx = build_context(
        records=[
            record("KN-ALGO-1", level=3, assessed_days_ago=500),
            record("KN-ALGO-2", level=2, assessed_days_ago=500),
        ]
    )
    result = engine.analyze(ctx)
    stale = [
        g for g in result.gaps if g.gap_type == GapType.STALE_ASSESSMENT
    ]
    assert stale
    assert all(
        g.data_quality_status == DataQualityStatus.STALE for g in stale
    )


def test_active_training_need_detected():
    engine = GapEngine()
    ctx = build_context(
        records=[
            record("KN-ALGO-1", level=1),
            record("KN-ALGO-2", level=2),
        ],
        needs=[need("KN-ALGO-1")],
    )
    result = engine.analyze(ctx)
    active = [
        g for g in result.gaps if g.gap_type == GapType.ACTIVE_TRAINING_NEED
    ]
    assert active
    assert active[0].severity in {
        GapSeverity.MEDIUM,
        GapSeverity.HIGH,
        GapSeverity.CRITICAL,
    }


def test_aggregation_hierarchy_present():
    engine = GapEngine()
    ctx = build_context(
        records=[
            record("KN-ALGO-1", level=1),
            record("KN-ALGO-2", level=1),
        ]
    )
    result = engine.analyze(ctx)
    levels = {a.level for a in result.aggregates}
    assert levels == {"SUB_COMPETENCY", "COMPETENCY", "DOMAIN"}
    sub_agg = next(a for a in result.aggregates if a.level == "SUB_COMPETENCY")
    assert sub_agg.gap_count >= 2


def test_evidence_and_explainability_present():
    engine = GapEngine()
    ctx = build_context(
        records=[
            record("KN-ALGO-1", level=2),
            record("KN-ALGO-2", level=2),
        ]
    )
    result = engine.analyze(ctx)
    deficit = next(g for g in result.gaps if g.gap_type == GapType.LEVEL_DEFICIT)
    assert deficit.explainability is not None
    assert "formula" in deficit.explainability.model_dump()
    assert deficit.evidence
    assert deficit.explainability.model_dump()["human_readable"]


def test_severity_critical_for_big_gap():
    engine = GapEngine()
    ctx = build_context(
        records=[
            record("KN-ALGO-1", level=1),  # gap 3 => HIGH
            record("KN-ALGO-2", level=1),  # gap 2 + prereq escalation
        ]
    )
    result = engine.analyze(ctx)
    assert any(
        g.severity == GapSeverity.HIGH for g in result.gaps if g.gap_type == GapType.LEVEL_DEFICIT
    )


def test_partial_records_gives_data_incomplete_status():
    engine = GapEngine()
    ctx = build_context(
        records=[
            record("KN-ALGO-1", level=3),
            record("KN-ALGO-2", level=None, assessed_days_ago=None),
        ]
    )
    result = engine.analyze(ctx)
    assert any(
        g.data_quality_status == DataQualityStatus.DATA_INCOMPLETE
        for g in result.gaps
    )


def test_deterministic_same_input_same_output():
    engine = GapEngine()
    ctx = build_context(
        records=[
            record("KN-ALGO-1", level=2),
            record("KN-ALGO-2", level=1),
        ]
    )
    r1 = engine.analyze(ctx)
    r2 = engine.analyze(ctx)
    assert [g.gap_level for g in r1.gaps] == [g.gap_level for g in r2.gaps]
    assert [g.severity for g in r1.gaps] == [g.severity for g in r2.gaps]


def test_reference_date_is_used_for_staleness():
    ctx = build_context(
        records=[
            record("KN-ALGO-1", level=3, assessed_days_ago=30),
            record("KN-ALGO-2", level=2, assessed_days_ago=30),
        ],
        reference_date=date(2024, 1, 1),
    )
    # records assessed 30 days before today => if reference date is 2024, staleness differs
    result = GapEngine().analyze(ctx)
    assert result.detected_at == date(2024, 1, 1)


def test_teacher_without_records_but_unknown_hierarchy():
    engine = GapEngine()
    ctx = build_context(records=[])
    result = engine.analyze(ctx)
    assert result.data_quality_status == DataQualityStatus.MISSING_COMPETENCIES
    assert not result.aggregates
