"""Experience : pousser l'accuracy au maximum possible honnetement.

Trois leviers testes sur le corpus auteur (217 lignes, split paires 80/20) :
1. Bandes de tolerance elargies (+-0.75 / +-1.0 / +-1.5 / +-2.0) pour le
   meilleur regresseur ;
2. Reformulation en CLASSIFICATION de severite (meme bins que l'application :
   CRITIQUE >= 0.75, HAUTE >= 0.50, MOYENNE >= 0.25, FAIBLE) — exact accuracy
   + macro-F1 (garde anti-classe-majoritaire) ;
3. Verification du corpus simulateur (10 920 lignes) ou l'accuracy est
   structurellement elevee.

Lecture honnete attendue : l'accuracy plafonne par le contenu informationnel
du corpus auteur ; la severite (tache plus grossiere) peut l'augmenter, a
condition que le macro-F1 suive (sinon ce n'est que la classe majoritaire).
"""
from __future__ import annotations

import json
from pathlib import Path

import numpy as np
import pandas as pd
from sklearn.ensemble import GradientBoostingClassifier, GradientBoostingRegressor
from sklearn.linear_model import RidgeCV
from sklearn.metrics import accuracy_score, f1_score
from sklearn.neural_network import MLPRegressor
from sklearn.preprocessing import StandardScaler

try:
    from xgboost import XGBRegressor
    HAS_XGB = True
except Exception:
    HAS_XGB = False

BASE = Path(__file__).parent.parent
CORPUS = BASE / "data" / "clean" / "training_corpus_from_db.csv"
REPORT = BASE / "reports" / "max_accuracy_results.json"

SEED = 42
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


def tolerance_accs(y_true, y_pred) -> dict:
    e = np.abs(np.asarray(y_true) - np.asarray(y_pred))
    return {f"acc_pm_{t}": float(np.mean(e <= t)) for t in (0.5, 0.75, 1.0, 1.5, 2.0)}


def main() -> dict:
    df = pd.read_csv(CORPUS).fillna({c: 0.0 for c in FEATURES})
    df = df.sort_values("date_t").reset_index(drop=True)
    n_test = max(1, int(round(len(df) * 0.2)))
    tr, te = df.iloc[:-n_test], df.iloc[-n_test:]
    sc = StandardScaler().fit(tr[FEATURES])
    Xt, Xs = sc.transform(tr[FEATURES]), sc.transform(te[FEATURES])
    ytr, yte = tr[TARGET].to_numpy(), te[TARGET].to_numpy()
    out = {"seed": SEED, "n_train": int(len(tr)), "n_test": int(len(te))}

    # ---- 1. Regresseurs + bandes de tolerance ----
    models = {
        "Ridge": RidgeCV(alphas=np.logspace(-3, 3, 25)),
        "GradientBoosting": GradientBoostingRegressor(
            learning_rate=0.03, n_estimators=200, max_depth=2,
            subsample=0.9, min_samples_leaf=8, random_state=SEED),
        "MLP": MLPRegressor(hidden_layer_sizes=(32, 16), alpha=0.05,
                            max_iter=600, random_state=SEED),
    }
    if HAS_XGB:
        models["XGBoost"] = XGBRegressor(n_estimators=200, max_depth=1,
                                         learning_rate=0.05, random_state=SEED,
                                         verbosity=0)
    for name, m in models.items():
        m.fit(Xt, ytr)
        p = np.clip(m.predict(Xs), 0.0, 5.0)
        out[name] = tolerance_accs(yte, p)

    # ---- 2. Classification de severite (bins de l'application) ----
    def sev(v):
        return np.where(v >= 0.75, 3, np.where(v >= 0.50, 2, np.where(v >= 0.25, 1, 0)))

    clf = GradientBoostingClassifier(random_state=SEED)
    clf.fit(Xt, sev(ytr))
    pc = clf.predict(Xs)
    sc_true, sc_pred = sev(yte), pc
    out["severity_classifier"] = {
        "exact_accuracy": float(accuracy_score(sc_true, sc_pred)),
        "macro_f1": float(f1_score(sc_true, sc_pred, average="macro")),
        "majority_share_test": float(np.mean(sc_true == 3)),  # classe dominante ?
        "note": "3=CRITIQUE. Si exact_accuracy ~ majority_share, c'est trivial.",
    }

    REPORT.parent.mkdir(exist_ok=True)
    REPORT.write_text(json.dumps(out, indent=2, ensure_ascii=False),
                      encoding="utf-8")
    print(f"[OK] rapport -> {REPORT}\n")
    hdr = f"{'model':18s} " + " ".join(f"{t:>8s}" for t in
          ("+-0.5", "+-0.75", "+-1.0", "+-1.5", "+-2.0"))
    print(hdr)
    for name in list(models) + ["severity_classifier(exact)"]:
        if name in out:
            d = out[name]
            print(f"{name:18s} " + " ".join(
                f"{d[f'acc_pm_{t}']*100:7.1f}%" for t in (0.5, 0.75, 1.0, 1.5, 2.0)))
    s = out["severity_classifier"]
    print(f"\nSeverite : exact {s['exact_accuracy']*100:.1f}%  "
          f"macro-F1 {s['macro_f1']:.3f}  part classe majoritaire "
          f"{s['majority_share_test']*100:.1f}%")
    return out


if __name__ == "__main__":
    main()
