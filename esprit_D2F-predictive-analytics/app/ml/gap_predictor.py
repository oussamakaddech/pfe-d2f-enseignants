"""Competency Gap Predictor using Gradient Boosting (local scikit-learn)."""

import logging
import os
from datetime import datetime
from typing import Any

import joblib
import numpy as np
import pandas as pd
from sklearn.ensemble import GradientBoostingRegressor
from sklearn.model_selection import cross_val_score, train_test_split

from app.config import settings
from app.core.exceptions import InsufficientDataError, ModelNotTrainedError
from app.ml.artifact_integrity import (
    ArtifactIntegrityError,
    load_with_hash_check,
    save_with_hash,
)
from app.ml.feature_engineering import build_gap_labels, build_teacher_features

logger = logging.getLogger(__name__)

MODEL_PATH = os.path.join(settings.models_dir, settings.gap_model_file)

FEATURE_COLS = [
    "avg_level", "min_level", "max_level", "nb_savoirs",
    "nb_competences", "nb_level_5", "nb_level_1",
    "competency_coverage_rate", "nb_formations_completed",
    "nb_formations_in_progress", "taux_assiduite",
    "nb_besoins_exprimes", "nb_besoins_approuves",
    "avg_eval_score", "nb_evaluations", "days_since_last_training",
    "engagement_score",
]


def _compare_importances(
    saved_importances: dict[str, float],
    current_importances: dict[str, float],
    threshold: float,
) -> tuple[list[dict], bool, str | None]:
    checked = []
    for feat in FEATURE_COLS:
        old_val = saved_importances.get(feat, 0.0)
        new_val = current_importances.get(feat, 0.0)
        relative_change = abs(new_val - old_val) / old_val if old_val > 0 else 0.0
        checked.append({
            "feature": feat,
            "previous_importance": round(old_val, 4),
            "current_importance": round(new_val, 4),
            "relative_change": round(relative_change, 4),
            "drift_flag": relative_change > threshold,
        })
    drifted = [f for f in checked if f["drift_flag"]]
    if drifted:
        return checked, True, (
            f"Drift detected on {len(drifted)}/{len(FEATURE_COLS)} features. "
            "Consider retraining the model via POST /api/predict/train"
        )
    return checked, False, None


def _check_model_age(meta: dict) -> tuple[bool, str | None, int | None]:
    trained_at = meta.get("trained_at")
    if not trained_at:
        return False, None, None
    try:
        trained_dt = pd.Timestamp(trained_at)
        days_since = (pd.Timestamp.now() - trained_dt).days
        if days_since > 90:
            return True, (
                f"Model was trained {days_since} days ago. "
                "Consider retraining the model via POST /api/predict/train"
            ), days_since
        return False, None, days_since
    except Exception:
        return False, None, None


