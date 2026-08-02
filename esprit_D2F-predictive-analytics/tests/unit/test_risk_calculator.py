from app.domain.entities.risk_profile import RiskProfile
from app.domain.services.risk_calculator import RiskInputs, compute_risk, risk_level
from app.domain.value_objects.enums import RiskLevel

WEIGHTS = {"stagnation": 0.25, "decline": 0.20, "attendance": 0.20, "low_eval": 0.15, "repeated_need": 0.10, "low_engagement": 0.10}


def _inputs(**kwargs) -> RiskInputs:
    defaults = dict(
        teacher_id="T001",
        stagnation_months=0.0,
        declined=False,
        attendance_rate=1.0,
        avg_eval_score=5.0,
        repeated_need_count=0.0,
        days_since_last_activity=0.0,
    )
    defaults.update(kwargs)
    return RiskInputs(**defaults)


def test_risk_zero_for_healthy_teacher():
    profile = compute_risk(_inputs(), WEIGHTS)
    assert profile.risk_score == 0.0
    assert profile.risk_level is RiskLevel.LOW
    assert profile.factors == ()


def test_risk_critical_for_extreme_inputs():
    profile = compute_risk(
        _inputs(stagnation_months=24.0, declined=True, attendance_rate=0.0, avg_eval_score=1.0, repeated_need_count=5.0, days_since_last_activity=365.0),
        WEIGHTS,
    )
    assert profile.risk_score >= 70.0
    assert profile.risk_level is RiskLevel.CRITICAL


def test_risk_levels_boundaries():
    assert risk_level(10.0) is RiskLevel.LOW
    assert risk_level(40.0) is RiskLevel.MEDIUM
    assert risk_level(60.0) is RiskLevel.HIGH
    assert risk_level(70.0) is RiskLevel.CRITICAL
    assert risk_level(85.0) is RiskLevel.CRITICAL


def test_factors_sorted_by_contribution_desc():
    profile = compute_risk(_inputs(stagnation_months=24.0, declined=False, attendance_rate=0.0), WEIGHTS)
    contributions = [f.contribution for f in profile.factors]
    assert contributions == sorted(contributions, reverse=True)
    assert profile.factors[0].feature == "stagnation"


def test_avg_eval_none_is_neutral():
    low = compute_risk(_inputs(avg_eval_score=None), WEIGHTS).risk_score
    mid = compute_risk(_inputs(avg_eval_score=5.0), WEIGHTS).risk_score
    none_profile = compute_risk(_inputs(avg_eval_score=None, stagnation_months=24.0), WEIGHTS)
    assert none_profile.risk_score > low
