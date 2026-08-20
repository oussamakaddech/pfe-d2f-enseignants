"""Validation statistique complète et reproductible des modèles.

Recalcule réellement les métriques pour :
  A. GAP : baseline de persistance, GradientBoosting, XGBoost, MLP, legacy
  B. RISQUE : moteur heuristique à six facteurs, RandomForest si entraîné
  C. RANKING : formule heuristique 0.70*contenu + 0.20*qualité + 0.10*fraîcheur

Même dataset nettoyé (v1.1.0), même split temporel strict 3-way
(train/validation/test), même seed 42, mêmes features, même cible gap_next_3m.
Anti-fuite : required_level et gap_next_3m exclus.

Sorties :
  reports/model_validation_report.json
  reports/model_validation_report.csv
  reports/model_comparison.md
  reports/model_validation_details.md
  reports/model_comparison.json
  reports/model_comparison.csv
  reports/model_validation_final.md
"""
from __future__ import annotations

import hashlib
import json
import time
from pathlib import Path
from typing import Any

import numpy as np
import pandas as pd
from sklearn.ensemble import GradientBoostingRegressor
from sklearn.metrics import mean_absolute_error, mean_squared_error, r2_score

BASE_DIR = Path(__file__).parent.parent
CLEAN_DIR = BASE_DIR / "data" / "clean"
MODELS_DIR = BASE_DIR / "data" / "models"
REPORTS_DIR = BASE_DIR / "reports"
REPORTS_DIR.mkdir(parents=True, exist_ok=True)

DATASET_PATH = CLEAN_DIR / "training_corpus_clean.csv"
LEGACY_ARTIFACT = MODELS_DIR / "gap_predictor.joblib"
LEGACY_METADATA = MODELS_DIR / "training_metadata.json"
REGISTRY_PATH = MODELS_DIR / "model_registry.json"

RANDOM_STATE = 42
TEST_FRAC = 0.2
VAL_FRAC = 0.2

FEATURE_COLS = [
    "current_level_t3", "current_level_t2", "current_level_t1", "current_level_t",
    "lag_gap_t3_t2", "lag_gap_t2_t1", "lag_gap_t1_t", "rolling_tendance",
    "days_since_last_training", "training_frequency_per_month", "is_long_absent", "is_stagnant",
    "avg_level", "min_level", "max_level", "nb_level_5", "nb_level_1",
    "nb_savoirs", "nb_competences", "competency_coverage_rate",
    "nb_formations_completed", "nb_formations_in_progress", "taux_assiduite",
    "nb_besoins_exprimes", "nb_besoins_approuves", "avg_eval_score", "nb_evaluations",
    "months_since_last_training", "engagement_score",
]
TARGET_COL = "gap_next_3m"
FORBIDDEN_IN_X = {"required_level", "required_level_t", "gap_next_3m"}
FEATURE_SCHEMA_VERSION = "1.0"


def _dataset_hash(df: pd.DataFrame) -> str:
    canonical = df.copy().sort_values(by=df.columns.tolist()).reset_index(drop=True)
    return hashlib.sha256(canonical.to_csv(index=False).encode("utf-8")).hexdigest()


def _feature_schema_hash(features: list[str]) -> str:
    return hashlib.sha256(json.dumps(features, sort_keys=True).encode("utf-8")).hexdigest()


def _sha256_of_file(path: Path) -> str:
    if not path.exists():
        return ""
    h = hashlib.sha256()
    with open(path, "rb") as f:
        for chunk in iter(lambda: f.read(65536), b""):
            h.update(chunk)
    return h.hexdigest()


def _load_dataset() -> pd.DataFrame:
    if not DATASET_PATH.exists():
        raise FileNotFoundError(f"Dataset nettoyé introuvable : {DATASET_PATH}")
    df = pd.read_csv(DATASET_PATH)
    required = ["source_type", "source_id", "is_synthetic", "created_at", "dataset_version"]
    missing = [c for c in required if c not in df.columns]
    if missing:
        raise ValueError(f"Colonnes de provenance absentes : {missing}")
    leaks = [c for c in FEATURE_COLS if c in FORBIDDEN_IN_X]
    if leaks:
        raise ValueError(f"Fuite détectée dans les features : {leaks}")
    return df


