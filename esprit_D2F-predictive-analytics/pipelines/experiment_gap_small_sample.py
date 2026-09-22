"""Expérience petit-échantillon : tenter d'améliorer le gap predictor réel v1.1.0 (R²=0.22, 217 lignes).

Contraintes : pas d'accès DB (Docker arrêté), corpus réel figé à 217 lignes.
Leviers testés (même holdout temporel que v1.1.0, seed 42, comparaison par bootstrap IC95) :
  1. dummy_mean / persistence (lag_gap_t1_t)      — plancher honnête
  2. mlp_v110 (hyperparams exacts du modèle servi) — référence
  3. gb_real_only (GB, hyperparams v1.1.0)         — baseline ML alternative
  4. ridge_alpha_cv (linéaire régularisé, CV sur train uniquement)
  5. sim_pretrain_gb_warmstart (transfer: GB pré-entraîné sur 10920 lignes simulées -> warm-start sur réel)
  6. mlp_sim_pretrain_finetune  (transfer: MLP pré-entraîné sur simulation -> fine-tune lr bas sur réel)

Décision : promotion seulement si gain RMSE significatif (IC95 du delta exclut 0).
NE MODIFIE AUCUN ARTEFACT DE PROD — rapport seul dans reports/.
"""
from __future__ import annotations

import json
from pathlib import Path

import numpy as np
import pandas as pd
from sklearn.ensemble import GradientBoostingRegressor
from sklearn.linear_model import Ridge
from sklearn.metrics import mean_absolute_error, mean_squared_error, r2_score
from sklearn.model_selection import cross_val_score
from sklearn.neural_network import MLPRegressor

BASE = Path(__file__).parent.parent
CLEAN = BASE / "data" / "clean"
REPORTS = BASE / "reports"
RANDOM_STATE = 42
np.random.seed(RANDOM_STATE)

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
TARGET = "gap_next_3m"

def minmax(train: pd.DataFrame, test: pd.DataFrame) -> tuple[pd.DataFrame, pd.DataFrame, dict]:
    ranges = {}
    tr, te = train.copy(), test.copy()
    for c in FEATURE_COLS:
        mn, mx = float(tr[c].min()), float(tr[c].max())
        ranges[c] = {"min": mn, "max": mx}
        if mx > mn:
            tr[c] = ((tr[c] - mn) / (mx - mn)).clip(0, 1)
            te[c] = ((te[c] - mn) / (mx - mn)).clip(0, 1)
        else:
            tr[c], te[c] = 0.0, 0.0
    return tr, te, ranges

def metrics(y, p) -> dict:
    p = np.clip(p, 0, 5)
    return {
        "rmse": round(float(np.sqrt(mean_squared_error(y, p))), 4),
        "mae": round(float(mean_absolute_error(y, p)), 4),
        "r2": round(float(r2_score(y, p)), 4),
    }

def boot_ci(y, p_a, p_b, n=1000, seed=42):
    """IC95 du delta RMSE (a - b), bootstrap apparié sur le holdout. Négatif = a meilleur."""
    rng = np.random.RandomState(seed)
    y, pa, pb = np.asarray(y, float), np.asarray(p_a, float), np.asarray(p_b, float)
    deltas = []
    n_ = len(y)
    for _ in range(n):
        idx = rng.randint(0, n_, n_)
        ra = np.sqrt(mean_squared_error(y[idx], np.clip(pa[idx], 0, 5)))
        rb = np.sqrt(mean_squared_error(y[idx], np.clip(pb[idx], 0, 5)))
        deltas.append(ra - rb)
    lo, hi = np.percentile(deltas, [2.5, 97.5])
    return [round(float(lo), 4), round(float(hi), 4)]

def minmax_fixed(train: pd.DataFrame, test: pd.DataFrame, ranges: dict) -> tuple[pd.DataFrame, pd.DataFrame]:
    """Normalisation par plages FIXES (celles du registre v1.1.0) — protocole du modèle servi."""
    tr, te = train.copy(), test.copy()
    for c in FEATURE_COLS:
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

