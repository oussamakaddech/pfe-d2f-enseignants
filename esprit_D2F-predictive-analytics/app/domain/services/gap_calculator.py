from app.domain.value_objects.enums import Severity, Trend


def raw_gap(current_level: float, target_level: float) -> float:
    return max(0.0, target_level - current_level)


def gap_score(current_level: float, target_level: float, max_level: int = 4) -> float:
    return min(1.0, raw_gap(current_level, target_level) / max_level)


def severity_from_gap(score: float, seuil_critique: float, seuil_haute: float, seuil_moyenne: float) -> Severity:
    if score >= seuil_critique:
        return Severity.CRITICAL
    if score >= seuil_haute:
        return Severity.HIGH
    if score >= seuil_moyenne:
        return Severity.MEDIUM
    return Severity.LOW


def trend_from_levels(current_level: float, previous_level: float | None) -> Trend:
    if previous_level is None:
        return Trend.STABLE
    if current_level > previous_level:
        return Trend.IMPROVING
    if current_level < previous_level:
        return Trend.DECLINING
    return Trend.STABLE


def compute_gap(current_level: float, target_level: float, seuil_critique: float, seuil_haute: float, seuil_moyenne: float) -> tuple[float, Severity]:
    score = gap_score(current_level, target_level)
    return score, severity_from_gap(score, seuil_critique, seuil_haute, seuil_moyenne)
