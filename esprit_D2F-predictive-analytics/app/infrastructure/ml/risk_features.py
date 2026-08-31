"""Features de risque partagees (entraînement simulation / serving) — anti-fuite.

Toutes les features sont calculees a ``t`` (AVANT la re-mesure M+3) :
- aucune information posterieure a t (pas de ``gap_next_3m``, pas de
  ``target_observation_date``, pas de niveaux postérieurs) ;
- la CIBLE du modele de risque est la categorie de risque a t+3 calculee
  depuis les niveaux OBSERVES a M+3 (re-mesure simulee), avec la MEME
  definition que le moteur heuristique (coherence de definition) :
      score_risque = 0.50 * min(1, n_gaps_critiques / 2)
                   + 0.12 * min(1, n_gaps_hautes / 1)
                   + 0.40 * moyenne(gap_score des gaps)
      classes : >= 0.75 CRITICAL, >= 0.50 HIGH, >= 0.30 MEDIUM, sinon LOW.

Le même constructeur sert l'entraînement (corpus de simulation) et le serving
(bundle DB + gaps), garantissant l'alignement train/serving.
"""
from __future__ import annotations

from typing import Any

import numpy as np
import pandas as pd

# Seuils de sévérité d'un gap (gap_score = min(1, ecart / 4)) — moteur heuristique.
SEUIL_GAP_CRITIQUE = 0.75
SEUIL_GAP_HAUTE = 0.50
SEUIL_GAP_MOYENNE = 0.25

# Poids du score de risque (moteur heuristique — repli documenté, fail-closed).
RISK_WEIGHTS = {"critical_gaps": 0.50, "high_gaps": 0.12, "avg_gap_score": 0.40}

# Classes du modele de risque ( memes valeurs que RiskLevel ).
RISK_CLASSES = ["LOW", "MEDIUM", "HIGH", "CRITICAL"]
RISK_LEVEL_LABELS_FR = {"LOW": "FAIBLE", "MEDIUM": "MODEREE", "HIGH": "HAUTE", "CRITICAL": "CRITIQUE"}

# Features du modele de risque — TOUTES disponibles a t au serving.
RISK_FEATURES = [
    "n_gaps_total",
    "n_gaps_critical",
    "n_gaps_high",
    "n_gaps_medium",
    "avg_gap_score",
    "max_gap_score",
    "critical_ratio",
    "has_critical",
    "trend_gap_direction",
    "stagnation_months",
    "attendance_rate",
    "nb_formations_completed",
    "nb_besoins_exprimes",
    "nb_besoins_approuves",
    "avg_eval_score",
    "nb_evaluations",
    "avg_level_t",
    "min_level_t",
    "max_level_t",
    "nb_savoirs",
    "competency_coverage_rate",
    "days_since_last_training",
    "training_frequency_per_month",
    "level_change_last_month",
    "rolling_tendance",
    "stagnant_share",
    "long_absent_share",
]

# Contraintes de monotonie XGBoost : plus de gaps critiques / hautes /
# profondeur / stagnation => probabilite de risque JAMAIS plus basse ;
# plus d'amelioration recente du niveau (lag / tendance) => JAMAIS plus haute.
MONOTONE_CONSTRAINTS = {
    "n_gaps_critical": 1,
    "n_gaps_high": 1,
    "n_gaps_medium": 1,
    "avg_gap_score": 1,
    "max_gap_score": 1,
    "critical_ratio": 1,
    "has_critical": 1,
    "trend_gap_direction": 1,
    "stagnation_months": 1,
    "stagnant_share": 1,
    "long_absent_share": 1,
    "level_change_last_month": -1,
    "rolling_tendance": -1,
}



def gap_score_from_levels(required: float, observed: float) -> float:
    """Score de gap normalise dans [0, 1] (moteur heuristique)."""
    return float(min(1.0, max(0.0, required - observed) / 4.0))


def severity_from_gap_score(score: float) -> str:
    if score >= SEUIL_GAP_CRITIQUE:
        return "CRITICAL"
    if score >= SEUIL_GAP_HAUTE:
        return "HIGH"
    if score >= SEUIL_GAP_MOYENNE:
        return "MEDIUM"
    return "LOW"


def risk_score_from_gaps(scores: list[float]) -> float:
    """Score de risque heuristique (0..1) sur les gap_scores des gaps detectes."""
    if not scores:
        return 0.0
    n_crit = sum(1 for s in scores if s >= SEUIL_GAP_CRITIQUE)
    n_high = sum(1 for s in scores if SEUIL_GAP_HAUTE <= s < SEUIL_GAP_CRITIQUE)
    avg = float(np.mean(scores))
    return float(
        RISK_WEIGHTS["critical_gaps"] * min(1.0, n_crit / 2.0)
        + RISK_WEIGHTS["high_gaps"] * min(1.0, n_high / 1.0)
        + RISK_WEIGHTS["avg_gap_score"] * avg
    )


