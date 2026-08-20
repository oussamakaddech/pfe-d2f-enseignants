"""Validation stricte du schéma de features au serving.

Vérifie dans l'ordre :
1. présence de toutes les features attendues ;
2. ordre exact des colonnes ;
3. types numériques ;
4. plages de valeurs (bornes du training) ;
5. absence de colonnes de fuite (required_level, gap_next_3m).
"""
from __future__ import annotations

from dataclasses import dataclass, field

import numpy as np

LEAK_COLUMNS = {"knowledge_difficulty_level", "required_level", "required_level_t", "gap_next_3m"}


@dataclass
class FeatureValidationResult:
    valid: bool = False
    errors: list[str] = field(default_factory=list)
    warnings: list[str] = field(default_factory=list)

    def fail(self, message: str) -> None:
        self.valid = False
        self.errors.append(message)


def validate_feature_spec(
    feature_names: list[str],
    feature_schema_version: str | None,
    expected_feature_names: list[str],
    expected_schema_version: str | None,
) -> FeatureValidationResult:
    """Valide que la liste des features du modèle match le schéma du code."""
    result = FeatureValidationResult(valid=True)
    if feature_schema_version != expected_schema_version:
        result.fail(
            f"schéma features incompatible : modèle={feature_schema_version}, code={expected_schema_version}"
        )
        return result
    if feature_names != expected_feature_names:
        missing = [c for c in expected_feature_names if c not in feature_names]
        extra = [c for c in feature_names if c not in expected_feature_names]
        if missing:
            result.fail(f"features manquantes : {missing}")
        if extra:
            result.fail(f"features inattendues : {extra}")
        if not missing and not extra and feature_names != expected_feature_names:
            result.fail("ordre des features non canonique")
        return result
    return result


def validate_feature_vector(
    X: np.ndarray,
    feature_names: list[str],
    ranges: dict[str, dict[str, float]],
) -> FeatureValidationResult:
    """Validation runtime d'un vecteur de features avant inference."""
    result = FeatureValidationResult(valid=True)

    leaks = [c for c in feature_names if c in LEAK_COLUMNS]
    if leaks:
        result.fail(f"colonnes de fuite présentes : {leaks}")
        return result

    if X.ndim != 2:
        result.fail(f"X doit être 2D (reçu {X.ndim}D)")
        return result
    if X.shape[1] != len(feature_names):
        result.fail(f"nombre de features {X.shape[1]} != attendu {len(feature_names)}")
        return result

    if not np.issubdtype(X.dtype, np.number):
        result.fail(f"type non numérique : {X.dtype}")
    if np.issubdtype(X.dtype, np.number) and np.isnan(X).any():
        result.fail("valeurs NaN détectées dans les features")

    for i, col in enumerate(feature_names):
        bounds = ranges.get(col)
        if not bounds:
            # Plage non documentée : on ne peut pas vérifier — warning
            # consultatif, pas d'erreur bloquante (le schéma d'ordre/type
            # reste strictement validé).
            result.warnings.append(f"plage non documentée pour la feature {col}")
            continue
        col_min = float(bounds.get("min", -np.inf))
        col_max = float(bounds.get("max", np.inf))
        if col_max < col_min:
            continue
        lo_val = float(X[:, i].min())
        hi_val = float(X[:, i].max())
        tol = max(0.5, (col_max - col_min) * 0.2)
        if lo_val < col_min - tol or hi_val > col_max + tol:
            result.fail(
                f"feature {col} hors plage [{col_min}, {col_max}] "
                f"(valeurs {lo_val:.2f}..{hi_val:.2f})"
            )
        elif lo_val < col_min - 1e-6 or hi_val > col_max + 1e-6:
            result.warnings.append(
                f"feature {col} légèrement hors plage d'entraînement"
            )
    return result
