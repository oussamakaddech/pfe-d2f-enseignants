"""Contrôle de robustesse rolling-origin : ridge vs mlp_v110 vs gb sur PLUSIEURS coupes temporelles.

Objectif : vérifier que le gain Ridge observé sur le holdout unique (43 lignes)
n'est pas un artefact d'un seul split. Évaluation expanding-window mois par mois.
"""
from __future__ import annotations

import numpy as np
import pandas as pd
from sklearn.ensemble import GradientBoostingRegressor
from sklearn.linear_model import Ridge
from sklearn.metrics import mean_squared_error
from sklearn.neural_network import MLPRegressor

from pipelines.experiment_gap_small_sample import (
    CLEAN, FEATURE_COLS, RANDOM_STATE, TARGET, minmax,
)

def main() -> int:
    real = pd.read_csv(CLEAN / "training_corpus_from_db.csv").sort_values("date_t").reset_index(drop=True)
    n = len(real)
    rows = []
    cuts = [n - 30 * (i + 1) for i in range(5)]  # 5 coupes : test = 30 lignes a chaque fois
    for cut in cuts:
        tr, te = real.iloc[:cut], real.iloc[cut:cut + 30]
        if len(tr) < 100:
            continue
        X_tr, X_te, _ = minmax(tr, te)
        y_tr = tr[TARGET].clip(0, 5).values
        y_te = te[TARGET].clip(0, 5).values
        mlp = MLPRegressor(hidden_layer_sizes=(32, 16), alpha=0.01, solver="adam",
                           learning_rate_init=0.001, max_iter=400, early_stopping=True,
                           n_iter_no_change=20, random_state=RANDOM_STATE).fit(
            X_tr[FEATURE_COLS].values, y_tr)
        gb = GradientBoostingRegressor(n_estimators=120, max_depth=3, learning_rate=0.08,
                                       subsample=0.85, random_state=RANDOM_STATE,
                                       min_samples_split=10, min_samples_leaf=5,
                                       max_features="sqrt").fit(X_tr[FEATURE_COLS].values, y_tr)
        ridge = Ridge(alpha=3.0).fit(X_tr[FEATURE_COLS].values, y_tr)
        r = {
            "cut": int(cut),
            "n_train": len(y_tr),
            "n_test": len(y_te),
            "mlp": float(np.sqrt(mean_squared_error(y_te, np.clip(mlp.predict(X_te[FEATURE_COLS].values), 0, 5)))),
            "gb": float(np.sqrt(mean_squared_error(y_te, np.clip(gb.predict(X_te[FEATURE_COLS].values), 0, 5)))),
            "ridge": float(np.sqrt(mean_squared_error(y_te, np.clip(ridge.predict(X_te[FEATURE_COLS].values), 0, 5)))),
        }
        rows.append(r)
        print(f"coupe cut={r['cut']} (train={r['n_train']}, test={r['n_test']}): "
              f"mlp={r['mlp']:.4f} gb={r['gb']:.4f} ridge={r['ridge']:.4f}")

    if rows:
        dm = [r["ridge"] - r["mlp"] for r in rows]
        dg = [r["ridge"] - r["gb"] for r in rows]
        print(f"\ndelta ridge-mlp par coupe : {['%+.4f' % d for d in dm]} | moyenne {np.mean(dm):+.4f}")
        print(f"delta ridge-gb  par coupe : {['%+.4f' % d for d in dg]} | moyenne {np.mean(dg):+.4f}")
    return 0

if __name__ == "__main__":
    raise SystemExit(main())
