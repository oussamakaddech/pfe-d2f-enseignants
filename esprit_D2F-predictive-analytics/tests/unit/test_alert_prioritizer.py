from datetime import datetime

from app.domain.entities.alert import Alert
from app.domain.services.alert_prioritizer import priority_score, sort_by_priority


def make_alert(severity: str, target_type: str) -> Alert:
    return Alert(
        alert_type="GAP_CRITIQUE",
        target_type=target_type,
        severity=severity,
        title="titre",
        message="message",
        created_at=datetime.utcnow(),
    )


def test_priority_score_severity_scales():
    assert priority_score(make_alert("CRITIQUE", "ENSEIGNANT")) > priority_score(make_alert("INFO", "ENSEIGNANT"))


def test_priority_score_reach_scales():
    assert priority_score(make_alert("WARNING", "DEPARTEMENT")) > priority_score(make_alert("WARNING", "ENSEIGNANT"))


def test_priority_score_missing_severity_defaults_low():
    assert priority_score(make_alert("INCONNUE", "ENSEIGNANT")) == priority_score(make_alert("INFO", "ENSEIGNANT"))


def test_sort_by_priority_orders_descending():
    low = make_alert("INFO", "ENSEIGNANT")
    high = make_alert("CRITIQUE", "DEPARTEMENT")
    ordered = sort_by_priority([low, high])
    assert ordered[0] is high
    assert ordered[1] is low
