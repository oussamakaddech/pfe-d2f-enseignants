from dataclasses import dataclass

from app.domain.entities.risk_profile import RiskFactor, RiskProfile
from app.domain.value_objects.enums import RiskLevel

MAX_LEVEL = 5.0
STAGNATION_REF_MONTHS = 24.0
NEED_REF_COUNT = 3.0
ENGAGEMENT_REF_DAYS = 180.0
EVAL_REF_SCORE = 5.0

FACTOR_LABELS = {
    "stagnation": "Stagnation prolongée",
    "decline": "Régression de niveau",
    "attendance": "Assiduité faible",
    "low_eval": "Évaluations faibles",
    "repeated_need": "Besoins répétés non couverts",
    "low_engagement": "Faible engagement",
}


@dataclass(frozen=True)
class RiskInputs:
    teacher_id: str
    stagnation_months: float
    declined: bool
    attendance_rate: float
    avg_eval_score: float | None
    repeated_need_count: float
    days_since_last_activity: float | None


# Normalise le nombre de mois de stagnation en score 0..1
# (24 mois de référence → score 1.0, valeurs supérieures plafonnées à 1).
def _normalize_stagnation(months: float, ref_months: float = STAGNATION_REF_MONTHS) -> float:
    return min(1.0, max(0.0, months / ref_months))


# Normalise le nombre de jours sans activité en score 0..1 (180 jours → 1.0).
# Si l'information est inconnue (None), on renvoie un score neutre de 0.5.
def _normalize_engagement(days: float | None, ref_days: float = ENGAGEMENT_REF_DAYS) -> float:
    if days is None:
        return 0.5
    return min(1.0, max(0.0, days / ref_days))


# Normalise un score d'évaluation (sur 5) en score de risque 0..1 :
# plus la note est basse, plus le risque est élevé. Note inconnue → 0.5 (neutre).
def _normalize_eval(score: float | None, ref: float = EVAL_REF_SCORE) -> float:
    if score is None:
        return 0.5
    return min(1.0, max(0.0, (ref - score) / ref))


# Normalise le nombre de besoins de formation répétés en score 0..1
# (3 besoins de référence → 1.0).
def _normalize_need(count: float, ref: float = NEED_REF_COUNT) -> float:
    return min(1.0, max(0.0, count / ref))


# Calcule les 6 sous-scores de risque normalisés (0..1) pour un enseignant :
# stagnation, régression de niveau, assiduité faible, évaluations faibles,
# besoins répétés et faible engagement. Base du calcul du score global.
def compute_sub_scores(inputs: RiskInputs) -> dict[str, float]:
    return {
        "stagnation": _normalize_stagnation(inputs.stagnation_months),
        "decline": 1.0 if inputs.declined else 0.0,
        "attendance": 1.0 - min(1.0, max(0.0, inputs.attendance_rate)),
        "low_eval": _normalize_eval(inputs.avg_eval_score),
        "repeated_need": _normalize_need(inputs.repeated_need_count),
        "low_engagement": _normalize_engagement(inputs.days_since_last_activity),
    }


# Moteur principal du risque : combine les sous-scores pondérés (poids configurables)
# en un score global 0..100, construit la liste des facteurs contributeurs triés
# (du plus impactant au moins impactant) et détermine le niveau de risque final.
def compute_risk(inputs: RiskInputs, weights: dict[str, float]) -> RiskProfile:
    sub_scores = compute_sub_scores(inputs)
    total_weight = sum(weights.values()) or 1.0
    weighted = {key: sub_scores[key] * weights.get(key, 0.0) for key in sub_scores}
    score = min(100.0, 100.0 * sum(weighted.values()) / total_weight)

    raw_values = {
        "stagnation": inputs.stagnation_months,
        "decline": 1.0 if inputs.declined else 0.0,
        "attendance": inputs.attendance_rate,
        "low_eval": inputs.avg_eval_score if inputs.avg_eval_score is not None else 0.0,
        "repeated_need": inputs.repeated_need_count,
        "low_engagement": inputs.days_since_last_activity if inputs.days_since_last_activity is not None else 0.0,
    }

    # Chaque contribution = sous-score normalisé (0..1) * poids (0..1) / somme des poids.
    # La somme des poids vaut 1.0 par construction -> somme des contributions <= 1.0,
    # donc le score n'est jamais plafonné dans ce moteur (is_capped=False).
    factors = tuple(
        RiskFactor(
            feature=key,
            value=round(raw_values[key], 4),
            normalized_value=round(sub_scores[key], 4),
            weight=round(weights.get(key, 0.0) / total_weight, 4),
            contribution=round(weighted[key] / total_weight, 4),
            label=FACTOR_LABELS.get(key, key),
            scope="TEACHER",
        )
        for key in sorted(weighted, key=lambda k: weighted[k], reverse=True)
        if weighted[key] > 0
    )

    level = risk_level(score)
    return RiskProfile(teacher_id=inputs.teacher_id or "", risk_score=score, risk_level=level, factors=factors)


# Convertit un score de risque (0..100) en niveau métier :
# >= 70 → CRITICAL, >= 55 → HIGH, >= 30 → MEDIUM, sinon LOW.
def risk_level(score: float, threshold_medium: float = 30.0, threshold_high: float = 70.0) -> RiskLevel:
    if score >= threshold_high:
        return RiskLevel.CRITICAL
    if score >= threshold_medium:
        return RiskLevel.HIGH if score >= 55.0 else RiskLevel.MEDIUM
    return RiskLevel.LOW
