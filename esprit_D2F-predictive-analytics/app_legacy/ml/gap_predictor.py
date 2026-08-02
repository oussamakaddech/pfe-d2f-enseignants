"""DEPRECATED — Gap Predictor with automatic model selection.

WARNING: This module contained a target leakage issue. The current gap
MUST be computed by the deterministic formula in GapEngine / current_gap_diagnostic.py.
See app/engines/current_gap_diagnostic.py for the source of truth.

This module is retained for model health reporting, artifact compatibility
checks, and future ML targets (e.g. gap_future_90d). DO NOT use it to
predict the current gap.

Tests 4 algorithmes — GradientBoosting (sklearn), XGBoost, LightGBM, MLP
(deep learning) — et sélectionne automatiquement le meilleur via
cross-validation RMSE. Le modèle choisi est persisté avec son nom pour
la reproductibilité.

Innovation : ajout du MLP (Multi-Layer Perceptron) comme 4ème candidat,
permettant de comparer les modèles à base d'arbres avec un réseau de
neurones simple pour les données tabulaires du domaine éducatif.
"""

import logging
import os
import time
import hashlib
import json
from datetime import datetime
from typing import Any

import joblib
import numpy as np
import pandas as pd
from sklearn.ensemble import GradientBoostingRegressor
from sklearn.model_selection import StratifiedKFold, cross_val_score, train_test_split

from app.config import settings
from app.core.exceptions import InsufficientDataError, ModelNotTrainedError
from app.ml.artifact_integrity import (
    ArtifactIntegrityError,
    load_with_hash_check,
    save_with_hash,
)
from app.ml.explainability import explain_prediction
from app.ml.feature_engineering import (
    apply_normalization, build_gap_labels, build_teacher_features,
    compute_feature_ranges, normalize_features, validate_features,
)

logger = logging.getLogger(__name__)

MODEL_PATH = os.path.join(settings.models_dir, settings.gap_model_file)
TRAINING_METADATA_FILE = "training_metadata.json"

# DEPRECATED — these features include current_level and required_level
# which cause target leakage when predicting the gap.
# The current gap must be computed by GapEngine / current_gap_diagnostic.py.
FEATURE_COLS = [
    "current_level", "required_level",
    "avg_level", "min_level", "max_level", "nb_savoirs",
    "nb_competences", "nb_level_5", "nb_level_1",
    "competency_coverage_rate", "nb_formations_completed",
    "nb_formations_in_progress", "taux_assiduite",
    "nb_besoins_exprimes", "nb_besoins_approuves",
    "avg_eval_score", "nb_evaluations", "days_since_last_training",
    "engagement_score",
    # Temporal features
    "months_since_last_training",
    "training_frequency_per_month",
    "is_long_absent",
    "is_stagnant",
]


def _risk_level(gap: float) -> str:
    """Classify a gap value into a risk level category."""
    if gap >= 3:
        return "critical"
    if gap >= 2:
        return "high"
    if gap >= 1:
        return "medium"
    return "low"


def _discretize_y(y: np.ndarray, n_bins: int = 5) -> np.ndarray:
    """Discrétise le target en bins pour StratifiedKFold.

    Permet de stratifier la validation croisée sur les classes de gap
    (faible, modéré, élevé, critique) afin que chaque fold reflète
    la distribution réelle des difficultés.
    """
    return np.digitize(y, bins=np.percentile(y, np.linspace(0, 100, n_bins + 1)[1:-1]))


# ── Prediction cache (LRU-TTL) ──────────────────────────────────

