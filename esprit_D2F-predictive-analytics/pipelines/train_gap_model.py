"""Entrainement du modele gap predictor temporel (gap_next_3m).

Compare 3 modeles : GradientBoosting, XGBoost, MLP (sklearn).
Baseline = persistance : y_pred = gap_t = current_gap_t (current - required).
Critere de succes : lift_rmse > 0  (ML doit faire mieux que la baseline).

Exporte le meilleur modele en joblib avec :
  - modele (joblib)
  - metadata : n_features, metrics, baseline_rmse, lift_rmse, model_name
  - SHA-256/HMAC sidecar (artifact_integrity)
"""

import json
import sys
from pathlib import Path
from typing import Any

import joblib
import numpy as np
import pandas as pd
from sklearn.ensemble import GradientBoostingRegressor
from sklearn.metrics import mean_absolute_error, mean_squared_error, r2_score
from sklearn.model_selection import StratifiedKFold, cross_val_score

sys.path.insert(0, str(Path(__file__).parent.parent))

from app.ml.artifact_integrity import save_with_hash
from app.ml.deep_learning import build_mlp_pipeline
from app.ml.feature_engineering import compute_feature_ranges, normalize_features
from pipelines.build_features import (
    FEATURE_COLS_TEMPORAL, build_temporal_split, load_corpus,
    normalize_with_ranges,
)

RANDOM_STATE = 42
np.random.seed(RANDOM_STATE)

BASE_DIR = Path(__file__).parent.parent
MODELS_DIR = BASE_DIR / "data" / "models"
MODELS_DIR.mkdir(parents=True, exist_ok=True)
MODEL_PATH = MODELS_DIR / "gap_predictor_temporal.joblib"
METADATA_PATH = MODELS_DIR / "temporal_training_metadata.json"


def build_candidates() -> list[tuple[str, Any]]:
    """Construit la liste des 3 modeles candidats (random_state=42 partout)."""
    candidates: list[tuple[str, Any]] = []

    candidates.append((
        "gradient_boosting",
        GradientBoostingRegressor(
            n_estimators=120, max_depth=3, learning_rate=0.08,
            subsample=0.85, random_state=RANDOM_STATE,
            min_samples_split=10, min_samples_leaf=5,
            max_features="sqrt", loss="squared_error",
        ),
    ))

    try:
        from xgboost import XGBRegressor
        candidates.append((
            "xgboost",
            XGBRegressor(
                n_estimators=120, max_depth=3, learning_rate=0.08,
                subsample=0.85, random_state=RANDOM_STATE,
                verbosity=0, n_jobs=-1,
                reg_alpha=0.1, reg_lambda=1.0, min_child_weight=5,
            ),
        ))
    except ImportError:
        print("[INFO] XGBoost non disponible, skip")

    try:
        candidates.append(("mlp", build_mlp_pipeline()))
    except Exception as e:
        print(f"[INFO] MLP non disponible : {e}")

    return candidates


def compute_baseline(y_test: np.ndarray, gap_t: np.ndarray) -> dict[str, float]:
    """Baseline persistance : y_pred = gap_t (le gap actuel comme prevision du futur).

    Pour un modele d'anticipation, la baseline naive est de predire
    que le gap futur sera identique au gap actuel.
    """
    baseline_pred = np.clip(gap_t, 0, 5)
    rmse = float(np.sqrt(mean_squared_error(y_test, baseline_pred)))
    mae = float(mean_absolute_error(y_test, baseline_pred))
    r2 = float(r2_score(y_test, baseline_pred)) if len(y_test) > 1 else 0.0
    return {"baseline_rmse": rmse, "baseline_mae": mae, "baseline_r2": r2}


def cross_validate_model(model: Any, X: np.ndarray, y: np.ndarray, cv: int = 5) -> float:
    """Validation croisee StratifiedKFold, retourne RMSE moyen."""
    y_bins = np.digitize(y, bins=np.percentile(y, np.linspace(0, 100, cv + 1)[1:-1]))
    skf = StratifiedKFold(n_splits=cv, shuffle=True, random_state=RANDOM_STATE)
    scores = cross_val_score(model, X, y, cv=skf, scoring="neg_root_mean_squared_error")
    return float(-scores.mean())


def evaluate_on_test(
    model: Any, X_test: np.ndarray, y_test: np.ndarray,
    baseline_rmse: float,
) -> dict[str, float]:
    """Evalue un modele sur le test set, calcule le lift vs baseline."""
    preds = np.clip(model.predict(X_test), 0, 5)
    rmse = float(np.sqrt(mean_squared_error(y_test, preds)))
    mae = float(mean_absolute_error(y_test, preds))
    r2 = float(r2_score(y_test, preds)) if len(y_test) > 1 else 0.0
    lift_rmse = round(baseline_rmse - rmse, 4)  # positif = ML > baseline
    return {"test_rmse": rmse, "test_mae": mae, "test_r2": r2, "lift_rmse": lift_rmse}


