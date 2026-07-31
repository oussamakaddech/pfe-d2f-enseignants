"""Datasets supervisés: cibles, construction temporelle, garde-fous anti-fuite."""

from __future__ import annotations

from app.ml.datasets.dataset_builder import (
    DatasetConfig,
    build_completion_dataset,
    build_effectiveness_dataset,
    build_future_need_dataset,
    build_stagnation_dataset,
)
from app.ml.datasets.leakage import LeakageGuard, TargetLeakageError
from app.ml.datasets.targets import TARGET_DEFINITIONS

__all__ = [
    "TARGET_DEFINITIONS",
    "DatasetConfig",
    "build_completion_dataset",
    "build_effectiveness_dataset",
    "build_stagnation_dataset",
    "build_future_need_dataset",
    "LeakageGuard",
    "TargetLeakageError",
]
