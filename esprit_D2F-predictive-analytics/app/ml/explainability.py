"""Model explainability — SHAP + feature importance fallback.

Utilise SHAP (TreeExplainer) pour des explications précises et
référenciables. Si SHAP n'est pas installé, retombe sur les feature
importances du modèle (proxy global non spécifique à une prédiction).

SHAP fournit :
- **Valeurs SHAP** par feature pour chaque prédiction (explicabilité locale).
- **Importance globale** (mean |SHAP value|) pour l'interprétabilité du modèle.
- **Base value** (prédiction moyenne du modèle) pour contextualiser chaque prédiction.
"""

import logging
from typing import Any

import numpy as np

logger = logging.getLogger(__name__)

# ── SHAP availability detection ──────────────────────────────

_SHAP_AVAILABLE = False
try:
    import shap as _shap
    _SHAP_AVAILABLE = True
except ImportError:
    logger.info("SHAP non installé — utilisation du proxy feature_importance")


def explain_prediction(
    model: Any,
    features: Any = None,
    feature_names: list[str] | None = None,
    x_background: np.ndarray | None = None,
) -> dict[str, Any]:
    """Generate a human-readable explanation for a prediction.

    Priorité d'explicabilité :
    1. SHAP TreeExplainer (si disponible + modèle compatible)
    2. Feature importance globale (proxy, fallback)

    Quand ``features`` (une instance, shape ``(n,)`` ou ``(1, n)``) est
    fourni, les top features sont enrichies avec leur valeur et leur
    contribution locale (importance × value ou valeur SHAP).
    """
    names = (
        list(feature_names)
        if feature_names is not None
        else [f"f{i}" for i in range(getattr(model, "n_features_in_", 17))]
    )

    # ── Attempt 1: SHAP TreeExplainer ─────────────────────────
    if _SHAP_AVAILABLE and features is not None and _is_tree_model(model):
        try:
            return _explain_with_shap(model, features, names, x_background)
        except Exception as e:
            logger.warning("SHAP explainer failed, falling back to feature_importance: %s", e)

    # ── Attempt 2: Feature importance proxy (global) ──────────
    return _explain_with_importance(model, features, names)


def _is_tree_model(model: Any) -> bool:
    """Check if the model is compatible with SHAP TreeExplainer."""
    try:
        from sklearn.ensemble import GradientBoostingRegressor
        from xgboost import XGBRegressor
        from lightgbm import LGBMRegressor
        return isinstance(model, (GradientBoostingRegressor, XGBRegressor, LGBMRegressor))
    except ImportError:
        from sklearn.ensemble import GradientBoostingRegressor
        return isinstance(model, GradientBoostingRegressor)


def _prepare_shap_instance(features: Any) -> np.ndarray | None:
    """Reshape features into a (1, n) instance array, or None if invalid."""
    arr = np.asarray(features, dtype=float)
    if arr.ndim == 2 and arr.shape[0] >= 1:
        return arr.reshape(1, -1)
    if arr.ndim == 1:
        return arr.reshape(1, -1)
    return None


def _sample_background(x_background: np.ndarray | None, instance: np.ndarray) -> np.ndarray:
    """Select a small background sample for SHAP efficiency."""
    if x_background is not None and len(x_background) > 50:
        return x_background[np.random.default_rng().choice(len(x_background), 50, replace=False)]
    return x_background if x_background is not None else instance


def _compute_global_shap_importance(
    explainer: Any, bg: np.ndarray, feature_names: list[str],
) -> dict[str, float]:
    """Compute mean |SHAP| as global feature importance (best-effort)."""
    try:
        n_bg = min(len(bg), 100)
        all_shap = explainer.shap_values(bg[:n_bg])
        all_shap = all_shap[0] if all_shap.ndim > 2 else all_shap
        global_abs = np.mean(np.abs(all_shap), axis=0)
        return dict(zip(
            feature_names[:len(global_abs)],
            [round(float(v), 4) for v in global_abs],
        ))
    except Exception:
        return {}


def _explain_with_shap(
    model: Any,
    features: Any,
    feature_names: list[str],
    x_background: np.ndarray | None = None,
) -> dict[str, Any]:
    """SHAP-based explanation with TreeExplainer."""
    instance = _prepare_shap_instance(features)
    if instance is None:
        return _explain_with_importance(model, features, feature_names)

    bg = _sample_background(x_background, instance)

    explainer = _shap.TreeExplainer(model, data=bg)
    shap_values = explainer.shap_values(instance)
    base_value = float(explainer.expected_value) if np.isscalar(explainer.expected_value) else float(explainer.expected_value[0])

    values = shap_values[0] if shap_values.ndim > 1 else shap_values
    abs_values = np.abs(values)

    # Top 5 features by absolute SHAP value
    top_indices = np.argsort(abs_values)[::-1][:5]
    top_features: list[dict[str, Any]] = []
    for i in top_indices:
        top_features.append({
            "feature": feature_names[i] if i < len(feature_names) else f"f{i}",
            "shap_value": round(float(values[i]), 4),
            "abs_shap": round(float(abs_values[i]), 4),
            "value": round(float(instance[0, i]), 4),
            "direction": "positive" if values[i] > 0 else "negative",
        })

    global_importance = _compute_global_shap_importance(explainer, bg, feature_names)

    return {
        "method": "shap_tree_explainer",
        "base_value": round(base_value, 4),
        "top_features": top_features,
        "global_feature_importance": global_importance,
        "summary": (
            f"Prédiction SHAP : {', '.join(f['feature'] for f in top_features[:3])} "
            f"sont les facteurs les plus influents."
        ),
    }


def _explain_with_importance(
    model: Any,
    features: Any = None,
    feature_names: list[str] | None = None,
) -> dict[str, Any]:
    """Fallback: feature importance globale (proxy non spécifique à une prédiction)."""
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
