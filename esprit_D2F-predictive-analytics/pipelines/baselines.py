"""Baselines de référence du gap predictor — contrat de comparaison honnête.

Le lift d'un modèle ne veut rien dire sans la baseline qu'il bat. Ce module
centralise les baselines légitimes, pour que l'entraînement, les audits et le
rapport parlent tous du même chiffre.

Historique du correctif
-----------------------
La baseline dite « de persistance » utilisée jusqu'ici valait
``clip(current_level_t - avg_level, 0, 5)``. Sur le holdout servi elle vaut
**0 pour 77 % des lignes** (moyenne 0,149) alors que la cible vaut 2,132 en
moyenne : ce n'est pas une prévision de l'écart, c'est l'écart du niveau à la
moyenne de l'enseignant. Son RMSE de 2,4949 est donc artificiellement élevé,
et le lift de 1,2629 qu'on en tirait surestimait l'apport du modèle d'un
facteur ~5 (lift honnête : 0,2570 contre la moyenne du train).

Le corpus impose une seconde baseline, plus exigeante. Tant que la cible est
extrapolée (``is_extrapolated`` vrai sur toutes les lignes), elle est produite
par une formule déterministe :

    gap = max(0, requis - clip(niveau_t + (niveau_t - niveau_t3) / 3, 1, 5))

Le seul terme inconnu du modèle est ``requis``. Une règle à UN paramètre, ce
``requis`` calibré sur le train seul, est donc le vrai concurrent du modèle —
pas la moyenne, et pas un autre réseau de neurones. Mesure sur le holdout
servi : règle 1,2210 contre 1,2140 pour le Gradient Boosting à 29 features,
écart non significatif (IC95 bootstrap [-0,1236, +0,1384]).

Politique retenue : ``baseline_rmse`` est le RMSE de la baseline la PLUS FORTE
(RMSE le plus bas) parmi les baselines légitimes. Le lift annoncé est donc le
plus conservateur possible. Toutes les baselines restent exposées
individuellement pour la traçabilité.
"""
from __future__ import annotations

import numpy as np
import pandas as pd
from sklearn.metrics import mean_absolute_error, mean_squared_error

# Grille de calibration du niveau requis de la règle d'extrapolation.
_REQUIRED_GRID = np.arange(1.0, 5.51, 0.05)

# Baselines écartées du choix de ``baseline_rmse`` : conservées pour la
# continuité des rapports, mais jamais utilisées pour annoncer un lift.
DEGENERATE_BASELINES = ("persistence_proxy",)


def _rmse(y_true: np.ndarray, y_pred: np.ndarray) -> float:
    return float(np.sqrt(mean_squared_error(y_true, y_pred)))


def extrapolated_future_level(frame: pd.DataFrame) -> np.ndarray:
    """Niveau futur reconstruit par la formule du générateur de corpus.

    Réplique ``generate_corpus_from_db`` : prolongement de la tendance
    ``t-3 -> t`` sur un pas, borné à l'échelle des niveaux [1, 5].
    """
    niveau_t = frame["current_level_t"].astype(float).to_numpy()
    niveau_t3 = frame["current_level_t3"].astype(float).to_numpy()
    return np.clip(niveau_t + (niveau_t - niveau_t3) / 3.0, 1.0, 5.0)


def calibrate_required_level(frame_train: pd.DataFrame, y_train: np.ndarray) -> float:
    """Calibre le niveau requis de la règle sur le TRAIN uniquement.

    Aucune information du holdout n'entre dans ce choix : la règle reste une
    baseline honnête, comparable au modèle sur le même jeu de test.
    """
    futur = extrapolated_future_level(frame_train)
    erreurs = [_rmse(y_train, np.maximum(0.0, r - futur)) for r in _REQUIRED_GRID]
    return float(_REQUIRED_GRID[int(np.argmin(erreurs))])


