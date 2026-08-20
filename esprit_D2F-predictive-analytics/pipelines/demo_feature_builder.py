"""FeatureBuilder partagé du pipeline démo synthétique.

Canonical unique : ce module est la SEULE source du contrat de features du
pipeline expérimental (29 features ``current_level_*`` du schéma servi 1.0).
Il est utilisé par la génération, le nettoyage, l'entraînement et l'inférence
application afin d'éviter tout train/serve skew.

Règles anti-fuite appliquées ici et vérifiées à chaque construction :
- ``gap_next_3m`` et toute colonne ``future_*`` sont INTERDITES dans X ;
- ``current_observation`` (observation pédagogique du mois courant) n'est
  jamais une feature (proxy de la cible) ;
- ``knowledge_difficulty_level`` est la difficulté pédagogique du savoir ;
  ce n'est PAS le niveau de maîtrise de l'enseignant — jamais feature.
"""
from __future__ import annotations

from typing import Any

import numpy as np
import pandas as pd

from pipelines.demo_common import (
    FEATURE_NAMES,
    FORBIDDEN_IN_X,
    GAP_MAX,
    GAP_MIN,
    SCALE_MAX,
    SCALE_MIN,
    TARGET_COL,
    schema_hash,
)

FEATURE_SCHEMA_VERSION = "1.0"


class FeatureLeakageError(ValueError):
    """Levée si une colonne interdite est présente dans X."""


class FeatureBuilder:
    """Construit X/y depuis un dataset en respectant le contrat de features."""

    def __init__(self, feature_names: list[str] | None = None, target_col: str = TARGET_COL) -> None:
        self.feature_names = list(feature_names or FEATURE_NAMES)
        self.target_col = target_col
        self.forbidden = set(FORBIDDEN_IN_X)

    def schema(self) -> dict[str, Any]:
        return {
            "feature_schema_version": FEATURE_SCHEMA_VERSION,
            "feature_names": list(self.feature_names),
            "target": self.target_col,
            "forbidden_in_X": sorted(self.forbidden),
            "feature_schema_hash": schema_hash(self.feature_names),
        }

    def validate_no_leak(self, X_columns: list[str]) -> list[str]:
        """Retourne les colonnes de fuite présentes dans X (vide = OK)."""
        return [c for c in X_columns if c in self.forbidden]

    def build(self, df: pd.DataFrame) -> dict[str, Any]:
        """Construit X (DataFrame des features), y (target), et vérifie l'anti-fuite."""
        missing = [c for c in self.feature_names if c not in df.columns]
        if missing:
            raise ValueError(f"Features absentes du dataset : {missing}")
        if self.target_col not in df.columns:
            raise ValueError(f"Target '{self.target_col}' absente du dataset")

        X = df[self.feature_names].astype(float).copy()
        leaks = self.validate_no_leak(list(X.columns))
        if leaks:
            raise FeatureLeakageError(f"Fuite détectée dans X : {leaks}")

        y = pd.to_numeric(df[self.target_col], errors="coerce").astype(float)
        y = y.clip(GAP_MIN, GAP_MAX)
        return {"X": X, "y": y, "feature_names": list(self.feature_names)}

    def build_train(self, df: pd.DataFrame) -> dict[str, Any]:
        """Construit X/y ET capture les ranges de normalisation sur le train."""
        built = self.build(df)
        ranges = compute_feature_ranges(built["X"], self.feature_names)
        built["feature_ranges"] = ranges
        return built

    @staticmethod
    def build_temporal_split(df: pd.DataFrame, train_frac: float = 0.7, val_frac: float = 0.15) -> dict[str, Any]:
        """Split temporel STRICT train/validation/test sur ``ref_month``.

        Interdit shuffle. Vérifie :
            max(train.ref_month) < min(val.ref_month) < min(test.ref_month)
        """
        if "ref_month" not in df.columns:
            raise ValueError("Colonne ref_month requise pour le split temporel")
        df = df.copy()
        df["ref_month"] = pd.to_datetime(df["ref_month"])
        df = df.sort_values(["ref_month", "teacher_id", "competence_id"]).reset_index(drop=True)

        months = sorted(df["ref_month"].dt.to_period("M").unique())
        n = len(months)
        if n < 3:
            raise ValueError(f"Au moins 3 mois distincts requis pour le split, obtenu {n}")
        n_val = max(1, int(round(n * val_frac)))
        n_test = max(1, int(round(n * (1.0 - train_frac - val_frac))))
        n_train = n - n_val - n_test
        if n_train < 1:
            raise ValueError("train_frac trop faible : aucun mois en train")

        train_months = set(m for m in months[:n_train])
        val_months = set(m for m in months[n_train : n_train + n_val])
        test_months = set(m for m in months[n_train + n_val :])

        periods = df["ref_month"].dt.to_period("M")
        train = df[periods.isin(train_months)].copy()
        validation = df[periods.isin(val_months)].copy()
        test = df[periods.isin(test_months)].copy()

        if not (len(train) and len(validation) and len(test)):
            raise ValueError("Split temporel : un des ensembles est vide")

        assert train["ref_month"].max() < validation["ref_month"].min(), "fuite temporelle train->val"
        assert validation["ref_month"].max() < test["ref_month"].min(), "fuite temporelle val->test"

        def _months(dfx: pd.DataFrame) -> list[str]:
            return sorted(str(p) for p in dfx["ref_month"].dt.to_period("M").unique())

        return {
            "train": train,
            "validation": validation,
            "test": test,
            "train_months": _months(train),
            "validation_months": _months(validation),
            "test_months": _months(test),
            "train_rows": len(train),
            "validation_rows": len(validation),
            "test_rows": len(test),
        }


def compute_feature_ranges(X: pd.DataFrame, feature_names: list[str]) -> dict[str, dict[str, float]]:
    ranges: dict[str, dict[str, float]] = {}
    for col in feature_names:
        if col in X.columns:
            ranges[col] = {"min": float(X[col].min()), "max": float(X[col].max())}
    return ranges


def normalize_with_ranges(
    X: pd.DataFrame,
    feature_names: list[str],
    ranges: dict[str, dict[str, float]],
) -> pd.DataFrame:
    X_norm = X.copy()
    for col in feature_names:
        if col not in X_norm.columns:
            continue
        bounds = ranges.get(col)
        if not bounds:
            continue
        mn, mx = bounds["min"], bounds["max"]
        if mx > mn:
            X_norm[col] = ((X_norm[col] - mn) / (mx - mn)).clip(0.0, 1.0)
        else:
            X_norm[col] = 0.0
    return X_norm