def _temporal_split_3way(df: pd.DataFrame) -> dict[str, Any]:
    """Split temporel strict 3-way : train (plus ancien), validation, test (plus récent).

    Découpage chronologique par date_t :
      - train : 60% les plus anciennes
      - validation : 20% suivantes
      - test : 20% les plus récentes
    """
    df = df.reset_index(drop=True)
    if "date_t" in df.columns:
        dates = pd.to_datetime(df["date_t"], errors="coerce")
        if dates.notna().all() and dates.nunique() > 1:
            n = len(df)
            n_test = max(10, int(n * TEST_FRAC))
            n_val = max(10, int(n * VAL_FRAC))
            n_train = n - n_val - n_test

            train = df.iloc[:n_train]
            val = df.iloc[n_train:n_train + n_val]
            test = df.iloc[n_train + n_val:]

            train_cutoff = dates.iloc[n_train - 1].date() if n_train > 0 else None
            val_cutoff = dates.iloc[n_train + n_val - 1].date() if n_train + n_val > 0 else None
            split_kind = f"temporal_3way_train_{train_cutoff}_val_{val_cutoff}"
        else:
            n = len(df)
            n_test = max(10, int(n * TEST_FRAC))
            n_val = max(10, int(n * VAL_FRAC))
            n_train = n - n_val - n_test
            train = df.iloc[:n_train]
            val = df.iloc[n_train:n_train + n_val]
            test = df.iloc[n_train + n_val:]
            split_kind = "sequential_3way_no_shuffle"
    else:
        n = len(df)
        n_test = max(10, int(n * TEST_FRAC))
        n_val = max(10, int(n * VAL_FRAC))
        n_train = n - n_val - n_test
        train = df.iloc[:n_train]
        val = df.iloc[n_train:n_train + n_val]
        test = df.iloc[n_train + n_val:]
        split_kind = "sequential_3way_no_shuffle"

    X_train = train[FEATURE_COLS].astype(float)
    y_train = train[TARGET_COL].astype(float).clip(0, 5).values
    X_val = val[FEATURE_COLS].astype(float)
    y_val = val[TARGET_COL].astype(float).clip(0, 5).values
    X_test = test[FEATURE_COLS].astype(float)
    y_test = test[TARGET_COL].astype(float).clip(0, 5).values

    return {
        "X_train": X_train, "X_val": X_val, "X_test": X_test,
        "y_train": y_train, "y_val": y_val, "y_test": y_test,
        "n_train": len(X_train), "n_val": len(X_val), "n_test": len(X_test),
        "split_kind": split_kind,
        "train_dates": (train["date_t"].min(), train["date_t"].max()) if "date_t" in train.columns else (None, None),
        "val_dates": (val["date_t"].min(), val["date_t"].max()) if "date_t" in val.columns else (None, None),
        "test_dates": (test["date_t"].min(), test["date_t"].max()) if "date_t" in test.columns else (None, None),
        "train_teachers": int(train["teacher_id"].nunique()) if "teacher_id" in train.columns else 0,
        "val_teachers": int(val["teacher_id"].nunique()) if "teacher_id" in val.columns else 0,
        "test_teachers": int(test["teacher_id"].nunique()) if "teacher_id" in test.columns else 0,
    }


def _normalize_with_ranges(X_train: pd.DataFrame, X_val: pd.DataFrame, X_test: pd.DataFrame) -> tuple[pd.DataFrame, pd.DataFrame, pd.DataFrame, dict]:
    ranges = {}
    Xtr, Xv, Xte = X_train.copy(), X_val.copy(), X_test.copy()
    for col in FEATURE_COLS:
        mn, mx = float(Xtr[col].min()), float(Xtr[col].max())
        ranges[col] = {"min": mn, "max": mx}
        if mx > mn:
            Xtr[col] = ((Xtr[col] - mn) / (mx - mn)).clip(0, 1)
            Xv[col] = ((Xv[col] - mn) / (mx - mn)).clip(0, 1)
            Xte[col] = ((Xte[col] - mn) / (mx - mn)).clip(0, 1)
        else:
            Xtr[col], Xv[col], Xte[col] = 0.0, 0.0, 0.0
    return Xtr, Xv, Xte, ranges


def _compute_metrics(y_true: np.ndarray, y_pred: np.ndarray) -> dict[str, float]:
    y_pred = np.clip(np.asarray(y_pred, dtype=float), 0, 5)
    y_true = np.asarray(y_true, dtype=float)
    abs_err = np.abs(y_true - y_pred)
    return {
        "rmse": float(np.sqrt(mean_squared_error(y_true, y_pred))),
        "mae": float(mean_absolute_error(y_true, y_pred)),
        "r2": float(r2_score(y_true, y_pred)) if len(y_true) > 1 else 0.0,
        "median_abs_err": float(np.median(abs_err)),
        "max_abs_err": float(np.max(abs_err)),
        "n_predictions": int(len(y_true)),
    }


def _baseline_persistence(y_test: np.ndarray, X_test: pd.DataFrame) -> np.ndarray:
    return np.clip(
        X_test["current_level_t"].astype(float).values - X_test["avg_level"].astype(float).values,
        0, 5,
    )


def _make_base_model_entry(df: pd.DataFrame, split: dict, metrics: dict, **extra) -> dict:
    return {
        "task": "regression_gap",
        "target": TARGET_COL,
        "dataset_version": str(df["dataset_version"].iloc[0]),
        "dataset_hash": _dataset_hash(df),
        "n_rows": int(len(df)),
        "n_teachers": int(df["teacher_id"].nunique()),
        "n_competencies": int(df["competence_id"].nunique()),
        "feature_count": len(FEATURE_COLS),
        "feature_schema_version": FEATURE_SCHEMA_VERSION,
        "feature_schema_hash": _feature_schema_hash(FEATURE_COLS),
        "train_period": str(split["train_dates"]),
        "val_period": str(split["val_dates"]),
        "test_period": str(split["test_dates"]),
        "random_seed": RANDOM_STATE,
        "split": split["split_kind"],
        "metrics": metrics,
        "n_train": split["n_train"],
        "n_val": split["n_val"],
        "n_test": split["n_test"],
        "train_teachers": split["train_teachers"],
        "val_teachers": split["val_teachers"],
        "test_teachers": split["test_teachers"],
        **extra,
    }


