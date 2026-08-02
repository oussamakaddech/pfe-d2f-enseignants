from dataclasses import dataclass

from app.domain.entities.risk_profile import RiskFactor, RiskProfile
from app.domain.value_objects.enums import RiskLevel

MAX_LEVEL = 5.0
STAGNATION_REF_MONTHS = 24.0
NEED_REF_COUNT = 3.0
ENGAGEMENT_REF_DAYS = 180.0
EVAL_REF_SCORE = 5.0


@dataclass(frozen=True)
class RiskInputs:
    teacher_id: str
    stagnation_months: float
    declined: bool
    attendance_rate: float
    avg_eval_score: float | None
    repeated_need_count: float
    days_since_last_activity: float | None


def _normalize_stagnation(months: float, ref_months: float = STAGNATION_REF_MONTHS) -> float:
    return min(1.0, max(0.0, months / ref_months))


def _normalize_engagement(days: float | None, ref_days: float = ENGAGEMENT_REF_DAYS) -> float:
    if days is None:
        return 0.5
    return min(1.0, max(0.0, days / ref_days))


def _normalize_eval(score: float | None, ref: float = EVAL_REF_SCORE) -> float:
    if score is None:
        return 0.5
    return min(1.0, max(0.0, (ref - score) / ref))


def _normalize_need(count: float, ref: float = NEED_REF_COUNT) -> float:
    return min(1.0, max(0.0, count / ref))


def compute_sub_scores(inputs: RiskInputs) -> dict[str, float]:
    return {
        "stagnation": _normalize_stagnation(inputs.stagnation_months),
        "decline": 1.0 if inputs.declined else 0.0,
        "attendance": 1.0 - min(1.0, max(0.0, inputs.attendance_rate)),
        "low_eval": _normalize_eval(inputs.avg_eval_score),
        "repeated_need": _normalize_need(inputs.repeated_need_count),
        "low_engagement": _normalize_engagement(inputs.days_since_last_activity),
    }


def compute_risk(inputs: RiskInputs, weights: dict[str, float]) -> RiskProfile:
    sub_scores = compute_sub_scores(inputs)
    total_weight = sum(weights.values()) or 1.0
    weighted = {key: sub_scores[key] * weights.get(key, 0.0) for key in sub_scores}
    score = min(100.0, 100.0 * sum(weighted.values()) / total_weight)

    factors = tuple(
        RiskFactor(feature=key, value=round(sub_scores[key], 4), contribution=round(weighted[key] / total_weight, 4))
        for key in sorted(weighted, key=lambda k: weighted[k], reverse=True)
        if weighted[key] > 0
    )

    level = risk_level(score)
    return RiskProfile(teacher_id=inputs.teacher_id or "", risk_score=score, risk_level=level, factors=factors)


def risk_level(score: float, threshold_medium: float = 30.0, threshold_high: float = 70.0) -> RiskLevel:
    if score >= threshold_high:
        return RiskLevel.CRITICAL
    if score >= threshold_medium:
        return RiskLevel.HIGH if score >= 55.0 else RiskLevel.MEDIUM
    return RiskLevel.LOW
