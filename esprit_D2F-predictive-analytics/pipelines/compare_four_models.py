"""Comparaison de QUATRE modeles de prediction des ecarts sur DEUX corpus (reel servi, simulation).

Modeles : Gradient Boosting, XGBoost, Random Forest, perceptron multicouche (MLP),
plus la baseline de reference (pipelines/baselines.py) pour situer le gain.

Corpus :
- reel servi   : data/clean/training_corpus_provenanced.csv (217 lignes, reel)
- simulation   : data/clean/simulation_dataset.csv (10920 lignes, SIMULATED)

Protocole (celui de audit_model_comparison_datasets.py, a une correction pres) :
- split temporel 80/20 sans shuffle quand date_t existe, avec un tri STABLE :
  sur un corpus deja trie, il conserve l'ordre fichier du protocole canonique
  d'enregistrement (le tri par defaut, instable, melangeait les ex-aequo de date
  et changeait les 43 lignes de test du corpus servi) ; sinon split aleatoire seed 42 ;
- normalisation min-max capturee sur le train, seed 42, anti-fuite ;
- IC95 bootstrap (1000, apparie) de l'ecart de RMSE de chaque modele au meilleur.

Sortie : reports/compare_four_models.{json,md}. Lecture seule : aucun artefact,
registre ou modele servi n'est modifie.
"""
from __future__ import annotations

import json
from pathlib import Path

import numpy as np
import pandas as pd
from sklearn.ensemble import GradientBoostingRegressor, RandomForestRegressor
from sklearn.metrics import mean_absolute_error, mean_squared_error, r2_score
from sklearn.neural_network import MLPRegressor
from xgboost import XGBRegressor

from pipelines.train_gap_model import FEATURE_COLS, TARGET_COL
from pipelines.baselines import compute_baselines

SEED = 42
# Colonnes jamais données au modèle (cible et niveau requis : anti-fuite).
FORBIDDEN_IN_X = {"knowledge_difficulty_level", "required_level", "required_level_t", TARGET_COL}

BASE = Path(__file__).parent.parent
OUT_JSON = BASE / "reports" / "compare_four_models.json"
OUT_MD = BASE / "reports" / "compare_four_models.md"
N_BOOT = 1000

DATASETS = [
    ("Reel servi", BASE / "data" / "clean" / "training_corpus_provenanced.csv"),
    ("Simulation", BASE / "data" / "clean" / "simulation_dataset.csv"),
]

LABELS = {
    "gradient_boosting": "Gradient Boosting",
    "xgboost": "XGBoost",
    "random_forest": "Random Forest",
    "mlp": "Perceptron (MLP)",
}


def make_candidates() -> dict[str, object]:
    # GB, XGBoost et MLP : hyperparametres identiques a l'audit multi-corpus.
    return {
        "gradient_boosting": GradientBoostingRegressor(
            n_estimators=120, max_depth=3, learning_rate=0.08, subsample=0.85,
            random_state=SEED, min_samples_split=10, min_samples_leaf=5, max_features="sqrt",
        ),
        "xgboost": XGBRegressor(
            n_estimators=120, max_depth=3, learning_rate=0.08, subsample=0.85,
            random_state=SEED, verbosity=0, n_jobs=-1, reg_alpha=0.1, reg_lambda=1.0,
            min_child_weight=5,
        ),
        "random_forest": RandomForestRegressor(
            n_estimators=300, max_depth=8, min_samples_leaf=5, max_features="sqrt",
            random_state=SEED, n_jobs=-1,
        ),
        "mlp": MLPRegressor(
            hidden_layer_sizes=(32, 16), max_iter=400, learning_rate_init=0.001,
            alpha=0.01, random_state=SEED, early_stopping=True, n_iter_no_change=20,
        ),
    }


def _split(df: pd.DataFrame) -> tuple[pd.DataFrame, pd.DataFrame, str]:
    for col in FEATURE_COLS + [TARGET_COL]:
        df[col] = pd.to_numeric(df[col], errors="coerce")
    df = df[~df[FEATURE_COLS + [TARGET_COL]].isna().any(axis=1)]
    if "date_t" in df.columns and df["date_t"].notna().all():
        df = df.sort_values("date_t", kind="stable").reset_index(drop=True)
        kind = "temporel (tri stable par date_t)"
    else:
        df = df.sample(frac=1.0, random_state=SEED).reset_index(drop=True)
        kind = "aleatoire seed 42 (pas de date_t)"
    n_test = max(20, int(len(df) * 0.2))
    return df.iloc[:-n_test], df.iloc[-n_test:], kind


def _normalize(train: pd.DataFrame, test: pd.DataFrame) -> tuple[np.ndarray, np.ndarray]:
    X_train = train[FEATURE_COLS].astype(float).copy()
    X_test = test[FEATURE_COLS].astype(float).copy()
    for col in FEATURE_COLS:
        mn, mx = float(X_train[col].min()), float(X_train[col].max())
        if mx > mn:
            X_train[col] = ((X_train[col] - mn) / (mx - mn)).clip(0, 1)
            X_test[col] = ((X_test[col] - mn) / (mx - mn)).clip(0, 1)
        else:
            X_train[col], X_test[col] = 0.0, 0.0
    return X_train.values, X_test.values


