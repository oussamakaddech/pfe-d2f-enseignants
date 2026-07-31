"""Split temporel — jamais de k-fold aléatoire sur données temporelles."""

from __future__ import annotations

from dataclasses import dataclass

import numpy as np
import pandas as pd


@dataclass
class TemporalSplit:
    train_indices: np.ndarray
    test_indices: np.ndarray
    split_date: pd.Timestamp


def temporal_split(
    event_dates: pd.Series,
    *,
    test_size: float = 0.2,
    min_train_rows: int = 10,
) -> TemporalSplit:
    """Découpe chronologiquement: train = dates passées, test = dates futures.

    Lève ValueError si trop peu de données.
    """
    dates = pd.to_datetime(event_dates)
    ordered = dates.sort_values()
    if len(ordered) < min_train_rows + 1:
        raise ValueError(
            f"données insuffisantes pour un split temporel ({len(ordered)} lignes)"
        )
    n_test = max(1, int(round(len(ordered) * test_size)))
    split_date = ordered.iloc[len(ordered) - n_test]
    train_mask = dates < split_date
    test_mask = dates >= split_date
    train_idx = np.where(train_mask.values)[0]
    test_idx = np.where(test_mask.values)[0]
    if len(train_idx) == 0 or len(test_idx) == 0:
        raise ValueError("split temporel invalide: classe vide d'un côté de la frontière")
    return TemporalSplit(train_indices=train_idx, test_indices=test_idx, split_date=split_date)


def temporal_cv(event_dates: pd.Series, n_splits: int = 3):
    """Itérateur de validation croisée temporelle (expanding window)."""
    dates = pd.to_datetime(event_dates)
    ordered_dates = np.sort(dates.values)
    n = len(ordered_dates)
    for split in range(1, n_splits + 1):
        cutoff = n - int(n * split / (n_splits + 1))
        split_date = ordered_dates[cutoff]
        train_idx = np.where(dates.values < split_date)[0]
        test_idx = np.where(dates.values >= split_date)[0]
        if len(train_idx) >= 5 and len(test_idx) >= 1:
            yield train_idx, test_idx, pd.Timestamp(split_date)