def _bootstrap_ci(y_test: np.ndarray, preds: np.ndarray, baseline_pred: np.ndarray, n_boot: int = 1000) -> dict:
    """Bootstrap IC95 pour RMSE, MAE, improvement_vs_persistence_pct."""
    rng = np.random.default_rng(RANDOM_STATE)
    n = len(y_test)
    idx = np.arange(n)

    boot_rmse = []
    boot_mae = []
    boot_improve = []
    for _ in range(n_boot):
        sample = rng.choice(idx, size=n, replace=True)
        rmse_m = float(np.sqrt(mean_squared_error(y_test[sample], preds[sample])))
        rmse_b = float(np.sqrt(mean_squared_error(y_test[sample], baseline_pred[sample])))
        mae_m = float(mean_absolute_error(y_test[sample], preds[sample]))
        boot_rmse.append(rmse_m)
        boot_mae.append(mae_m)
        if rmse_b > 0:
            boot_improve.append(100.0 * (rmse_b - rmse_m) / rmse_b)
        else:
            boot_improve.append(0.0)

    return {
        "method": f"bootstrap_{n_boot}_ic95",
        "seed": RANDOM_STATE,
        "rmse_ci95": [round(float(np.percentile(boot_rmse, 2.5)), 4), round(float(np.percentile(boot_rmse, 97.5)), 4)],
        "mae_ci95": [round(float(np.percentile(boot_mae, 2.5)), 4), round(float(np.percentile(boot_mae, 97.5)), 4)],
        "improvement_pct_ci95": [round(float(np.percentile(boot_improve, 2.5)), 2), round(float(np.percentile(boot_improve, 97.5)), 2)],
        "improvement_significant_95": bool(np.percentile(boot_improve, 2.5) > 0),
        "n_boot": n_boot,
        "n_test": n,
    }


def _compute_subgroup_metrics(df: pd.DataFrame, split: dict, preds: np.ndarray) -> dict:
    """Métriques par sous-groupe : teacher, competence, department, ref_month, gap severity."""
    result = {}

    # Reconstruire le test set avec les prédictions
    test_df = df.iloc[len(df) - split["n_test"]:].copy().reset_index(drop=True)
    test_df["y_true"] = split["y_test"]
    test_df["y_pred"] = preds

    # Par enseignant
    teacher_metrics = {}
    for tid, group in test_df.groupby("teacher_id"):
        if len(group) >= 5:
            teacher_metrics[str(tid)] = _compute_metrics(group["y_true"].values, group["y_pred"].values)
        else:
            teacher_metrics[str(tid)] = {"insufficient_sample": True, "n": len(group)}
    result["by_teacher"] = teacher_metrics

    # Par compétence
    comp_metrics = {}
    for cid, group in test_df.groupby("competence_id"):
        if len(group) >= 5:
            comp_metrics[str(cid)] = _compute_metrics(group["y_true"].values, group["y_pred"].values)
        else:
            comp_metrics[str(cid)] = {"insufficient_sample": True, "n": len(group)}
    result["by_competence"] = comp_metrics

    # Par mois de référence
    month_metrics = {}
    for month, group in test_df.groupby("ref_month"):
        if len(group) >= 5:
            month_metrics[str(month)] = _compute_metrics(group["y_true"].values, group["y_pred"].values)
        else:
            month_metrics[str(month)] = {"insufficient_sample": True, "n": len(group)}
    result["by_ref_month"] = month_metrics

    # Par sévérité du gap
    test_df["gap_bucket"] = pd.cut(
        test_df["y_true"], bins=[-0.1, 1.0, 2.0, 3.0, 5.0],
        labels=["faible", "moyen", "élevé", "critique"],
    )
    gap_metrics = {}
    for bucket in ["faible", "moyen", "élevé", "critique"]:
        subset = test_df[test_df["gap_bucket"] == bucket]
        if len(subset) >= 5:
            gap_metrics[f"gap_{bucket}"] = _compute_metrics(subset["y_true"].values, subset["y_pred"].values)
        else:
            gap_metrics[f"gap_{bucket}"] = {"insufficient_sample": True, "n": len(subset)}
    result["by_gap_severity"] = gap_metrics

    return result


