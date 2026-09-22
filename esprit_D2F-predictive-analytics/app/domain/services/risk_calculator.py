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
class RiskThresholds:
    """Bornes de classement du score de risque (0..100), configurables.

    ``critical`` correspond a la cle de configuration ``RISK_THRESHOLD_HIGH``,
    qui declenche aussi les alertes (generate_alerts) : une seule valeur pilote
    donc le niveau CRITIQUE et l'alerte, sans divergence possible.
    """

    medium: float = 30.0
    high: float = 55.0
    critical: float = 70.0


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
def compute_risk(
    inputs: RiskInputs,
    weights: dict[str, float],
    thresholds: RiskThresholds | None = None,
) -> RiskProfile:
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

    bounds = thresholds or RiskThresholds()
    level = risk_level(score, bounds.medium, bounds.high, bounds.critical)
    return RiskProfile(teacher_id=inputs.teacher_id or "", risk_score=score, risk_level=level, factors=factors)


# Convertit un score de risque (0..100) en niveau métier :
# >= critical → CRITICAL, >= high → HIGH, >= medium → MEDIUM, sinon LOW.
# Les bornes par défaut reproduisent le paramétrage historique (30 / 55 / 70).
def risk_level(
    score: float,
    threshold_medium: float = 30.0,
    threshold_high: float = 55.0,
    threshold_critical: float = 70.0,
) -> RiskLevel:
    if score >= threshold_critical:
        return RiskLevel.CRITICAL
    if score >= threshold_high:
        return RiskLevel.HIGH
    if score >= threshold_medium:
        return RiskLevel.MEDIUM
    return RiskLevel.LOW


# ══════════════════════════════════════════════════════════════════════════════
# Moteur de risque DÉRIVÉ DES ÉCARTS (poids 0.50 / 0.12 / 0.40)
# ══════════════════════════════════════════════════════════════════════════════
# UNE SEULE implémentation pour tous les chemins qui exposent un score calculé
# depuis les écarts : serving des écarts (`predictor.rule_risk_from_gaps`), KPI
# du tableau de bord, chemins legacy. Avant ce correctif, le tableau de bord
# lisait `analyse.teacher_risk_profiles` — 17 profils figés au 2026-07-30 et
# produits par l'ANCIEN moteur (0.30/0.25/0.20/0.15/0.10) — alors que la fiche
# enseignant servait 0.50/0.12/0.40 : le même enseignant affichait 0,2877 ici et
# 0,4167 là (audit d'autorité 2026-09-22, §3.2 et §3.5).
GAP_RISK_CRITICAL_CAP = 2.0
GAP_RISK_HIGH_CAP = 1.0
GAP_RISK_WEIGHTS = {"critical_gaps": 0.50, "high_gaps": 0.12, "avg_gap_score": 0.40}
# Bornes de niveau SPÉCIFIQUES à ce moteur : CRITIQUE >= 75, ELEVE >= 50, MOYEN >= 30.
# Elles diffèrent volontairement des bornes génériques (70/55/30) utilisées par
# le moteur comportemental `compute_risk` ; ne pas les confondre.
GAP_RISK_LEVEL_THRESHOLDS = {"critical": 75.0, "high": 50.0, "medium": 30.0}


@dataclass(frozen=True)
class GapRiskScore:
    """Résultat normalisé du moteur de risque dérivé des écarts."""

    score_01: float          # score borné 0..1
    uncapped: float          # somme des contributions avant plafonnement
    is_capped: bool
    risk_score: float        # score métier 0..100 (arrondi 2 décimales)
    level: RiskLevel
    critical_gaps: int
    high_gaps: int
    avg_gap_score: float
    normalized: dict[str, float]
    contributions: dict[str, float]


def gap_risk_score(n_critical: int, n_high: int, avg_gap_score: float) -> GapRiskScore:
    """Score de risque normalisé depuis les agrégats d'écarts (formule unique).

    Facteurs normalisés dans [0, 1] avec caps documentés :
    - ``critical_gaps`` : cap ``GAP_RISK_CRITICAL_CAP`` (2) ;
    - ``high_gaps`` : cap ``GAP_RISK_HIGH_CAP`` (1) ;
    - ``avg_gap_score`` : déjà borné dans [0, 1] par construction.
    Somme des poids = 1.02 (> 1) : le plafonnement est possible et signalé.
    """
    n_critical_norm = min(1.0, max(0.0, float(n_critical) / GAP_RISK_CRITICAL_CAP))
    n_high_norm = min(1.0, max(0.0, float(n_high) / GAP_RISK_HIGH_CAP))
    avg_norm = min(1.0, max(0.0, float(avg_gap_score)))
    contributions = {
        "critical_gaps": n_critical_norm * GAP_RISK_WEIGHTS["critical_gaps"],
        "high_gaps": n_high_norm * GAP_RISK_WEIGHTS["high_gaps"],
        "avg_gap_score": avg_norm * GAP_RISK_WEIGHTS["avg_gap_score"],
    }
    uncapped = sum(contributions.values())
    score_01 = min(1.0, max(0.0, uncapped))
    risk_score = round(100.0 * score_01, 2)
    if risk_score >= GAP_RISK_LEVEL_THRESHOLDS["critical"]:
        level = RiskLevel.CRITICAL
    elif risk_score >= GAP_RISK_LEVEL_THRESHOLDS["high"]:
        level = RiskLevel.HIGH
    elif risk_score >= GAP_RISK_LEVEL_THRESHOLDS["medium"]:
        level = RiskLevel.MEDIUM
    else:
        level = RiskLevel.LOW
    return GapRiskScore(
        score_01=score_01,
        uncapped=uncapped,
        is_capped=uncapped > 1.0,
        risk_score=risk_score,
        level=level,
        critical_gaps=int(n_critical),
        high_gaps=int(n_high),
        avg_gap_score=float(avg_gap_score),
        normalized={
            "critical_gaps": round(n_critical_norm, 4),
            "high_gaps": round(n_high_norm, 4),
            "avg_gap_score": round(avg_norm, 4),
        },
        contributions=contributions,
    )
