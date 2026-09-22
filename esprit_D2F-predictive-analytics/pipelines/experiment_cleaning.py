"""Expérience : nettoyage du corpus réel (217 lignes) -> ré-entraînement -> comparaison honnête.

Variantes testées (même holdout temporel 174/43, seed 42) :
  RAW    : corpus original (référence, reproduction du protocole v1.1.0)
  CLEAN1 : suppression des 2 features mortes (100% de zéros)
  CLEAN2 : CLEAN1 + winsorisation des outliers sur train (quantiles 0.001/0.999)
  CLEAN3 : CLEAN2 + log1p sur les comptages à queue lourde (days, months, nb_*)
Chaque variante est évaluée avec MLP(32,16) et Ridge(alpha=3).
Décision : le nettoyage n'est retenu que si le gain est significatif (bootstrap IC95).

Trace écrite : reports/cleaning_variants_experiment.json (le delta est calculé
PAR MODELE contre sa propre variante RAW, pour ne pas confondre effet du nettoyage
et différence entre algorithmes).
"""
from __future__ import annotations

import json
from pathlib import Path

import numpy as np
import pandas as pd
from sklearn.linear_model import Ridge
from sklearn.metrics import mean_absolute_error, mean_squared_error, r2_score
from sklearn.neural_network import MLPRegressor

BASE = Path(__file__).parent.parent
REPORT_PATH = BASE / "reports" / "cleaning_variants_experiment.json"
CLEAN = "data/clean"
RANDOM_STATE = 42
TARGET = "gap_next_3m"

FEATURES_RAW = [
    "current_level_t3", "current_level_t2", "current_level_t1", "current_level_t",
    "lag_gap_t3_t2", "lag_gap_t2_t1", "lag_gap_t1_t", "rolling_tendance",
    "days_since_last_training", "training_frequency_per_month", "is_long_absent", "is_stagnant",
    "avg_level", "min_level", "max_level", "nb_level_5", "nb_level_1",
    "nb_savoirs", "nb_competences", "competency_coverage_rate",
    "nb_formations_completed", "nb_formations_in_progress", "taux_assiduite",
    "nb_besoins_exprimes", "nb_besoins_approuves", "avg_eval_score", "nb_evaluations",
    "months_since_last_training", "engagement_score",
]
DEAD_FEATURES = ["nb_besoins_exprimes", "nb_besoins_approuves"]  # 100% zeros
HEAVY_TAIL = ["days_since_last_training", "months_since_last_training",
              "nb_formations_completed", "nb_formations_in_progress", "nb_evaluations"]


def minmax(train: pd.DataFrame, test: pd.DataFrame, cols):
    tr, te = train[cols].astype(float).copy(), test[cols].astype(float).copy()
    for c in cols:
        mn, mx = tr[c].min(), tr[c].max()
        if mx > mn:
            tr[c] = ((tr[c] - mn) / (mx - mn)).clip(0, 1)
            te[c] = ((te[c] - mn) / (mx - mn)).clip(0, 1)
        else:
            tr[c], te[c] = 0.0, 0.0
    return tr, te


def metrics(y, p) -> dict:
    p = np.clip(p, 0, 5)
    return {"rmse": float(np.sqrt(mean_squared_error(y, p))),
            "mae": float(mean_absolute_error(y, p)),
            "r2": float(r2_score(y, p))}


def boot_ci(y, pa, pb, n=1000, seed=42):
    rng = np.random.RandomState(seed)
    y, pa, pb = np.asarray(y, float), np.asarray(pa, float), np.asarray(pb, float)
    d = [np.sqrt(mean_squared_error(y[i], np.clip(pa[i], 0, 5))) -
         np.sqrt(mean_squared_error(y[i], np.clip(pb[i], 0, 5)))
         for i in [rng.randint(0, len(y), len(y)) for _ in range(n)]]
    return [round(float(x), 4) for x in np.percentile(d, [2.5, 97.5])]


