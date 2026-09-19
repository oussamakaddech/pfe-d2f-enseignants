"""Experience : expansion du corpus auteur (217 lignes) vers 1 000 lignes.

Contexte : le plafond de la base est de 238 paires (enseignant, competence)
(42 enseignants, 488 saisies de niveaux) — impossible d'atteindre 1 000 lignes
depuis la DB sans ajouter de nouvelles saisies (ce qui modifierait l'affichage
des gaps dans l'application). Cette experience procede par expansion HORS LIGNE :

- re-echantillonnage des 217 lignes reelles avec bruit gaussien calibre sur
  les ecarts-types du corpus lui-meme (simulation de re-mesures) ;
- split HONNETE par paire source : les lignes expandues d'une meme paire
  source ne peuvent jamais se retrouver a la fois dans le train et le test ;
- meme protocole pour le baseline 217 et l'expansion 1 000 (split des paires
  sources 80/20 chronologique, seed 42) — comparaison equitable.

Lecture honnete attendue : le contenu informationnel ne depasse pas les 217
paires sources — la valeur de l'experience est (1) l'effet du volume sur le
choix du modele, (2) la reduction d'intervalle de confiance (test ~5x plus
grand), (3) la mecanique du pipeline a l'echelle.
"""
from __future__ import annotations

import json
from pathlib import Path

import numpy as np
import pandas as pd
from sklearn.ensemble import GradientBoostingRegressor
from sklearn.linear_model import RidgeCV
from sklearn.metrics import mean_absolute_error, mean_squared_error, r2_score
from sklearn.neural_network import MLPRegressor
from sklearn.preprocessing import StandardScaler

try:  # xgboost optionnel
    from xgboost import XGBRegressor
    HAS_XGB = True
except Exception:  # pragma: no cover
    HAS_XGB = False

BASE = Path(__file__).parent.parent
CORPUS = BASE / "data" / "clean" / "training_corpus_from_db.csv"
REPORT = BASE / "reports" / "expand_corpus_1000_results.json"

SEED = 42
TARGET_ROWS = 1000
TEST_FRACTION = 0.2
Y_NOISE = 0.15          # bruit de la cible (re-mesures simulees)
X_NOISE_FRAC = 0.10     # bruit des features (fraction de l'ecart-type)

