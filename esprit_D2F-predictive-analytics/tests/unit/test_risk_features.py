"""Tests unitaires de risk_features (features de risque partagées train/serving).

Couvre les branches non testées : construction training (corpus simulé),
construction serving (gaps + bundle), helpers de sévérité/score et vecteur
ordonné (contrat artefact).
"""
from __future__ import annotations

import pandas as pd
import pytest

from datetime import date

import pandas as pd
import pytest

from app.domain.entities.skill_gap import SkillGap
from app.domain.value_objects.enums import Severity, Trend
from app.infrastructure.ml import risk_features as rf


def _gap(severity: Severity, score: float, trend: Trend = Trend.STABLE) -> SkillGap:
    return SkillGap(
        teacher_id="ens-001",
        competence_id=10,
        competence_code="COMP.10",
        competence_nom="Compétence test",
        observed_result=2.0,
        knowledge_difficulty_level=4.0,
        gap_score=score,
        severity=severity,
        trend=trend,
        as_of=date(2026, 1, 31),
    )


# ── Helpers de sévérité / score ─────────────────────────────────────────────

def test_gap_score_from_levels():
    assert rf.gap_score_from_levels(4.0, 2.0) == 0.5
    assert rf.gap_score_from_levels(2.0, 4.0) == 0.0
    assert rf.gap_score_from_levels(10.0, 0.0) == 1.0


@pytest.mark.parametrize(
    "score,expected",
    [
        (0.80, "CRITICAL"),
        (0.75, "CRITICAL"),
        (0.60, "HIGH"),
        (0.50, "HIGH"),
        (0.30, "MEDIUM"),
        (0.25, "MEDIUM"),
        (0.10, "LOW"),
    ],
)
def test_severity_from_gap_score(score, expected):
    assert rf.severity_from_gap_score(score) == expected


def test_risk_score_from_gaps_empty():
    assert rf.risk_score_from_gaps([]) == 0.0


def test_risk_score_from_gaps_two_criticals():
    # 0.50 * min(1, 2/2) + 0.12 * 0 + 0.40 * moyenne
    scores = [0.9, 0.8]
    expected = 0.50 * 1.0 + 0.40 * (0.85)
    assert rf.risk_score_from_gaps(scores) == pytest.approx(expected)


def test_risk_score_from_gaps_one_high():
    scores = [0.6]
    expected = 0.12 * 1.0 + 0.40 * 0.6
    assert rf.risk_score_from_gaps(scores) == pytest.approx(expected)


@pytest.mark.parametrize(
    "score,expected",
    [
        (0.90, "CRITICAL"),
        (0.75, "CRITICAL"),
        (0.60, "HIGH"),
        (0.50, "HIGH"),
        (0.40, "MEDIUM"),
        (0.30, "MEDIUM"),
        (0.10, "LOW"),
    ],
)
def test_risk_class_from_score(score, expected):
    assert rf.risk_class_from_score(score) == expected


# ── build_serving_features ──────────────────────────────────────────────────

def test_build_serving_features_counts_and_bundle():
    gaps = [
        _gap(Severity.CRITICAL, 0.9, Trend.DECLINING),
        _gap(Severity.HIGH, 0.6, Trend.IMPROVING),
        _gap(Severity.MEDIUM, 0.3, Trend.STABLE),
    ]
    bundle = {
        "attendance": 0.8,
        "completed": ["f1", "f2"],
        "needs": {"nb": 3, "nb_approuves": 1},
        "eval": {"avg_score": 14.5, "nb": 2},
        "stagnation_months": 6.0,
    }
    agg = {"avg_level_t": 2.5, "nb_savoirs": 12.0}

    features = rf.build_serving_features(gaps, bundle, agg)

    assert features["n_gaps_total"] == 3.0
    assert features["n_gaps_critical"] == 1.0
    assert features["n_gaps_high"] == 1.0
    assert features["n_gaps_medium"] == 1.0
    assert features["has_critical"] == 1.0
    assert features["critical_ratio"] == pytest.approx(1 / 3)
    assert features["avg_gap_score"] == pytest.approx(0.6)
    assert features["max_gap_score"] == pytest.approx(0.9)
    # DECLINING=1, IMPROVING=-1, STABLE=0 -> moyenne 0
    assert features["trend_gap_direction"] == pytest.approx(0.0)
    assert features["stagnation_months"] == 6.0
    assert features["attendance_rate"] == 0.8
    assert features["nb_formations_completed"] == 2.0
    assert features["nb_besoins_exprimes"] == 3.0
    assert features["nb_besoins_approuves"] == 1.0
    assert features["avg_eval_score"] == 14.5
    assert features["nb_evaluations"] == 2.0
    assert features["avg_level_t"] == 2.5
    assert features["nb_savoirs"] == 12.0
    # agrégats absents -> 0.0
    assert features["competency_coverage_rate"] == 0.0


