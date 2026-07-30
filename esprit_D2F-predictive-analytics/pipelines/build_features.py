"""Construction des features et split temporel pour le gap predictor temporel.

Ce module transforme le corpus brut (généré par generate_training_corpus.py)
en matrices X (features) / y (target) avec split temporel strict.

Train : periodes t-6..t-2  (4 periodes les plus anciennes)
Test  : periodes t-1..t     (2 periodes les plus recentes)

Features ajoutees / preservees :
  - lag_gap (t-2 - t-3, t-1 - t-2, t - t-1)
  - rolling_tendance (moyenne variations sur 3 mois)
  - days_since_last_training (historique)
  - training_velocity (formations/mois)
  - is_long_absent, is_stagnant
  - aggregated metrics : avg_level, min_level, max_level, etc.

AUCUNE fuite : `required_level` et `gap_next_3m` ne sont JAMAIS dans X.
"""

import json
from pathlib import Path
from typing import Any

import numpy as np
import pandas as pd
from sklearn.model_selection import train_test_split

RANDOM_STATE = 42
np.random.seed(RANDOM_STATE)

BASE_DIR = Path(__file__).parent.parent
CLEAN_DIR = BASE_DIR / "data" / "clean"

# Liste canonique des features (X). Doit etre identique a celle utilisee
# par train_gap_model.py pour eviter le feature skew.
FEATURE_COLS_TEMPORAL = [
    # Historique temporel des niveaux
    "current_level_t3",
    "current_level_t2",
    "current_level_t1",
    "current_level_t",
    # Lag gaps (tendances entre periodes consecutives)
    "lag_gap_t3_t2",
    "lag_gap_t2_t1",
    "lag_gap_t1_t",
    # Moyenne des variations sur 3 mois
    "rolling_tendance",
    # Engagement / stagnation
    "days_since_last_training",
    "training_frequency_per_month",
    "is_long_absent",
    "is_stagnant",
    # Metrics agregees (calculees sur l'historique)
    "avg_level",
    "min_level",
    "max_level",
    "nb_level_5",
    "nb_level_1",
    "nb_savoirs",
    "nb_competences",
    "competency_coverage_rate",
    "nb_formations_completed",
    "nb_formations_in_progress",
    "taux_assiduite",
    "nb_besoins_exprimes",
    "nb_besoins_approuves",
    "avg_eval_score",
    "nb_evaluations",
    "months_since_last_training",
    "engagement_score",
]

TARGET_COL = "gap_next_3m"


def load_corpus(
    corpus_path: Path = CLEAN_DIR / "training_corpus.csv",
) -> pd.DataFrame:
    """Charge le corpus d'entrainement."""
    if not corpus_path.exists():
        raise FileNotFoundError(
            f"Corpus introuvable : {corpus_path}. "
            "Executez d'abord : python -m pipelines.generate_training_corpus"
        )
    return pd.read_csv(corpus_path)