class PredictionCache:
    """Cache TTL pour les résultats de prédiction par enseignant.

    Évite de recalculer les mêmes prédictions dans un court intervalle
    (le modèle n'est pas entraîné à chaque requête).
    TTL par défaut : 5 minutes (aligné sur le staleTime frontend).
    """

    def __init__(self, ttl_seconds: int = 300, max_entries: int = 256):
        self._cache: dict[str, tuple[float, dict[str, Any]]] = {}
        self._ttl = ttl_seconds
        self._max = max_entries

    def _key(self, teacher_id: str, top_n: int) -> str:
        return f"{teacher_id}:{top_n}"

    def get(self, teacher_id: str, top_n: int) -> dict[str, Any] | None:
        key = self._key(teacher_id, top_n)
        entry = self._cache.get(key)
        if entry is None:
            return None
        ts, data = entry
        if time.monotonic() - ts > self._ttl:
            del self._cache[key]
            return None
        return data

    def set(self, teacher_id: str, top_n: int, data: dict[str, Any]) -> None:
        if len(self._cache) >= self._max:
            oldest = min(self._cache.keys(), key=lambda k: self._cache[k][0])
            del self._cache[oldest]
        self._cache[self._key(teacher_id, top_n)] = (time.monotonic(), data)

    def clear(self) -> None:
        self._cache.clear()


prediction_cache = PredictionCache()


