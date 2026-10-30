"""Garanties du pipeline d'amélioration (pipelines/improve_gap_models.py)."""
from __future__ import annotations

import numpy as np
import pandas as pd
import pytest

from pipelines import improve_gap_models as igm
from pipelines.train_gap_model import FEATURE_COLS, TARGET_COL


@pytest.fixture
def corpus() -> pd.DataFrame:
    rng = np.random.default_rng(0)
    n = 240
    frame = pd.DataFrame({c: rng.integers(0, 5, n).astype(float) for c in FEATURE_COLS})
    frame["date_t"] = np.repeat(pd.date_range("2024-01-31", periods=12, freq="ME"), n // 12)
    frame["teacher_id"] = [f"T{i % 7}" for i in range(n)]
    frame["competence_id"] = np.arange(n) % 5
    frame[TARGET_COL] = rng.uniform(0, 4, n)
    frame["required_level"] = 4.0  # présent dans le fichier, interdit dans X
    return igm.temporal_order(frame.sample(frac=1.0, random_state=1))


def test_holdout_is_the_most_recent_slice(corpus):
    train, test = igm.holdout_split(corpus)
    assert len(test) == int(len(corpus) * 0.2)
    assert train["date_t"].max() <= test["date_t"].min()


def test_rolling_folds_are_chronological_and_never_split_a_date(corpus):
    train, _ = igm.holdout_split(corpus)
    folds = igm.rolling_folds(train, 4)
    assert folds
    for fit_idx, val_idx in folds:
        fit_dates = set(train.iloc[fit_idx]["date_t"])
        val_dates = set(train.iloc[val_idx]["date_t"])
        assert not fit_dates & val_dates
        assert max(fit_dates) < min(val_dates)
        assert max(val_idx) < len(train)  # jamais d'index du test


def test_no_leak_column_and_no_target_formula_in_features(corpus):
    train, _ = igm.holdout_split(corpus)
    for cols in igm.feature_sets(train).values():
        x = igm.matrix(train, cols)
        assert not set(x.columns) & igm.LEAK
    derived = set(igm.engineered(train).columns)
    assert "level_extrapole" not in derived  # terme de la formule qui fabrique la cible réelle


def test_paired_bootstrap_sign_convention():
    y = np.array([1.0, 2.0, 3.0, 2.0] * 20)
    better = y + 0.1
    worse = y + 1.0
    res = igm.paired_bootstrap(y, worse, better)
    assert res["gain_rmse"] > 0 and res["significatif"]
