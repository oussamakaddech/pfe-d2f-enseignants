"""Mesure de l'ACCURACY (part de predictions dans une tolerance) pour les modeles
du comparatif, sur les MEMES holdouts que les metriques RMSE documentees.

Definition (regression) : accuracy@tol = part des predictions verifiees
|pred - reel| <= tol (tol = 0.5 et 1.0 point, echelle gap 0-5).
Pour le classifieur de risque : accuracy = taux de classification exacte 4 classes.

Protocoles strictement reutilises :
  - reel 217 : holdout 43 dernieres lignes, plages FIXES du registre v1.1.0
  - simulation 10920 : split temporel 80/20, hyperparametres documentes
  - test1500 : split temporel 80/20
"""
from __future__ import annotations

import json
from pathlib import Path

import joblib
import numpy as np
import pandas as pd
from sklearn.ensemble import GradientBoostingRegressor
from sklearn.linear_model import Ridge
from sklearn.metrics import accuracy_score
from sklearn.neural_network import MLPRegressor

BASE = Path(__file__).resolve().parents[1]
CLEAN = BASE / "data" / "clean"
MODELS = BASE / "data" / "models"
TARGET = "gap_next_3m"
SEED = 42

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

RISK_FEATURES = [
    "n_gaps_total", "n_gaps_critical", "n_gaps_high", "n_gaps_medium",
    "avg_gap_score", "max_gap_score", "critical_ratio", "has_critical",
    "trend_gap_direction", "stagnation_months", "attendance_rate",
    "nb_formations_completed", "nb_besoins_exprimes", "nb_besoins_approuves",
    "avg_eval_score", "nb_evaluations", "avg_level_t", "min_level_t", "max_level_t",
    "nb_savoirs", "competency_coverage_rate", "days_since_last_training",
    "training_frequency_per_month", "level_change_last_month", "rolling_tendance",
    "stagnant_share", "long_absent_share",
]


def acc_tol(y, p, tol):
    p = np.clip(p, 0, 5)
    return float(np.mean(np.abs(p - y) <= tol))


def minmax_fit(tr, te, cols):
    tr, te = tr[cols].astype(float).copy(), te[cols].astype(float).copy()
    for c in cols:
        mn, mx = tr[c].min(), tr[c].max()
        if mx > mn:
            tr[c] = ((tr[c] - mn) / (mx - mn)).clip(0, 1)
            te[c] = ((te[c] - mn) / (mx - mn)).clip(0, 1)
        else:
            tr[c], te[c] = 0.0, 0.0
    return tr, te


def minmax_fixed(tr, te, ranges, cols):
    tr, te = tr[cols].astype(float).copy(), te[cols].astype(float).copy()
    for c in cols:
        r = ranges.get(c)
        if r is None:
            tr[c], te[c] = 0.0, 0.0
            continue
        mn, mx = float(r["min"]), float(r["max"])
        if mx > mn:
            tr[c] = ((tr[c] - mn) / (mx - mn)).clip(0, 1)
            te[c] = ((te[c] - mn) / (mx - mn)).clip(0, 1)
        else:
            tr[c], te[c] = 0.0, 0.0
    return tr, te


def mlp():
    return MLPRegressor(hidden_layer_sizes=(32, 16), activation="relu", alpha=0.01,
                        solver="adam", learning_rate_init=0.001, max_iter=400,
                        early_stopping=True, n_iter_no_change=20, random_state=SEED)


def gb():
    return GradientBoostingRegressor(n_estimators=120, max_depth=3, learning_rate=0.08,
                                     subsample=0.85, random_state=SEED,
                                     min_samples_split=10, min_samples_leaf=5,
                                     max_features="sqrt")


def eval_row(name, y, p):
    p = np.clip(p, 0, 5)
    row = {"model": name,
           "acc_05": round(acc_tol(y, p, 0.5), 4),
           "acc_10": round(acc_tol(y, p, 1.0), 4)}
    print(f"{name:<36} acc@0.5={row['acc_05']:.4f}  acc@1.0={row['acc_10']:.4f}  (n={len(y)})")
    return row