class GapPredictor:
    """Predicts future competency gaps for teachers using Gradient Boosting."""

    def __init__(self):
        self.model: GradientBoostingRegressor | None = None
        self.feature_importances: dict[str, float] | None = None
        self.last_metrics: dict[str, Any] | None = None
        self._load_model()

    def reload(self) -> None:
        """Recharge le modèle depuis le disque (utilisé après un rollback)."""
        self.model = None
        self.feature_importances = None
        self._load_model()

    def _load_model(self) -> None:
        """Load persisted model from disk, verifying integrity first.

        Refuse de charger un artefact dont le hash/HMAC sidecar est absent
        ou ne correspond pas : prevention contre les uploads malveillants
        de modeles (joblib utilise pickle = code exec arbitraire au load).
        """
        if not os.path.exists(MODEL_PATH):
            return
        try:
            self.model = load_with_hash_check(MODEL_PATH)
            logger.info("Loaded gap predictor model from %s", MODEL_PATH)
        except ArtifactIntegrityError as e:
            logger.error("REFUS de charger %s : %s", MODEL_PATH, e)
        except Exception as e:
            logger.warning("Failed to load model: %s", e)

    def _save_model(self) -> None:
        """Persist trained model to disk + write SHA-256/HMAC sidecar."""
        os.makedirs(settings.models_dir, exist_ok=True)
        save_with_hash(self.model, MODEL_PATH)
        # Also save training metadata for drift monitoring
        self._save_training_metadata()
        logger.info("Saved gap predictor model to %s", MODEL_PATH)

    def _save_training_metadata(self) -> None:
        """Save training metadata (feature stats) for drift detection."""
        import json
        meta_path = os.path.join(settings.models_dir, "training_metadata.json")
        try:
            meta = {
                "trained_at": pd.Timestamp.now().isoformat(),
                "n_features": len(FEATURE_COLS),
                "feature_cols": FEATURE_COLS,
                "cv_folds": settings.cv_folds,
                "min_training_samples": settings.min_training_samples,
            }
            if self.feature_importances:
                meta["feature_importances"] = self.feature_importances
            if self.last_metrics:
                # Persisté pour permettre la comparaison accuracy_before/after
                # lors d'un ré-entraînement avec protection rollback (spec §5).
                meta["metrics"] = {
                    k: self.last_metrics[k]
                    for k in ("test_r2", "test_rmse", "cv_rmse", "n_samples")
                    if k in self.last_metrics
                }
            with open(meta_path, "w", encoding="utf-8") as f:
                json.dump(meta, f, indent=2, default=str)
        except Exception as e:
            logger.warning("Failed to save training metadata: %s", e)

    def check_drift(
        self,
        teacher_profiles: list[dict[str, Any]],
        competency_levels: list[dict[str, Any]],
        threshold: float = 0.15,
    ) -> dict[str, Any]:
        """Check for data drift by comparing feature distributions.

        Compares current feature statistics against training metadata.
        Returns a drift report with per-feature drift flags.
        """
        if self.model is None:
            return {"drift_detected": False, "message": "No model loaded"}

        df_teacher = build_teacher_features(teacher_profiles, competency_levels)
        if df_teacher.empty:
            return {"drift_detected": False, "message": "No data to compare"}

        import json
        meta_path = os.path.join(settings.models_dir, "training_metadata.json")
        if not os.path.exists(meta_path):
            return {"drift_detected": False, "message": "No training metadata found"}

        try:
            with open(meta_path, "r", encoding="utf-8") as f:
                meta = json.load(f)
        except Exception:
            return {"drift_detected": False, "message": "Could not load training metadata"}

        drift_report: dict[str, Any] = {
            "drift_detected": False,
            "checked_features": [],
            "recommendation": None,
        }

        saved_importances = meta.get("feature_importances", {})
        if saved_importances and self.feature_importances:
            checked, drifted, recommendation = _compare_importances(
                saved_importances, self.feature_importances, threshold
            )
            drift_report["checked_features"] = checked
            if drifted:
                drift_report["drift_detected"] = True
                drift_report["recommendation"] = recommendation

        age_drift, age_recommendation, days_since = _check_model_age(meta)
        if days_since is not None:
            drift_report["days_since_training"] = days_since
        if age_drift:
            drift_report["drift_detected"] = True
            drift_report["recommendation"] = age_recommendation

        return drift_report

    def train(
        self,
        teacher_profiles: list[dict[str, Any]],
        competency_levels: list[dict[str, Any]],
        required_levels: list[dict[str, Any]],
    ) -> dict[str, Any]:
        """Train the gap prediction model on historical data.

        Problem type: Regression (predict gap magnitude 0-5)
        Target: gap = required_level - current_level
        Algorithm: GradientBoostingRegressor (handles non-linearities, feature interactions)
        """
        df_teacher = build_teacher_features(teacher_profiles, competency_levels)
        df_gaps = build_gap_labels(competency_levels, required_levels)

        # Diagnostic message that pinpoints the empty input — saves operator
        # debugging time when the train endpoint returns 422.
        if df_teacher.empty or df_gaps.empty:
            missing = []
            if not teacher_profiles:
                missing.append("aucun enseignant (table enseignants vide)")
            if not competency_levels:
                missing.append("aucun niveau de compétence évalué (table enseignant_competences vide)")
            if not required_levels:
                missing.append("aucun niveau requis défini (table niveau_savoir_requis vide)")
            if not missing:
                missing.append("croisement teacher↔gap vide (vérifier les FK savoir_id/competence_id)")
            raise InsufficientDataError(
                "Données insuffisantes pour entraîner le modèle : " + " ; ".join(missing)
            )

        # Merge teacher features with gap labels per competency
        df_train = df_gaps.merge(df_teacher, on="enseignant_id", how="left", validate="m:1")
        df_train = df_train.dropna(subset=FEATURE_COLS + ["gap"])

        if len(df_train) < settings.min_training_samples:
            raise InsufficientDataError(
                f"Échantillon trop petit : {len(df_train)} lignes après jointure "
                f"(seuil = {settings.min_training_samples}). "
                "Augmentez les données ou abaissez MIN_TRAINING_SAMPLES dans .env."
            )

        x_df = df_train[FEATURE_COLS].copy()
        y = df_train["gap"].values.clip(0, 5)  # Gap is between 0 and 5

        # Normalize features for better model convergence
        from app.ml.feature_engineering import normalize_features
        x_df = normalize_features(x_df, FEATURE_COLS)
        X = x_df.values

        # Train/test split for validation
        X_train, X_test, y_train, y_test = train_test_split(
            X, y, test_size=0.2, random_state=42
        )

        self.model = GradientBoostingRegressor(
            n_estimators=200,
            max_depth=5,
            learning_rate=0.1,
            subsample=0.8,
            random_state=42,
        )
        self.model.fit(X_train, y_train)

        # Cross-validation RMSE
        cv_scores = cross_val_score(
            self.model, X_train, y_train,
            cv=settings.cv_folds, scoring="neg_root_mean_squared_error"
        )
        cv_rmse = -cv_scores.mean()

        # Test set performance
        test_score = self.model.score(X_test, y_test)
        test_rmse = np.sqrt(np.mean((self.model.predict(X_test) - y_test) ** 2))

        self.feature_importances = dict(
            zip(FEATURE_COLS, self.model.feature_importances_.tolist())
        )

        self.last_metrics = {
            "cv_rmse": round(cv_rmse, 3),
            "test_r2": round(test_score, 3),
            "test_rmse": round(test_rmse, 3),
            "n_samples": len(df_train),
            "feature_importances": self.feature_importances,
        }

        self._save_model()

        return dict(self.last_metrics)

    def predict(
        self,
        teacher_profiles: list[dict[str, Any]],
        competency_levels: list[dict[str, Any]],
        required_levels: list[dict[str, Any]],
        top_n: int = 10,
    ) -> dict[str, Any]:
        """Predict competency gaps for given teachers.

        If the ML model is not trained, falls back to a heuristic
        computation (deterministic gap = required - current level).
        """
        if self.model is None:
            logger.warning("Model not trained — using heuristic fallback for gap prediction")
            return self._heuristic_predict(
                teacher_profiles, competency_levels, required_levels, top_n
            )

        df_teacher = build_teacher_features(teacher_profiles, competency_levels)
        df_gaps = build_gap_labels(competency_levels, required_levels)

        if df_teacher.empty or df_gaps.empty:
            return {"gaps": [], "overall_risk_score": 0.0, "explanation": {}}

    def _heuristic_predict(
        self,
        teacher_profiles: list[dict[str, Any]],
        competency_levels: list[dict[str, Any]],
        required_levels: list[dict[str, Any]],
        top_n: int = 10,
    ) -> dict[str, Any]:
        """Heuristic fallback when the ML model is not trained.

        Computes gaps deterministically: gap = required_level - current_level.
        Uses engagement and stagnation signals to adjust confidence.
        """
        df_teacher = build_teacher_features(teacher_profiles, competency_levels)
        df_gaps = build_gap_labels(competency_levels, required_levels)

        if df_teacher.empty or df_gaps.empty:
            return {"gaps": [], "overall_risk_score": 0.0, "explanation": {"method": "heuristic", "model_trained": False}}

        df_pred = df_gaps.merge(df_teacher, on="enseignant_id", how="left", validate="m:1")

        if df_pred.empty:
            return {"gaps": [], "overall_risk_score": 0.0, "explanation": {"method": "heuristic", "model_trained": False}}

        # Deterministic gap: required - current (already computed in build_gap_labels)
        df_pred["predicted_gap"] = df_pred["gap"].clip(0, 5)

        # Confidence is lower for heuristic (no ML validation)
        df_pred["confidence"] = 0.5  # Fixed moderate confidence for heuristic

        # Risk level categorization
        def risk_level(gap: float) -> str:
            if gap >= 3: return "critical"
            if gap >= 2: return "high"
            if gap >= 1: return "medium"
            return "low"

        df_pred["risk_level"] = df_pred["predicted_gap"].apply(risk_level)

        # Sort by predicted gap descending, take top N per teacher
        df_pred = df_pred.sort_values(["enseignant_id", "predicted_gap"], ascending=[True, False])

        gaps = []
        for teacher_id, group in df_pred.groupby("enseignant_id"):
            top = group.head(top_n)
            for _, row in top.iterrows():
                gaps.append({
                    "teacher_id": str(teacher_id),
                    "competency_id": int(row["competence_id"]),
                    "competency_name": row["competence_nom"],
                    "domaine_name": row["domaine_nom"],
                    "current_level": float(row["current_level"]),
                    "required_level": float(row.get("required_level") or 0),
                    "predicted_gap": round(float(row["predicted_gap"]), 2),
                    "confidence": round(float(row["confidence"]), 2),
                    "risk_level": row["risk_level"],
                })

        overall_risk = float(df_pred["predicted_gap"].mean())

        return {
            "gaps": gaps,
            "overall_risk_score": round(overall_risk, 2),
            "explanation": {"method": "heuristic", "model_trained": False},
        }


# Singleton instance
gap_predictor = GapPredictor()