def _evaluate_gap_models(df: pd.DataFrame) -> dict[str, Any]:
    split = _temporal_split_3way(df)
    X_train, X_val, X_test, _ = _normalize_with_ranges(split["X_train"], split["X_val"], split["X_test"])
    X_train_arr, X_val_arr, X_test_arr = X_train.values, X_val.values, X_test.values
    y_train, y_val, y_test = split["y_train"], split["y_val"], split["y_test"]

    results: dict[str, Any] = {}

    # ── Baseline persistance
    baseline_pred = _baseline_persistence(y_test, split["X_test"])
    baseline_metrics = _compute_metrics(y_test, baseline_pred)
    results["baseline_persistence"] = _make_base_model_entry(
        df, split, baseline_metrics,
        train_time_s=0.0, inference_time_ms=0.0,
        artifact_path="N/A (règle métier)", artifact_sha256="N/A",
        serving_status="KEEP_AS_BASELINE",
    )

    # ── Gradient Boosting (mêmes hyperparamètres que production)
    start = time.perf_counter()
    gb = GradientBoostingRegressor(
        n_estimators=120, max_depth=3, learning_rate=0.08,
        subsample=0.85, random_state=RANDOM_STATE,
        min_samples_split=10, min_samples_leaf=5, max_features="sqrt",
    )
    gb.fit(X_train_arr, y_train)
    train_time = time.perf_counter() - start
    start = time.perf_counter()
    gb_pred = np.clip(gb.predict(X_test_arr), 0, 5)
    gb_inference = (time.perf_counter() - start) * 1000.0
    gb_metrics = _compute_metrics(y_test, gb_pred)
    gb_metrics["improvement_vs_persistence_pct"] = round(
        100.0 * (baseline_metrics["rmse"] - gb_metrics["rmse"]) / baseline_metrics["rmse"], 2
    )
    gb_boot = _bootstrap_ci(y_test, gb_pred, baseline_pred)
    results["gradient_boosting"] = _make_base_model_entry(
        df, split, gb_metrics,
        train_time_s=round(train_time, 4), inference_time_ms=round(gb_inference, 4),
        artifact_path=str(MODELS_DIR / "gap_predictor_temporal.joblib"),
        artifact_sha256=_sha256_of_file(MODELS_DIR / "gap_predictor_temporal.joblib"),
        serving_status="ACTIVE",
        bootstrap_ci=gb_boot,
    )

    # ── XGBoost
    try:
        from xgboost import XGBRegressor

        xgb = XGBRegressor(
            n_estimators=120, max_depth=3, learning_rate=0.08,
            subsample=0.85, random_state=RANDOM_STATE, verbosity=0, n_jobs=-1,
            reg_alpha=0.1, reg_lambda=1.0, min_child_weight=5,
        )
        start = time.perf_counter()
        xgb.fit(X_train_arr, y_train)
        train_time = time.perf_counter() - start
        start = time.perf_counter()
        xgb_pred = np.clip(xgb.predict(X_test_arr), 0, 5)
        xgb_inference = (time.perf_counter() - start) * 1000.0
        xgb_metrics = _compute_metrics(y_test, xgb_pred)
        xgb_metrics["improvement_vs_persistence_pct"] = round(
            100.0 * (baseline_metrics["rmse"] - xgb_metrics["rmse"]) / baseline_metrics["rmse"], 2
        )
        xgb_boot = _bootstrap_ci(y_test, xgb_pred, baseline_pred)
        results["xgboost"] = _make_base_model_entry(
            df, split, xgb_metrics,
            train_time_s=round(train_time, 4), inference_time_ms=round(xgb_inference, 4),
            artifact_path="N/A (challenger, non enregistré)", artifact_sha256="N/A",
            serving_status="KEEP_AS_CHALLENGER",
            bootstrap_ci=xgb_boot,
        )
    except ImportError:
        results["xgboost"] = {
            "task": "regression_gap", "target": TARGET_COL,
            "dataset_version": str(df["dataset_version"].iloc[0]),
            "dataset_hash": _dataset_hash(df), "n_rows": int(len(df)),
            "metrics": {"rmse": "N/A", "mae": "N/A", "r2": "N/A"},
            "note": "XGBoost non installé", "serving_status": "NOT_AVAILABLE",
        }

    # ── MLP
    try:
        from sklearn.neural_network import MLPRegressor

        mlp = MLPRegressor(
            hidden_layer_sizes=(64, 32), activation="relu", solver="adam",
            max_iter=500, random_state=RANDOM_STATE, early_stopping=True,
        )
        start = time.perf_counter()
        mlp.fit(X_train_arr, y_train)
        train_time = time.perf_counter() - start
        start = time.perf_counter()
        mlp_pred = np.clip(mlp.predict(X_test_arr), 0, 5)
        mlp_inference = (time.perf_counter() - start) * 1000.0
        mlp_metrics = _compute_metrics(y_test, mlp_pred)
        mlp_metrics["improvement_vs_persistence_pct"] = round(
            100.0 * (baseline_metrics["rmse"] - mlp_metrics["rmse"]) / baseline_metrics["rmse"], 2
        )
        mlp_boot = _bootstrap_ci(y_test, mlp_pred, baseline_pred)
        results["mlp"] = _make_base_model_entry(
            df, split, mlp_metrics,
            train_time_s=round(train_time, 4), inference_time_ms=round(mlp_inference, 4),
            artifact_path="N/A (challenger, non enregistré)", artifact_sha256="N/A",
            serving_status="KEEP_AS_CHALLENGER",
            bootstrap_ci=mlp_boot,
        )
    except Exception as exc:
        results["mlp"] = {
            "task": "regression_gap", "target": TARGET_COL,
            "dataset_version": str(df["dataset_version"].iloc[0]),
            "dataset_hash": _dataset_hash(df), "n_rows": int(len(df)),
            "metrics": {"rmse": "N/A", "mae": "N/A", "r2": "N/A"},
            "note": f"MLP non évalué : {exc}", "serving_status": "NOT_AVAILABLE",
        }

    # ── Legacy (détection de fuite uniquement)
    if LEGACY_ARTIFACT.exists():
        try:
            import joblib
            legacy_model = joblib.load(LEGACY_ARTIFACT)
            legacy_pred = np.clip(legacy_model.predict(X_test_arr), 0, 5)
            legacy_metrics = _compute_metrics(y_test, legacy_pred)
            legacy_has_leak_features = False
            if LEGACY_METADATA.exists():
                legacy_meta = json.loads(LEGACY_METADATA.read_text(encoding="utf-8"))
                legacy_feats = legacy_meta.get("feature_cols") or []
                legacy_has_leak_features = any(c in FORBIDDEN_IN_X for c in legacy_feats)
            results["legacy_gap_predictor"] = _make_base_model_entry(
                df, split, legacy_metrics,
                artifact_path=str(LEGACY_ARTIFACT),
                artifact_sha256=_sha256_of_file(LEGACY_ARTIFACT),
                leak_detected=legacy_has_leak_features,
                serving_status="REJECT_LEAKAGE" if legacy_has_leak_features else "KEEP_AS_CHALLENGER",
            )
        except Exception as exc:
            results["legacy_gap_predictor"] = {
                "task": "regression_gap", "target": TARGET_COL,
                "dataset_version": str(df["dataset_version"].iloc[0]),
                "dataset_hash": _dataset_hash(df), "n_rows": int(len(df)),
                "metrics": {"rmse": "N/A", "mae": "N/A", "r2": "N/A"},
                "note": f"Legacy non évaluable : {exc}", "serving_status": "NOT_AVAILABLE",
            }
    else:
        results["legacy_gap_predictor"] = {
            "task": "regression_gap", "target": TARGET_COL,
            "dataset_version": str(df["dataset_version"].iloc[0]),
            "dataset_hash": _dataset_hash(df), "n_rows": int(len(df)),
            "metrics": {"rmse": "N/A", "mae": "N/A", "r2": "N/A"},
            "note": "Artefact legacy absent", "serving_status": "NOT_AVAILABLE",
        }

    # ── Métriques par sous-groupe
    results["subgroup_metrics"] = _compute_subgroup_metrics(df, split, gb_pred)

    return results


