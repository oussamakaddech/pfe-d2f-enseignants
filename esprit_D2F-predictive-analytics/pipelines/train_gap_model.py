"""Entrainement du gap predictor temporel — pipeline reproductible.

Lit le dataset provenancé (training_corpus_provenanced.csv) produit par
prepare_dataset.py, applique un split temporel strict, compare la baseline
de persistance, GradientBoosting et XGBoost, puis exporte l'artefact avec
son sidecar SHA-256 et la metadata complète.

Usage :
    python -m pipelines.prepare_dataset --dataset-version v1.0.0
    python -m pipelines.train_gap_model --dataset-version v1.0.0 --model-version v1.0.0
"""
from __future__ import annotations

import argparse
import json
import sys
from pathlib import Path
from typing import Any

import numpy as np
import pandas as pd
from sklearn.ensemble import GradientBoostingRegressor
from sklearn.metrics import mean_absolute_error, mean_squared_error, r2_score
from sklearn.model_selection import KFold, cross_val_score

BASE_DIR = Path(__file__).parent.parent
MODELS_DIR = BASE_DIR / "data" / "models"
CLEAN_DIR = BASE_DIR / "data" / "clean"
MODEL_PATH = MODELS_DIR / "gap_predictor_temporal.joblib"
METADATA_PATH = MODELS_DIR / "temporal_training_metadata.json"
REGISTRY_PATH = MODELS_DIR / "model_registry.json"
FEATURE_SCHEMA_PATH = MODELS_DIR / "feature_schema.json"

RANDOM_STATE = 42
np.random.seed(RANDOM_STATE)

DEFAULT_DATASET_VERSION = "v1.0.0"

FEATURE_COLS = [
    "observed_result_t3", "observed_result_t2", "observed_result_t1", "observed_result_t",
    "lag_gap_t3_t2", "lag_gap_t2_t1", "lag_gap_t1_t", "rolling_tendance",
    "days_since_last_training", "training_frequency_per_month", "is_long_absent", "is_stagnant",
    "avg_level", "min_level", "max_level", "nb_level_5", "nb_level_1",
    "nb_savoirs", "nb_competences", "competency_coverage_rate",
    "nb_formations_completed", "nb_formations_in_progress", "taux_assiduite",
    "nb_besoins_exprimes", "nb_besoins_approuves", "avg_eval_score", "nb_evaluations",
    "months_since_last_training", "engagement_score",
]
TARGET_COL = "gap_next_3m"
FEATURE_SCHEMA_VERSION = "1.0"

# Colonnes de fuite interdites dans X
FORBIDDEN_IN_X = {"knowledge_difficulty_level", "required_level", "required_level_t", TARGET_COL}


def load_provenanced_corpus(dataset_path: Path | None = None) -> pd.DataFrame:
    """Charge le dataset provenancé et vérifie les colonnes de provenance."""
    path = dataset_path or (CLEAN_DIR / "training_corpus_provenanced.csv")
    if not path.exists():
        raise FileNotFoundError(
            f"Dataset provenancé introuvable : {path}. "
            "Exécutez d'abord : python -m pipelines.prepare_dataset"
        )
    df = pd.read_csv(path)
    required = ["source_type", "source_id", "is_synthetic", "created_at", "dataset_version"]
    missing = [c for c in required if c not in df.columns]
    if missing:
        raise ValueError(f"Colonnes de provenance absentes : {missing}")
    return df


def compute_provenance_stats(df: pd.DataFrame) -> dict[str, Any]:
    """Calcule la provenance depuis les lignes du dataset."""
    total = len(df)
    n_synth = int(df["is_synthetic"].astype(bool).sum())
    n_real = total - n_synth
    return {
        "total_rows": total,
        "real_rows": n_real,
        "synthetic_rows": n_synth,
        "synthetic_share_pct": round(100.0 * n_synth / max(1, total), 2),
        "real_share_pct": round(100.0 * n_real / max(1, total), 2),
        "dataset_version": str(df["dataset_version"].iloc[0]) if "dataset_version" in df.columns else "unknown",
    }