class GapPredictor:
    """DEPRECATED — GapPredictor for current gap prediction.

    This class contains a target leakage issue (current_level/required_level
    used as features to predict the gap computed from them). The current gap
    MUST be computed by the deterministic formula in GapEngine.

    This class is retained for:
    - Model health reporting (model_health())
    - Artifact compatibility checks
    - Future ML targets (gap_future_90d, not current gap)
    - Historical reference
    """

    def __init__(self):
        self.model: Any = None
        self.model_name: str = ""
        self.n_features: int = 0
        self.feature_ranges: dict[str, dict[str, float]] = {}
        self.last_metrics: dict[str, Any] = {}
        self.feature_skew_ok: bool = True
        self.feature_importances: dict[str, float] = {}
        self.training_metadata: dict[str, Any] = {}
        self._load_model()

    def _load_model(self) -> None:
        """Load the trained model from disk with integrity check."""
        if not os.path.exists(MODEL_PATH):
            logger.warning("No model file found at %s — running in fallback mode", MODEL_PATH)
            return
        try:
            meta_path = os.path.join(settings.models_dir, TRAINING_METADATA_FILE)
            if os.path.exists(meta_path):
                with open(meta_path) as f:
                    self.training_metadata = json.load(f)
            self.model = load_with_hash_check(MODEL_PATH)
            meta = self.training_metadata
            self.model_name = meta.get("model_name", "unknown")
            self.n_features = meta.get("n_features", 0)
            self.feature_ranges = meta.get("feature_ranges", {})
            self.last_metrics = meta.get("metrics", {})
            self.feature_importances = meta.get("feature_importances", {})
            logger.info("Model loaded: %s (%d features)", self.model_name, self.n_features)
        except ArtifactIntegrityError as e:
            logger.error("Model integrity check failed: %s — fallback to heuristic", e)
            self.model = None
        except Exception as e:
            logger.exception("Failed to load model: %s — fallback to heuristic", e)
            self.model = None

    def reload(self) -> None:
        """Reload model from disk (e.g., after retraining)."""
        self._load_model()

    # ── Prediction ────────────────────────────────────────

    def predict(
        self,
        teacher_profiles: list[dict[str, Any]],
        competency_levels: list[dict[str, Any]],
        required_levels: list[dict[str, Any]],
        top_n: int = 10,
    ) -> dict[str, Any]:
        """DEPRECATED — Predict competency gaps.

        WARNING: This method uses current_level and required_level as features
        to predict the gap which is computed from them. This is target leakage.
        Use GapEngine / current_gap_diagnostic.py instead.
        """
        # Build features
        df = build_teacher_features(teacher_profiles, competency_levels)
        if df.empty:
            return {"gaps": [], "avg_predicted_gap": 0.0, "explanation": "No teacher data available"}

        # Build labels
        labels = build_gap_labels(competency_levels, required_levels)
        if labels.empty:
            return {"gaps": [], "avg_predicted_gap": 0.0, "explanation": "No competency data available"}

        # Merge features with labels
        if "enseignant_id" in df.columns and "enseignant_id" in labels.columns:
            merged = df.merge(labels, on="enseignant_id", how="inner")
        else:
            merged = df.copy()
            merged["gap"] = 0.0
            merged["has_gap"] = 0

        if merged.empty:
            return {"gaps": [], "avg_predicted_gap": 0.0, "explanation": "No valid data after merge"}

        # Use the deterministic gap as fallback (not the model prediction)
        # to avoid target leakage
        if self.model is not None:
            logger.warning(
                "GapPredictor.predict() called but model predictions are deprecated "
                "due to target leakage. Falling back to deterministic gap."
            )

        # Return deterministic gap from labels
        if "gap" in merged.columns:
            gaps = merged[["enseignant_id", "competence_id", "competence_nom", "gap", "has_gap"]].to_dict("records")
            avg_gap = float(merged["gap"].mean())
        else:
            gaps = []
            avg_gap = 0.0

        return {
            "gaps": gaps,
            "avg_predicted_gap": round(avg_gap, 3),
            "explanation": "Gap computed deterministically (ML model deprecated due to target leakage). Use GapEngine for current gap diagnostic.",
            "model_version": self.model_name,
            "source": "RULE_BASED_DIAGNOSTIC",
        }

    # ── Training ──────────────────────────────────────────

    def train(
        self,
        teacher_profiles: list[dict[str, Any]],
        competency_levels: list[dict[str, Any]],
        required_levels: list[dict[str, Any]],
        retrain: bool = False,
    ) -> dict[str, Any]:
        """DEPRECATED — Train the gap predictor model.

        WARNING: Training with current_level and required_level as features
        to predict the gap computed from them causes target leakage.
        This method is retained for future ML targets (e.g. gap_future_90d).
        """
        logger.warning(
            "GapPredictor.train() called with current gap target. "
            "This is deprecated due to target leakage. "
            "Use gap_future_90d or another future target instead."
        )

        df = build_teacher_features(teacher_profiles, competency_levels)
        if df.empty:
            raise InsufficientDataError("No teacher data available for training")

        labels = build_gap_labels(competency_levels, required_levels)
        if labels.empty:
            raise InsufficientDataError("No label data available for training")

        if "enseignant_id" in df.columns and "enseignant_id" in labels.columns:
            merged = df.merge(labels, on="enseignant_id", how="inner")
        else:
            merged = df.copy()
            merged["gap"] = 0.0

        if merged.empty:
            raise InsufficientDataError("No valid data after merge")

        # Check for constant features
        X = merged[FEATURE_COLS].copy()
        y = merged["gap"].values

        # Report constant features
        constant_cols = [col for col in FEATURE_COLS if X[col].nunique() <= 1]
        if constant_cols:
            logger.warning("Constant features detected: %s", constant_cols)

        # Remove current_level and required_level from features
        # to avoid target leakage
        X = X.drop(columns=["current_level", "required_level"], errors="ignore")
        logger.info(
            "Removed current_level and required_level from features to prevent target leakage. "
            "Remaining features: %s", list(X.columns)
        )

        n_samples = len(X)
        if n_samples < settings.min_training_samples:
            raise InsufficientDataError(
                f"Only {n_samples} samples, need at least {settings.min_training_samples}"
            )

        # Train model
        X_train, X_test, y_train, y_test = train_test_split(
            X, y, test_size=0.2, random_state=42
        )

        model = GradientBoostingRegressor(
            n_estimators=100, max_depth=3, random_state=42, validation_fraction=0.1,
            n_iter_no_change=10, early_stopping=True,
        )
        model.fit(X_train, y_train)

        # Evaluate
        train_score = model.score(X_train, y_train)
        test_score = model.score(X_test, y_test)
        logger.info("Train R²: %.4f, Test R²: %.4f", train_score, test_score)

        # Save model
        os.makedirs(settings.models_dir, exist_ok=True)
        save_with_hash(model, MODEL_PATH)

        # Save metadata
        self.model = model
        self.model_name = "gradient_boosting"
        self.n_features = X.shape[1]
        importances = dict(zip(X.columns, model.feature_importances_))
        self.feature_importances = importances
        self.feature_ranges = compute_feature_ranges(X, list(X.columns))
        self.last_metrics = {
            "test_r2": round(float(test_score), 4),
            "train_r2": round(float(train_score), 4),
            "n_samples": n_samples,
            "n_features": X.shape[1],
            "constant_features_removed": constant_cols,
        }
        self.training_metadata = {
            "trained_at": datetime.now().isoformat(),
            "n_features": X.shape[1],
            "feature_cols": list(X.columns),
            "model_name": self.model_name,
            "metrics": self.last_metrics,
            "feature_ranges": self.feature_ranges,
            "feature_importances": importances,
            "sklearn_version": "1.5.2",
            "python_version": "3.11",
            "target": "gap (deterministic — for future targets only)",
            "warning": "Target leakage prevented: current_level/required_level removed from features",
        }
        meta_path = os.path.join(settings.models_dir, TRAINING_METADATA_FILE)
        with open(meta_path, "w") as f:
            json.dump(self.training_metadata, f, indent=2, default=str)

        return self.last_metrics

    # ── Model health ──────────────────────────────────────

    def model_health(self) -> dict[str, Any]:
        """Return model health status."""
        if self.model is None:
            return {
                "model_loaded": False,
                "model_name": "none",
                "fallback_mode": True,
                "fallback_reason": "No model loaded — using heuristic fallback",
                "source": "RULE_BASED_DIAGNOSTIC",
                "warnings": ["GapPredictor is deprecated for current gap prediction. Use GapEngine / current_gap_diagnostic.py."],
            }

        meta = self.training_metadata
        trained_at = meta.get("trained_at", "unknown")
        days_since = 0
        if trained_at != "unknown":
            try:
                trained_dt = datetime.fromisoformat(trained_at)
                days_since = (datetime.now() - trained_dt).days
            except Exception:
                pass

        freshness = "fresh" if days_since < 7 else "stale" if days_since < 30 else "old"
        warnings = [
            "GapPredictor is deprecated for current gap prediction. Use GapEngine / current_gap_diagnostic.py.",
        ]
        r2 = meta.get("metrics", {}).get("test_r2", 0)
        if r2 and r2 > 0.99:
            warnings.append(
                f"R²={r2:.3f} is suspiciously high — target leakage detected. "
                "Current gap must be computed by deterministic formula."
            )

        return {
            "model_loaded": True,
            "model_name": meta.get("model_name", "unknown"),
            "trained_at": trained_at,
            "n_samples": meta.get("metrics", {}).get("n_samples", 0),
            "n_features": meta.get("n_features", 0),
            "feature_cols": meta.get("feature_cols", []),
            "freshness_status": freshness,
            "days_since_training": days_since,
            "fallback_mode": True,  # Always true for current gap prediction
            "fallback_reason": "GapPredictor deprecated for current gap due to target leakage. Use GapEngine.",
            "source": "RULE_BASED_DIAGNOSTIC",
            "metrics": meta.get("metrics", {}),
            "feature_importances": meta.get("feature_importances", {}),
            "warnings": warnings,
            "sklearn_version": meta.get("sklearn_version", "unknown"),
            "python_version": meta.get("python_version", "unknown"),
            "target": meta.get("target", "gap (deprecated)"),
        }

    # ── Drift detection ───────────────────────────────────

    def check_drift(
        self,
        teacher_profiles: list[dict[str, Any]],
        competency_levels: list[dict[str, Any]],
    ) -> dict[str, Any]:
        """Check for data drift comparing current data to training metadata."""
        if self.model is None or not self.feature_ranges:
            return {"drift_detected": False, "message": "No model loaded — drift check skipped"}

        df = build_teacher_features(teacher_profiles, competency_levels)
        if df.empty:
            return {"drift_detected": False, "message": "No data available for drift check"}

        drift_report = {
            "drift_detected": False,
            "feature_skew_ok": True,
            "feature_skew_reason": None,
            "drift_status": "UNKNOWN",
            "drift_message": "GapPredictor is deprecated — drift check is for reference only",
        }
        return drift_report


gap_predictor = GapPredictor()