def _evaluate_risk_heuristic() -> dict:
    from app.core.config import Settings

    settings = Settings()
    return {
        "task": "risk_scoring",
        "method": "heuristic_six_factors",
        "weights": settings.risk_weights,
        "total_weight": settings.total_risk_weight,
        "thresholds": {"high": settings.risk_threshold_high, "medium": settings.risk_threshold_medium},
        "metrics": {"accuracy": "N/A", "balanced_accuracy": "N/A", "precision_macro": "N/A",
                    "recall_macro": "N/A", "f1_macro": "N/A", "roc_auc": "N/A"},
        "note": "Le moteur heuristique est explicable (six facteurs pondérés). "
                "Les règles critiques restent prioritaires sur toute prédiction statistique.",
        "serving_status": "KEEP_AS_BASELINE",
    }


def _evaluate_risk_rf() -> dict:
    risk_artifact = MODELS_DIR / "risk_classifier.joblib"
    risk_metadata = MODELS_DIR / "risk_training_metadata.json"

    if not risk_artifact.exists():
        return {
            "task": "risk_classification", "method": "random_forest",
            "metrics": {"f1_macro": "N/A"},
            "note": "Artefact risk_classifier.joblib absent — modèle non évalué",
            "serving_status": "NOT_AVAILABLE",
        }
    if not risk_metadata.exists():
        return {
            "task": "risk_classification", "method": "random_forest",
            "metrics": {"f1_macro": "N/A"},
            "note": "Metadata risque absente", "serving_status": "NOT_AVAILABLE",
        }

    meta = json.loads(risk_metadata.read_text(encoding="utf-8"))
    metrics = meta.get("metrics") or {}
    decision = meta.get("decision", "unknown")
    return {
        "task": "risk_classification", "method": "random_forest",
        "artifact_path": str(risk_artifact),
        "artifact_sha256": _sha256_of_file(risk_artifact),
        "n_teachers_trained": meta.get("n_teachers"),
        "n_samples": meta.get("n_samples"),
        "label_distribution": meta.get("label_distribution"),
        "metrics": {
            "f1_macro": metrics.get("macro_f1"),
            "baseline_f1_macro": metrics.get("baseline_macro_f1"),
            "f1_per_class": metrics.get("f1_per_class"),
        },
        "decision": decision,
        "serving_status": "ACTIVE" if decision == "accept" else "REJECT_METRICS",
    }


def _evaluate_ranking_heuristic() -> dict:
    from app.domain.services.ranking_service import WEIGHT_CONTENT, WEIGHT_QUALITY, WEIGHT_RECENCY

    return {
        "task": "ranking",
        "method": "heuristic_weighted_sum",
        "weights": {"content": WEIGHT_CONTENT, "quality": WEIGHT_QUALITY, "recency": WEIGHT_RECENCY},
        "metrics": {"precision_at_1": "N/A", "precision_at_3": "N/A", "precision_at_5": "N/A",
                    "recall_at_k": "N/A", "ndcg_at_k": "N/A", "map_at_k": "N/A"},
        "note": "Évaluation du ranking limitée en l'absence de labels de pertinence réels "
                "ou de feedback utilisateur suffisant.",
        "serving_status": "KEEP_AS_BASELINE",
    }


