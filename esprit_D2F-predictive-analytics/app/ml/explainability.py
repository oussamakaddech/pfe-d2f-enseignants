"""Model explainability using SHAP and feature importances."""

import logging
from typing import Any

import numpy as np

logger = logging.getLogger(__name__)


def explain_prediction(
    model: Any,
    features: np.ndarray,
    feature_names: list[str],
    sample_idx: int = 0,
) -> dict[str, Any]:
    """Generate a human-readable explanation for a single prediction.

    Uses feature importances as a proxy when SHAP is not available
    (e.g., for GradientBoostingRegressor, we use model.feature_importances_).
    """
    if hasattr(model, "feature_importances_"):
        importances = model.feature_importances_
        top_indices = np.argsort(importances)[::-1][:5]
        top_features = [
            {"feature": feature_names[i], "importance": round(float(importances[i]), 4)}
            for i in top_indices
        ]
        return {
            "method": "feature_importance",
            "top_features": top_features,
            "summary": f"Prediction driven mainly by: {', '.join(f['feature'] for f in top_features[:3])}.",
        }

    return {
        "method": "none",
        "top_features": [],
        "summary": "No explainability available for this model type.",
    }


def get_gap_explanation(
    feature_importances: dict[str, float],
    teacher_features: dict[str, Any],
) -> str:
    """Generate a natural language explanation for a teacher's gap prediction."""
    if not feature_importances:
        return "No explanation available."

    top_feature = max(feature_importances, key=feature_importances.get)
    top_value = teacher_features.get(top_feature, "N/A")

    explanations = {
        "days_since_last_training": f"Long absence from training ({top_value} days) contributes significantly.",
        "avg_level": f"Overall competency level ({top_value:.1f}) is a key predictor.",
        "engagement_score": f"Engagement score ({top_value:.1f}) strongly influences predictions.",
        "taux_assiduite": f"Attendance rate ({top_value:.0%}) affects gap predictions.",
        "nb_formations_completed": f"Training history ({top_value} completed) is a major factor.",
        "competency_coverage_rate": f"Coverage rate ({top_value:.0%}) indicates areas for improvement.",
    }

    return explanations.get(top_feature, f"Feature '{top_feature}' (value: {top_value}) is most influential.")
