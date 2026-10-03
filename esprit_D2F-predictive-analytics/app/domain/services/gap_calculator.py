from app.domain.value_objects.enums import Severity, Trend


# Écart brut entre le niveau actuel et le niveau cible d'une compétence.
# Renvoie 0 si l'enseignant a déjà atteint ou dépassé la cible.
def raw_gap(current_level: float, target_level: float) -> float:
    return max(0.0, target_level - current_level)


# Score d'écart normalisé entre 0 et 1 : le gap brut divisé par le niveau max possible.
# Exemple : gap de 2 points sur une échelle de 4 → score 0.5.
def gap_score(current_level: float, target_level: float, max_level: int = 4) -> float:
    return min(1.0, raw_gap(current_level, target_level) / max_level)


# Convertit un score d'écart en niveau de sévérité (CRITICAL / HIGH / MEDIUM / LOW)
# en comparant aux seuils passés en paramètres (configurables par le métier).
def severity_from_gap(score: float, seuil_critique: float, seuil_haute: float, seuil_moyenne: float) -> Severity:
    if score >= seuil_critique:
        return Severity.CRITICAL
    if score >= seuil_haute:
        return Severity.HIGH
    if score >= seuil_moyenne:
        return Severity.MEDIUM
    return Severity.LOW


# Déduit la tendance d'évolution d'une compétence : si on ne connaît pas le
# niveau précédent → STABLE ; sinon IMPROVING / DECLINING / STABLE.
def trend_from_levels(current_level: float, previous_level: float | None) -> Trend:
    if previous_level is None:
        return Trend.STABLE
    if current_level > previous_level:
        return Trend.IMPROVING
    if current_level < previous_level:
        return Trend.DECLINING
    return Trend.STABLE


# Fonction "tout-en-un" : calcule le score d'écart ET sa sévérité d'un coup.
# Renvoie un tuple (score normalisé 0..1, Severity) utilisé par le use case ComputeGaps.
def compute_gap(current_level: float, target_level: float, seuil_critique: float, seuil_haute: float, seuil_moyenne: float) -> tuple[float, Severity]:
    score = gap_score(current_level, target_level)
    return score, severity_from_gap(score, seuil_critique, seuil_haute, seuil_moyenne)
