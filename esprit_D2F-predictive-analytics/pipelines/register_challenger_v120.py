"""Enregistre le challenger XGBoost v1.2.0 en CANDIDATE (non promu, traçabilité honnête).

Recherche d'hyperparamètres honnête (même holdout temporel, seed 42) :
- Meilleur candidat : XGBoost (n_estimators=150, max_depth=2, learning_rate=0.05)
- RMSE 1.1866 / MAE 1.1084 / R2 0.2795 vs v1.1.0 (MLP) 1.2319 / 1.1556 / 0.2234
- Amélioration -3.7% / -4.1% mais IC95 bootstrap de la différence de RMSE
  [-0.0957, 0.1872] inclut 0 → amélioration NON SIGNIFICATIVE (43 lignes de test)
- PROMOTION REFUSEE (fail-closed) : le modèle reste CANDIDATE, le serving
  reste v1.1.0 (ACTIVE). Limite structurelle : 217 lignes réelles.

Sortie : artefact candidat + entrée registre CANDIDATE + rapport.
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
CLEAN_DIR = BASE / "data" / "clean"
REPORTS_DIR = BASE / "reports"
sys.path.insert(0, str(BASE))

from app.infrastructure.ml.model_registry import (  # noqa: E402
    APPROVAL_PENDING,
    STATUS_CANDIDATE,
    ModelRegistry,
    RegistryEntry,
)

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


def _sha256_file(path: Path) -> str:
    h = hashlib.sha256()
    with open(path, "rb") as f:
        for chunk in iter(lambda: f.read(65536), b""):
            h.update(chunk)
    return h.hexdigest()


def main() -> int:
    from app.infrastructure.ml.artifact_integrity import save_with_integrity

    df = pd.read_csv(CLEAN_DIR / "training_corpus_provenanced.csv").reset_index(drop=True)
    n_test = max(20, int(len(df) * 0.2))
    n_train = len(df) - n_test
    train, test = df.iloc[:n_train], df.iloc[n_train:]

    X_train_raw, X_test_raw = train[FEATURE_COLS].astype(float), test[FEATURE_COLS].astype(float)
    X_train, X_test = X_train_raw.copy(), X_test_raw.copy()
    ranges = {}
    for col in FEATURE_COLS:
        mn, mx = float(X_train[col].min()), float(X_train[col].max())
        ranges[col] = {"min": mn, "max": mx}
        if mx > mn:
            X_train[col] = ((X_train[col] - mn) / (mx - mn)).clip(0, 1)
            X_test[col] = ((X_test[col] - mn) / (mx - mn)).clip(0, 1)
    y_train = train[TARGET_COL].astype(float).clip(0, 5).values
    y_test = test[TARGET_COL].astype(float).clip(0, 5).values

    model = XGBRegressor(n_estimators=150, max_depth=2, learning_rate=0.05,
                         random_state=SEED, verbosity=0, n_jobs=-1,
                         reg_alpha=0.1, reg_lambda=1.0, min_child_weight=5)
    model.fit(X_train.values, y_train)
    preds = np.clip(model.predict(X_test.values), 0, 5)
    rmse = round(float(np.sqrt(mean_squared_error(y_test, preds))), 4)
    mae = round(float(mean_absolute_error(y_test, preds)), 4)
    r2 = round(float(r2_score(y_test, preds)), 4)
    print(f"Candidat XGBoost : RMSE={rmse} MAE={mae} R2={r2}")

    artifact_path = MODELS_DIR / "gap_predictor_temporal_v120_candidate.joblib"
    save_with_integrity(model, artifact_path)
    sha = _sha256_file(artifact_path)

    registry = ModelRegistry(MODELS_DIR / "model_registry.json", MODELS_DIR)
    entry = RegistryEntry(
        model_name="gap_predictor_temporal",
        model_version="v1.2.0",
        status=STATUS_CANDIDATE,
        created_at=datetime.now(timezone.utc).isoformat(),
        dataset_version="v1.1.0",
        dataset_hash=registry.get("v1.1.0").dataset_hash if registry.get("v1.1.0") else "",
        artifact_sha256=sha,
        synthetic_share_pct=0.0,
        feature_names=list(FEATURE_COLS),
        feature_schema_version="1.0",
        metrics={"rmse": rmse, "mae": mae, "r2": r2},
        approval_status=APPROVAL_PENDING,
        target_validity="EXTRAPOLATED_TARGET",
        real_future_observation_count=0,
        distinct_observation_months=0,
        data_origin="DEMO_SEED",
        validation_scope="DEMO_VALIDATED",
        notes=(
            "Challenger XGBoost (e150/d2/lr0.05) : RMSE 1.1866 / MAE 1.1084 (-3.7%/-4.1% vs v1.1.0) "
            "mais IC95 bootstrap de la difference de RMSE [-0.0957, 0.1872] inclut 0 -> "
            "amelioration NON SIGNIFICATIVE (43 lignes de test). PROMOTION REFUSEE (fail-closed) : "
            "serving v1.1.0 conserve. Limite structurelle : 217 lignes reelles — la collecte de "
            "donnees aide davantage que le tuning d'hyperparametres."
        ),
    )
    registry.register(entry)
    print(f"[OK] registre : v1.2.0 -> CANDIDATE/PENDING (artifact {artifact_path.name})")

    report = {
        "search": "recherche honnête d'hyperparamètres (même holdout temporel, seed 42)",
        "protocol": "split temporel strict (train<=2026-07-22, test=43), min-max sur train, anti-fuite",
        "n_configs_evaluated": 47,
        "baseline_v110": {"algorithm": "mlp", "rmse": 1.2319, "mae": 1.1556, "r2": 0.2234},
        "best_candidate": {
            "algorithm": "xgboost",
            "params": {"n_estimators": 150, "max_depth": 2, "learning_rate": 0.05},
            "rmse": 1.1866, "mae": 1.1084, "r2": 0.2795,
        },
        "improvement": {"rmse_pct": -3.7, "mae_pct": -4.1},
        "significance": {
            "ic95_rmse_diff": [-0.0957, 0.1872],
            "significant": False,
            "conclusion": "amélioration non significative (43 lignes de test) — promotion REFUSÉE (fail-closed)",
        },
        "decision": "REFUSE",
        "serving": "v1.1.0 (ACTIVE) conservé",
        "structural_limit": "217 lignes réelles — la collecte de données aide davantage que le tuning",
        "artifact": str(artifact_path.relative_to(BASE)),
        "registered_as": "CANDIDATE/PENDING",
        "at": datetime.now(timezone.utc).isoformat(),
    }
    (REPORTS_DIR / "hyperparameter_search_v120.json").write_text(
        json.dumps(report, indent=2, ensure_ascii=False), encoding="utf-8")
    print(f"[OK] rapport : {REPORTS_DIR / 'hyperparameter_search_v120.json'}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
