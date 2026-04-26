"""Competency Gap Predictor using Gradient Boosting (local scikit-learn)."""

import logging
import os
from typing import Any

import joblib
import numpy as np
import pandas as pd
from sklearn.ensemble import GradientBoostingRegressor
from sklearn.model_selection import cross_val_score, train_test_split

from app.config import settings
from app.core.exceptions import InsufficientDataError, ModelNotTrainedError
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


class GapPredictor:
    """Predicts future competency gaps for teachers using Gradient Boosting."""

    def __init__(self):
        self.model: GradientBoostingRegressor | None = None
        self.feature_importances: dict[str, float] | None = None
        self._load_model()

    def _load_model(self) -> None:
        """Load persisted model from disk if available."""
        if os.path.exists(MODEL_PATH):
            try:
                self.model = joblib.load(MODEL_PATH)
                logger.info("Loaded gap predictor model from %s", MODEL_PATH)
            except Exception as e:
                logger.warning("Failed to load model: %s", e)

    def _save_model(self) -> None:
        """Persist trained model to disk."""
        os.makedirs(settings.models_dir, exist_ok=True)
        joblib.dump(self.model, MODEL_PATH)
        logger.info("Saved gap predictor model to %s", MODEL_PATH)

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

        if df_teacher.empty or df_gaps.empty:
            raise InsufficientDataError("Not enough data to train gap predictor.")

        # Merge teacher features with gap labels per competency
        df_train = df_gaps.merge(df_teacher, on="enseignant_id", how="left")
        df_train = df_train.dropna(subset=FEATURE_COLS + ["gap"])

        if len(df_train) < settings.min_training_samples:
            raise InsufficientDataError(
                f"Need at least {settings.min_training_samples} samples, got {len(df_train)}."
            )

        X = df_train[FEATURE_COLS].values
        y = df_train["gap"].values.clip(0, 5)  # Gap is between 0 and 5

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

        self._save_model()

        return {
            "cv_rmse": round(cv_rmse, 3),
            "test_r2": round(test_score, 3),
            "test_rmse": round(test_rmse, 3),
            "n_samples": len(df_train),
            "feature_importances": self.feature_importances,
        }

    def predict(
        self,
        teacher_profiles: list[dict[str, Any]],
        competency_levels: list[dict[str, Any]],
        required_levels: list[dict[str, Any]],
        top_n: int = 10,
    ) -> dict[str, Any]:
        """Predict competency gaps for given teachers."""
        if self.model is None:
            raise ModelNotTrainedError("gap_predictor")

        df_teacher = build_teacher_features(teacher_profiles, competency_levels)
        df_gaps = build_gap_labels(competency_levels, required_levels)

        if df_teacher.empty or df_gaps.empty:
            return {"gaps": [], "overall_risk_score": 0.0, "explanation": {}}

        df_pred = df_gaps.merge(df_teacher, on="enseignant_id", how="left")
        df_pred = df_pred.dropna(subset=FEATURE_COLS)

        if df_pred.empty:
            return {"gaps": [], "overall_risk_score": 0.0, "explanation": {}}

        X = df_pred[FEATURE_COLS].values
        df_pred["predicted_gap"] = self.model.predict(X).clip(0, 5)
        df_pred["confidence"] = 1.0 - (df_pred["predicted_gap"] - df_pred["gap"]).abs() / 5.0
        df_pred["confidence"] = df_pred["confidence"].clip(0.1, 1.0)

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
                    "required_level": float(row["required_level"].fillna(0)),
                    "predicted_gap": round(float(row["predicted_gap"]), 2),
                    "confidence": round(float(row["confidence"]), 2),
                    "risk_level": row["risk_level"],
                })

        overall_risk = float(df_pred["predicted_gap"].mean())

        return {
            "gaps": gaps,
            "overall_risk_score": round(overall_risk, 2),
            "explanation": self.feature_importances or {},
        }


# Singleton instance
gap_predictor = GapPredictor()
