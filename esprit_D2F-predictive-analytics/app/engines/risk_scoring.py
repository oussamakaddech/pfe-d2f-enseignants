"""Score de risque enseignant — multi-facteurs à pondérations configurables.

Spec §3 : le score de risque combine cinq facteurs (w1..w5) dont les
pondérations proviennent **exclusivement** de la configuration (jamais codées
en dur). Chaque facteur est normalisé dans [0, 1] et le score final reste dans
[0, 1] grâce à la normalisation des poids (leur somme est ramenée à 1.0).

Le résultat inclut le détail des contributions par facteur, ce qui rend le
score explicable (innovation #2 / #7 du PFE).
"""

from __future__ import annotations

from typing import Any

from app.config import settings

# Clés des cinq facteurs du score de risque (ordre = w1..w5 de la spec).
FACTOR_KEYS = (
    "no_training",       # w1 — absence prolongée de formation / faible complétion
    "stagnation",        # w2 — compétences stagnantes depuis longtemps
    "gap_count",         # w3 — proportion de gaps critiques
    "feedback_decline",  # w4 — régression / baisse de tendance
    "unmet_needs",       # w5 — besoins exprimés non satisfaits
)


def get_weights() -> dict[str, float]:
    """Retourne les poids w1..w5 normalisés (somme = 1.0).

    Les valeurs brutes viennent de `settings`; on les normalise pour que seules
    les proportions comptent et que le score reste borné dans [0, 1].
    """
    raw = {
        "no_training":      settings.risk_weight_no_training,
        "stagnation":       settings.risk_weight_stagnation,
        "gap_count":        settings.risk_weight_gap_count,
        "feedback_decline": settings.risk_weight_feedback_decline,
        "unmet_needs":      settings.risk_weight_unmet_needs,
    }
    total = sum(max(0.0, v) for v in raw.values()) or 1.0
    return {k: max(0.0, v) / total for k, v in raw.items()}


def _clamp01(x: float) -> float:
    return max(0.0, min(1.0, float(x)))


def categorize(score: float) -> str:
    """Catégorise un score [0,1] en FAIBLE / MODERE / ELEVE / CRITIQUE."""
    if score >= settings.risk_score_critique:
        return "CRITIQUE"
    if score >= settings.risk_score_eleve:
        return "ELEVE"
    if score >= settings.risk_score_modere:
        return "MODERE"
    return "FAIBLE"


def compute_risk_score(factors: dict[str, float]) -> dict[str, Any]:
    """Calcule le score de risque pondéré et son explication.

    Args:
        factors: dict {facteur: valeur dans [0,1]}. Les clés inconnues sont
            ignorées; les facteurs absents valent 0.

    Returns:
        dict avec `score_risque` (0-1), `niveau_risque`, `contributions`
        (part de chaque facteur dans le score) et `weights` (poids normalisés).
    """
    weights = get_weights()
    contributions = {
        key: round(weights[key] * _clamp01(factors.get(key, 0.0)), 4)
        for key in FACTOR_KEYS
    }
    score = round(min(1.0, sum(contributions.values())), 4)
    return {
        "score_risque":  score,
        "niveau_risque": categorize(score),
        "contributions": contributions,
        "weights":       {k: round(v, 4) for k, v in weights.items()},
    }


def build_factors_from_gaps(
    gaps: list,
    taux_completion: float,
    nb_besoins_exprimes: int = 0,
    nb_besoins_approuves: int = 0,
) -> dict[str, float]:
    """Dérive les cinq facteurs [0,1] à partir des gaps et du snapshot.

    - no_training      : 1 - taux_completion/100
    - stagnation       : mois de stagnation max / fenêtre configurée
    - gap_count        : proportion de gaps critiques
    - feedback_decline : 1.0 si au moins un gap en régression, sinon 0.0
    - unmet_needs      : (besoins exprimés - approuvés) / saturation configurée
    """
    nb_gaps = len(gaps)
    nb_crit = sum(1 for g in gaps if getattr(g, "niveau_urgence", "") == "CRITIQUE")
    mois_stag_max = max((getattr(g, "mois_stagnation", 0) for g in gaps), default=0)
    en_regression = any(getattr(g, "en_regression", False) for g in gaps)
    unmet = max(0, int(nb_besoins_exprimes) - int(nb_besoins_approuves))

    return {
        "no_training":      _clamp01(1.0 - (taux_completion / 100.0)),
        "stagnation":       _clamp01(mois_stag_max / max(settings.risk_stagnation_window_months, 1)),
        "gap_count":        _clamp01(nb_crit / max(nb_gaps, 1)),
        "feedback_decline": 1.0 if en_regression else 0.0,
        "unmet_needs":      _clamp01(unmet / max(settings.risk_unmet_needs_saturation, 1)),
    }