def risk_class_from_score(score: float) -> str:
    if score >= 0.75:
        return "CRITICAL"
    if score >= 0.50:
        return "HIGH"
    if score >= 0.30:
        return "MEDIUM"
    return "LOW"


# ---------------------------------------------------------------------------
# Construction TRAINING : corpus de simulation (1 ligne = enseignant x savoir x mois)
# ---------------------------------------------------------------------------

def build_training_frame(df: pd.DataFrame) -> pd.DataFrame:
    """Construit (features a t, cible t+3) par (enseignant, mois) depuis le corpus simule.

    - gap a t : max(0, required_level - current_level_t) -> gap_score = min(1, gap/4) ;
    - gap a t+3 (cible, OBSERVEE) : max(0, required_level - niveau observe a M+3)
      = max(0, gap_next_3m) (colonne de re-mesure, jamais dans les features) ;
    - trend_gap_direction : signe moyen de l'evolution du gap entre t-1 et t.
    """
    required = pd.to_numeric(df["required_level"], errors="coerce")
    cur_t = pd.to_numeric(df["current_level_t"], errors="coerce")
    cur_t1 = pd.to_numeric(df["current_level_t1"], errors="coerce")
    gap_t = (required - cur_t).clip(lower=0.0)
    gap_t1 = (required - cur_t1).clip(lower=0.0)
    score_t = (gap_t / 4.0).clip(upper=1.0)
    score_t1 = (gap_t1 / 4.0).clip(upper=1.0)
    # gap futur OBSERVE (re-mesure M+3) — CIBLE uniquement, interdit en feature.
    gap_fut = pd.to_numeric(df["gap_next_3m"], errors="coerce").clip(lower=0.0)
    score_fut = (gap_fut / 4.0).clip(upper=1.0)

    df = df.assign(
        _gap_score_t=score_t,
        _gap_score_t1=score_t1,
        _is_gap=score_t >= SEUIL_GAP_MOYENNE,
        _gap_fut_score=score_fut,
    )

    def _agg(g: pd.DataFrame) -> pd.Series:
        scores = g.loc[g["_is_gap"], "_gap_score_t"]
        prev_scores = g.loc[g["_is_gap"], "_gap_score_t1"]
        n_tot = int(len(scores))
        n_crit = int((scores >= SEUIL_GAP_CRITIQUE).sum())
        n_high = int(((scores >= SEUIL_GAP_HAUTE) & (scores < SEUIL_GAP_CRITIQUE)).sum())
        n_med = int(((scores >= SEUIL_GAP_MOYENNE) & (scores < SEUIL_GAP_HAUTE)).sum())
        trend = float(np.mean(np.sign(scores.values - prev_scores.values))) if n_tot else 0.0

        def _med(col: str) -> float:
            v = pd.to_numeric(g[col], errors="coerce").median()
            return float(v) if pd.notna(v) else 0.0

        features = {
            "n_gaps_total": float(n_tot),
            "n_gaps_critical": float(n_crit),
            "n_gaps_high": float(n_high),
            "n_gaps_medium": float(n_med),
            "avg_gap_score": float(scores.mean()) if n_tot else 0.0,
            "max_gap_score": float(scores.max()) if n_tot else 0.0,
            "critical_ratio": n_crit / max(1.0, float(n_tot)),
            "has_critical": 1.0 if n_crit > 0 else 0.0,
            "trend_gap_direction": trend,
            "stagnation_months": _med("months_since_last_training"),
            "attendance_rate": _med("taux_assiduite"),
            "nb_formations_completed": _med("nb_formations_completed"),
            "nb_besoins_exprimes": _med("nb_besoins_exprimes"),
            "nb_besoins_approuves": _med("nb_besoins_approuves"),
            "avg_eval_score": _med("avg_eval_score"),
            "nb_evaluations": _med("nb_evaluations"),
            "avg_level_t": _med("avg_level"),
            "min_level_t": _med("min_level"),
            "max_level_t": _med("max_level"),
            "nb_savoirs": _med("nb_savoirs"),
            "competency_coverage_rate": _med("competency_coverage_rate"),
            "days_since_last_training": _med("days_since_last_training"),
            "training_frequency_per_month": _med("training_frequency_per_month"),
            "level_change_last_month": _med("lag_gap_t1_t"),
            "rolling_tendance": _med("rolling_tendance"),
            "stagnant_share": float(pd.to_numeric(g["is_stagnant"], errors="coerce").mean()),
            "long_absent_share": float(pd.to_numeric(g["is_long_absent"], errors="coerce").mean()),
        }
        # Cible : categorie de risque a t+3 depuis les niveaux OBSERVES (re-mesure).
        fut_scores = g.loc[g["_gap_fut_score"] >= SEUIL_GAP_MOYENNE, "_gap_fut_score"]
        fut_risk_score = risk_score_from_gaps(list(fut_scores.values))
        target = risk_class_from_score(fut_risk_score)
        # Baseline de persistance : classe de risque si on assumait l'etat a t.
        baseline = risk_class_from_score(risk_score_from_gaps(list(scores.values)))
        return pd.Series({**features, "risk_class": target, "risk_score_fut": fut_risk_score, "risk_class_t": baseline})




    grouped = (
        df.sort_values("date_t")
        .groupby(["teacher_id", "ref_month"], sort=True)
        .apply(_agg, include_groups=False)
        .reset_index()
    )
    return grouped