def main() -> int:
    np.random.seed(RANDOM_STATE)
    real = pd.read_csv(f"{CLEAN}/training_corpus_from_db.csv").sort_values("date_t").reset_index(drop=True)
    tr_raw, te_raw = real.iloc[:-43].copy(), real.iloc[-43:].copy()
    y_tr = tr_raw[TARGET].clip(0, 5).values
    y_te = te_raw[TARGET].clip(0, 5).values
    print(f"corpus: {len(real)} | train={len(tr_raw)} test={len(te_raw)}\n")

    # CLEAN2 : winsorisation train-only sur les colonnes a outliers
    winsor_cols = ["days_since_last_training", "months_since_last_training"]
    tr_w, te_w = tr_raw.copy(), te_raw.copy()
    for c in winsor_cols:
        lo, hi = tr_raw[c].quantile([0.001, 0.999])
        tr_w[c] = tr_w[c].clip(lo, hi)
        te_w[c] = te_w[c].clip(lo, hi)
    feats_c2 = [c for c in FEATURES_RAW if c not in DEAD_FEATURES]
    tr2, te2 = minmax(tr_w, te_w, feats_c2)

    # CLEAN3 : CLEAN2 + log1p sur comptages a queue lourde (puis min-max)
    tr3, te3 = tr_w.copy(), te_w.copy()
    for c in HEAVY_TAIL:
        tr3[c] = np.log1p(tr3[c].clip(lower=0))
        te3[c] = np.log1p(te3[c].clip(lower=0))
    for c in feats_c2:
        mn, mx = tr3[c].min(), tr3[c].max()
        tr3[c] = ((tr3[c] - mn) / (mx - mn)).clip(0, 1) if mx > mn else 0.0
        te3[c] = ((te3[c] - mn) / (mx - mn)).clip(0, 1) if mx > mn else 0.0
    tr3, te3 = tr3[feats_c2], te3[feats_c2]

    variants = {
        "RAW": minmax(tr_raw, te_raw, FEATURES_RAW),
        "CLEAN1 (sans mortes)": minmax(tr_raw, te_raw, [c for c in FEATURES_RAW if c not in DEAD_FEATURES]),
        "CLEAN2 (+winsorise)": (tr2, te2),
        "CLEAN3 (+log1p)": (tr3, te3),
    }

    results, preds = {}, {}
    models = {
        "MLP": lambda: MLPRegressor(hidden_layer_sizes=(32, 16), activation="relu",
                                    alpha=0.01, solver="adam", learning_rate_init=0.001,
                                    max_iter=400, early_stopping=True, n_iter_no_change=20,
                                    random_state=RANDOM_STATE),
        "Ridge": lambda: Ridge(alpha=3.0),
    }
    for vname, (Xtr, Xte) in variants.items():
        cols = list(Xtr.columns)
        for mname, mk in models.items():
            m = mk().fit(Xtr[cols].values, y_tr)
            key = f"{mname} | {vname}"
            p = m.predict(Xte[cols].values)
            preds[key] = p
            results[key] = metrics(y_te, p)

    ref_key = "MLP | RAW"
    print("%-42s %8s %8s %8s   delta_RMSE_IC95 vs RAW (meme modele)" % ("modele | variante", "RMSE", "MAE", "R2"))
    rows: dict[str, dict] = {}
    for k, m in results.items():
        model_name, variant = k.split(" | ")
        own_ref = f"{model_name} | RAW"
        lo, hi = boot_ci(y_te, preds[k], preds[own_ref])
        significant = bool(lo > 0 or hi < 0)
        improves = bool(hi < 0)
        rows[k] = {
            "model": model_name,
            "variant": variant,
            "rmse": round(m["rmse"], 4),
            "mae": round(m["mae"], 4),
            "r2": round(m["r2"], 4),
            "delta_rmse_vs_raw_ic95": [lo, hi],
            "significant": significant,
            "improves_raw_significantly": improves,
        }
        print("%-42s %8.4f %8.4f %8.4f   [%+.4f, %+.4f] %s"
              % (k, m["rmse"], m["mae"], m["r2"], lo, hi,
                 "GAIN SIG" if improves else ("variante SIG" if significant else "ns ")))

    winners = [k for k, r in rows.items()
               if r["variant"] != "RAW" and r["improves_raw_significantly"]]
    payload = {
        "generated_by": "pipelines/experiment_cleaning.py",
        "protocol": ("corpus reel 217 lignes, holdout temporel strict 174/43, seed 42, "
                     "normalisation min-max capturee sur train, clip cible [0,5], "
                     "bootstrap 1000 pour l'IC95 du delta de RMSE"),
        "corpus": {
            "path": f"{CLEAN}/training_corpus_from_db.csv",
            "rows": int(len(real)), "n_train": int(len(tr_raw)), "n_test": int(len(te_raw)),
        },
        "variants": {
            "RAW": "corpus original (reproduction du protocole v1.1.0)",
            "CLEAN1 (sans mortes)": f"suppression de {DEAD_FEATURES} (100% de zeros)",
            "CLEAN2 (+winsorise)": f"CLEAN1 + winsorisation {winsor_cols} (quantiles 0.001/0.999 sur train)",
            "CLEAN3 (+log1p)": f"CLEAN2 + log1p sur {HEAVY_TAIL}",
        },
        "delta_convention": "delta = RMSE(variante) - RMSE(RAW du meme modele) ; IC95 < 0 = gain significatif",
        "results": rows,
        "summary": {
            "variants_significantly_better_than_raw": winners,
            "any_cleaning_gain_proven": bool(winners),
            "honest_conclusion": (
                "Aucun nettoyage teste ne produit de gain statistiquement significatif : "
                "le nettoyage retenu est donc justifie par la tracabilite et la robustesse, "
                "pas par la metrique."
                if not winners else
                "Au moins une variante de nettoyage ameliore significativement le RAW (voir "
                "`variants_significantly_better_than_raw`)."),
        },
    }
    REPORT_PATH.parent.mkdir(parents=True, exist_ok=True)
    REPORT_PATH.write_text(json.dumps(payload, indent=2, ensure_ascii=False), encoding="utf-8")
    print(f"\n[OK] {REPORT_PATH.relative_to(BASE)}")
    print(f"[resume] {payload['summary']['honest_conclusion']}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
