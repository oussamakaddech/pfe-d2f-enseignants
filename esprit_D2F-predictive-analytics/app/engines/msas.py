"""Multi-Signal Adaptive Scoring (MSAS) — algorithme hybride novel.

Algorithme original qui combine trois sources de signal dans un score
unifié de recommandation de formation, avec des poids adaptatifs qui
s'ajustent dynamiquement en fonction de la confiance de chaque signal.

Innovation : les poids ne sont pas fixes (comme dans un scoring classique)
mais dépendent de la **qualité des données** disponibles pour chaque signal.
Quand un signal est peu fiable (peu de données), son poids diminue
automatiquement au profit des signaux plus fiables.

Signaux combinés :
    S₁ = Gap Score     — écart compétence (GapEngine)
    S₂ = Peer Score    — similarité collaborative (CollaborativeFilter)
    S₃ = Risk Score    — probabilité de décrochage (RiskScoring)

Formule MSAS :
    MSAS(t, f) = α(t)·S₁(t,f) + β(t)·S₂(t,f) + γ(t)·S₃(t)

    où α(t) + β(t) + γ(t) = 1 (poids adaptatifs)

Poids adaptatifs :
    α(t) = confidence_gap(t) / Σ confidence
    β(t) = confidence_peer(t) / Σ confidence
    γ(t) = confidence_risk(t) / Σ confidence

    confidence_gap(t)  = min(1.0, nb_competences_evaluées(t) / seuil_competences)
    confidence_peer(t) = min(1.0, nb_voisins_similaires(t) / K)
    confidence_risk(t) = min(1.0, nb_indicateurs_disponibles(t) / seuil_indicateurs)

Référence : adaptation du weighted ensemble learning avec confidence
weighting (Ting & Witten, 1999), appliqué au domaine éducatif.
"""

from __future__ import annotations

import logging
from typing import Any

logger = logging.getLogger(__name__)

# Seuils de confiance (configurables via settings à terme)
_MIN_COMPETENCES_EVALUATED = 5
_MIN_SIMILAR_NEIGHBORS = 3
_MIN_RISK_INDICATORS = 3


def _clamp01(x: float) -> float:
    return max(0.0, min(1.0, float(x)))


def compute_adaptive_weights(
    teacher_id: str,
    profiles: dict[str, Any],
    peer_data: dict[str, Any],
    risk_data: dict[str, Any],
) -> dict[str, float]:
    """Calcule les poids adaptatifs α, β, γ basés sur la confiance.

    Chaque poids est proportionnel à la confiance dans le signal
    correspondant, puis normalisé pour que α + β + γ = 1.

    Args:
        teacher_id: identifiant de l'enseignant
        profiles: données de profils (compétences évaluées, etc.)
        peer_data: données de filtrage collaboratif (nb voisins, etc.)
        risk_data: données de scoring de risque (facteurs disponibles, etc.)

    Returns:
        dict avec 'alpha', 'beta', 'gamma' (somme = 1.0)
    """
    # Confiance dans le gap score
    nb_comps_eval = profiles.get("nb_competences_evaluees", 0)
    conf_gap = _clamp01(nb_comps_eval / max(_MIN_COMPETENCES_EVALUATED, 1))

    # Confiance dans le peer score
    nb_voisins = peer_data.get("nb_similar_neighbors", 0)
    conf_peer = _clamp01(nb_voisins / max(_MIN_SIMILAR_NEIGHBORS, 1))

    # Confiance dans le risk score
    nb_indicateurs = risk_data.get("nb_risk_indicators", 0)
    conf_risk = _clamp01(nb_indicateurs / max(_MIN_RISK_INDICATORS, 1))

    # Normalisation pour que α + β + γ = 1
    total = conf_gap + conf_peer + conf_risk
    if total < 1e-10:
        # Si aucun signal n'est fiable, poids égaux
        return {"alpha": 1 / 3, "beta": 1 / 3, "gamma": 1 / 3}

    return {
        "alpha": round(conf_gap / total, 4),
        "beta": round(conf_peer / total, 4),
        "gamma": round(conf_risk / total, 4),
    }


def compute_gap_score(
    gap_score: float,
    nb_competences: int,
    nb_critiques: int,
) -> float:
    """Score de gap normalisé [0, 1].

    Combinaison du gap moyen et de la proportion de gaps critiques :
    S₁ = 0.7 × gap_moyen_normalized + 0.3 × proportion_critiques
    """
    gap_norm = _clamp01(gap_score / 5.0)
    prop_crit = _clamp01(nb_critiques / max(nb_competences, 1))
    return round(0.7 * gap_norm + 0.3 * prop_crit, 4)


def compute_peer_score(
    peer_success_rate: float,
    peer_adoption_count: int,
    total_peers: int,
) -> float:
    """Score de recommandation collaborative normalisé [0, 1].

    S₂ = 0.6 × taux_réussite_pairs + 0.4 × log_adoption
    où log_adoption = log(1 + adoption_count) / log(1 + total_peers)
    """
    import math
    success = _clamp01(peer_success_rate)
    log_adopt = math.log(1 + peer_adoption_count) / math.log(2 + total_peers)
    return round(0.6 * success + 0.4 * _clamp01(log_adopt), 4)


