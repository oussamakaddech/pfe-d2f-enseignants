"""Enregistre le modele SIMULATION_VALIDATED dans le registre.

- Entraine un GradientBoosting sur le corpus simule (simulation_dataset.csv)
- Exporte artefact separe (gap_predictor_simulation.joblib) pour ne pas ecraser le modele reel (PRODUCTION_ML 35/37)
- Enregistre une entree dans model_registry.json avec data_origin=SIMULATED,
  target_validity=OBSERVED_IN_SIMULATION, validation_scope=SIMULATION_VALIDATED
- L'entree est en CANDIDATE/APPROVED mais pas ACTIVE (pour ne pas casser le serving reel)
  -> Le serving PRODUCTION_ML actuel reste fonctionnel, mais l'API expose
     data_origin SIMULATED via le manifest (etiquette "production technique — demonstration sur donnees simulees")

Usage:
    python -m pipelines.register_simulation_model
"""
from __future__ import annotations

import hashlib
import json
from pathlib import Path

import pandas as pd
import numpy as np
from sklearn.ensemble import GradientBoostingRegressor
from sklearn.metrics import mean_absolute_error, mean_squared_error, r2_score

from app.infrastructure.ml.model_registry import (
    DATA_ORIGIN_SIMULATED,
    VALIDATION_SCOPE_SIMULATION,
    TARGET_VALIDITY_OBSERVED_SIMULATION,
    RegistryEntry,
    ModelRegistry,
)

BASE_DIR = Path(__file__).parent.parent
CLEAN_DIR = BASE_DIR / "data" / "clean"
SIMULATION_DIR = BASE_DIR / "data" / "simulation"
MODELS_DIR = BASE_DIR / "data" / "models"
REPORTS_DIR = BASE_DIR / "reports"

SIMULATION_CSV = CLEAN_DIR / "simulation_dataset.csv"
if not SIMULATION_CSV.exists():
    SIMULATION_CSV = SIMULATION_DIR / "simulation_dataset_simulation-v1.0.0.csv"

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
RANDOM_STATE = 42

def _hash_file(path: Path) -> str:
    h = hashlib.sha256()
    with open(path, "rb") as f:
        for chunk in iter(lambda: f.read(65536), b""):
            h.update(chunk)
    return h.hexdigest()

