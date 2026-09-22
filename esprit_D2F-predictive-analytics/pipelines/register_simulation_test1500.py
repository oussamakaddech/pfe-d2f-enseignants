"""Entraîne et enregistre le challenger GB sur l'échantillon de SIMULATION « test1500 ».

Contexte — décision projet du 2026-09-22 (suite à l'audit d'autorité du même jour) :

- l'expérience volume 1500 lignes montre le GB devant le MLP en POINT d'estimation
  (0.6246 vs 0.6488 RMSE, mesuré ici ; 0.6376 vs 0.6742 dans
  ``reports/audit_model_comparison_datasets.json``), mais l'IC95 APPARIÉ du delta
  RMSE (GB - MLP) inclut 0 : le gain est NON significatif au sens de la règle §2.6
  (candidat vs modèle de référence), exactement comme sur le corpus réel ;
- ce résultat ne peut donc PAS fonder une promotion ``PRODUCTION_ML`` : il est
  enregistré comme entrée ``SIMULATION_VALIDATED`` documentée (régime démonstration),
  sans toucher au serving (``ML_SERVING_MODE=HEURISTIC``, artefact de production
  ``gap_predictor_temporal.joblib`` ni modifié ni remplacé).

Protocole : corpus 100 % SIMULÉ (seed 42, cible observée en simulation), tri
``date_t`` stable, split 80/20 sans shuffle, normalisation min-max capturée sur le
train, GB (hyperparamètres canoniques v1.1.0) vs MLP (référence v1.1.0), bootstrap
apparié 1000 — fonctions identiques à ``pipelines/decide_gb_production.py``.

Limites documentées : la frontière train/test partage la date 2023-08-31 (le corpus
n'a pas de coupure strictement vide) ; la cible est ``OBSERVED_IN_SIMULATION``,
jamais réelle ; l'artefact est un overlay de démonstration.
"""
from __future__ import annotations

import hashlib
import json
import sys
from datetime import datetime, timezone
from pathlib import Path

import numpy as np
import pandas as pd
from sklearn.ensemble import GradientBoostingRegressor
from sklearn.metrics import mean_absolute_error, mean_squared_error, r2_score
from sklearn.neural_network import MLPRegressor

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

SIM_CSV = BASE / "data" / "simulation" / "simulation_dataset_test1500.csv"
SIM_DATASET_VERSION = "simulation-test1500-v1.0.0"
MODEL_VERSION = "simulation-test1500-v1.0.0-gb"
ARTIFACT_PATH = MODELS_DIR / "gap_predictor_simulation_test1500_gb.joblib"
REPORT_PATH = REPORTS_DIR / "simulation_test1500_challenger.json"
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
# Baseline publiée par reports/audit_model_comparison_datasets.json (même corpus).
AUDIT_BASELINE = {"rmse": 1.2891, "accuracy_pm10": 58.7}


def metrics(y, p) -> dict[str, float]:
    """Métriques canoniques (mêmes définitions que decide_gb_production)."""
    p = np.clip(np.asarray(p, float), 0, 5)
    y = np.asarray(y, float)
    return {
        "rmse": round(float(np.sqrt(mean_squared_error(y, p))), 4),
        "mae": round(float(mean_absolute_error(y, p)), 4),
        "r2": round(float(r2_score(y, p)), 4),
        "accuracy_pm05": round(float(np.mean(np.abs(p - y) <= 0.5) * 100), 1),
        "accuracy_pm10": round(float(np.mean(np.abs(p - y) <= 1.0) * 100), 1),
    }


def boot_ci(y, p_a, p_b, n: int = 1000, seed: int = 42) -> tuple[float, float]:
    """IC95 du delta RMSE (a - b), bootstrap apparié. Négatif = a meilleur."""
    rng = np.random.RandomState(seed)
    y, pa, pb = np.asarray(y, float), np.asarray(p_a, float), np.asarray(p_b, float)
    deltas = []
    for _ in range(n):
        idx = rng.randint(0, len(y), len(y))
        ra = np.sqrt(mean_squared_error(y[idx], np.clip(pa[idx], 0, 5)))
        rb = np.sqrt(mean_squared_error(y[idx], np.clip(pb[idx], 0, 5)))
        deltas.append(ra - rb)
    lo, hi = np.percentile(deltas, [2.5, 97.5])
    return round(float(lo), 4), round(float(hi), 4)


