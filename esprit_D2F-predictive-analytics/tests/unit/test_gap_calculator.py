from app.domain.services.gap_calculator import compute_gap, gap_score, raw_gap, severity_from_gap, trend_from_levels
from app.domain.value_objects.enums import Severity, Trend


def test_raw_gap_zero_when_below_target():
    assert raw_gap(3.0, 2.0) == 0.0
    assert raw_gap(4.0, 4.0) == 0.0


def test_gap_score_normalized_on_four_levels():
    assert gap_score(1.0, 5.0) == 1.0
    assert gap_score(1.0, 3.0) == 0.5
    assert gap_score(3.0, 3.0) == 0.0


def test_gap_score_clamped():
    assert gap_score(0.0, 5.0) == 1.0
    assert gap_score(5.0, 1.0) == 0.0


def test_severity_thresholds():
    assert severity_from_gap(0.8, 0.75, 0.5, 0.25) is Severity.CRITICAL
    assert severity_from_gap(0.6, 0.75, 0.5, 0.25) is Severity.HIGH
    assert severity_from_gap(0.3, 0.75, 0.5, 0.25) is Severity.MEDIUM
    assert severity_from_gap(0.1, 0.75, 0.5, 0.25) is Severity.LOW


def test_compute_gap_boundary_critical():
    score, severity = compute_gap(1.0, 5.0, 0.75, 0.5, 0.25)
    assert score == 1.0
    assert severity is Severity.CRITICAL


def test_trend_from_levels():
    assert trend_from_levels(3.0, 2.0) is Trend.IMPROVING
    assert trend_from_levels(2.0, 3.0) is Trend.DECLINING
    assert trend_from_levels(3.0, 3.0) is Trend.STABLE
    assert trend_from_levels(3.0, None) is Trend.STABLE
