"""Amélioration gouvernée du gap predictor : features, réglage, évaluation robuste.

Pourquoi ce pipeline (2026-09-23). Les modèles étaient comparés sur UN holdout
(43 lignes sur le corpus réel) avec des hyperparamètres fixés à la main : un
écart de quelques centièmes n'y veut rien dire, et régler sur ce holdout
(47 réglages pour XGBoost v1.2.0) revient à choisir sur le test.

Protocole :
- tri temporel STABLE (date_t, teacher_id, competence_id) ; les 20 % les plus
  récents forment le TEST, mis de côté et évalués UNE seule fois ;
- sélection (jeu de features, famille, hyperparamètres) par validation croisée
  temporelle glissante sur la seule partie entraînement : plis à origine
  croissante découpés par DATE (aucun mois à cheval sur deux plis) ;
- verdict sur le test : IC95 bootstrap apparié contre la configuration de
  référence (hyperparamètres du modèle servi, 29 features) et contre la règle
  déterministe à un paramètre (``pipelines.baselines``) ;
- anti-fuite inchangé : gap_next_3m, required_level(_t) et
  knowledge_difficulty_level n'entrent jamais dans X, ni aucune feature qui en
  dérive. Les features ajoutées sont des combinaisons de valeurs connues à t.

Corpus réel : la cible y est EXTRAPOLÉE par une formule
(``generate_corpus_from_db.py``) dont la seule inconnue est le niveau requis.
Le pipeline y mesure l'incertitude réelle des comparaisons (validation
croisée), pas une « accuracy » à gonfler. Seul un gain significatif sur le
corpus de simulation (cible observée) est un gain de méthode.

Ne touche ni au registre ni au modèle servi : écrit un rapport, et
l'artefact du meilleur candidat uniquement avec ``--save-candidate``.

Usage :
    python -m pipelines.improve_gap_models --corpus simulation
    python -m pipelines.improve_gap_models --corpus reel
"""
from __future__ import annotations

import argparse
import json
import os
import time
from datetime import datetime, timezone
from pathlib import Path

import numpy as np
import pandas as pd
from sklearn.ensemble import GradientBoostingRegressor, HistGradientBoostingRegressor
from sklearn.model_selection import ParameterSampler

from pipelines.baselines import extrapolation_rule_predictions
from pipelines.train_gap_model import FEATURE_COLS, TARGET_COL

BASE_DIR = Path(__file__).parent.parent
REPORTS = BASE_DIR / "reports"
MODELS = BASE_DIR / "data" / "models"
CORPUS = {
    "simulation": BASE_DIR / "data" / "clean" / "simulation_dataset.csv",
    "reel": BASE_DIR / "data" / "clean" / "training_corpus_provenanced.csv",
}
SEED = 42
# joblib (loky) interroge `wmic` pour compter les CPU sous Windows et imprime
# « [WinError 2] » quand il est absent : sans effet sur les calculs, on le fixe.
os.environ.setdefault("LOKY_MAX_CPU_COUNT", str(os.cpu_count() or 1))
N_BOOT = 1000
LEAK = {TARGET_COL, "required_level", "required_level_t", "knowledge_difficulty_level"}

# Hyperparamètres du modèle servi (v1.2.0-gb) = référence.
REFERENCE_GB = dict(n_estimators=120, max_depth=3, learning_rate=0.08, subsample=0.85,
                    min_samples_split=10, min_samples_leaf=5, max_features="sqrt")


# ------------------------------------------------------------------ features
def engineered(frame: pd.DataFrame) -> pd.DataFrame:
    """Features dérivées, toutes calculées à partir de valeurs connues à t."""
    out = pd.DataFrame(index=frame.index)
    out["delta_t3_t"] = frame["current_level_t"] - frame["current_level_t3"]
    out["accel_gap"] = frame["lag_gap_t1_t"] - frame["lag_gap_t3_t2"]
    out["level_vs_avg"] = frame["current_level_t"] - frame["avg_level"]
    out["level_vs_min"] = frame["current_level_t"] - frame["min_level"]
    # Volontairement ABSENT : le niveau extrapolé clip(t + (t - t3)/3, 1, 5).
    # C'est le terme exact de la formule qui fabrique la cible réelle
    # (generate_corpus_from_db.py) : le fournir au modèle reviendrait à lui
    # redonner la formule sur le corpus réel.
    return out