def build_temporal_split(
    df: pd.DataFrame,
    train_periods: tuple[int, ...] = (0, 1, 2, 3),  # t-6..t-3
    test_periods: tuple[int, ...] = (4, 5),         # t-2..t-1
) -> dict[str, Any]:
    """Split temporel strict.

    Le corpus est genere avec un identifiant de periode implicite (l'ordre
    des lignes). On prend les premieres `len(train_periods)` lignes pour
    train et les suivantes pour test.

    Returns:
        dict avec X_train, X_test, y_train, y_test, feature_cols, target_col.
    """
    df = df.reset_index(drop=True)
    n_train = len(train_periods)
    n_test = len(test_periods)
    total_needed = n_train + n_test
    if len(df) < total_needed:
        raise ValueError(
            f"Corpus trop petit : {len(df)} lignes, "
            f"besoin de {total_needed} (train={n_train} + test={n_test})"
        )
    train_df = df.iloc[:n_train * (len(df) // total_needed)].copy()
    test_df = df.iloc[n_train * (len(df) // total_needed):].copy()

    # Verification : toutes les features sont presentes
    missing = [c for c in FEATURE_COLS_TEMPORAL if c not in df.columns]
    if missing:
        raise ValueError(f"Features manquantes dans le corpus : {missing}")
    if TARGET_COL not in df.columns:
        raise ValueError(f"Target '{TARGET_COL}' manquante dans le corpus")

    # Verification : aucune fuite (required_level, gap_next_3m) dans X
    forbidden_in_X = {"required_level_t", TARGET_COL, "required_level"}
    leak_cols = [c for c in FEATURE_COLS_TEMPORAL if c in forbidden_in_X]
    if leak_cols:
        raise ValueError(f"Fuite detectee dans X : {leak_cols}")

    X_train = train_df[FEATURE_COLS_TEMPORAL].astype(float)
    X_test = test_df[FEATURE_COLS_TEMPORAL].astype(float)
    y_train = train_df[TARGET_COL].astype(float).clip(0, 5)
    y_test = test_df[TARGET_COL].astype(float).clip(0, 5)

    return {
        "X_train": X_train,
        "X_test": X_test,
        "y_train": y_train.values,
        "y_test": y_test.values,
        "feature_cols": list(FEATURE_COLS_TEMPORAL),
        "target_col": TARGET_COL,
        "n_train": len(X_train),
        "n_test": len(X_test),
        "train_periods": list(train_periods),
        "test_periods": list(test_periods),
    }


def compute_feature_ranges(
    X_train: pd.DataFrame,
    feature_cols: list[str],
) -> dict[str, dict[str, float]]:
    """Capture min/max par feature (anti train/serve skew)."""
    ranges: dict[str, dict[str, float]] = {}
    for col in feature_cols:
        if col in X_train.columns:
            ranges[col] = {
                "min": float(X_train[col].min()),
                "max": float(X_train[col].max()),
            }
    return ranges


def normalize_with_ranges(
    X: pd.DataFrame,
    feature_cols: list[str],
    ranges: dict[str, dict[str, float]],
) -> pd.DataFrame:
    """Normalise X avec les ranges captures au train time."""
    X_norm = X.copy()
    for col in feature_cols:
        if col not in X_norm.columns:
            continue
        bounds = ranges.get(col)
        if not bounds:
            continue
        min_v, max_v = bounds["min"], bounds["max"]
        if max_v > min_v:
            X_norm[col] = ((X_norm[col] - min_v) / (max_v - min_v)).clip(0.0, 1.0)
        else:
            X_norm[col] = 0.0
    return X_norm


def main() -> dict[str, Any]:
    """Point d'entree : charge corpus, split temporel, dump stats."""
    corpus = load_corpus()
    print(f"[1] Corpus charge : {len(corpus)} lignes")

    split = build_temporal_split(corpus)
    print(f"[2] Split temporel : train={split['n_train']}, test={split['n_test']}")
    print(f"    Features : {len(split['feature_cols'])}")
    print(f"    Target : {split['target_col']}")

    # Sanity checks
    assert "required_level" not in split["feature_cols"], "Fuite required_level dans X"
    assert split["target_col"] not in split["feature_cols"], "Fuite target dans X"

    # Stats descriptives
    y_train_mean = float(split["y_train"].mean())
    y_test_mean = float(split["y_test"].mean())
    print(f"    y_train mean = {y_train_mean:.3f}")
    print(f"    y_test mean = {y_test_mean:.3f}")

    stats = {
        "n_total": len(corpus),
        "n_train": split["n_train"],
        "n_test": split["n_test"],
        "n_features": len(split["feature_cols"]),
        "feature_cols": split["feature_cols"],
        "target_col": split["target_col"],
        "y_train_mean": y_train_mean,
        "y_test_mean": y_test_mean,
        "no_leak_check": "passed",
    }
    output_path = BASE_DIR / "data" / "exports" / "features_stats.json"
    output_path.parent.mkdir(parents=True, exist_ok=True)
    with open(output_path, "w", encoding="utf-8") as f:
        json.dump(stats, f, indent=2)
    print(f"[3] Stats exportees : {output_path}")
    return stats


if __name__ == "__main__":
    main()
