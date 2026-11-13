"""Tests du contrat de baselines du gap predictor.

Verrouille le correctif d'audit : le lift annoncé doit être mesuré contre une
baseline légitime, et la baseline « persistance » historique
(``current_level_t - avg_level``) est dégénérée sur le corpus servi — nulle
sur la grande majorité des lignes, donc RMSE gonflé et lift surestimé.
"""
from __future__ import annotations

from pathlib import Path

import numpy as np
import pandas as pd
import pytest

from pipelines.baselines import (
    bootstrap_lift_ci95,
    calibrate_required_level,
    compute_baselines,
    extrapolated_future_level,
    persistence_proxy_predictions,
)

CORPUS = (
    Path(__file__).resolve().parents[2]
    / "data"
    / "clean"
    / "training_corpus_provenanced.csv"
)


def _frame(n: int = 40, seed: int = 0) -> pd.DataFrame:
    rng = np.random.default_rng(seed)
    niveau_t = rng.integers(1, 6, size=n).astype(float)
    return pd.DataFrame(
        {
            "current_level_t": niveau_t,
            "current_level_t3": np.clip(niveau_t - 1, 1, 5),
            "avg_level": niveau_t,  # proxy de persistance nul par construction
            "gap_next_3m": np.maximum(0.0, 4.0 - niveau_t),
        }
    )


def test_extrapolated_future_level_reproduit_la_formule_du_generateur():
    frame = pd.DataFrame({"current_level_t": [4.0], "current_level_t3": [1.0]})
    # 4 + (4 - 1) / 3 = 5, borné à l'échelle des niveaux
    assert extrapolated_future_level(frame)[0] == pytest.approx(5.0)
    borne = pd.DataFrame({"current_level_t": [5.0], "current_level_t3": [1.0]})
    assert extrapolated_future_level(borne)[0] == pytest.approx(5.0)


def test_required_level_calibre_sur_le_train_seulement():
    """La règle ne voit jamais le holdout : elle reste une baseline honnête."""
    train = _frame(seed=1)
    requis = calibrate_required_level(train, train["gap_next_3m"].to_numpy())
    assert 1.0 <= requis <= 5.5
    # Le calibrage ne dépend que du train : rappeler avec un autre test ne change rien.
    assert requis == calibrate_required_level(train, train["gap_next_3m"].to_numpy())


def test_persistence_proxy_est_ecartee_du_lift():
    """La baseline dégénérée est mesurée, exposée, mais jamais retenue."""
    train, test = _frame(seed=2), _frame(seed=3)
    resultat = compute_baselines(
        train, train["gap_next_3m"].to_numpy(), test, test["gap_next_3m"].to_numpy()
    )
    proxy = resultat["baselines"]["persistence_proxy"]
    assert proxy["legitimate"] is False
    assert proxy["zero_share"] == pytest.approx(1.0)  # nulle partout ici
    assert resultat["baseline_name"] != "persistence_proxy"
    assert "dégénérée" in proxy["note"]


def test_baseline_retenue_est_la_plus_forte():
    """``baseline_rmse`` = RMSE la plus basse des baselines légitimes."""
    train, test = _frame(seed=4), _frame(seed=5)
    resultat = compute_baselines(
        train, train["gap_next_3m"].to_numpy(), test, test["gap_next_3m"].to_numpy()
    )
    legitimes = {
        nom: detail["rmse"]
        for nom, detail in resultat["baselines"].items()
        if detail["legitimate"]
    }
    assert resultat["baseline_rmse"] == pytest.approx(min(legitimes.values()))
    assert resultat["baseline_name"] == min(legitimes, key=legitimes.get)


def test_bootstrap_lift_ci95_detecte_un_gain_nul():
    """Modèle identique à la baseline => lift nul, IC95 contenant 0."""
    y = np.array([0.0, 1.0, 2.0, 3.0, 4.0] * 8)
    pred = np.full_like(y, 2.0)
    lift, (lo, hi), significatif = bootstrap_lift_ci95(y, pred, pred, n_boot=200)
    assert lift == pytest.approx(0.0)
    assert lo <= 0 <= hi
    assert significatif is False


@pytest.mark.skipif(not CORPUS.exists(), reason="corpus servi absent")
def test_corpus_servi_la_baseline_historique_est_degeneree():
    """Sur le vrai holdout servi, le proxy de persistance est nul en majorité.

    C'est la mesure qui justifie le correctif : un RMSE calculé sur cette
    baseline surestimait le lift du modèle d'un facteur ~5.
    """
    corpus = pd.read_csv(CORPUS)
    test = corpus.iloc[174:]
    proxy = persistence_proxy_predictions(test)
    assert float(np.mean(proxy == 0.0)) > 0.5
    assert float(np.mean(proxy)) < float(test["gap_next_3m"].mean()) / 5


@pytest.mark.skipif(not CORPUS.exists(), reason="corpus servi absent")
def test_corpus_servi_la_regle_deterministe_talonne_le_modele():
    """Cible extrapolée => une règle à un paramètre reste le vrai concurrent.

    Verrouille le constat d'audit : tant que ``is_extrapolated`` est vrai
    partout, aucun gain du modèle ne peut être annoncé sans se comparer à
    cette règle.
    """
    corpus = pd.read_csv(CORPUS)
    train, test = corpus.iloc[:174], corpus.iloc[174:]
    resultat = compute_baselines(
        train,
        train["gap_next_3m"].to_numpy(),
        test,
        test["gap_next_3m"].to_numpy(),
    )
    assert resultat["baseline_name"] == "extrapolation_rule"
    # Le modèle servi est à 1,2140 : la règle doit rester dans son voisinage.
    assert resultat["baseline_rmse"] < 1.30