def build_candidates() -> list[tuple[str, Any]]:
    """Construit les modèles candidats (seed 42 partout)."""
    from sklearn.neural_network import MLPRegressor

    candidates: list[tuple[str, Any]] = [
        (
            "gradient_boosting",
            GradientBoostingRegressor(
                n_estimators=120, max_depth=3, learning_rate=0.08,
                subsample=0.85, random_state=RANDOM_STATE,
                min_samples_split=10, min_samples_leaf=5, max_features="sqrt",
            ),
        ),
        (
            "mlp",
            MLPRegressor(
                hidden_layer_sizes=(32, 16), max_iter=400,
                learning_rate_init=0.001, alpha=0.01,
                random_state=RANDOM_STATE, early_stopping=True,
                n_iter_no_change=20,
            ),
        ),
    ]
    try:
        from xgboost import XGBRegressor
        candidates.append((
            "xgboost",
            XGBRegressor(
                n_estimators=120, max_depth=3, learning_rate=0.08,
                subsample=0.85, random_state=RANDOM_STATE, verbosity=0, n_jobs=-1,
                reg_alpha=0.1, reg_lambda=1.0, min_child_weight=5,
            ),
        ))
    except ImportError:
        print("[INFO] XGBoost indisponible, skip")
    return candidates


def temporal_split(df: pd.DataFrame) -> dict[str, Any]:
    """Split temporel strict : 80% plus anciennes en train, 20% plus récentes en test."""
    df = df.reset_index(drop=True)
    if "date_t" in df.columns:
        dates = pd.to_datetime(df["date_t"], errors="coerce")
        if dates.notna().all() and dates.nunique() > 1:
            n = len(df)
            n_test = max(20, int(n * 0.2))
            n_train = n - n_test
            train = df.iloc[:n_train]
            test = df.iloc[n_train:]
            cutoff = dates.iloc[n_train - 1].date()
            split_kind = f"temporal_strict_cutoff_{cutoff}"
        else:
            n = len(df)
            n_train = int(n * 0.8)
            train = df.iloc[:n_train]
            test = df.iloc[n_train:]
            split_kind = "sequential_no_shuffle_80_20_fallback"
    else:
        n = len(df)
        n_train = int(n * 0.8)
        train = df.iloc[:n_train]
        test = df.iloc[n_train:]
        split_kind = "sequential_no_shuffle_80_20"

    # Vérification anti-fuite : aucune colonne interdite dans X
    leaks = [c for c in FEATURE_COLS if c in FORBIDDEN_IN_X]
    if leaks:
        raise ValueError(f"Fuite détectée dans X : {leaks}")

    X_train = train[FEATURE_COLS].astype(float)
    y_train = train[TARGET_COL].astype(float).clip(0, 5).values
    X_test = test[FEATURE_COLS].astype(float)
    y_test = test[TARGET_COL].astype(float).clip(0, 5).values

    return {
        "X_train": X_train, "X_test": X_test,
        "y_train": y_train, "y_test": y_test,
        "n_train": len(X_train), "n_test": len(X_test),
        "split_kind": split_kind,
    }


def normalize_with_ranges(X_train: pd.DataFrame, X_test: pd.DataFrame) -> tuple[pd.DataFrame, pd.DataFrame, dict[str, dict[str, float]]]:
    """Normalisation min-max capturée sur le train (anti train/serve skew)."""
    ranges: dict[str, dict[str, float]] = {}
    Xtr = X_train.copy()
    Xte = X_test.copy()
    for col in FEATURE_COLS:
        mn, mx = float(Xtr[col].min()), float(Xtr[col].max())
        ranges[col] = {"min": mn, "max": mx}
        if mx > mn:
            Xtr[col] = ((Xtr[col] - mn) / (mx - mn)).clip(0, 1)
            Xte[col] = ((Xte[col] - mn) / (mx - mn)).clip(0, 1)
        else:
            Xtr[col] = 0.0
            Xte[col] = 0.0
    return Xtr, Xte, ranges


def compute_baseline(y_test: np.ndarray, gap_t_proxy: np.ndarray) -> dict[str, float]:
    """Baseline persistance : y_pred = gap_t (le gap actuel comme prévision)."""
    pred = np.clip(gap_t_proxy, 0, 5)
    return {
        "baseline_rmse": float(np.sqrt(mean_squared_error(y_test, pred))),
        "baseline_mae": float(mean_absolute_error(y_test, pred)),
        "baseline_r2": float(r2_score(y_test, pred)) if len(y_test) > 1 else 0.0,
    }