def compute_risk_score(
    risk_score: float,
    niveau_risque: str,
) -> float:
    """Score de risque normalisé [0, 1].

    S₃ = risk_score × multiplieur_niveau
    où le multiplieur pénalise les niveaux plus élevés.
    """
    multipliers = {
        "CRITIQUE": 1.0,
        "ELEVE": 0.75,
        "MODERE": 0.5,
        "FAIBLE": 0.25,
    }
    mult = multipliers.get(niveau_risque, 0.5)
    return round(_clamp01(risk_score) * mult, 4)


def msas_score(
    teacher_id: str,
    formation_id: int,
    gap_data: dict[str, Any],
    peer_data: dict[str, Any],
    risk_data: dict[str, Any],
) -> dict[str, Any]:
    """Calcule le score MSAS (Multi-Signal Adaptive Scoring) pour un
    couple (enseignant, formation).

    C'est l'algorithme principal du moteur hybride. Il combine :
    - Le score de gap (à quelle point cette formation comble le gap)
    - Le score de pair (qu'est-ce que les pairs similaires en disent)
    - Le score de risque (quel est le risque de décrochage)

    Les poids s'adaptent dynamiquement selon la fiabilité de chaque signal.

    Returns:
        dict avec :
            - msas_score: float [0, 1] — score final
            - alpha, beta, gamma: poids adaptatifs
            - s_gap, s_peer, s_risk: scores individuels
            - confidence: confiance globale dans le score
            - explanation: explication lisible
    """
    # 1. Calculer les poids adaptatifs
    profiles = {
        "nb_competences_evaluees": gap_data.get("nb_competences_evaluees", 0),
    }
    weights = compute_adaptive_weights(teacher_id, profiles, peer_data, risk_data)

    # 2. Calculer les trois signaux
    s_gap = compute_gap_score(
        gap_data.get("avg_gap", 0.0),
        gap_data.get("nb_competences", 0),
        gap_data.get("nb_critiques", 0),
    )

    s_peer = compute_peer_score(
        peer_data.get("peer_success_rate", 0.5),
        peer_data.get("peer_adoption_count", 0),
        peer_data.get("total_peers", 1),
    )

    s_risk = compute_risk_score(
        risk_data.get("risk_score", 0.0),
        risk_data.get("niveau_risque", "MODERE"),
    )

    # 3. Score MSAS pondéré adaptativement
    alpha, beta, gamma = weights["alpha"], weights["beta"], weights["gamma"]
    msas = alpha * s_gap + beta * s_peer + gamma * s_risk

    # 4. Confiance globale (moyenne harmonique des confidences)
    conf_gap = alpha  # déjà normalisé
    conf_peer = beta
    conf_risk = gamma
    harmonique = 3.0 / (
        1.0 / max(conf_gap, 0.01) +
        1.0 / max(conf_peer, 0.01) +
        1.0 / max(conf_risk, 0.01)
    ) if (conf_gap + conf_peer + conf_risk) > 0 else 0.0

    # 5. Explication
    dominant = "gap" if alpha >= beta and alpha >= gamma else (
        "peer" if beta >= gamma else "risk"
    )
    explanation = (
        f"MSAS = {alpha:.2f}×S₁(gap={s_gap:.2f}) + "
        f"{beta:.2f}×S₂(peer={s_peer:.2f}) + "
        f"{gamma:.2f}×S₃(risk={s_risk:.2f}) = {msas:.4f}. "
        f"Signal dominant: {dominant}."
    )

    return {
        "msas_score": round(msas, 4),
        "alpha": alpha,
        "beta": beta,
        "gamma": gamma,
        "s_gap": s_gap,
        "s_peer": s_peer,
        "s_risk": s_risk,
        "confidence": round(_clamp01(harmonique), 4),
        "dominant_signal": dominant,
        "explanation": explanation,
    }


def msas_batch(
    teacher_id: str,
    formations: list[dict[str, Any]],
    gap_data: dict[str, Any],
    peer_data: dict[str, Any],
    risk_data: dict[str, Any],
    top_n: int = 10,
) -> list[dict[str, Any]]:
    """Calcule les scores MSAS pour un enseignant et un ensemble de formations.

    Retourne les top_n formations triées par score MSAS décroissant.
    """
    scores = []
    for f in formations:
        fid = f.get("formation_id") or f.get("id_formation")
        s = msas_score(
            teacher_id, fid,
            gap_data=gap_data,
            peer_data=peer_data,
            risk_data=risk_data,
        )
        s["formation_id"] = fid
        s["formation_titre"] = f.get("titre_formation", "")
        scores.append(s)

    scores.sort(key=lambda x: x["msas_score"], reverse=True)
    return scores[:top_n]
