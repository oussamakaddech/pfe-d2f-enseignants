"""Hybride formule + ML pour la classe de risque à M+3 (expérience, lecture seule).

Constat de départ (train_risk_model) : la formule pondérée appliquée aux écarts à t
(= persistance) bat les modèles ML directs (macro-F1 0,722 vs 0,663), car 75,7 %
des enseignants gardent leur classe à 3 mois.

Idée : garder la formule comme décision par défaut et ne laisser le ML la
remplacer que lorsqu'il est TRÈS confiant d'un changement de classe :

    classe = c_ml   si  P_ml(c_ml) >= tau  et  c_ml != classe_formule
             classe_formule sinon

Le modèle reçoit en plus la classe de la formule à t (ordinale). tau est choisi
sur les mois de CALIBRATION uniquement (jamais sur le test), parmi une grille.
Le test (mêmes 6 derniers mois que train_risk_model) est évalué UNE fois, avec
le même bootstrap apparié (1000, graine 42) contre la formule.

Règle de décision (identique à train_risk_model) : l'hybride n'est retenu que si
macro-F1 >= 0,70 ET gain sur la formule significatif (IC95 apparié > 0).
Aucun artefact, aucun registre, aucun serving n'est modifié.

Usage : python -m pipelines.experiment_risk_hybrid
Sortie : reports/risk_hybrid_experiment.json
"""
from __future__ import annotations

import json
from datetime import datetime, timezone

import numpy as np
import pandas as pd
from sklearn.ensemble import GradientBoostingClassifier
from sklearn.metrics import f1_score

from pipelines.train_risk_model import (
    CALIB_MONTH_FRACTION,
    MACRO_F1_MIN,
    REPORTS_DIR,
    RISK_CLASSES,
    RISK_FEATURES,
    SIMULATION_CSV,
    TEST_MONTH_FRACTION,
    _ensure_dataset,
    _paired_macro_f1_gain,
    build_training_frame,
)

OUT = REPORTS_DIR / "risk_hybrid_experiment.json"
ORDRE = {c: i for i, c in enumerate(["LOW", "MEDIUM", "HIGH", "CRITICAL"])}
TAUS = [0.50, 0.55, 0.60, 0.65, 0.70, 0.75, 0.80, 0.85, 0.90, 0.95, 1.01]


def _X(frame: pd.DataFrame) -> np.ndarray:
    base = frame[RISK_FEATURES].to_numpy(dtype=float)
    formule = frame["risk_class_t"].map(ORDRE).to_numpy(dtype=float).reshape(-1, 1)
    return np.hstack([base, formule])


def _hybride(model, X: np.ndarray, y_formula: np.ndarray, tau: float) -> np.ndarray:
    proba = model.predict_proba(X)
    classes = np.asarray(model.classes_)
    best = proba.argmax(axis=1)
    c_ml, p_ml = classes[best], proba[np.arange(len(best)), best]
    out = y_formula.copy()
    swap = (p_ml >= tau) & (c_ml != y_formula)
    out[swap] = c_ml[swap]
    return out


def main() -> int:
    _ensure_dataset(SIMULATION_CSV)
    df = pd.read_csv(SIMULATION_CSV)
    frame = build_training_frame(df).dropna(subset=RISK_FEATURES + ["risk_class", "risk_class_t"])

    months = sorted(frame["ref_month"].unique())
    n_test = max(1, int(len(months) * TEST_MONTH_FRACTION))
    test_months, train_months = months[-n_test:], months[:-n_test]
    n_cal = max(1, int(len(train_months) * CALIB_MONTH_FRACTION))
    cal_months = train_months[-n_cal:]
    fit = frame[frame["ref_month"].isin(train_months) & ~frame["ref_month"].isin(cal_months)]
    cal = frame[frame["ref_month"].isin(cal_months)]
    test = frame[frame["ref_month"].isin(test_months)]

    model = GradientBoostingClassifier(n_estimators=200, max_depth=3, learning_rate=0.05,
                                       subsample=0.85, random_state=42)
    model.fit(_X(fit), fit["risk_class"].to_numpy())

    # Choix de tau sur la calibration seule.
    y_cal, f_cal = cal["risk_class"].to_numpy(), cal["risk_class_t"].to_numpy()
    grille = []
    for tau in TAUS:
        pred = _hybride(model, _X(cal), f_cal, tau)
        grille.append({"tau": tau, "macro_f1_calib": round(float(f1_score(y_cal, pred, average="macro", zero_division=0)), 4),
                       "changements": int((pred != f_cal).sum())})
    tau = max(grille, key=lambda g: (g["macro_f1_calib"], g["tau"]))["tau"]

    # Évaluation unique sur le test.
    y_test, f_test = test["risk_class"].to_numpy(), test["risk_class_t"].to_numpy()
    pred = _hybride(model, _X(test), f_test, tau)
    f1_h = float(f1_score(y_test, pred, average="macro", zero_division=0))
    f1_f = float(f1_score(y_test, f_test, average="macro", zero_division=0))
    gain = _paired_macro_f1_gain(y_test, pred, f_test)
    swaps = pred != f_test
    retenu = bool(f1_h >= MACRO_F1_MIN and gain["significant"] and gain["gain"] > 0)

    rapport = {
        "generated_at": datetime.now(timezone.utc).isoformat(),
        "corpus": str(SIMULATION_CSV.relative_to(SIMULATION_CSV.parents[2])).replace("\\", "/"),
        "split": {"fit": len(fit), "calibration": len(cal), "test": len(test),
                  "test_months": [str(test_months[0]), str(test_months[-1])]},
        "regle": "formule par défaut ; ML seulement si P(classe ML) >= tau et classe différente ; tau choisi sur la calibration",
        "grille_tau_calibration": grille,
        "tau_retenu": tau,
        "test": {
            "macro_f1_formule": round(f1_f, 4),
            "macro_f1_hybride": round(f1_h, 4),
            "gain_vs_formule": gain,
            "changements_de_classe_proposes": int(swaps.sum()),
            "changements_corrects": int((pred[swaps] == y_test[swaps]).sum()),
            "vrais_changements_dans_le_test": int((y_test != f_test).sum()),
        },
        "decision": "HYBRIDE_RETENU" if retenu else "FORMULE_CONSERVEE",
        "classes": RISK_CLASSES,
    }
    OUT.write_text(json.dumps(rapport, indent=2, ensure_ascii=False, default=str), encoding="utf-8")
    print(json.dumps(rapport["test"], ensure_ascii=False, default=str))
    print("tau =", tau, "| décision :", rapport["decision"])
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