def extrapolation_rule_predictions(
    frame_train: pd.DataFrame,
    y_train: np.ndarray,
    frame_test: pd.DataFrame,
) -> tuple[np.ndarray, float]:
    """Prédictions de la règle déterministe à un paramètre + le paramètre retenu."""
    requis = calibrate_required_level(frame_train, y_train)
    return np.maximum(0.0, requis - extrapolated_future_level(frame_test)), requis


def persistence_proxy_predictions(frame_test: pd.DataFrame) -> np.ndarray:
    """Ancienne baseline « persistance » — conservée pour la continuité.

    Dégénérée sur le corpus servi (nulle sur 77 % des lignes) : elle n'entre
    jamais dans le choix de ``baseline_rmse``.
    """
    return np.clip(
        frame_test["current_level_t"].astype(float).to_numpy()
        - frame_test["avg_level"].astype(float).to_numpy(),
        0.0,
        5.0,
    )


def compute_baselines(
    frame_train: pd.DataFrame,
    y_train: np.ndarray,
    frame_test: pd.DataFrame,
    y_test: np.ndarray,
) -> dict[str, object]:
    """Évalue toutes les baselines et désigne la plus forte comme référence.

    Retourne ``baseline_rmse``/``baseline_mae`` (la référence retenue),
    ``baseline_name``, et le détail par baseline dans ``baselines``.
    """
    y_train = np.asarray(y_train, dtype=float)
    y_test = np.asarray(y_test, dtype=float)

    regle, requis = extrapolation_rule_predictions(frame_train, y_train, frame_test)
    candidates: dict[str, np.ndarray] = {
        "extrapolation_rule": regle,
        "train_mean": np.full_like(y_test, float(np.mean(y_train))),
        "train_median": np.full_like(y_test, float(np.median(y_train))),
        "persistence_proxy": persistence_proxy_predictions(frame_test),
    }

    detail: dict[str, dict[str, object]] = {}
    for nom, pred in candidates.items():
        detail[nom] = {
            "rmse": round(_rmse(y_test, pred), 4),
            "mae": round(float(mean_absolute_error(y_test, pred)), 4),
            "legitimate": nom not in DEGENERATE_BASELINES,
        }
    detail["extrapolation_rule"]["required_level_calibrated_on_train"] = round(requis, 2)
    part_nulle = float(np.mean(candidates["persistence_proxy"] == 0.0))
    detail["persistence_proxy"]["zero_share"] = round(part_nulle, 4)
    detail["persistence_proxy"]["note"] = (
        "dégénérée : nulle sur "
        f"{part_nulle:.0%} du holdout — écartée du calcul du lift"
    )

    legitimes = {n: v for n, v in detail.items() if v["legitimate"]}
    reference = min(legitimes, key=lambda n: legitimes[n]["rmse"])
    return {
        "baseline_name": reference,
        "baseline_rmse": float(legitimes[reference]["rmse"]),
        "baseline_mae": float(legitimes[reference]["mae"]),
        "baseline_predictions": candidates[reference],
        "baseline_selection_rule": "RMSE la plus basse parmi les baselines légitimes",
        "baselines": detail,
    }


def bootstrap_lift_ci95(
    y_test: np.ndarray,
    model_predictions: np.ndarray,
    baseline_predictions: np.ndarray,
    n_boot: int = 1000,
    seed: int = 42,
) -> tuple[float, tuple[float, float], bool]:
    """IC95 bootstrap du lift RMSE (baseline - modèle) sur l'échantillon de test."""
    y_test = np.asarray(y_test, dtype=float)
    rng = np.random.default_rng(seed)
    n = len(y_test)
    lifts = np.empty(n_boot, dtype=float)
    for b in range(n_boot):
        idx = rng.choice(n, size=n, replace=True)
        lifts[b] = _rmse(y_test[idx], baseline_predictions[idx]) - _rmse(
            y_test[idx], model_predictions[idx]
        )
    lo, hi = (float(np.percentile(lifts, 2.5)), float(np.percentile(lifts, 97.5)))
    lift = _rmse(y_test, baseline_predictions) - _rmse(y_test, model_predictions)
    return round(lift, 4), (round(lo, 4), round(hi, 4)), bool(lo > 0)