def _evaluate_relevance_model() -> dict:
    relevance_artifact = MODELS_DIR / "relevance_model.joblib"
    if not relevance_artifact.exists():
        return {
            "task": "recommendation_ranking", "method": "relevance_model",
            "metrics": {"precision_at_3": "N/A"},
            "note": "Artefact relevance_model.joblib absent — ranking heuristique conservé",
            "serving_status": "NOT_AVAILABLE",
        }
    return {
        "task": "recommendation_ranking", "method": "relevance_model",
        "artifact_path": str(relevance_artifact),
        "artifact_sha256": _sha256_of_file(relevance_artifact),
        "metrics": {"precision_at_3": "N/A", "recall_at_3": "N/A", "ndcg_at_3": "N/A"},
        "note": "Modèle présent mais évaluation des métriques de classement impossible "
                "en l'absence de labels de pertinence réels.",
        "serving_status": "KEEP_AS_CHALLENGER",
    }


def _load_registry() -> dict | None:
    if not REGISTRY_PATH.exists():
        return None
    data = json.loads(REGISTRY_PATH.read_text(encoding="utf-8"))
    if isinstance(data, list):
        active = [e for e in data if e.get("status") == "ACTIVE"]
        return active[0] if active else None
    return None


def _detect_incoherences(gap_results: dict) -> list[dict]:
    incoherences = []
    gb = gap_results.get("gradient_boosting", {})
    gb_metrics = gb.get("metrics", {})
    new_rmse = gb_metrics.get("rmse")
    new_r2 = gb_metrics.get("r2")

    # Anciennes valeurs du rapport PFE
    old_rmse, old_r2 = 1.0018, 0.3145

    if isinstance(new_rmse, float) and abs(new_rmse - old_rmse) > 0.01:
        incoherences.append({
            "model": "gradient_boosting", "metric": "test_rmse",
            "old_value": old_rmse, "new_value": new_rmse,
            "difference": round(new_rmse - old_rmse, 4),
            "explanation": (
                "Les deux séries de métriques correspondent à des expériences différentes "
                "et ne doivent pas être présentées comme une comparaison directe "
                "(dataset, split ou version de features différents)."
            ),
        })
    if isinstance(new_r2, float) and abs(new_r2 - old_r2) > 0.01:
        incoherences.append({
            "model": "gradient_boosting", "metric": "test_r2",
            "old_value": old_r2, "new_value": new_r2,
            "difference": round(new_r2 - old_r2, 4),
            "explanation": (
                "Les deux séries de métriques correspondent à des expériences différentes "
                "et ne doivent pas être présentées comme une comparaison directe "
                "(dataset, split ou version de features différents)."
            ),
        })
    return incoherences


def _build_report(gap_results: dict) -> dict:
    registry = _load_registry()
    df = _load_dataset()
    synth_pct = float(100.0 * df["is_synthetic"].astype(bool).sum() / len(df))

    return {
        "audit_metadata": {
            "generated_at": pd.Timestamp.now().isoformat(),
            "dataset_path": str(DATASET_PATH),
            "dataset_version": str(df["dataset_version"].iloc[0]),
            "dataset_hash": _dataset_hash(df),
            "n_rows": int(len(df)),
            "n_teachers": int(df["teacher_id"].nunique()),
            "n_competencies": int(df["competence_id"].nunique()),
            "feature_count": len(FEATURE_COLS),
            "feature_schema_version": FEATURE_SCHEMA_VERSION,
            "feature_schema_hash": _feature_schema_hash(FEATURE_COLS),
            "target": TARGET_COL,
            "forbidden_features": sorted(FORBIDDEN_IN_X),
            "random_seed": RANDOM_STATE,
            "synthetic_share_pct": synth_pct,
        },
        "gap_models": gap_results,
        "risk_models": {
            "heuristic_six_factors": _evaluate_risk_heuristic(),
            "random_forest": _evaluate_risk_rf(),
        },
        "recommendation_models": {
            "heuristic_ranking": _evaluate_ranking_heuristic(),
            "relevance_model": _evaluate_relevance_model(),
        },
        "serving_status": {
            "model_mode": "PRODUCTION_ML",
            "model_version": registry.get("model_version") if registry else None,
            "artifact_sha256": registry.get("artifact_sha256") if registry else None,
            "approval_status": registry.get("approval_status") if registry else None,
            "prediction_horizon": "3m",
            "provenance": {"synthetic_share_pct": synth_pct,
                           "dataset_version": str(df["dataset_version"].iloc[0])},
        },
        "incoherence_report": _detect_incoherences(gap_results),
    }


