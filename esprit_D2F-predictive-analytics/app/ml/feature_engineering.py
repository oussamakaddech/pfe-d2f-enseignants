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