def main() -> int:
    np.random.seed(SEED)
    out = {}

    # ── 1. Corpus REEL 217 (protocole v1.1.0 : holdout 43, plages registre) ──
    real = pd.read_csv(CLEAN / "training_corpus_from_db.csv").sort_values("date_t").reset_index(drop=True)
    meta = json.loads((MODELS / "temporal_training_metadata_v111.json").read_text(encoding="utf-8"))
    ranges = meta["feature_ranges"]
    n_test = 43
    tr_raw, te_raw = real.iloc[:-n_test], real.iloc[-n_test:]
    X_tr, X_te = minmax_fixed(tr_raw, te_raw, ranges, FEATURE_COLS)
    y_tr, y_te = tr_raw[TARGET].clip(0, 5).values, te_raw[TARGET].clip(0, 5).values
    print("\n=== CORPUS REEL 217 (holdout 43, plages v1.1.0) ===")
    out["real"] = [
        eval_row("MLP v1.1.0 (repro plages registre)", y_te, mlp().fit(X_tr.values, y_tr).predict(X_te.values)),
        eval_row("GB (reels uniquement)", y_te, gb().fit(X_tr.values, y_tr).predict(X_te.values)),
        eval_row("Ridge alpha=3.0", y_te, Ridge(alpha=3.0).fit(X_tr.values, y_tr).predict(X_te.values)),
        eval_row("Persistance (lag gap)", y_te, te_raw["lag_gap_t1_t"].values),
    ]

    # ── 2. Corpus SIMULATION 10920 (split temporel 80/20 documente) ──
    sim = pd.read_csv(CLEAN / "simulation_dataset.csv").sort_values("date_t").reset_index(drop=True)
    n_test = int(len(sim) * 0.2)
    tr_raw, te_raw = sim.iloc[:-n_test], sim.iloc[-n_test:]
    X_tr, X_te = minmax_fit(tr_raw, te_raw, FEATURE_COLS)
    y_tr, y_te = tr_raw[TARGET].clip(0, 5).values, te_raw[TARGET].clip(0, 5).values
    print("\n=== CORPUS SIMULATION 10920 (holdout temporel 20%) ===")
    out["sim_10920"] = [
        eval_row("GB simulation-v1.0.0 (documente)", y_te, gb().fit(X_tr.values, y_tr).predict(X_te.values)),
        eval_row("MLP (simulation)", y_te, mlp().fit(X_tr.values, y_tr).predict(X_te.values)),
        eval_row("Persistance (lag gap)", y_te, te_raw["lag_gap_t1_t"].values),
    ]

    # ── 3. Dataset TEST 1500 (split temporel 80/20) ──
    t15 = pd.read_csv(BASE / "data" / "simulation" / "simulation_dataset_test1500.csv").sort_values("date_t").reset_index(drop=True)
    n_test = max(50, int(len(t15) * 0.2))
    tr_raw, te_raw = t15.iloc[:-n_test], t15.iloc[-n_test:]
    X_tr, X_te = minmax_fit(tr_raw, te_raw, FEATURE_COLS)
    y_tr, y_te = tr_raw[TARGET].clip(0, 5).values, te_raw[TARGET].clip(0, 5).values
    print("\n=== DATASET TEST 1500 (holdout temporel 300) ===")
    out["test1500"] = [
        eval_row("Gradient Boosting", y_te, gb().fit(X_tr.values, y_tr).predict(X_te.values)),
        eval_row("Ridge alpha=3.0", y_te, Ridge(alpha=3.0).fit(X_tr.values, y_tr).predict(X_te.values)),
        eval_row("MLP 32-16", y_te, mlp().fit(X_tr.values, y_tr).predict(X_te.values)),
    ]

    # ── 4. Classifieur de RISQUE : accuracy exacte 4 classes ──
    print("\n=== RISQUE (accuracy 4 classes exactes) ===")
    art = joblib.load(MODELS / "risk_predictor_simulation.joblib")
    model, iso = art["model"], art["calibrator"]
    feat_cols = art["feature_cols"]
    classes = list(art["classes"])
    from pipelines.train_risk_model import build_training_frame
    frame = build_training_frame(sim).dropna(subset=feat_cols + ["risk_class"])
    test_months = ["2025-04", "2025-05", "2025-06", "2025-07", "2025-08", "2025-09"]
    te = frame[frame["ref_month"].isin(test_months)]
    y_true = te["risk_class"].to_numpy()
    proba = model.predict_proba(te[feat_cols].to_numpy(dtype=float))
    i_crit = classes.index("CRITICAL")
    proba[:, i_crit] = iso.predict(proba[:, i_crit])
    y_pred = np.array(classes)[np.argmax(proba, axis=1)]
    acc = float(accuracy_score(y_true, y_pred))
    print(f"acc_exacte_4classes={acc:.4f} (n={len(y_true)})")
    out["risk_accuracy"] = round(acc, 4)

    dest = BASE / "reports" / "accuracy_results.json"
    dest.write_text(json.dumps(out, indent=2, ensure_ascii=False), encoding="utf-8")
    print(f"\n[ok] resultats -> {dest}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())