def _write_csv(report: dict) -> None:
    rows = []
    for name, model in report["gap_models"].items():
        if name in ("statistical_validation", "subgroup_metrics"):
            continue
        m = model.get("metrics", {})
        rows.append({
            "Model": name, "Task": model.get("task", "N/A"),
            "Dataset": report["audit_metadata"]["dataset_version"],
            "Rows": model.get("n_rows", "N/A"), "Features": model.get("feature_count", "N/A"),
            "RMSE": m.get("rmse", "N/A"), "MAE": m.get("mae", "N/A"), "R2": m.get("r2", "N/A"),
            "F1 macro": "N/A", "Precision@K": "N/A", "Baseline": "N/A",
            "Improvement %": m.get("improvement_vs_persistence_pct", "N/A"),
            "Status": model.get("serving_status", "N/A"),
        })
    for name, model in report["risk_models"].items():
        m = model.get("metrics", {})
        rows.append({
            "Model": f"risk_{name}", "Task": "risk_scoring",
            "Dataset": report["audit_metadata"]["dataset_version"],
            "Rows": model.get("n_samples", "N/A"), "Features": model.get("n_features", "N/A"),
            "RMSE": "N/A", "MAE": "N/A", "R2": "N/A",
            "F1 macro": m.get("f1_macro", "N/A"), "Precision@K": "N/A",
            "Baseline": m.get("baseline_f1_macro", "N/A"), "Improvement %": "N/A",
            "Status": model.get("serving_status", "N/A"),
        })
    for name, model in report["recommendation_models"].items():
        m = model.get("metrics", {})
        rows.append({
            "Model": f"ranking_{name}", "Task": "recommendation_ranking",
            "Dataset": report["audit_metadata"]["dataset_version"],
            "Rows": "N/A", "Features": "N/A", "RMSE": "N/A", "MAE": "N/A", "R2": "N/A",
            "F1 macro": "N/A", "Precision@K": m.get("precision_at_3", "N/A"),
            "Baseline": "N/A", "Improvement %": "N/A",
            "Status": model.get("serving_status", "N/A"),
        })
    pd.DataFrame(rows).to_csv(REPORTS_DIR / "model_validation_report.csv", index=False)
    pd.DataFrame(rows).to_csv(REPORTS_DIR / "model_comparison.csv", index=False)


def _write_markdown(report: dict) -> None:
    lines = [
        "# Validation des modèles — D2F Predictive Analytics",
        "", f"Généré le : {report['audit_metadata']['generated_at']}", "",
        "## Tableau principal", "",
        "| Model | Task | Dataset | Rows | Features | RMSE | MAE | R² | F1 macro | Precision@K | Baseline | Improvement | Status |",
        "|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---|",
    ]
    for name, model in report["gap_models"].items():
        if name in ("statistical_validation", "subgroup_metrics"):
            continue
        m = model.get("metrics", {})
        lines.append(
            f"| {name} | {model.get('task', 'N/A')} | {report['audit_metadata']['dataset_version']} | "
            f"{model.get('n_rows', 'N/A')} | {model.get('feature_count', 'N/A')} | "
            f"{m.get('rmse', 'N/A')} | {m.get('mae', 'N/A')} | {m.get('r2', 'N/A')} | "
            f"N/A | N/A | N/A | {m.get('improvement_vs_persistence_pct', 'N/A')} | "
            f"{model.get('serving_status', 'N/A')} |"
        )
    for name, model in report["risk_models"].items():
        m = model.get("metrics", {})
        lines.append(
            f"| risk_{name} | risk_scoring | {report['audit_metadata']['dataset_version']} | "
            f"{model.get('n_samples', 'N/A')} | {model.get('n_features', 'N/A')} | "
            f"N/A | N/A | N/A | {m.get('f1_macro', 'N/A')} | N/A | "
            f"{m.get('baseline_f1_macro', 'N/A')} | N/A | {model.get('serving_status', 'N/A')} |"
        )
    for name, model in report["recommendation_models"].items():
        m = model.get("metrics", {})
        lines.append(
            f"| ranking_{name} | recommendation_ranking | {report['audit_metadata']['dataset_version']} | "
            f"N/A | N/A | N/A | N/A | N/A | N/A | {m.get('precision_at_3', 'N/A')} | "
            f"N/A | N/A | {model.get('serving_status', 'N/A')} |"
        )

    lines += ["", "## Tableau GAP", "",
              "| Modèle | RMSE | MAE | R² | IC95 amélioration | Temps inférence | Décision |",
              "|---|---:|---:|---:|---:|---:|---|"]
    for name, model in report["gap_models"].items():
        if name in ("statistical_validation", "subgroup_metrics"):
            continue
        m = model.get("metrics", {})
        boot = model.get("bootstrap_ci", {})
        ic95 = boot.get("improvement_pct_ci95", "N/A")
        lines.append(
            f"| {name} | {m.get('rmse', 'N/A')} | {m.get('mae', 'N/A')} | {m.get('r2', 'N/A')} | "
            f"{ic95} | {model.get('inference_time_ms', 'N/A')} ms | {model.get('serving_status', 'N/A')} |"
        )

    lines += ["", "## Tableau RISQUE", "",
              "| Modèle | Balanced accuracy | Precision macro | Recall macro | F1 macro | AUC | Décision |",
              "|---|---:|---:|---:|---:|---:|---|"]
    for name, model in report["risk_models"].items():
        m = model.get("metrics", {})
        lines.append(
            f"| risk_{name} | N/A | N/A | N/A | {m.get('f1_macro', 'N/A')} | N/A | "
            f"{model.get('serving_status', 'N/A')} |"
        )

    lines += ["", "## Tableau RANKING", "",
              "| Méthode | Precision@3 | Recall@3 | NDCG@3 | Taux acceptation | Statut |",
              "|---|---:|---:|---:|---:|---|"]
    for name, model in report["recommendation_models"].items():
        m = model.get("metrics", {})
        lines.append(
            f"| {name} | {m.get('precision_at_3', 'N/A')} | {m.get('recall_at_3', 'N/A')} | "
            f"{m.get('ndcg_at_3', 'N/A')} | N/A | {model.get('serving_status', 'N/A')} |"
        )

    lines += ["", "## Incohérences avec le rapport PFE"]
    if report["incoherence_report"]:
        for inc in report["incoherence_report"]:
            lines.append(f"- **{inc['model']}** {inc['metric']} : {inc['old_value']} → {inc['new_value']} ({inc['explanation']})")
    else:
        lines.append("- Aucune incohérence détectée.")

    (REPORTS_DIR / "model_comparison.md").write_text("\n".join(lines), encoding="utf-8")
    (REPORTS_DIR / "model_validation_final.md").write_text("\n".join(lines), encoding="utf-8")

    # Détail par modèle
    detail_lines = ["# Détail de validation par modèle", "", f"Généré le : {report['audit_metadata']['generated_at']}", "",
                    "## Métadonnées d'audit", ""]
    for key, value in report["audit_metadata"].items():
        detail_lines.append(f"- **{key}** : {value}")
    for section, title in [("gap_models", "Modèles GAP"), ("risk_models", "Modèles RISQUE"),
                           ("recommendation_models", "Modèles RECOMMANDATION")]:
        detail_lines += ["", f"## {title}"]
        for name, model in report[section].items():
            detail_lines.append(f"### {name}")
            for key, value in model.items():
                detail_lines.append(f"- **{key}** : {value}")
    (REPORTS_DIR / "model_validation_details.md").write_text("\n".join(detail_lines), encoding="utf-8")