def train_gap_model(
    dataset_version: str = "v1.0.0",
    model_version: str = "v1.0.0",
    dataset_path: Path | None = None,
    artifact_path: Path | None = None,
    metadata_path: Path | None = None,
) -> dict[str, Any]:
    """Entraîne, évalue et exporte le modèle gap temporal."""
    out_model = artifact_path or MODEL_PATH
    out_metadata = metadata_path or METADATA_PATH
    print(f"[1] Chargement dataset provenancé (version {dataset_version})...")
    df = load_provenanced_corpus(dataset_path)
    prov = compute_provenance_stats(df)
    print(f"    Provenance : {prov}")

    if prov["real_rows"] < 50:
        raise SystemExit(
            f"[ERROR] Données réelles insuffisantes ({prov['real_rows']} < 50). "
            "Phase de collecte requise avant tout réentraînement honnête."
        )

    print("[2] Split temporel strict...")
    split = temporal_split(df)
    print(f"    train={split['n_train']} test={split['n_test']} ({split['split_kind']})")

    print("[3] Normalisation (ranges capturées sur train)...")
    X_train, X_test, ranges = normalize_with_ranges(split["X_train"], split["X_test"])
    X_train_arr = X_train.values
    X_test_arr = X_test.values
    y_train = split["y_train"]
    y_test = split["y_test"]

    print("[4] Baseline persistance...")
    gap_t_proxy = np.clip(
        split["X_test"]["observed_result_t"].astype(float).values -
        split["X_test"]["avg_level"].astype(float).values,
        0, 5,
    )
    baseline = compute_baseline(y_test, gap_t_proxy)
    print(f"    baseline_rmse={baseline['baseline_rmse']:.4f}")

    print("[5] Comparaison candidats (CV-RMSE)...")
    candidates = build_candidates()
    cv_results: dict[str, float] = {}
    fitted: dict[str, Any] = {}
    kf = KFold(n_splits=5, shuffle=True, random_state=RANDOM_STATE)
    for name, model in candidates:
        model.fit(X_train_arr, y_train)
        fitted[name] = model
        scores = cross_val_score(model, X_train_arr, y_train, cv=kf, scoring="neg_root_mean_squared_error")
        cv_results[name] = float(-scores.mean())
        print(f"    {name}: CV-RMSE={cv_results[name]:.4f}")

    best_name = min(cv_results, key=cv_results.get)
    best = fitted[best_name]
    print(f"[6] Meilleur modèle : {best_name}")

    print("[7] Évaluation sur test...")
    preds = np.clip(best.predict(X_test_arr), 0, 5)
    test_rmse = float(np.sqrt(mean_squared_error(y_test, preds)))
    test_mae = float(mean_absolute_error(y_test, preds))
    test_r2 = float(r2_score(y_test, preds)) if len(y_test) > 1 else 0.0
    lift_rmse = round(baseline["baseline_rmse"] - test_rmse, 4)
    print(f"    RMSE={test_rmse:.4f} MAE={test_mae:.4f} R2={test_r2:.4f} lift={lift_rmse:.4f}")

    # Bootstrap IC95 du lift
    N_BOOT = 1000
    rng = np.random.default_rng(RANDOM_STATE)
    n_test = len(y_test)
    test_idx = np.arange(n_test)
    boot_lifts: list[float] = []
    for _ in range(N_BOOT):
        idx = rng.choice(test_idx, size=n_test, replace=True)
        boot_rmse_m = float(np.sqrt(mean_squared_error(y_test[idx], preds[idx])))
        boot_rmse_b = float(np.sqrt(mean_squared_error(y_test[idx], gap_t_proxy[idx])))
        boot_lifts.append(boot_rmse_b - boot_rmse_m)
    boot_lifts = np.asarray(boot_lifts)
    lift_ci = (float(np.percentile(boot_lifts, 2.5)), float(np.percentile(boot_lifts, 97.5)))
    lift_significant = bool(lift_ci[0] > 0)

    decision = "accept" if (lift_rmse > 0 and len(y_test) >= 20) else "reject"
    print(f"[8] Décision : {decision}")

    feature_importances = {}
    if hasattr(best, "feature_importances_"):
        feature_importances = dict(zip(FEATURE_COLS, best.feature_importances_.tolist()))

    metadata = {
        "model_name": best_name,
        "model_version": model_version,
        "trained_at": pd.Timestamp.now().isoformat(),
        "n_features": len(FEATURE_COLS),
        "feature_cols": FEATURE_COLS,
        "feature_schema_version": FEATURE_SCHEMA_VERSION,
        "n_samples": prov["total_rows"],
        "n_train": split["n_train"],
        "n_test": split["n_test"],
        "data_sources": prov,
        "dataset_version": dataset_version,
        "hyperparameters": {
            "random_state": RANDOM_STATE,
            "cv": {"type": "KFold", "n_splits": 5, "shuffle": True, "random_state": RANDOM_STATE},
            "split": {"type": split["split_kind"], "train_frac": 0.8, "test_frac": 0.2},
            "models": {name: model.get_params() for name, model in fitted.items()},
        },
        "cv_folds": 5,
        "split": {"type": split["split_kind"]},
        "candidate_cv_scores": {k: round(v, 4) for k, v in cv_results.items()},
        "metrics": {
            "test_r2": round(test_r2, 4),
            "test_rmse": round(test_rmse, 4),
            "test_mae": round(test_mae, 4),
            "baseline_rmse": round(baseline["baseline_rmse"], 4),
            "baseline_mae": round(baseline["baseline_mae"], 4),
            "lift_rmse": lift_rmse,
            "lift_rmse_ci95": [round(lift_ci[0], 4), round(lift_ci[1], 4)],
            "lift_ci95_method": f"bootstrap {N_BOOT} replicas on test sample (n={n_test}), percentile 2.5-97.5",
            "lift_significant_95": lift_significant,
        },
        "feature_importances": {k: round(v, 6) for k, v in feature_importances.items()},
        "feature_ranges": ranges,
        "decision": decision,
        "notes": (
            "Pipeline reproductible : dataset provenancé, split temporel strict, "
            "seed 42, anti-fuite (knowledge_difficulty_level/gap_next_3m exclus), "
            "normalisation capturée sur train, sidecar SHA-256."
        ),
    }

    # Export : joblib + sidecar SHA-256
    from app.infrastructure.ml.artifact_integrity import save_with_integrity
    save_with_integrity(best, out_model)
    out_metadata.write_text(json.dumps(metadata, indent=2, ensure_ascii=False), encoding="utf-8")

    # Export du schéma de features
    feature_schema = {
        "feature_schema_version": FEATURE_SCHEMA_VERSION,
        "feature_names": FEATURE_COLS,
        "target": TARGET_COL,
        "forbidden_in_X": sorted(FORBIDDEN_IN_X),
        "feature_ranges": ranges,
    }
    # Le schéma partagé (feature_schema.json) accompagne l'artefact servi :
    # il n'est mis à jour que pour la version officielle. Les expériences
    # candidates exportent leur schéma versionné sans toucher au schéma servi.
    if dataset_version == DEFAULT_DATASET_VERSION:
        schema_path = FEATURE_SCHEMA_PATH
    else:
        schema_path = MODELS_DIR / f"feature_schema_{dataset_version.replace('.', '')}.json"
    schema_path.write_text(json.dumps(feature_schema, indent=2, ensure_ascii=False), encoding="utf-8")

    print(f"[9] Modèle sauvegardé : {out_model}")
    print(f"[10] Metadata : {out_metadata}")
    print(f"[11] Schéma features : {schema_path}")
    return metadata


def main() -> int:
    parser = argparse.ArgumentParser(description="Entraîne le gap predictor temporel")
    parser.add_argument("--dataset-version", default="v1.0.0")
    parser.add_argument("--model-version", default="v1.0.0")
    parser.add_argument("--dataset-path", default=None, help="Chemin du dataset provenancé")
    parser.add_argument("--artifact-path", default=None, help="Chemin de sortie de l'artefact joblib")
    parser.add_argument("--metadata-path", default=None, help="Chemin de sortie de la metadata JSON")
    args = parser.parse_args()
    try:
        metrics = train_gap_model(
            args.dataset_version,
            args.model_version,
            Path(args.dataset_path) if args.dataset_path else None,
            Path(args.artifact_path) if args.artifact_path else None,
            Path(args.metadata_path) if args.metadata_path else None,
        )
    except SystemExit as exc:
        return int(exc.code or 1)
    return 0 if metrics["decision"] == "accept" else 1


if __name__ == "__main__":
    sys.exit(main())