# ---------------------------------------------------------------------------
# Construction SERVING : gaps (SkillGap) + bundle DB — mêmes features qu'à t.
# ---------------------------------------------------------------------------

_TREND_VALUE = {"DECLINING": 1.0, "WORSENING": 1.0, "STABLE": 0.0, "IMPROVING": -1.0}


def build_serving_features(gaps: list[Any], bundle: dict[str, Any], agg: dict[str, float] | None = None) -> dict[str, float]:
    """Features de risque a t depuis les gaps servis + le bundle comportemental.

    ``gaps`` : liste d'objets SkillGap (severity, trend, gap_score).
    ``bundle`` : dict avec ``attendance`` (0..1), ``completed`` (liste), ``needs``,
    ``eval`` (row avg_score/nb), ``stagnation_months`` (float) — même convention
    que ``ArtifactModelPort._teacher_feature_bundle``.
    ``agg`` : agrégats par compétence calculés au serving depuis le bundle
    (mêmes colonnes que la matrice de features du modèle de gaps) —
    voir ``AGG_FEATURE_SOURCES``.
    """
    from app.domain.value_objects.enums import Severity

    agg = agg or {}
    n_tot = len(gaps)
    n_crit = sum(1 for g in gaps if g.severity == Severity.CRITICAL)
    n_high = sum(1 for g in gaps if g.severity == Severity.HIGH)
    n_med = sum(1 for g in gaps if g.severity == Severity.MEDIUM)
    scores = [float(g.gap_score) for g in gaps]
    avg_eval, nb_eval = _safe_eval_row(bundle.get("eval"))
    nb_need, nb_need_ok = _safe_needs_row(bundle.get("needs"))
    features = {
        "n_gaps_total": float(n_tot),
        "n_gaps_critical": float(n_crit),
        "n_gaps_high": float(n_high),
        "n_gaps_medium": float(n_med),
        "avg_gap_score": float(np.mean(scores)) if scores else 0.0,
        "max_gap_score": float(max(scores)) if scores else 0.0,
        "critical_ratio": n_crit / max(1.0, float(n_tot)),
        "has_critical": 1.0 if n_crit > 0 else 0.0,
        "trend_gap_direction": float(
            np.mean([_TREND_VALUE.get(str(getattr(g, "trend").name), 0.0) for g in gaps])
        ) if gaps else 0.0,
        "stagnation_months": float(bundle.get("stagnation_months") or 0.0),
        "attendance_rate": float(bundle.get("attendance") or 0.0),
        "nb_formations_completed": float(len(bundle.get("completed") or [])),
        "nb_besoins_exprimes": float(nb_need),
        "nb_besoins_approuves": float(nb_need_ok),
        "avg_eval_score": float(avg_eval),
        "nb_evaluations": float(nb_eval),
    }
    for k in (
        "avg_level_t", "min_level_t", "max_level_t", "nb_savoirs",
        "competency_coverage_rate", "days_since_last_training",
        "training_frequency_per_month", "level_change_last_month",
        "rolling_tendance", "stagnant_share", "long_absent_share",
    ):
        features[k] = float(agg.get(k, 0.0))
    return features


# Sources des agregats de serving : colonne de la matrice de features du modele
# de gaps (29 features) -> feature de risque. Calculées comme moyennes sur les
# lignes de compétences de l'enseignant (même convention que le corpus simulé).
AGG_FEATURE_SOURCES = {
    "avg_level_t": "avg_level",
    "min_level_t": "min_level",
    "max_level_t": "max_level",
    "nb_savoirs": "nb_savoirs",
    "competency_coverage_rate": "competency_coverage_rate",
    "days_since_last_training": "days_since_last_training",
    "training_frequency_per_month": "training_frequency_per_month",
    "level_change_last_month": "lag_gap_t1_t",
    "rolling_tendance": "rolling_tendance",
    "stagnant_share": "is_stagnant",
    "long_absent_share": "is_long_absent",
}



def features_to_vector(features: dict[str, float]) -> list[float]:
    """Vecteur ordonné selon RISK_FEATURES (contrat artefact)."""
    return [float(features[c]) for c in RISK_FEATURES]


def _safe_eval_row(row: Any) -> tuple[float, int]:
    if not row:
        return 0.0, 0
    avg = float(row["avg_score"]) if row["avg_score"] is not None else 0.0
    return avg, int(row["nb"] or 0)


def _safe_needs_row(row: Any) -> tuple[int, int]:
    if not row:
        return 0, 0
    return int(row["nb"] or 0), int(row["nb_approuves"] or 0)