def reproduce_v110(ranges: dict) -> dict:
    """Tente de reproduire exactement le v1.1.0 servi (MLP, plages registre)."""
    real = pd.read_csv(CLEAN / "training_corpus_from_db.csv").sort_values("date_t").reset_index(drop=True)
    n_test = 43
    tr_raw, te_raw = real.iloc[:-n_test], real.iloc[-n_test:]
    X_tr, X_te = minmax_fixed(tr_raw, te_raw, ranges)
    y_tr = tr_raw[TARGET].clip(0, 5).values
    y_te = te_raw[TARGET].clip(0, 5).values
    mlp = MLPRegressor(hidden_layer_sizes=(32, 16), activation="relu", alpha=0.01,
                       solver="adam", learning_rate_init=0.001, max_iter=400,
                       early_stopping=True, n_iter_no_change=20, random_state=RANDOM_STATE)
    mlp.fit(X_tr[FEATURE_COLS].values, y_tr)
    return metrics(y_te, mlp.predict(X_te[FEATURE_COLS].values))
def main() -> int:


    # ── Données réelles (protocole v1.1.0) ─────────────────────────────
    real = pd.read_csv(CLEAN / "training_corpus_from_db.csv").sort_values("date_t").reset_index(drop=True)
    assert len(real) == 217, f"corpus inattendu: {len(real)}"
    if "data_origin" in real.columns:
        assert (real["data_origin"] == "SIMULATED").sum() == 0
    n_test = 43  # holdout v1.1.0 (20%)
    tr_raw, te_raw = real.iloc[:-n_test], real.iloc[-n_test:]
    X_tr, X_te, ranges = minmax(tr_raw, te_raw)
    y_tr = tr_raw[TARGET].clip(0, 5).values
    y_te = te_raw[TARGET].clip(0, 5).values
    print(f"[data] reel: {len(real)} lignes | train={len(tr_raw)} test={len(te_raw)} (holdout v1.1.0)")

    # Reproduction du v1.1.0 servi avec les plages FIXES du registre
    meta = json.loads((BASE / "data" / "models" / "temporal_training_metadata_v111.json").read_text(encoding="utf-8"))
    rep = reproduce_v110(meta["feature_ranges"])
    print(f"[repro v1.1.0 plages registre] RMSE={rep['rmse']} MAE={rep['mae']} R2={rep['r2']} (documente: 1.2319/1.1556/0.2234)")


    # ── Corpus de simulation (pré-entraînement) ────────────────────────
    sim = pd.read_csv(CLEAN / "simulation_dataset.csv").sort_values("date_t").reset_index(drop=True)
    n_sim_test = max(20, int(len(sim) * 0.2))
    sim_tr, _, s_ranges = minmax(sim.iloc[:-n_sim_test], sim.iloc[-n_sim_test:])
    y_sim_tr = sim_tr[TARGET].clip(0, 5).values

    results: dict[str, dict] = {}
    preds: dict[str, np.ndarray] = {}

    # 1. planchers
    results["dummy_mean"] = metrics(y_te, np.full(len(y_te), y_tr.mean()))
    preds["dummy_mean"] = np.full(len(y_te), y_tr.mean())
    results["persistence_lag_gap"] = metrics(y_te, te_raw["lag_gap_t1_t"].values)
    preds["persistence_lag_gap"] = te_raw["lag_gap_t1_t"].values

    # 2. référence : MLP v1.1.0 exact
    mlp = MLPRegressor(hidden_layer_sizes=(32, 16), activation="relu", alpha=0.01,
                       solver="adam", learning_rate_init=0.001, max_iter=400,
                       early_stopping=True, n_iter_no_change=20, random_state=RANDOM_STATE)
    mlp.fit(X_tr[FEATURE_COLS].values, y_tr)
    preds["mlp_v110"] = mlp.predict(X_te[FEATURE_COLS].values)
    results["mlp_v110"] = metrics(y_te, preds["mlp_v110"])

    # 3. GB réel uniquement
    gb = GradientBoostingRegressor(n_estimators=120, max_depth=3, learning_rate=0.08,
                                   subsample=0.85, random_state=RANDOM_STATE,
                                   min_samples_split=10, min_samples_leaf=5, max_features="sqrt")
    gb.fit(X_tr[FEATURE_COLS].values, y_tr)
    preds["gb_real_only"] = gb.predict(X_te[FEATURE_COLS].values)
    results["gb_real_only"] = metrics(y_te, preds["gb_real_only"])

    # 4. Ridge (alpha par CV 5-fold sur train uniquement)
    best_a, best_cv = None, np.inf
    for a in [0.1, 0.3, 1.0, 3.0, 10.0, 30.0]:
        sc = -cross_val_score(Ridge(alpha=a), X_tr[FEATURE_COLS].values, y_tr, cv=5,
                              scoring="neg_root_mean_squared_error").mean()
        if sc < best_cv:
            best_cv, best_a = sc, a
    ridge = Ridge(alpha=best_a).fit(X_tr[FEATURE_COLS].values, y_tr)
    preds["ridge_cv"] = ridge.predict(X_te[FEATURE_COLS].values)
    results["ridge_cv"] = metrics(y_te, preds["ridge_cv"])
    results["ridge_cv"]["alpha"] = best_a

    # 5. Transfer GB : pré-entraîné simulation -> warm-start sur réel
    gb_sim = GradientBoostingRegressor(n_estimators=120, max_depth=3, learning_rate=0.08,
                                       subsample=0.85, random_state=RANDOM_STATE,
                                       min_samples_split=10, min_samples_leaf=5, max_features="sqrt",
                                       warm_start=True)
    gb_sim.fit(sim_tr[FEATURE_COLS].values, y_sim_tr)
    gb_sim.learning_rate = 0.02
    gb_sim.n_estimators = 160  # +40 arbres fine-tune sur réel (normalisation réelle)
    gb_sim.fit(X_tr[FEATURE_COLS].values, y_tr)
    preds["sim_pretrain_gb"] = gb_sim.predict(X_te[FEATURE_COLS].values)
    results["sim_pretrain_gb"] = metrics(y_te, preds["sim_pretrain_gb"])

    # 6. Transfer MLP : pré-train simulation -> fine-tune réel (lr bas)
    mlp_sim = MLPRegressor(hidden_layer_sizes=(32, 16), activation="relu", alpha=0.01,
                           solver="adam", learning_rate_init=0.001, max_iter=400,
                           early_stopping=False, random_state=RANDOM_STATE,
                           warm_start=True)
    mlp_sim.fit(sim_tr[FEATURE_COLS].values, y_sim_tr)
    mlp_sim.set_params(learning_rate_init=0.0002, max_iter=mlp_sim.n_iter_ + 150)
    mlp_sim.fit(X_tr[FEATURE_COLS].values, y_tr)
    preds["mlp_sim_finetune"] = mlp_sim.predict(X_te[FEATURE_COLS].values)
    results["mlp_sim_finetune"] = metrics(y_te, preds["mlp_sim_finetune"])

    # ── Bootstrap IC95 : delta RMSE vs mlp_v110 (négatif = meilleur) ────
    ref = preds["mlp_v110"]
    print("\n{:<22} {:>8} {:>8} {:>8}   delta_RMSE_IC95 vs mlp_v110".format(
        "candidat", "RMSE", "MAE", "R2"))
    for name, m in results.items():
        if name in preds:
            lo, hi = boot_ci(y_te, preds[name], ref)
            sig = "SIG" if (lo > 0 or hi < 0) else "ns "
            print("{:<22} {:>8.4f} {:>8.4f} {:>8.4f}   [{:>8.4f}, {:>8.4f}] {}".format(
                name, m["rmse"], m["mae"], m["r2"], lo, hi, sig))
        else:
            print("{:<22} {:>8.4f} {:>8.4f} {:>8.4f}".format(name, m["rmse"], m["mae"], m["r2"]))

    REPORTS.mkdir(exist_ok=True)
    (REPORTS / "gap_small_sample_experiment.json").write_text(
        json.dumps({"protocol": "holdout temporel v1.1.0 (174/43), seed 42, clip(0,5), minmax(train)",
                    "n_real": 217, "results": results}, indent=2, ensure_ascii=False),
        encoding="utf-8")
    print("\n[OK] reports/gap_small_sample_experiment.json")
    return 0

if __name__ == "__main__":
    raise SystemExit(main())

