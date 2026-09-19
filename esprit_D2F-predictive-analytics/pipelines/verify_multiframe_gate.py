"""Démontre l'ouverture du protocole de validation multi-fenêtres avec 1500 lignes.

Vérifie que la garde (>= 500 lignes ET >= 6 mois distincts) fonctionne :
  - corpus TEST 1500 lignes (simulé) -> ELIGIBLE -> multi-fenêtres exécutée
  - corpus RÉEL 217 lignes            -> REFUSÉ avec message explicite (honnête)

Le corpus test est SIMULÉ : la démonstration porte sur le MÉCANISME, pas sur
une performance réelle.
"""
from __future__ import annotations

import json

import pandas as pd

from pipelines.validate_all_models import (
    MULTIFRAME_MIN_MONTHS,
    MULTIFRAME_MIN_ROWS,
    _evaluate_multiframe,
    _multiframe_eligibility,
)

TEST_CSV = "data/simulation/simulation_dataset_test1500.csv"
REAL_CSV = "data/clean/training_corpus_from_db.csv"
GB_PARAMS = {
    "n_estimators": 120, "max_depth": 3, "learning_rate": 0.08, "subsample": 0.85,
    "min_samples_split": 10, "min_samples_leaf": 5, "max_features": "sqrt", "random_state": 42,
}


def main() -> int:
    print(f"Garde : >= {MULTIFRAME_MIN_ROWS} lignes ET >= {MULTIFRAME_MIN_MONTHS} mois distincts\n")

    # 1. Corpus TEST 1500 (simulé)
    df_sim = pd.read_csv(TEST_CSV)
    elig_sim = _multiframe_eligibility(df_sim)
    print(f"[SIMULÉ 1500]  eligible={elig_sim['eligible']} | {elig_sim['n_rows']} lignes, "
          f"{elig_sim['distinct_months']} mois")
    print(f"               message : {elig_sim['message']}")

    rid = _evaluate_multiframe(df_sim, GB_PARAMS)
    if rid is None:
        print("               -> multi-fenêtres REFUSÉE (inattendu)")
        return 1
    folds = rid.get("folds", [])
    print(f"               -> multi-fenêtres EXÉCUTÉE : {len(folds)} fenêtres glissantes")
    rmses = []
    for f in folds:
        m = f.get("metrics", {})
        rmses.append(m.get("rmse"))
        print(f"                  fold {f.get('fold', '?')} : train={f.get('n_train')} "
              f"test={f.get('n_test')} RMSE={m.get('rmse')} R2={m.get('r2')}")
    if rmses and all(r is not None for r in rmses):
        mean = sum(rmses) / len(rmses)
        spread = max(rmses) - min(rmses)
        print(f"                  RMSE moyen={mean:.4f} | amplitude inter-fenêtres={spread:.4f}")
    if "aggregate" in rid:
        print(f"                  agrégat : {json.dumps(rid['aggregate'], ensure_ascii=False)[:160]}")

    # 2. Corpus RÉEL 217 (doit être refusé)
    print()
    df_real = pd.read_csv(REAL_CSV)
    elig_real = _multiframe_eligibility(df_real)
    print(f"[RÉEL 217]     eligible={elig_real['eligible']} | {elig_real['n_rows']} lignes, "
          f"{elig_real['distinct_months']} mois distincts")
    print(f"               message : {elig_real['message']}")
    assert elig_real["eligible"] is False, "le corpus réel ne doit pas être éligible"
    assert elig_sim["eligible"] is True, "le corpus de test doit être éligible"

    print("\n[OK] Garde vérifiée : refus honnête sous 500 lignes, exécution dès que le volume suffit.")
    print("[RAPPEL] Le corpus 1500 est SIMULÉ : valide le mécanisme, pas la performance réelle.")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())