def test_build_serving_features_empty_gaps_and_bundle():
    features = rf.build_serving_features([], {})
    assert features["n_gaps_total"] == 0.0
    assert features["n_gaps_critical"] == 0.0
    assert features["has_critical"] == 0.0
    assert features["avg_gap_score"] == 0.0
    assert features["max_gap_score"] == 0.0
    assert features["trend_gap_direction"] == 0.0
    assert features["attendance_rate"] == 0.0
    assert features["nb_besoins_exprimes"] == 0.0


def test_features_to_vector_ordered():
    features = {c: 1.0 for c in rf.RISK_FEATURES}
    vector = rf.features_to_vector(features)
    assert vector == [1.0] * len(rf.RISK_FEATURES)
    assert len(vector) == len(rf.RISK_FEATURES)


# ── build_training_frame (corpus de simulation) ────────────────────────────

def _simulation_row(
    teacher: str, month: str, required: float, cur_t: float, cur_t1: float, gap_fut: float
) -> dict:
    return {
        "teacher_id": teacher,
        "ref_month": month,
        "date_t": month,
        "required_level": required,
        "current_level_t": cur_t,
        "current_level_t1": cur_t1,
        "gap_next_3m": gap_fut,
        "months_since_last_training": 5.0,
        "taux_assiduite": 0.9,
        "nb_formations_completed": 2.0,
        "nb_besoins_exprimes": 1.0,
        "nb_besoins_approuves": 1.0,
        "avg_eval_score": 15.0,
        "nb_evaluations": 3.0,
        "avg_level": 2.5,
        "min_level": 1.0,
        "max_level": 4.0,
        "nb_savoirs": 8.0,
        "competency_coverage_rate": 0.6,
        "days_since_last_training": 150.0,
        "training_frequency_per_month": 0.5,
        "lag_gap_t1_t": 0.1,
        "rolling_tendance": -0.2,
        "is_stagnant": 0.0,
        "is_long_absent": 0.0,
    }


def test_build_training_frame_features_and_target():
    rows = [
        _simulation_row("ens-1", "2026-01", 4.0, 1.0, 1.5, 3.0),
        _simulation_row("ens-1", "2026-02", 4.0, 2.0, 1.0, 2.0),
        _simulation_row("ens-2", "2026-01", 4.0, 4.0, 4.0, 0.0),
    ]
    frame = rf.build_training_frame(pd.DataFrame(rows))

    assert list(frame.columns) == list(rf.RISK_FEATURES) + [
        "teacher_id", "ref_month", "risk_class", "risk_score_fut", "risk_class_t",
    ] or set(rf.RISK_FEATURES).issubset(set(frame.columns))
    assert len(frame) == 3

    ens1_jan = frame[(frame["teacher_id"] == "ens-1") & (frame["ref_month"] == "2026-01")].iloc[0]
    # gap t = 4.0 - 1.0 = 3.0 -> score 0.75 (critique)
    assert ens1_jan["n_gaps_critical"] == 1.0
    assert ens1_jan["has_critical"] == 1.0
    assert ens1_jan["avg_gap_score"] == pytest.approx(0.75)
    # gap futur 3.0 -> score 0.75 : 0.50*min(1,1/2) + 0.40*0.75 = 0.55 -> HIGH
    assert ens1_jan["risk_class"] == "HIGH"
    assert ens1_jan["risk_class_t"] == "HIGH"

    ens2 = frame[(frame["teacher_id"] == "ens-2") & (frame["ref_month"] == "2026-01")].iloc[0]
    # pas de gap a t ni a t+3
    assert ens2["n_gaps_total"] == 0.0
    assert ens2["risk_class"] == "LOW"
    assert ens2["risk_class_t"] == "LOW"


def test_build_training_frame_aggregates_multiple_months():
    rows = [
        _simulation_row("ens-3", "2026-01", 4.0, 1.0, 1.0, 1.0),
        _simulation_row("ens-3", "2026-02", 4.0, 1.0, 1.0, 1.0),
    ]
    frame = rf.build_training_frame(pd.DataFrame(rows))
    assert len(frame) == 2
    for _, row in frame.iterrows():
        # gap constant -> tendance nulle
        assert row["trend_gap_direction"] == pytest.approx(0.0)
        assert row["n_gaps_critical"] == 1.0


def test_safe_eval_and_needs_rows():
    assert rf._safe_eval_row(None) == (0.0, 0)
    assert rf._safe_eval_row({"avg_score": None, "nb": None}) == (0.0, 0)
    assert rf._safe_eval_row({"avg_score": 12.0, "nb": 4}) == (12.0, 4)
    assert rf._safe_needs_row(None) == (0, 0)
    assert rf._safe_needs_row({"nb": None, "nb_approuves": None}) == (0, 0)
    assert rf._safe_needs_row({"nb": 2, "nb_approuves": 1}) == (2, 1)