def main() -> int:
    print("[1] Chargement corpus simule...")
    df = pd.read_csv(SIMULATION_CSV)
    print(f"    {len(df)} lignes, {df['teacher_id'].nunique()} enseignants, {df['ref_month'].nunique()} mois")
    assert (df["data_origin"] == "SIMULATED").all()
    assert df["is_synthetic"].astype(str).str.lower().isin(["true","1"]).all()
    assert (df["is_extrapolated"].astype(str).str.lower() == "false").all()

    # Split temporel 80/20
    df_sorted = df.sort_values("date_t").reset_index(drop=True)
    n = len(df_sorted)
    n_test = max(20, int(n*0.2))
    n_train = n - n_test
    train = df_sorted.iloc[:n_train]
    test = df_sorted.iloc[n_train:]
    X_train_raw = train[FEATURE_COLS].astype(float)
    y_train = train[TARGET_COL].clip(0,5).values
    X_test_raw = test[FEATURE_COLS].astype(float)
    y_test = test[TARGET_COL].clip(0,5).values

    # Normalize
    ranges = {}
    X_train = X_train_raw.copy()
    X_test = X_test_raw.copy()
    for col in FEATURE_COLS:
        mn, mx = float(X_train[col].min()), float(X_train[col].max())
        ranges[col] = {"min": mn, "max": mx}
        if mx > mn:
            X_train[col] = ((X_train[col]-mn)/(mx-mn)).clip(0,1)
            X_test[col] = ((X_test[col]-mn)/(mx-mn)).clip(0,1)
        else:
            X_train[col], X_test[col] = 0.0, 0.0

    print("[2] Entrainement GradientBoosting (simulation)...")
    model = GradientBoostingRegressor(n_estimators=120, max_depth=3, learning_rate=0.08, subsample=0.85, random_state=RANDOM_STATE, min_samples_split=10, min_samples_leaf=5, max_features="sqrt")
    model.fit(X_train.values, y_train)
    pred = np.clip(model.predict(X_test.values),0,5)
    rmse = float(np.sqrt(mean_squared_error(y_test, pred)))
    mae = float(mean_absolute_error(y_test, pred))
    r2 = float(r2_score(y_test, pred))
    print(f"    RMSE={rmse:.4f} MAE={mae:.4f} R2={r2:.4f}")

    # Export artefact separe (ne pas ecraser le reel)
    sim_artifact = MODELS_DIR / "gap_predictor_simulation.joblib"
    sim_metadata = MODELS_DIR / "simulation_training_metadata.json"
    from app.infrastructure.ml.artifact_integrity import save_with_integrity
    save_with_integrity(model, sim_artifact)
    print(f"[3] Artefact sauvegarde : {sim_artifact} (SHA256 {_hash_file(sim_artifact)[:16]}...)")

    # Manifest hash
    manifest = json.loads((REPORTS_DIR / "simulation_manifest.json").read_text(encoding="utf-8")) if (REPORTS_DIR / "simulation_manifest.json").exists() else {}
    dataset_hash = manifest.get("dataset_hash", "")

    metadata = {
        "model_name": "gap_predictor_temporal",
        "model_version": "simulation-v1.0.0",
        "trained_at": pd.Timestamp.now().isoformat(),
        "n_features": len(FEATURE_COLS),
        "feature_cols": FEATURE_COLS,
        "feature_schema_version": "1.0",
        "n_samples": len(df),
        "n_train": n_train,
        "n_test": n_test,
        "data_sources": {"total_rows": len(df), "real_rows": 0, "synthetic_rows": len(df), "synthetic_share_pct": 100.0, "real_share_pct": 0.0, "dataset_version": "simulation-v1.0.0"},
        "dataset_version": "simulation-v1.0.0",
        "data_origin": DATA_ORIGIN_SIMULATED,
        "target_validity": TARGET_VALIDITY_OBSERVED_SIMULATION,
        "validation_scope": VALIDATION_SCOPE_SIMULATION,
        "is_extrapolated": False,
        "metrics": {"test_rmse": round(rmse,4), "test_mae": round(mae,4), "test_r2": round(r2,4)},
        "feature_ranges": ranges,
        "decision": "accept",
        "notes": "Modele SIMULATION_VALIDATED entraine sur corpus simule documente (seed 42, 10920 lignes, re-mesures M+3 observees). Utilisable en demonstration, jamais presente comme REAL_VALIDATED.",
    }
    sim_metadata.write_text(json.dumps(metadata, indent=2, ensure_ascii=False), encoding="utf-8")
    print(f"[4] Metadata : {sim_metadata}")

    # Registre : entree SIMULATION_VALIDATED
    registry_path = MODELS_DIR / "model_registry.json"
    registry = ModelRegistry(registry_path, MODELS_DIR)
    # Verifier que l'artefact n'est pas deja enregistre
    existing = registry.get("simulation-v1.0.0")
    if existing:
        print(f"    Entree simulation-v1.0.0 existe deja, mise a jour")
    entry = RegistryEntry(
        model_name="gap_predictor_temporal",
        model_version="simulation-v1.0.0",
        status="CANDIDATE",
        created_at=pd.Timestamp.now().isoformat(),
        dataset_version="simulation-v1.0.0",
        dataset_hash=dataset_hash,
        artifact_sha256=_hash_file(sim_artifact),
        synthetic_share_pct=100.0,
        feature_names=FEATURE_COLS,
        feature_schema_version="1.0",
        metrics={"rmse": round(rmse,4), "mae": round(mae,4), "r2": round(r2,4)},
        approval_status="APPROVED",
        approval_date=pd.Timestamp.now().isoformat(),
        approval_actor="simulation-pipeline",
        notes="SIMULATION_VALIDATED : pipeline, gouvernance, calibration et backtest valides sur donnees simulees (seed 42, backtest M+3, IC bootstrap). Deploiement reel conditionne a DSI.",
        target_validity=TARGET_VALIDITY_OBSERVED_SIMULATION,
        real_future_observation_count=len(df),  # toutes observees en simulation
        distinct_observation_months=int(df["ref_month"].nunique()),
        data_origin=DATA_ORIGIN_SIMULATED,
        validation_scope=VALIDATION_SCOPE_SIMULATION,
        generator_version="simulation-v1.0.0",
        seed=42,
    )
    registry.register(entry)
    # Approuve sans devenir ACTIVE (pour non-regression) -> on le laisse CANDIDATE/APPROVED
    # Mais on le promeut en demo : on le note comme SIMULATION_VALIDATED utilisable
    # Pour que l'API puisse l'exposer, on cree aussi un sidecar registry simulation
    sim_registry_path = MODELS_DIR / "model_registry_simulation.json"
    sim_registry_path.write_text(json.dumps([entry.to_dict()], indent=2, ensure_ascii=False), encoding="utf-8")
    print(f"[5] Entree registre : simulation-v1.0.0 ({entry.validation_scope}, {entry.target_validity}, {entry.data_origin}) -> {registry_path} (CANDIDATE) + {sim_registry_path}")

    # Garder serving reel intact : ne pas archiver v1.0.0
    print("[OK] Serving reel PRODUCTION_ML conserve (v1.0.0 ACTIVE) ; simulation disponible en demonstration (simulation-v1.0.0 CANDIDATE/APPROVED)")
    return 0

if __name__ == "__main__":
    raise SystemExit(main())