def _metrics(y: np.ndarray, p: np.ndarray) -> dict[str, float]:
    return {
        "rmse": round(float(np.sqrt(mean_squared_error(y, p))), 4),
        "mae": round(float(mean_absolute_error(y, p)), 4),
        "r2": round(float(r2_score(y, p)), 4),
        "accuracy_pm05": round(float(np.mean(np.abs(p - y) <= 0.5)) * 100, 1),
        "accuracy_pm10": round(float(np.mean(np.abs(p - y) <= 1.0)) * 100, 1),
    }


def compare_dataset(name: str, path: Path) -> dict[str, object]:
    df = pd.read_csv(path, low_memory=False)
    assert not [c for c in FEATURE_COLS if c in FORBIDDEN_IN_X], "fuite dans X"
    train, test, split_kind = _split(df)
    X_train, X_test = _normalize(train, test)
    y_train = train[TARGET_COL].clip(0, 5).values
    y_test = test[TARGET_COL].clip(0, 5).values

    baseline = compute_baselines(train, y_train, test, y_test)
    base_pred = np.asarray(baseline["baseline_predictions"], dtype=float)

    preds: dict[str, np.ndarray] = {}
    for cname, model in make_candidates().items():
        model.fit(X_train, y_train)
        preds[cname] = np.clip(model.predict(X_test), 0, 5)

    results = {c: _metrics(y_test, p) for c, p in preds.items()}
    best = min(results, key=lambda c: results[c]["rmse"])

    rng = np.random.default_rng(SEED)
    idxs = [rng.choice(len(y_test), size=len(y_test), replace=True) for _ in range(N_BOOT)]

    def _rmse(p: np.ndarray, i: np.ndarray) -> float:
        return float(np.sqrt(mean_squared_error(y_test[i], p[i])))

    for cname, p in preds.items():
        diffs = np.array([_rmse(p, i) - _rmse(preds[best], i) for i in idxs])
        lo, hi = (round(float(v), 4) for v in np.percentile(diffs, [2.5, 97.5]))
        results[cname]["gap_to_best_rmse_ci95"] = [lo, hi]
        results[cname]["worse_than_best_significant"] = bool(cname != best and lo > 0)
        lifts = np.array([_rmse(base_pred, i) - _rmse(p, i) for i in idxs])
        llo, lhi = (round(float(v), 4) for v in np.percentile(lifts, [2.5, 97.5]))
        results[cname]["lift_vs_baseline_ci95"] = [llo, lhi]
        results[cname]["beats_baseline_significant"] = bool(llo > 0)
        print(f"  {name:<11} {LABELS[cname]:<18} RMSE={results[cname]['rmse']:.4f} "
              f"R2={results[cname]['r2']:.4f} +-1={results[cname]['accuracy_pm10']:.1f}% "
              f"+-0.5={results[cname]['accuracy_pm05']:.1f}%")

    return {
        "dataset": name,
        "path": str(path.relative_to(BASE)).replace("\\", "/"),
        "rows_used": int(len(train) + len(test)),
        "n_train": int(len(train)),
        "n_test": int(len(test)),
        "split": split_kind,
        "baseline": {"name": baseline["baseline_name"], **_metrics(y_test, base_pred)},
        "models": results,
        "best_rmse": best,
        "best_accuracy_pm10": max(results, key=lambda c: results[c]["accuracy_pm10"]),
    }


def main() -> int:
    out = [compare_dataset(n, p) for n, p in DATASETS]
    OUT_JSON.write_text(json.dumps(out, indent=2, ensure_ascii=False), encoding="utf-8")

    lines = [
        "# Comparaison de quatre modeles sur deux corpus (seed 42)",
        "",
        "Protocole : split 80/20 (temporel, tri stable, quand date_t existe ; sinon aleatoire",
        "seed 42), normalisation min-max sur le train, anti-fuite. IC95 bootstrap apparie.",
        "",
    ]
    for res in out:
        lines += [
            f"## {res['dataset']} — {res['rows_used']} lignes ({res['n_train']}/{res['n_test']}, {res['split']})",
            "",
            "| Modele | RMSE | MAE | R2 | Acc. ±0,5 | Acc. ±1 | Ecart au meilleur (IC95) | Bat la baseline |",
            "|---|---|---|---|---|---|---|---|",
            f"| Baseline ({res['baseline']['name']}) | {res['baseline']['rmse']:.4f} | {res['baseline']['mae']:.4f} | "
            f"{res['baseline']['r2']:.4f} | {res['baseline']['accuracy_pm05']:.1f} % | {res['baseline']['accuracy_pm10']:.1f} % | - | - |",
        ]
        for c, m in sorted(res["models"].items(), key=lambda kv: kv[1]["rmse"]):
            lo, hi = m["gap_to_best_rmse_ci95"]
            lines.append(
                f"| {LABELS[c]} | {m['rmse']:.4f} | {m['mae']:.4f} | {m['r2']:.4f} | {m['accuracy_pm05']:.1f} % | "
                f"{m['accuracy_pm10']:.1f} % | [{lo:+.4f} ; {hi:+.4f}]{' significatif' if m['worse_than_best_significant'] else ''} | "
                f"{'oui' if m['beats_baseline_significant'] else 'non significatif'} |"
            )
        lines += ["", f"Meilleure RMSE : **{LABELS[res['best_rmse']]}** ; meilleure accuracy ±1 : "
                      f"**{LABELS[res['best_accuracy_pm10']]}**.", ""]
    OUT_MD.write_text("\n".join(lines) + "\n", encoding="utf-8")
    print(f"\n[OK] {OUT_JSON.name} + {OUT_MD.name}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