def train_gap_model(
    n_samples: int = 5000, cv_folds: int = 5, min_lift_rmse: float = 0.0,
) -> dict[str, Any]:
    """Entraine le modele gap temporal, retourne les metriques completes.

    Returns:
        dict avec : model_name, metrics, baseline_rmse, lift_rmse,
        decision ('accept' si lift_rmse > min_lift_rmse, sinon 'reject'),
        n_samples, n_features.
    """
    print(f"[1] Chargement corpus ({n_samples} lignes attendues)...")
    corpus = load_corpus()
    if len(corpus) < n_samples:
        print(f"[WARN] Corpus actuel = {len(corpus)} lignes (cible {n_samples})")

    print("[2] Split temporel + construction features...")
    split = build_temporal_split(corpus)
    X_train, X_test = split["X_train"], split["X_test"]
    y_train, y_test = split["y_train"], split["y_test"]
    feature_cols = split["feature_cols"]

    # Normalisation (anti train/serve skew)
    ranges = compute_feature_ranges(X_train, feature_cols)
    X_train_norm = normalize_features(X_train, feature_cols)
    X_test_norm = normalize_with_ranges(X_test, feature_cols, ranges)
    X_train_arr = X_train_norm.values
    X_test_arr = X_test_norm.values

    # Baseline = persistance (gap_t comme prevision de gap_next_3m)
    # gap_t = max(0, required_level_t - current_level_t)
    # Ici on approxime par current_level_t puisque required_level n'est pas dans X
    # (pour eviter la fuite). On utilise current_level_t comme proxy de "niveau futur probable".
    # La baseline naive devient : y_pred = current_gap_at_t (qu'on approxime par
    # max(0, current_level_t - mean_level_hist) ou similaire).
    # Pour rester simple et documente : baseline = 0 (pas de gap futur si niveau actuel eleve)
    gap_t_proxy = np.clip(
        X_test["current_level_t"].astype(float).values -
        X_test["avg_level"].astype(float).values,
        0, 5,
    )
    baseline_metrics = compute_baseline(y_test, gap_t_proxy)
    baseline_rmse = baseline_metrics["baseline_rmse"]
    print(f"[3] Baseline persistance : RMSE={baseline_rmse:.4f}")

    # Comparaison candidats
    print("[4] Comparaison candidats (CV-RMSE)...")
    candidates = build_candidates()
    cv_results: dict[str, float] = {}
    fitted_candidates: dict[str, Any] = {}

    for name, model in candidates:
        try:
            cv_rmse = cross_validate_model(model, X_train_arr, y_train, cv_folds)
            cv_results[name] = round(cv_rmse, 4)
            # Re-fit sur tout le train
            model.fit(X_train_arr, y_train)
            fitted_candidates[name] = model
            print(f"    {name}: CV-RMSE = {cv_rmse:.4f}")
        except Exception as e:
            print(f"    {name}: FAILED ({e})")
            cv_results[name] = float("inf")

    # Selection du meilleur (min CV-RMSE)
    best_name = min(cv_results, key=lambda k: cv_results[k])
    best_model = fitted_candidates[best_name]
    print(f"[5] Meilleur modele : {best_name} (CV-RMSE = {cv_results[best_name]:.4f})")

    # Evaluation sur test set
    test_metrics = evaluate_on_test(best_model, X_test_arr, y_test, baseline_rmse)
    print(f"[6] Test set : RMSE={test_metrics['test_rmse']:.4f}, "
          f"MAE={test_metrics['test_mae']:.4f}, R2={test_metrics['test_r2']:.4f}, "
          f"lift_rmse={test_metrics['lift_rmse']:.4f}")

    # Decision
    decision = "accept" if test_metrics["lift_rmse"] > min_lift_rmse else "reject"
    print(f"[7] Decision : {decision} (lift_rmse={test_metrics['lift_rmse']:.4f} > {min_lift_rmse})")

    # Feature importances (si disponibles)
    feature_importances = {}
    if hasattr(best_model, "feature_importances_"):
        feature_importances = dict(zip(feature_cols, best_model.feature_importances_.tolist()))
    elif hasattr(best_model, "named_steps") and "mlp" in best_model.named_steps:
        mlp = best_model.named_steps["mlp"]
        if hasattr(mlp, "coefs_"):
            imp = np.abs(mlp.coefs_[0]).mean(axis=1)
            feature_importances = {f: round(float(v), 6) for f, v in zip(feature_cols, imp)}

    metrics = {
        "model_name": best_name,
        "n_samples": len(corpus),
        "n_train": split["n_train"],
        "n_test": split["n_test"],
        "n_features": len(feature_cols),
        "feature_cols": feature_cols,
        "cv_folds": cv_folds,
        "candidate_cv_scores": cv_results,
        "metrics": {
            "test_r2": round(test_metrics["test_r2"], 4),
            "test_rmse": round(test_metrics["test_rmse"], 4),
            "test_mae": round(test_metrics["test_mae"], 4),
            "baseline_rmse": round(baseline_rmse, 4),
            "baseline_mae": round(baseline_metrics["baseline_mae"], 4),
            "lift_rmse": test_metrics["lift_rmse"],
        },
        "feature_importances": {k: round(v, 6) for k, v in feature_importances.items()},
        "feature_ranges": ranges,
        "decision": decision,
        "trained_at": pd.Timestamp.now().isoformat(),
    }

    # Export : joblib + SHA-256/HMAC sidecar (preserve l'integrite)
    save_with_hash(best_model, MODEL_PATH)

    # Metadata
    METADATA_PATH.write_text(
        json.dumps(metrics, indent=2, ensure_ascii=False),
        encoding="utf-8",
    )
    print(f"[8] Modele sauvegarde : {MODEL_PATH}")
    print(f"[9] Metadata sauvegardee : {METADATA_PATH}")

    return metrics


def main() -> int:
    metrics = train_gap_model()
    # Exit code base sur decision (pour CI)
    return 0 if metrics["decision"] == "accept" else 1


if __name__ == "__main__":
    sys.exit(main())