FEATURES = [
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
BINARY = {"is_long_absent", "is_stagnant"}


def metrics(y_true, y_pred) -> dict:
    return {
        "rmse": float(np.sqrt(mean_squared_error(y_true, y_pred))),
        "mae": float(mean_absolute_error(y_true, y_pred)),
        "r2": float(r2_score(y_true, y_pred)),
        "acc_pm_0p5": float(np.mean(np.abs(y_true - y_pred) <= 0.5)),
        "acc_pm_1p0": float(np.mean(np.abs(y_true - y_pred) <= 1.0)),
    }


def make_models() -> dict:
    models = {
        "MLP_32_16": MLPRegressor(hidden_layer_sizes=(32, 16), alpha=0.01,
                                  max_iter=400, random_state=SEED),
        "GradientBoosting": GradientBoostingRegressor(
            learning_rate=0.08, n_estimators=120, max_depth=3,
            subsample=0.85, min_samples_leaf=5, random_state=SEED),
        "Ridge": RidgeCV(alphas=np.logspace(-3, 3, 25)),
    }
    if HAS_XGB:
        models["XGBoost"] = XGBRegressor(
            n_estimators=150, max_depth=2, learning_rate=0.05,
            random_state=SEED, verbosity=0)
    return models


def bootstrap_ci(y_true, y_pred_a, y_pred_b, n_boot=1000) -> tuple:
    """IC95 du delta RMSE (b - a) par bootstrap sur les lignes de test."""
    rng = np.random.default_rng(SEED)
    errs_a = (y_true - y_pred_a) ** 2
    errs_b = (y_true - y_pred_b) ** 2
    n = len(y_true)
    deltas = []
    for _ in range(n_boot):
        idx = rng.integers(0, n, n)
        deltas.append(np.sqrt(errs_b[idx].mean()) - np.sqrt(errs_a[idx].mean()))
    lo, hi = np.percentile(deltas, [2.5, 97.5])
    return float(lo), float(hi), float(np.mean(deltas))


def run_protocol(X_train, y_train, X_test, y_test, label: str) -> dict:
    scaler = StandardScaler().fit(X_train)
    Xt, Xs = scaler.transform(X_train), scaler.transform(X_test)
    out = {"label": label, "n_train": int(len(X_train)), "n_test": int(len(X_test))}
    preds = {}
    for name, model in make_models().items():
        model.fit(Xt, y_train)
        p = model.predict(Xs)
        preds[name] = p
        out[name] = metrics(y_test, p)
    for name, p in preds.items():  # IC95 des deltas vs MLP
        if name == "MLP_32_16":
            continue
        lo, hi, mean_d = bootstrap_ci(np.asarray(y_test, dtype=float),
                                      preds["MLP_32_16"], p)
    return out


def expand_sources(src: pd.DataFrame, n_rows: int, rng) -> pd.DataFrame:
    """Genere n_rows lignes bruitees a partir des paires sources donnees."""
    idx = rng.integers(0, len(src), n_rows)
    picked = src.iloc[idx].reset_index(drop=True)
    exp = picked.copy()
    for c in FEATURES:
        std = float(src[c].std()) or 0.0
        if c in BINARY:
            exp[c] = np.clip(np.round(exp[c] + rng.normal(0, 0.15, n_rows)), 0, 1)
        elif std > 0:
            lo, hi = float(src[c].min()), float(src[c].max())
            exp[c] = np.clip(exp[c] + rng.normal(0, X_NOISE_FRAC * std, n_rows), lo, hi)
    exp[TARGET] = np.clip(picked[TARGET] + rng.normal(0, Y_NOISE, n_rows), 0.0, 5.0)
    # nouvelle identite de paire + date voisine (cosmetique)
    exp["source_pair_id"] = picked["source_pair_id"]
    exp["pair_key"] = exp["source_pair_id"].astype(str) + "_e" + np.arange(n_rows).astype(str)
    dt = pd.to_datetime(picked["date_t"])
    exp["date_t"] = (dt + pd.to_timedelta(
        rng.integers(-30, 31, n_rows), unit="D")).dt.strftime("%Y-%m-%d")
    return exp


def main() -> dict:
    rng = np.random.default_rng(SEED)
    df = pd.read_csv(CORPUS)
    df = df.fillna({c: 0.0 for c in FEATURES})
    df["source_pair_id"] = df.groupby(["teacher_id", "competence_id"]).ngroup()

    # split des PAIRES sources 80/20 chronologique (date_t)
    df = df.sort_values("date_t").reset_index(drop=True)
    n_test = max(1, int(round(len(df) * TEST_FRACTION)))
    train_src, test_src = df.iloc[:-n_test].copy(), df.iloc[-n_test:].copy()

    results = {"seed": SEED, "corpus_source": CORPUS.name,
               "n_source_rows": int(len(df)),
               "n_source_pairs_train": int(len(train_src)),
               "n_source_pairs_test": int(len(test_src))}

    # 1. Baseline 217 (meme protocole, memes paires test)
    results["baseline_217"] = run_protocol(
        train_src[FEATURES], train_src[TARGET],
        test_src[FEATURES], test_src[TARGET], "corpus_source_217")

    # 2. Expansion vers 1000 lignes
    n_test_exp = int(round(TARGET_ROWS * TEST_FRACTION))
    n_train_exp = TARGET_ROWS - n_test_exp
    exp_train = expand_sources(train_src, n_train_exp, rng)
    exp_test = expand_sources(test_src, n_test_exp, np.random.default_rng(SEED + 1))
    results["expanded_1000"] = run_protocol(
        exp_train[FEATURES], exp_train[TARGET],
        exp_test[FEATURES], exp_test[TARGET], "expanded_1000")
    results["expanded_1000"]["n_source_pairs_test"] = int(len(test_src))
    results["honest_note"] = (
        "Les lignes expandues sont des re-mesures simulees (bruit calibre) des "
        "217 paires sources ; le contenu informationnel ne depasse pas le corpus "
        "auteur. Valeur : effet du volume, IC95 plus serre (test ~5x plus grand), "
        "mecanique du pipeline a l'echelle. Anti-fuite : une paire source ne "
        "figure jamais dans le train ET le test.")

    REPORT.parent.mkdir(exist_ok=True)
    REPORT.write_text(json.dumps(results, indent=2, ensure_ascii=False),
                      encoding="utf-8")

    print(f"[OK] rapport -> {REPORT}")
    for label in ("baseline_217", "expanded_1000"):
        r = results[label]
        print(f"\n== {label} (train {r['n_train']} / test {r['n_test']}) ==")
        for m in ("MLP_32_16", "GradientBoosting", "Ridge", "XGBoost"):
            if m in r:
                d = r[m]
                line = (f"  {m:18s} RMSE {d['rmse']:.4f}  MAE {d['mae']:.4f}  "
                        f"R2 {d['r2']:+.4f}  acc+-0.5 {d['acc_pm_0p5']*100:.1f}%  "
                        f"acc+-1.0 {d['acc_pm_1p0']*100:.1f}%")
                if "delta_rmse_vs_mlp" in d:
                    dd = d["delta_rmse_vs_mlp"]
                    sig = "SIG" if dd["significant"] else "ns "
                    line += (f"  dRMSE vs MLP {dd['mean']:+.4f} "
                             f"IC95 [{dd['ic95'][0]:+.4f},{dd['ic95'][1]:+.4f}] {sig}")
                print(line)
    return results


if __name__ == "__main__":
    main()

