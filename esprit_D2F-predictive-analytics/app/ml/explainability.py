"""Model explainability using SHAP and feature importances."""

import logging
from typing import Any

import numpy as np

logger = logging.getLogger(__name__)


def explain_prediction(
    model: Any,
    features: Any = None,
    feature_names: list[str] | None = None,
) -> dict[str, Any]:
    """Generate a human-readable explanation for a prediction.

    Uses feature importances as a proxy when SHAP is not available
    (e.g., for GradientBoostingRegressor, we use model.feature_importances_).

    When ``features`` (a single instance, shape ``(n,)`` or ``(1, n)``) is
    provided, each top feature is enriched with its value and a local
    contribution estimate (importance × value), giving a per-prediction
    explanation rather than a purely global one.
    """
    if not hasattr(model, "feature_importances_"):
        return {
            "method": "none",
            "top_features": [],
            "summary": "No explainability available for this model type.",
        }

    importances = np.asarray(model.feature_importances_, dtype=float)
    names = (
        list(feature_names)
        if feature_names is not None
        else [f"f{i}" for i in range(len(importances))]
    )

    instance: np.ndarray | None = None
    if features is not None:
        arr = np.asarray(features, dtype=float)
        if arr.ndim == 2 and arr.shape[0] >= 1:
            instance = arr[0]
        elif arr.ndim == 1:
            instance = arr

    top_indices = np.argsort(importances)[::-1][:5]
    top_features: list[dict[str, Any]] = []
    for i in top_indices:
        entry: dict[str, Any] = {
            "feature": names[i] if i < len(names) else f"f{i}",
            "importance": round(float(importances[i]), 4),
        }
        if instance is not None and i < len(instance):
            entry["value"] = round(float(instance[i]), 4)
            entry["contribution"] = round(float(importances[i] * instance[i]), 4)
        top_features.append(entry)

    return {
        "method": "feature_importance",
        "top_features": top_features,
        "summary": f"Prediction driven mainly by: {', '.join(f['feature'] for f in top_features[:3])}.",
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
