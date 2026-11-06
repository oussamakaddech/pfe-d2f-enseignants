"""Expérience : plus de lignes réelles améliorent-elles les modèles ? + audit des features.

Corpus comparés (extraits par ``generate_corpus_from_db`` avec ``--grain`` et
``--exclude-seeds``) : le corpus servi (``training_corpus_provenanced.csv``,
nommé ``servi_<lignes>`` d'après son volume réel) et les variantes passées en
argument. Pour chacun :

- les quatre modèles de ``compare_four_models`` + la baseline de référence, au
  même protocole (split 80/20 temporel à tri stable, min-max sur le train) ;
- un audit des features : constantes, part de l'historique « plat » (aucune
  évolution t-3 → t), corrélation de Spearman avec la cible et importance par
  permutation du Gradient Boosting sur le test.

Lecture seule : aucun corpus servi, artefact ni registre n'est modifié.

Usage :
    python -m pipelines.experiment_volume_features nom=chemin.csv [nom=chemin.csv ...]
"""
from __future__ import annotations

import json
import sys
from pathlib import Path

import numpy as np
import pandas as pd
from scipy.stats import spearmanr
from sklearn.inspection import permutation_importance

from pipelines.baselines import compute_baselines
from pipelines.compare_four_models import (
    FEATURE_COLS, LABELS, SEED, TARGET_COL, _metrics, _normalize, _split, make_candidates,
)

BASE = Path(__file__).parent.parent
OUT = BASE / "reports" / "experiment_volume_features.json"
SERVED = (None, BASE / "data" / "clean" / "training_corpus_provenanced.csv")


def _audit_features(train: pd.DataFrame, test: pd.DataFrame, gb, X_test, y_test) -> dict:
    full = pd.concat([train, test])
    y = full[TARGET_COL].clip(0, 5)
    perm = permutation_importance(gb, X_test, y_test, n_repeats=10, random_state=SEED,
                                  scoring="neg_root_mean_squared_error")
    out = {}
    for i, col in enumerate(FEATURE_COLS):
        x = full[col].astype(float)
        rho = spearmanr(x, y).statistic if x.nunique() > 1 else float("nan")
        out[col] = {
            "constante": bool(x.nunique() <= 1),
            "valeurs_distinctes": int(x.nunique()),
            "spearman_cible": None if np.isnan(rho) else round(float(rho), 3),
            "importance_permutation": round(float(perm.importances_mean[i]), 4),
        }
    return out


def run(name: str | None, path: Path) -> dict:
    df = pd.read_csv(path, low_memory=False)
    if name is None:
        # Le corpus servi est nomme d'apres son volume reel : le libelle etait
        # fige sur « servi_217 » et ne suivait pas les re-extractions du corpus.
        name = f"servi_{len(df)}"
    train, test, split = _split(df)
    X_train, X_test = _normalize(train, test)
    y_train = train[TARGET_COL].clip(0, 5).values
    y_test = test[TARGET_COL].clip(0, 5).values
    base = compute_baselines(train, y_train, test, y_test)
    base_pred = np.asarray(base["baseline_predictions"], dtype=float)
    rng = np.random.default_rng(SEED)
    idxs = [rng.choice(len(y_test), len(y_test), replace=True) for _ in range(1000)]

    def rmse(p, i):
        return float(np.sqrt(np.mean((y_test[i] - p[i]) ** 2)))

    models, fitted = {}, {}
    for c, m in make_candidates().items():
        m.fit(X_train, y_train)
        p = np.clip(m.predict(X_test), 0, 5)
        fitted[c] = m
        lifts = np.array([rmse(base_pred, i) - rmse(p, i) for i in idxs])
        lo, hi = np.percentile(lifts, [2.5, 97.5])
        models[c] = {**_metrics(y_test, p), "lift_vs_baseline_ci95": [round(lo, 4), round(hi, 4)],
                     "beats_baseline_significant": bool(lo > 0)}

    full = pd.concat([train, test])
    flat = (full["current_level_t3"] == full["current_level_t"]) & (full["rolling_tendance"] == 0)
    res = {
        "corpus": name, "path": str(path), "rows": int(len(full)),
        "teachers": int(full["teacher_id"].nunique()), "n_train": int(len(train)),
        "n_test": int(len(test)), "split": split,
        "part_historique_plat": round(float(flat.mean()), 3),
        "part_cible_extrapolee": round(float(full["is_extrapolated"].astype(str).str.lower().eq("true").mean()), 3),
        "baseline": {"name": base["baseline_name"], **_metrics(y_test, base_pred)},
        "models": models,
        "features": _audit_features(train, test, fitted["gradient_boosting"], X_test, y_test),
    }
    print(f"\n=== {name} : {res['rows']} lignes, {res['teachers']} enseignants, "
          f"historique plat {100 * res['part_historique_plat']:.0f} %")
    print(f"  baseline ({base['baseline_name']}) RMSE {res['baseline']['rmse']:.3f}  ±1 {res['baseline']['accuracy_pm10']:.1f} %")
    for c, m in models.items():
        sig = "bat la baseline" if m["beats_baseline_significant"] else "ns"
        print(f"  {LABELS[c]:<18} RMSE {m['rmse']:.3f}  R2 {m['r2']:.3f}  ±1 {m['accuracy_pm10']:.1f} %  ({sig})")
    return res


def main(argv: list[str]) -> int:
    corpora = [SERVED] + [(a.split("=", 1)[0], Path(a.split("=", 1)[1])) for a in argv]
    results = [run(n, p) for n, p in corpora]
    OUT.write_text(json.dumps(results, indent=2, ensure_ascii=False), encoding="utf-8")
    print(f"\n[OK] {OUT}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main(sys.argv[1:]))
