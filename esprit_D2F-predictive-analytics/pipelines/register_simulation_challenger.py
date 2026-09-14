"""Entraîne le challenger XGBoost sur le corpus de SIMULATION (10 920 lignes).

Gouvernance (audit) :
- corpus 100% SIMULÉ (seed 42, re-mesures M+3 observées) — assertions ;
- même protocole que register_simulation_model.py : split temporel strict
  (tri date_t, 80/20, sans shuffle), normalisation min-max capturée sur le
  train, anti-fuite (required_level / gap_next_3m exclus), seed 42 ;
- artefact séparé (gap_predictor_simulation_v110.joblib) — ne touche NI le
  modèle de production (gap_predictor_temporal.joblib v1.1.0 ACTIVE) NI
  l'overlay existant (gap_predictor_simulation.joblib v1.0.0, rollback possible) ;
- registre : simulation-v1.1.0 en CANDIDATE/PENDING, data_origin=SIMULATED,
  target_validity=OBSERVED_IN_SIMULATION, validation_scope=SIMULATION_VALIDATED —
  JAMAIS REAL, jamais ACTIVE (le serving réel v1.1.0 reste intact).
"""
from __future__ import annotations

import hashlib
import json
import sys
from datetime import datetime, timezone
from pathlib import Path

import numpy as np
import pandas as pd
from sklearn.metrics import mean_absolute_error, mean_squared_error, r2_score
from xgboost import XGBRegressor

BASE = Path(__file__).parent.parent
MODELS_DIR = BASE / "data" / "models"
REPORTS_DIR = BASE / "reports"
sys.path.insert(0, str(BASE))

from app.infrastructure.ml.model_registry import (  # noqa: E402
    APPROVAL_PENDING,
    DATA_ORIGIN_SIMULATED,
    STATUS_CANDIDATE,
    TARGET_VALIDITY_OBSERVED_SIMULATION,
    VALIDATION_SCOPE_SIMULATION,
    ModelRegistry,
    RegistryEntry,
)

SIM_CSV = BASE / "data" / "clean" / "simulation_dataset.csv"
ARTIFACT_PATH = MODELS_DIR / "gap_predictor_simulation_v110.joblib"
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
SEED = 42
DOC_GB = {"rmse": 0.5115, "mae": 0.3596, "r2": 0.7113}


def _sha256_file(path: Path) -> str:
    h = hashlib.sha256()
    with open(path, "rb") as f:
        for chunk in iter(lambda: f.read(65536), b""):
            h.update(chunk)
    return h.hexdigest()