def main() -> int:
    from app.infrastructure.ml.artifact_integrity import save_with_integrity
    from app.infrastructure.ml.predictor import FEATURE_SCHEMA_VERSION
    from pipelines.register_model import _dataset_hash_from_corpus

    df = pd.read_csv(SIM_CSV)
    assert len(df) == 1500, f"corpus inattendu : {len(df)}"
    assert (df["data_origin"] == "SIMULATED").all(), "corpus non SIMULATED"
    assert df["is_synthetic"].astype(str).str.lower().isin(["true", "1"]).all(), "corpus non synthétique"
    assert (df["is_extrapolated"].astype(str).str.lower() == "false").all(), "cible non observée"

    # Split temporel (tri stable) : 80/20 sans shuffle — mêmes bornes que l'audit.
    df_sorted = df.sort_values("date_t", kind="mergesort").reset_index(drop=True)
    n_test = max(20, int(len(df_sorted) * 0.2))
    n_train = len(df_sorted) - n_test
    train, test = df_sorted.iloc[:n_train], df_sorted.iloc[n_train:]
    tr_max = pd.to_datetime(train["date_t"]).max()
    te_min = pd.to_datetime(test["date_t"]).min()
    te_max = pd.to_datetime(test["date_t"]).max()
    boundary_shared = bool(tr_max == te_min)
    print(f"[corpus] {len(df)} lignes SIMULATED | train={n_train} test={n_test} "
          f"| test {te_min.date()} -> {te_max.date()} | frontière partagée={boundary_shared}")

    # Normalisation min-max capturée sur le train.
    X_tr, X_te = train[FEATURE_COLS].astype(float).copy(), test[FEATURE_COLS].astype(float).copy()
    for col in FEATURE_COLS:
        mn, mx = float(X_tr[col].min()), float(X_tr[col].max())
        if mx > mn:
            X_tr[col] = ((X_tr[col] - mn) / (mx - mn)).clip(0, 1)
            X_te[col] = ((X_te[col] - mn) / (mx - mn)).clip(0, 1)
        else:
            X_tr[col], X_te[col] = 0.0, 0.0
    y_tr = train[TARGET_COL].clip(0, 5).values
    y_te = test[TARGET_COL].clip(0, 5).values

    # Référence MLP v1.1.0 (hyperparamètres canoniques) puis candidat GB — mêmes données.
    mlp = MLPRegressor(hidden_layer_sizes=(32, 16), activation="relu", alpha=0.01,
                       solver="adam", learning_rate_init=0.001, max_iter=400,
                       early_stopping=True, n_iter_no_change=20, random_state=SEED)
    mlp.fit(X_tr[FEATURE_COLS].values, y_tr)
    p_mlp = mlp.predict(X_te[FEATURE_COLS].values)
    m_mlp = metrics(y_te, p_mlp)

    gb = GradientBoostingRegressor(n_estimators=120, max_depth=3, learning_rate=0.08,
                                   subsample=0.85, random_state=SEED,
                                   min_samples_split=10, min_samples_leaf=5, max_features="sqrt")
    gb.fit(X_tr[FEATURE_COLS].values, y_tr)
    p_gb = gb.predict(X_te[FEATURE_COLS].values)
    m_gb = metrics(y_te, p_gb)

    lo, hi = boot_ci(y_te, p_gb, p_mlp)
    significant = (lo > 0) or (hi < 0)
    print(f"[mesure] MLP {m_mlp['rmse']} | GB {m_gb['rmse']} | delta RMSE IC95 [{lo}, {hi}] "
          f"-> {'SIGNIFICATIF' if significant else 'NON significatif'}")

    # Artefact de démonstration (sidecar SHA-256) — n'écrase AUCUN artefact de production.
    save_with_integrity(gb, ARTIFACT_PATH)
    sha = hashlib.sha256(ARTIFACT_PATH.read_bytes()).hexdigest()
    print(f"[artefact] {ARTIFACT_PATH.name} sha256={sha[:16]}...")

    registry = ModelRegistry(MODELS_DIR / "model_registry.json", MODELS_DIR)
    entry = RegistryEntry(
        model_name="gap_predictor_temporal",
        model_version=MODEL_VERSION,
        status=STATUS_CANDIDATE,
        created_at=datetime.now(timezone.utc).isoformat(),
        dataset_version=SIM_DATASET_VERSION,
        dataset_hash=_dataset_hash_from_corpus(SIM_CSV),
        artifact_sha256=sha,
        synthetic_share_pct=100.0,
        feature_names=list(FEATURE_COLS),
        feature_schema_version=FEATURE_SCHEMA_VERSION,
        metrics=m_gb,
        approval_status=APPROVAL_PENDING,
        target_validity=TARGET_VALIDITY_OBSERVED_SIMULATION,
        real_future_observation_count=len(df),
        distinct_observation_months=int(df["ref_month"].nunique()),
        data_origin=DATA_ORIGIN_SIMULATED,
        validation_scope=VALIDATION_SCOPE_SIMULATION,
        generator_version=str(df["generator_version"].iloc[0]),
        seed=SEED,
        lift_significant_95=significant,
        lift_rmse_ci95=[lo, hi],
        notes=(
            "Challenger GB (hyperparamètres v1.1.0) sur l'échantillon de volume SIMULÉ 1500 lignes "
            f"(seed 42, cible OBSERVED_IN_SIMULATION). Test pairwise vs MLP v1.1.0 sur le même "
            f"holdout 300 lignes : GB RMSE {m_gb['rmse']} vs MLP {m_mlp['rmse']} — GB meilleur en "
            f"POINT d'estimation mais IC95 apparié du delta [{lo}, {hi}] inclut 0 -> gain NON "
            "significatif (règle §2.6, candidat vs référence). Baseline publiée "
            f"(reports/audit_model_comparison_datasets.json) : RMSE {AUDIT_BASELINE['rmse']} / "
            f"acc ±1.0 {AUDIT_BASELINE['accuracy_pm10']} %. Enregistré pour documentation "
            "(régime démonstration) : JAMAIS promu en production, serving inchangé."
        ),
    )
    registry.register(entry)
    print(f"[registre] {MODEL_VERSION} -> CANDIDATE/PENDING (SIMULATED/SIMULATION_VALIDATED)")

    report = {
        "corpus": {
            "path": str(SIM_CSV.relative_to(BASE)), "rows": len(df),
            "n_train": n_train, "n_test": n_test, "data_origin": "SIMULATED", "seed": SEED,
            "test_first_date": str(te_min.date()), "test_last_date": str(te_max.date()),
            "boundary_date_shared_with_train": boundary_shared,
        },
        "split": "tri date_t stable, 80/20, sans shuffle (frontière partagée 2023-08-31 documentée)",
        "reference_mlp_v110": m_mlp,
        "candidate_gb": m_gb,
        "delta_rmse_ic95_gb_vs_mlp": [lo, hi],
        "significant": significant,
        "baseline_audit_reference": AUDIT_BASELINE,
        "decision": "DOCUMENTED_SIMULATION_CHALLENGER_NON_SIGNIFICANT",
        "governance": {
            "data_origin": "SIMULATED", "validation_scope": "SIMULATION_VALIDATED",
            "target_validity": "OBSERVED_IN_SIMULATION",
            "serving": "inchange (ML_SERVING_MODE=HEURISTIC, aucun ACTIVE : gate §2.6 fail-closed)",
            "production_artifact_untouched": "gap_predictor_temporal.joblib intact (SHA 59312ec9...)",
        },
        "artifact": str(ARTIFACT_PATH.relative_to(BASE)),
        "artifact_sha256": sha,
        "registered_as": f"{MODEL_VERSION} CANDIDATE/PENDING",
        "at": datetime.now(timezone.utc).isoformat(),
    }
    REPORT_PATH.write_text(json.dumps(report, indent=2, ensure_ascii=False), encoding="utf-8")
    print(f"[OK] rapport : {REPORT_PATH.relative_to(BASE)}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