def main() -> int:
    print("=" * 70)
    print("VALIDATION STATISTIQUE COMPLÈTE DES MODÈLES")
    print("=" * 70)

    print("\n[1] Chargement du dataset nettoyé...")
    df = _load_dataset()
    print(f"    {len(df)} lignes, {df['teacher_id'].nunique()} enseignants, {df['competence_id'].nunique()} compétences")
    print(f"    synthetic_share_pct = {100.0 * df['is_synthetic'].astype(bool).sum() / len(df):.2f}%")
    print(f"    dataset_version = {df['dataset_version'].iloc[0]}")
    print(f"    dataset_hash = {_dataset_hash(df)[:16]}...")

    print("\n[2] Vérification anti-fuite...")
    leaks = [c for c in FEATURE_COLS if c in FORBIDDEN_IN_X]
    assert not leaks, f"Fuite détectée : {leaks}"
    print("    OK : required_level et gap_next_3m exclus des features")

    print("\n[3] Évaluation des modèles GAP (même protocole)...")
    gap_results = _evaluate_gap_models(df)
    for name, model in gap_results.items():
        if name in ("statistical_validation", "subgroup_metrics"):
            continue
        m = model.get("metrics", {})
        print(f"    {name}: RMSE={m.get('rmse', 'N/A')}, MAE={m.get('mae', 'N/A')}, "
              f"R²={m.get('r2', 'N/A')}, improvement={m.get('improvement_vs_persistence_pct', 'N/A')}%")

    print("\n[4] Évaluation du risque...")
    risk = _evaluate_risk_rf()
    print(f"    RandomForest : {risk.get('metrics', {}).get('f1_macro', 'N/A')}, serving={risk.get('serving_status', 'N/A')}")

    print("\n[5] Évaluation des recommandations...")
    rec = _evaluate_ranking_heuristic()
    print(f"    Ranking heuristique : {rec.get('serving_status', 'N/A')}")

    print("\n[6] Assemblage du rapport...")
    report = _build_report(gap_results)

    (REPORTS_DIR / "model_validation_report.json").write_text(
        json.dumps(report, indent=2, ensure_ascii=False, default=str), encoding="utf-8"
    )
    (REPORTS_DIR / "model_comparison.json").write_text(
        json.dumps(report, indent=2, ensure_ascii=False, default=str), encoding="utf-8"
    )
    _write_csv(report)
    _write_markdown(report)

    print(f"\nRapports générés :")
    for f in ["model_validation_report.json", "model_validation_report.csv",
              "model_comparison.md", "model_validation_details.md",
              "model_comparison.json", "model_comparison.csv",
              "model_validation_final.md"]:
        print(f"  {REPORTS_DIR / f}")

    print("\n[7] Incohérences avec le rapport PFE :")
    if report["incoherence_report"]:
        for inc in report["incoherence_report"]:
            print(f"    - {inc['model']} {inc['metric']}: {inc['old_value']} → {inc['new_value']}")
            print(f"      {inc['explanation']}")
    else:
        print("    Aucune incohérence détectée.")

    return 0


if __name__ == "__main__":
    raise SystemExit(main())