def feature_sets(train: pd.DataFrame) -> dict[str, list[str]]:
    inert = [c for c in FEATURE_COLS if train[c].nunique() <= 1]
    return {
        "base_29": list(FEATURE_COLS),
        "sans_inertes": [c for c in FEATURE_COLS if c not in inert],
        "base_29_plus_derivees": list(FEATURE_COLS) + list(engineered(train.head(1)).columns),
    }


def matrix(frame: pd.DataFrame, cols: list[str]) -> pd.DataFrame:
    full = pd.concat([frame[[c for c in cols if c in frame.columns]].astype(float),
                      engineered(frame)[[c for c in cols if c not in frame.columns]]], axis=1)
    assert not (set(full.columns) & LEAK), "fuite : colonne interdite dans X"
    return full[cols]


def minmax(train_x: pd.DataFrame, other: pd.DataFrame) -> tuple[np.ndarray, np.ndarray]:
    lo, hi = train_x.min(), train_x.max()
    span = (hi - lo).replace(0, np.nan)
    f = lambda x: ((x - lo) / span).clip(0, 1).fillna(0.0).to_numpy(dtype=float)
    return f(train_x), f(other)


# -------------------------------------------------------------------- modèles
def build(family: str, params: dict):
    if family == "gb":
        return GradientBoostingRegressor(random_state=SEED, **params)
    if family == "hgb":
        return HistGradientBoostingRegressor(random_state=SEED, **params)
    if family == "xgb":
        from xgboost import XGBRegressor
        return XGBRegressor(random_state=SEED, verbosity=0, n_jobs=-1, **params)
    raise ValueError(family)


SPACES = {
    "gb": {"n_estimators": [150, 250, 400], "max_depth": [2, 3, 4, 5], "learning_rate": [0.03, 0.05, 0.08, 0.12],
           "subsample": [0.7, 0.85, 1.0], "min_samples_leaf": [5, 10, 20, 40], "max_features": [None, "sqrt", 0.6]},
    "hgb": {"max_iter": [150, 300, 500], "max_depth": [None, 3, 5, 7], "learning_rate": [0.03, 0.05, 0.08, 0.12],
            "min_samples_leaf": [10, 20, 40, 80], "l2_regularization": [0.0, 0.1, 1.0]},
    "xgb": {"n_estimators": [150, 250, 400], "max_depth": [2, 3, 4, 5], "learning_rate": [0.03, 0.05, 0.08, 0.12],
            "subsample": [0.7, 0.85, 1.0], "colsample_bytree": [0.6, 0.8, 1.0], "min_child_weight": [1, 5, 10],
            "reg_lambda": [1.0, 5.0]},
}


def rmse(y, p) -> float:
    return float(np.sqrt(np.mean((np.asarray(y) - np.asarray(p)) ** 2)))


# ------------------------------------------------------------------- découpes
def temporal_order(df: pd.DataFrame) -> pd.DataFrame:
    keys = ["date_t"] + [c for c in ("teacher_id", "competence_id") if c in df.columns]
    out = df.copy()
    out["date_t"] = pd.to_datetime(out["date_t"])
    return out.sort_values(keys, kind="mergesort").reset_index(drop=True)


def holdout_split(df: pd.DataFrame) -> tuple[pd.DataFrame, pd.DataFrame]:
    n_test = max(20, int(len(df) * 0.2))
    return df.iloc[: len(df) - n_test], df.iloc[len(df) - n_test:]


def rolling_folds(train: pd.DataFrame, k: int) -> list[tuple[np.ndarray, np.ndarray]]:
    """Plis à origine croissante, frontières sur des DATES entières."""
    dates = np.sort(train["date_t"].unique())
    bounds = np.linspace(0, len(dates), k + 2).astype(int)[1:]
    folds = []
    for i in range(k):
        fit_dates = dates[: bounds[i]]
        val_dates = dates[bounds[i]: bounds[i + 1]]
        fit_idx = np.where(train["date_t"].isin(fit_dates))[0]
        val_idx = np.where(train["date_t"].isin(val_dates))[0]
        if len(fit_idx) >= 20 and len(val_idx) >= 5:
            folds.append((fit_idx, val_idx))
    return folds


