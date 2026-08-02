"""Feature engineering pipeline for predictive analytics."""

from typing import Any

import numpy as np
import pandas as pd


def build_teacher_features(
    teacher_profiles: list[dict[str, Any]],
    competency_levels: list[dict[str, Any]],
) -> pd.DataFrame:
    """Build a feature matrix per teacher for ML models."""
    df_teacher = pd.DataFrame(teacher_profiles)
    df_comp = pd.DataFrame(competency_levels)

    if df_teacher.empty:
        return pd.DataFrame()

    # Aggregate competency stats per teacher
    if not df_comp.empty:
        comp_agg = (
            df_comp.groupby("enseignant_id")
            .agg(
                avg_level=("current_level", "mean"),
                min_level=("current_level", "min"),
                max_level=("current_level", "max"),
                nb_savoirs=("savoir_id", "nunique"),
                nb_competences=("competence_id", "nunique"),
                nb_level_5=("current_level", lambda x: (x == 5).sum()),
                nb_level_1=("current_level", lambda x: (x == 1).sum()),
            )
            .reset_index()
        )
        df_teacher = df_teacher.merge(comp_agg, on="enseignant_id", how="left", validate="m:1")
        max_savoirs = df_teacher["nb_savoirs"].max()
        if max_savoirs and max_savoirs > 0:
            df_teacher["competency_coverage_rate"] = df_teacher["nb_savoirs"] / max_savoirs
        else:
            df_teacher["competency_coverage_rate"] = 0.0
    else:
        for col in ["avg_level", "min_level", "max_level", "nb_savoirs",
                    "nb_competences", "nb_level_5", "nb_level_1", "competency_coverage_rate"]:
            df_teacher[col] = 0.0

    # Ensure all engagement-source columns exist (training data may lack them)
    for col, default in (
        ("nb_formations_completed", 0),
        ("nb_evaluations", 0),
        ("nb_besoins_exprimes", 0),
        ("taux_assiduite", 0.0),
        ("avg_eval_score", 0.0),
        ("days_since_last_training", 0),
        ("avg_days_between_trainings", 0.0),
    ):
        if col not in df_teacher.columns:
            df_teacher[col] = default

    # Engagement score: composite metric
    df_teacher["engagement_score"] = (
        df_teacher["nb_formations_completed"] * 2 +
        df_teacher["nb_evaluations"] * 1.5 +
        df_teacher["nb_besoins_exprimes"] * 1 +
        df_teacher["taux_assiduite"] * 5 +
        df_teacher["avg_eval_score"] * 2
    )

    # ── Temporal features ──────────────────────────────────
    # Mois depuis dernière formation (continuité temporelle)
    df_teacher["months_since_last_training"] = (
        df_teacher["days_since_last_training"] / 30.0
    ).clip(0, 48)

    # Fréquence moyenne de formation (formations / mois d'ancienneté)
    df_teacher["avg_days_between_trainings"] = df_teacher[
        "avg_days_between_trainings"
    ].fillna(0.0)
    df_teacher["training_frequency_per_month"] = (
        df_teacher["nb_formations_completed"]
        / (df_teacher["avg_days_between_trainings"] / 30.0).clip(0.1, None)
    ).clip(0, 10)

    # Absence prolongée : indicateur binaire si > 6 mois sans formation
    df_teacher["is_long_absent"] = (
        (df_teacher["days_since_last_training"] > 180).astype(int)
    )

    # Stagnation récente : pas d'évolution depuis plus de 12 mois
    df_teacher["is_stagnant"] = (
        (df_teacher["days_since_last_training"] > 365).astype(int)
    )

    # Fill NaNs
    df_teacher.fillna(0, inplace=True)
    return df_teacher


def build_gap_labels(
    competency_levels: list[dict[str, Any]],
    required_levels: list[dict[str, Any]],
) -> pd.DataFrame:
    """Build gap labels by joining current levels with required levels."""
    df_curr = pd.DataFrame(competency_levels)
    df_req = pd.DataFrame(required_levels)

    if df_curr.empty or df_req.empty:
        return pd.DataFrame()

    # Merge on savoir_id and competence_id
    merged = df_curr.merge(
        df_req[["competence_id", "savoir_id", "required_level"]],
        on=["competence_id", "savoir_id"],
        how="left",
        validate="m:1",
    )
    merged["gap"] = merged["required_level"].fillna(0) - merged["current_level"]
    merged["has_gap"] = (merged["gap"] > 0).astype(int)
    return merged


