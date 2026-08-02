DECLINING = "DECLINING"
STABLE = "STABLE"
IMPROVING = "IMPROVING"


def aggregate_declining(rows: list[dict]) -> list[dict]:
    results: list[dict] = []
    for row in rows:
        current = row.get("current_avg") or 0.0
        previous = row.get("previous_avg")
        delta = round(current - (previous or current), 3)
        if previous is None:
            trend = STABLE
        elif delta < -0.05:
            trend = DECLINING
        elif delta > 0.05:
            trend = IMPROVING
        else:
            trend = STABLE
        results.append(
            {
                "competence_id": row["competence_id"],
                "competence_nom": row.get("competence_nom"),
                "current_avg_level": current,
                "previous_avg_level": previous,
                "delta": delta,
                "trend": trend,
            }
        )
    return sorted(results, key=lambda r: r["delta"])


def summarize_kpis(kpis: dict) -> dict:
    at_risk = kpis.get("teachers_at_risk", 0)
    total = kpis.get("teachers_analysed", 0) or 1
    return {
        **kpis,
        "at_risk_ratio": round(at_risk / total, 4),
    }
