from app.domain.services.dashboard_aggregator import aggregate_declining, summarize_kpis


def test_aggregate_declining_marks_trends():
    rows = [
        {"competence_id": 1, "competence_nom": "Pedagogie", "current_avg": 2.0, "previous_avg": 3.0},
        {"competence_id": 2, "competence_nom": "Numérique", "current_avg": 4.0, "previous_avg": 4.0},
        {"competence_id": 3, "competence_nom": "Innovation", "current_avg": 3.0, "previous_avg": 2.0},
    ]
    result = aggregate_declining(rows)
    trends = {r["competence_id"]: r["trend"] for r in result}
    assert trends[1] == "DECLINING"
    assert trends[2] == "STABLE"
    assert trends[3] == "IMPROVING"


def test_aggregate_declining_sorted_by_delta():
    rows = [
        {"competence_id": 1, "competence_nom": "A", "current_avg": 2.0, "previous_avg": 3.0},
        {"competence_id": 2, "competence_nom": "B", "current_avg": 1.0, "previous_avg": 3.0},
    ]
    result = aggregate_declining(rows)
    assert result[0]["competence_id"] == 2
    assert result[1]["competence_id"] == 1


def test_aggregate_declining_no_previous_is_stable():
    result = aggregate_declining([{"competence_id": 1, "competence_nom": "A", "current_avg": 2.0, "previous_avg": None}])
    assert result[0]["trend"] == "STABLE"
    assert result[0]["delta"] == 0.0


def test_summarize_kpis_adds_ratio():
    kpis = {"teachers_at_risk": 2, "teachers_analysed": 4}
    result = summarize_kpis(kpis)
    assert result["at_risk_ratio"] == 0.5


def test_summarize_kpis_handles_zero_denominator():
    kpis = {"teachers_at_risk": 0, "teachers_analysed": 0}
    result = summarize_kpis(kpis)
    assert result["at_risk_ratio"] == 0.0