def build_training_effectiveness_features(
    training_data: list[dict[str, Any]],
) -> pd.DataFrame:
    """Build features measuring how effective past trainings were."""
    df = pd.DataFrame(training_data)
    if df.empty:
        return df

    df["post_eval_score"] = pd.to_numeric(df["post_eval_score"], errors="coerce")
    return df


def validate_features(df: pd.DataFrame) -> dict[str, Any]:
    """P1.3 — valide les features avant l'entraînement.

    Détecte les outliers métier :
      - taux_assiduite ∈ [0, 1]
      - niveaux ∈ [1, 5] (current_level / required_level / avg_level / min / max)
      - risk_score ∈ [0, 1]
      - engagement_score >= 0
      - days_since_last_training >= 0

    Renvoie un rapport avec outliers par colonne (count, ids exemples).
    Le caller peut choisir de drop, clamp ou alert.
    """
    rules: list[tuple[str, str, float | None, float | None]] = [
        ("taux_assiduite", "in", 0.0, 1.0),
        ("current_level", "in", 1.0, 5.0),
        ("required_level", "in", 1.0, 5.0),
        ("avg_level", "in", 1.0, 5.0),
        ("min_level", "in", 1.0, 5.0),
        ("max_level", "in", 1.0, 5.0),
        ("engagement_score", "ge", 0.0, None),
        ("days_since_last_training", "ge", 0.0, None),
        ("nb_formations_completed", "ge", 0.0, None),
    ]
    outliers: dict[str, dict[str, Any]] = {}
    n_rows = len(df)
    for col, op, lo, hi in rules:
        if col not in df.columns:
            continue
        col_series = pd.to_numeric(df[col], errors="coerce")
        if op == "in" and lo is not None and hi is not None:
            bad = col_series[(col_series < lo) | (col_series > hi)]
        elif op == "ge" and lo is not None:
            bad = col_series[col_series < lo]
        else:
            continue
        if len(bad) > 0:
            outliers[col] = {
                "count": int(len(bad)),
                "pct_of_rows": round(100 * len(bad) / max(n_rows, 1), 2),
                "sample_values": [float(v) for v in bad.head(3).tolist()],
                "rule": f"{col} {op} [{lo}, {hi}]",
            }
    return {
        "n_rows": int(n_rows),
        "outlier_columns": list(outliers.keys()),
        "outliers": outliers,
        "is_clean": len(outliers) == 0,
    }


def normalize_features(df: pd.DataFrame, numeric_cols: list[str]) -> pd.DataFrame:
    """Min-max normalize numeric columns to [0, 1] (fit on the given frame)."""
    df_norm = df.copy()
    for col in numeric_cols:
        if col in df_norm.columns:
            min_v = df_norm[col].min()
            max_v = df_norm[col].max()
            if max_v > min_v:
                df_norm[col] = (df_norm[col] - min_v) / (max_v - min_v)
            else:
                df_norm[col] = 0.0
    return df_norm


def compute_feature_ranges(
    df: pd.DataFrame, numeric_cols: list[str]
) -> dict[str, dict[str, float]]:
    """Capture min/max per feature so the exact same scaling can be replayed.

    Persisting these ranges at train time and replaying them at predict time
    avoids train/serve skew: without it, prediction-time min-max normalization
    would fit on a different (often single-teacher) sample, feeding the model
    features on a different scale than it was trained on.
    """
    ranges: dict[str, dict[str, float]] = {}
    for col in numeric_cols:
        if col in df.columns:
            ranges[col] = {"min": float(df[col].min()), "max": float(df[col].max())}
    return ranges


def apply_normalization(
    df: pd.DataFrame,
    numeric_cols: list[str],
    ranges: dict[str, dict[str, float]],
) -> pd.DataFrame:
    """Apply min-max scaling using pre-computed (training) ranges, clipped to [0, 1]."""
    df_norm = df.copy()
    for col in numeric_cols:
        if col not in df_norm.columns:
            df_norm[col] = 0.0
            continue
        bounds = ranges.get(col)
        if not bounds:
            df_norm[col] = 0.0
            continue
        min_v, max_v = bounds.get("min", 0.0), bounds.get("max", 0.0)
        if max_v > min_v:
            df_norm[col] = ((df_norm[col] - min_v) / (max_v - min_v)).clip(0.0, 1.0)
        else:
            df_norm[col] = 0.0
    return df_norm