def cv_score(train: pd.DataFrame, y: np.ndarray, folds, cols, family, params) -> float:
    scores = []
    for fit_idx, val_idx in folds:
        xf, xv = minmax(matrix(train.iloc[fit_idx], cols), matrix(train.iloc[val_idx], cols))
        model = build(family, params).fit(xf, y[fit_idx])
        scores.append(rmse(y[val_idx], np.clip(model.predict(xv), 0, 5)))
    return float(np.mean(scores))


def cv_rule(train: pd.DataFrame, y: np.ndarray, folds) -> float:
    scores = []
    for fit_idx, val_idx in folds:
        pred, _ = extrapolation_rule_predictions(train.iloc[fit_idx], y[fit_idx], train.iloc[val_idx])
        scores.append(rmse(y[val_idx], pred))
    return float(np.mean(scores))


def paired_bootstrap(y, p_ref, p_new, seed=SEED) -> dict:
    """Écart RMSE(référence) − RMSE(nouveau) ; positif = le nouveau fait mieux."""
    rng = np.random.default_rng(seed)
    y, p_ref, p_new = map(np.asarray, (y, p_ref, p_new))
    diffs = []
    for _ in range(N_BOOT):
        i = rng.integers(0, len(y), len(y))
        diffs.append(rmse(y[i], p_ref[i]) - rmse(y[i], p_new[i]))
    lo, hi = np.percentile(diffs, [2.5, 97.5])
    return {"gain_rmse": round(rmse(y, p_ref) - rmse(y, p_new), 4), "ic95": [round(float(lo), 4), round(float(hi), 4)],
            "significatif": bool(lo > 0 or hi < 0)}


def accuracy(y, p) -> dict:
    e = np.abs(np.asarray(y) - np.asarray(p))
    return {"pm05": round(100 * float(np.mean(e <= 0.5)), 1), "pm10": round(100 * float(np.mean(e <= 1.0)), 1)}


