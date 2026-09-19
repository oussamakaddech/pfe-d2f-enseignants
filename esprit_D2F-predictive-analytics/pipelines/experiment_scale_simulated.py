"""Test des modeles sur le dataset de TEST de 1500 lignes (100% SIMULE).

Objectif : verifier la MECANIQUE et le comportement des modeles a plus grande
echelle que les 217 lignes reelles.
  - split temporel strict (80/20) + bootstrap IC95
  - candidats : dummy (moyenne), persistance (lag gap), MLP 32-16, GB, Ridge
  - COURBE D'APPRENTISSAGE : 150 -> 1200 lignes pour mesurer l'effet du volume

AVERTISSEMENT GOUVERNANCE : corpus SIMULE (genere par nos heuristiques).
Les chiffres valident la mecanique, JAMAIS la performance reelle ESPRIT.
"""
from __future__ import annotations

import numpy as np
import pandas as pd
from sklearn.ensemble import GradientBoostingRegressor
from sklearn.linear_model import Ridge
from sklearn.metrics import mean_absolute_error, mean_squared_error, r2_score
from sklearn.neural_network import MLPRegressor

CSV = "data/simulation/simulation_dataset_test1500.csv"
TARGET = "gap_next_3m"
RANDOM_STATE = 42
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


def minmax(train: pd.DataFrame, test: pd.DataFrame):
    tr, te = train[FEATURE_COLS].astype(float).copy(), test[FEATURE_COLS].astype(float).copy()
    for c in FEATURE_COLS:
        mn, mx = tr[c].min(), tr[c].max()
        if mx > mn:
            tr[c] = ((tr[c] - mn) / (mx - mn)).clip(0, 1)
            te[c] = ((te[c] - mn) / (mx - mn)).clip(0, 1)
        else:
            tr[c], te[c] = 0.0, 0.0
    return tr, te


def metrics(y, p) -> dict:
    p = np.clip(p, 0, 5)
    return {"rmse": round(float(np.sqrt(mean_squared_error(y, p))), 4),
            "mae": round(float(mean_absolute_error(y, p)), 4),
            "r2": round(float(r2_score(y, p)), 4)}


def models() -> dict:
    return {
        "MLP 32-16": MLPRegressor(hidden_layer_sizes=(32, 16), activation="relu", alpha=0.01,
                                  solver="adam", learning_rate_init=0.001, max_iter=400,
                                  early_stopping=True, n_iter_no_change=20,
                                  random_state=RANDOM_STATE),
        "GradientBoosting": GradientBoostingRegressor(n_estimators=120, max_depth=3,
                                                      learning_rate=0.08, subsample=0.85,
                                                      min_samples_split=10, min_samples_leaf=5,
                                                      max_features="sqrt",
                                                      random_state=RANDOM_STATE),
        "Ridge": Ridge(alpha=3.0),
    }


def boot_ci(y, pa, pb, n=1000, seed=42):
    rng = np.random.RandomState(seed)
    y, pa, pb = np.asarray(y, float), np.asarray(pa, float), np.asarray(pb, float)
    d = [np.sqrt(mean_squared_error(y[i], np.clip(pa[i], 0, 5))) -
         np.sqrt(mean_squared_error(y[i], np.clip(pb[i], 0, 5)))
         for i in [rng.randint(0, len(y), len(y)) for _ in range(n)]]
    return [round(float(x), 4) for x in np.percentile(d, [2.5, 97.5])]


def main() -> int:
    np.random.seed(RANDOM_STATE)
    df = pd.read_csv(CSV).sort_values("date_t").reset_index(drop=True)
    assert (df["data_origin"] == "SIMULATED").all(), "corpus non simule : refus"
    n_test = max(50, int(len(df) * 0.2))
    tr, te = df.iloc[:-n_test].copy(), df.iloc[-n_test:].copy()
    print(f"dataset TEST (simule) : {len(df)} lignes | train={len(tr)} test={len(te)} "
          f"| mois test={te['ref_month'].nunique()}")

    X_tr, X_te = minmax(tr, te)
    y_tr, y_te = tr[TARGET].clip(0, 5).values, te[TARGET].clip(0, 5).values

    results, preds = {}, {}
    preds["dummy_moyenne"] = np.full(len(y_te), y_tr.mean())
    preds["persistance_lag"] = te["lag_gap_t1_t"].values
    for k, p in preds.items():
        results[k] = metrics(y_te, p)
    for name, m in models().items():
        m.fit(X_tr.values, y_tr)
        preds[name] = m.predict(X_te.values)
        results[name] = metrics(y_te, preds[name])

    print("\n%-20s %8s %8s %8s   delta_RMSE_IC95 vs MLP" % ("modele", "RMSE", "MAE", "R2"))
    for k, m in results.items():
        lo, hi = boot_ci(y_te, preds[k], preds["MLP 32-16"])
        sig = "SIG" if (lo > 0 or hi < 0) else "ns "
        print("%-20s %8.4f %8.4f %8.4f   [%+.4f, %+.4f] %s"
              % (k, m["rmse"], m["mae"], m["r2"], lo, hi, sig))

    print("\n=== COURBE D'APPRENTISSAGE (meme test, train croissant) ===")
    print("%-10s %10s %10s %10s" % ("n_train", "MLP", "GB", "Ridge"))
    for n in (150, 300, 600, 900, len(X_tr)):
        if n > len(X_tr):
            continue
        sub_X, sub_y = X_tr.iloc[:n], y_tr[:n]
        row = []
        for name, m in models().items():
            m2 = m.__class__(**m.get_params())
            m2.fit(sub_X.values, sub_y)
            row.append(np.sqrt(mean_squared_error(y_te, np.clip(m2.predict(X_te.values), 0, 5))))
        print("%-10d %10.4f %10.4f %10.4f" % (n, row[0], row[1], row[2]))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