def main() -> int:
    from app.infrastructure.ml.artifact_integrity import save_with_integrity

    df = pd.read_csv(SIM_CSV)
    assert (df["data_origin"] == "SIMULATED").all(), "corpus non SIMULATED"
    assert df["is_synthetic"].astype(str).str.lower().isin(["true", "1"]).all(), "corpus non synthétique"
    assert (df["is_extrapolated"].astype(str).str.lower() == "false").all(), "cible non observée"

    # Split temporel strict (identique au pipeline documenté) : tri date_t, 80/20, sans shuffle.
    df_sorted = df.sort_values("date_t").reset_index(drop=True)
    n_test = max(20, int(len(df_sorted) * 0.2))
    n_train = len(df_sorted) - n_test
    train, test = df_sorted.iloc[:n_train], df_sorted.iloc[n_train:]

    # Normalisation min-max capturée sur le train.
    X_train, X_test = train[FEATURE_COLS].astype(float).copy(), test[FEATURE_COLS].astype(float).copy()
    ranges = {}
    for col in FEATURE_COLS:
        mn, mx = float(X_train[col].min()), float(X_train[col].max())
        ranges[col] = {"min": mn, "max": mx}
        if mx > mn:
            X_train[col] = ((X_train[col] - mn) / (mx - mn)).clip(0, 1)
            X_test[col] = ((X_test[col] - mn) / (mx - mn)).clip(0, 1)
        else:
            X_train[col], X_test[col] = 0.0, 0.0
    y_train = train[TARGET_COL].clip(0, 5).values
    y_test = test[TARGET_COL].clip(0, 5).values

    # Challenger XGBoost (meilleur candidat de la recherche hyperparamètres v1.2.0).
    model = XGBRegressor(n_estimators=150, max_depth=2, learning_rate=0.05,
                         random_state=SEED, verbosity=0, n_jobs=-1,
                         reg_alpha=0.1, reg_lambda=1.0, min_child_weight=5)
    model.fit(X_train.values, y_train)
    preds = np.clip(model.predict(X_test.values), 0, 5)
    rmse = round(float(np.sqrt(mean_squared_error(y_test, preds))), 4)
    mae = round(float(mean_absolute_error(y_test, preds)), 4)
    r2 = round(float(r2_score(y_test, preds)), 4)
    print(f"Challenger XGBoost sur simulation : RMSE={rmse} MAE={mae} R2={r2} (GB documenté : {DOC_GB})")

    save_with_integrity(model, ARTIFACT_PATH)
    sha = _sha256_file(ARTIFACT_PATH)
    print(f"Artefact : {ARTIFACT_PATH.name} (sha256 {sha[:16]}...)")

    metadata = {
        "model_name": "gap_predictor_temporal",
        "model_version": "simulation-v1.1.0",
        "algorithm": "xgboost",
        "trained_at": pd.Timestamp.now().isoformat(),
        "n_features": len(FEATURE_COLS),
        "feature_cols": FEATURE_COLS,
        "feature_schema_version": "1.0",
        "n_samples": len(df),
        "n_train": n_train,
        "n_test": n_test,
        "data_sources": {"total_rows": len(df), "real_rows": 0, "synthetic_rows": len(df),
                         "synthetic_share_pct": 100.0, "real_share_pct": 0.0,
                         "dataset_version": "simulation-v1.0.0"},
        "dataset_version": "simulation-v1.0.0",
        "data_origin": DATA_ORIGIN_SIMULATED,
        "target_validity": TARGET_VALIDITY_OBSERVED_SIMULATION,
        "validation_scope": VALIDATION_SCOPE_SIMULATION,
        "is_extrapolated": False,
        "metrics": {"test_rmse": rmse, "test_mae": mae, "test_r2": r2},
        "feature_ranges": ranges,
        "decision": "challenger-non-promu-candidate",
        "notes": (
            "Challenger XGBoost (e150/d2/lr0.05) entraîné sur le corpus de simulation documenté "
            "(10 920 lignes, seed 42, re-mesures M+3 observées). Overlay de démonstration "
            "uniquement — JAMAIS présenté comme production sur données réelles. Le serving "
            "réel reste gap_predictor_temporal.joblib (v1.1.0 ACTIVE, 217 lignes réelles)."
        ),
    }
    (MODELS_DIR / "simulation_training_metadata_v110.json").write_text(
        json.dumps(metadata, indent=2, ensure_ascii=False), encoding="utf-8")

    manifest = {}
    manifest_path = REPORTS_DIR / "simulation_manifest.json"
    if manifest_path.exists():
        manifest = json.loads(manifest_path.read_text(encoding="utf-8"))

    registry = ModelRegistry(MODELS_DIR / "model_registry.json", MODELS_DIR)
    entry = RegistryEntry(
        model_name="gap_predictor_temporal",
        model_version="simulation-v1.1.0",
        status=STATUS_CANDIDATE,
        created_at=datetime.now(timezone.utc).isoformat(),
        dataset_version="simulation-v1.0.0",
        dataset_hash=manifest.get("dataset_hash", ""),
        artifact_sha256=sha,
        synthetic_share_pct=100.0,
        feature_names=list(FEATURE_COLS),
        feature_schema_version="1.0",
        metrics={"rmse": rmse, "mae": mae, "r2": r2},
        approval_status=APPROVAL_PENDING,
        target_validity=TARGET_VALIDITY_OBSERVED_SIMULATION,
        real_future_observation_count=len(df),
        distinct_observation_months=int(df["ref_month"].nunique()),
        data_origin=DATA_ORIGIN_SIMULATED,
        validation_scope=VALIDATION_SCOPE_SIMULATION,
        generator_version="simulation-v1.0.0",
        seed=SEED,
        notes=(
            "Challenger XGBoost entraîné sur le corpus de simulation (10 920 lignes, seed 42). "
            "CANDIDATE — overlay de démonstration uniquement ; le serving réel v1.1.0 (217 "
            "lignes réelles) reste ACTIVE et intact. JAMAIS REAL, jamais présenté comme production."
        ),
    )
    registry.register(entry)
    print("[OK] registre : simulation-v1.1.0 -> CANDIDATE/PENDING (SIMULATED/SIMULATION_VALIDATED)")

    report = {
        "corpus": {"path": str(SIM_CSV.relative_to(BASE)), "rows": len(df),
                   "n_train": n_train, "n_test": n_test, "data_origin": "SIMULATED", "seed": SEED},
        "split": "temporel strict (tri date_t, 80/20, sans shuffle)",
        "candidate": {"algorithm": "xgboost", "rmse": rmse, "mae": mae, "r2": r2},
        "documented_gb_baseline": DOC_GB,
        "improvement_vs_gb": {
            "rmse_pct": round(100.0 * (rmse - DOC_GB["rmse"]) / DOC_GB["rmse"], 2),
            "mae_pct": round(100.0 * (mae - DOC_GB["mae"]) / DOC_GB["mae"], 2),
        },
        "governance": {
            "data_origin": "SIMULATED", "validation_scope": "SIMULATION_VALIDATED",
            "target_validity": "OBSERVED_IN_SIMULATION",
            "serving": "PRODUCTION inchangé (v1.1.0, 217 lignes réelles, ACTIVE)",
            "overlay_v100": "gap_predictor_simulation.joblib intact (rollback)",
        },
        "artifact": str(ARTIFACT_PATH.relative_to(BASE)),
        "registered_as": "simulation-v1.1.0 CANDIDATE/PENDING",
        "at": datetime.now(timezone.utc).isoformat(),
    }
    (REPORTS_DIR / "simulation_challenger_v110.json").write_text(
        json.dumps(report, indent=2, ensure_ascii=False), encoding="utf-8")
    print(f"[OK] rapport : {REPORTS_DIR / 'simulation_challenger_v110.json'}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