# ----------------------------------------------------------------------- main
def run(corpus: str, n_iter: int, k: int, save_candidate: bool) -> dict:
    t0 = time.time()
    df = temporal_order(pd.read_csv(CORPUS[corpus]))
    train, test = holdout_split(df)
    y_tr = train[TARGET_COL].clip(0, 5).to_numpy(float)
    y_te = test[TARGET_COL].clip(0, 5).to_numpy(float)
    folds = rolling_folds(train, k)
    print(f"[{corpus}] {len(df)} lignes | train {len(train)} / test {len(test)} | {len(folds)} plis temporels")

    # 1. Jeu de features, à configuration de référence fixée.
    sets = feature_sets(train)
    set_scores = {name: cv_score(train, y_tr, folds, cols, "gb", REFERENCE_GB) for name, cols in sets.items()}
    for name, s in set_scores.items():
        print(f"  features {name:<24} CV-RMSE {s:.4f}")
    best_set = min(set_scores, key=set_scores.get)

    # 2. Réglage par famille, sur ce jeu, en validation croisée seulement.
    cols = sets[best_set]
    tuning = {}
    for family, space in SPACES.items():
        trials = []
        for params in ParameterSampler(space, n_iter=n_iter, random_state=SEED):
            trials.append((cv_score(train, y_tr, folds, cols, family, params), params))
        trials.sort(key=lambda t: t[0])
        tuning[family] = {"cv_rmse": round(trials[0][0], 4), "params": trials[0][1], "n_essais": len(trials)}
        print(f"  {family:<4} meilleur CV-RMSE {trials[0][0]:.4f} {trials[0][1]}")
    reference_cv = cv_score(train, y_tr, folds, list(FEATURE_COLS), "gb", REFERENCE_GB)
    rule_cv = cv_rule(train, y_tr, folds)
    winner = min(tuning, key=lambda f: tuning[f]["cv_rmse"])

    # 3. Verdict sur le test, une seule fois.
    xr_tr, xr_te = minmax(matrix(train, list(FEATURE_COLS)), matrix(test, list(FEATURE_COLS)))
    p_ref = np.clip(build("gb", REFERENCE_GB).fit(xr_tr, y_tr).predict(xr_te), 0, 5)
    xb_tr, xb_te = minmax(matrix(train, cols), matrix(test, cols))
    best_model = build(winner, tuning[winner]["params"]).fit(xb_tr, y_tr)
    p_new = np.clip(best_model.predict(xb_te), 0, 5)
    p_rule, _ = extrapolation_rule_predictions(train, y_tr, test)

    rapport = {
        "generated_at": datetime.now(timezone.utc).isoformat(),
        "corpus": str(CORPUS[corpus].relative_to(BASE_DIR)).replace("\\", "/"),
        "cible": "observée (simulation)" if corpus != "reel" else "EXTRAPOLÉE par formule (réel)",
        "protocole": {"split": "tri stable date_t>teacher_id>competence_id, test = 20 % les plus récents, évalué une fois",
                      "selection": f"validation croisée temporelle glissante, {len(folds)} plis découpés par date, sur le train seul",
                      "essais_par_famille": n_iter, "graine": SEED, "bootstrap": N_BOOT},
        "lignes": {"total": len(df), "train": len(train), "test": len(test)},
        "features": {"jeux": {k2: len(v) for k2, v in sets.items()}, "cv_rmse_reference_par_jeu": {k2: round(v, 4) for k2, v in set_scores.items()},
                     "retenu": best_set},
        "validation_croisee": {"regle_1_parametre": round(rule_cv, 4), "reference_gb_servi": round(reference_cv, 4),
                               "meilleurs_par_famille": tuning, "vainqueur": winner},
        "test": {
            "regle_1_parametre": {"rmse": round(rmse(y_te, p_rule), 4), **accuracy(y_te, p_rule)},
            "reference_gb_servi": {"rmse": round(rmse(y_te, p_ref), 4), **accuracy(y_te, p_ref)},
            "candidat": {"famille": winner, "features": best_set, "rmse": round(rmse(y_te, p_new), 4), **accuracy(y_te, p_new)},
            "candidat_vs_reference": paired_bootstrap(y_te, p_ref, p_new),
            "candidat_vs_regle": paired_bootstrap(y_te, p_rule, p_new),
            "reference_vs_regle": paired_bootstrap(y_te, p_rule, p_ref),
        },
        "duree_s": round(time.time() - t0, 1),
    }
    verdict = rapport["test"]["candidat_vs_reference"]
    rapport["decision"] = ("CANDIDAT_SIGNIFICATIVEMENT_MEILLEUR" if verdict["significatif"] and verdict["gain_rmse"] > 0
                           else "AUCUN_GAIN_DEMONTRE_REFERENCE_CONSERVEE")
    if save_candidate and rapport["decision"].startswith("CANDIDAT"):
        from app.infrastructure.ml.artifact_integrity import save_with_integrity
        out = MODELS / f"gap_predictor_{corpus}_improved_candidate.joblib"
        save_with_integrity(best_model, out)
        rapport["artefact_candidat"] = out.name
    REPORTS.mkdir(exist_ok=True)
    (REPORTS / f"model_improvement_{corpus}.json").write_text(json.dumps(rapport, indent=2, ensure_ascii=False, default=str), encoding="utf-8")
    t = rapport["test"]
    print(f"  TEST règle {t['regle_1_parametre']['rmse']} | référence {t['reference_gb_servi']['rmse']} | "
          f"candidat {winner} {t['candidat']['rmse']} | gain {verdict} | {rapport['decision']} ({rapport['duree_s']} s)")
    return rapport


def main() -> None:
    ap = argparse.ArgumentParser(description=__doc__)
    ap.add_argument("--corpus", choices=sorted(CORPUS), default="simulation")
    ap.add_argument("--n-iter", type=int, default=12, help="essais aléatoires par famille")
    ap.add_argument("--folds", type=int, default=4)
    ap.add_argument("--save-candidate", action="store_true")
    a = ap.parse_args()
    run(a.corpus, a.n_iter, a.folds, a.save_candidate)


if __name__ == "__main__":
    main()
