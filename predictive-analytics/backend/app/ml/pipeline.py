"""ML pipeline — orchestration complète (datasets -> entraînement -> export)."""

from __future__ import annotations

from dataclasses import dataclass, field
from pathlib import Path
from typing import Any

import numpy as np
import pandas as pd

from app.infrastructure.repositories.curated_repository import CuratedRepository
from app.ml.datasets.dataset_builder import DatasetBuilder
from app.ml.datasets.leakage import LeakageGuard
from app.ml.datasets.targets import TARGET_DEFINITIONS
from app.ml.features.feature_schema import FEATURE_COLUMNS
from app.ml.training.train import (
    TrainingResult,
    export_artifacts,
    train,
)


@dataclass
class PipelineRun:
    results: dict[str, TrainingResult] = field(default_factory=dict)
    datasets: dict[str, int] = field(default_factory=dict)
    leakage_checked: dict[str, int] = field(default_factory=dict)
    artifacts: dict[str, Path] = field(default_factory=dict)

    def summary(self) -> dict[str, Any]:
        return {
            "results": {k: v.summary() for k, v in self.results.items()},
            "dataset_sizes": self.datasets,
            "leakage_checked_rows": self.leakage_checked,
            "artifacts": {k: str(v) for k, v in self.artifacts.items()},
        }


class MlPipeline:
    def __init__(
        self,
        repository: CuratedRepository,
        *,
        model_dir: str | Path = "data/models",
        features_dir: str | Path = "data/features",
        reports_dir: str | Path = "data/reports",
    ) -> None:
        self.repo = repository
        self.builder = DatasetBuilder(repository)
        self.guard = LeakageGuard()
        self.model_dir = Path(model_dir)
        self.features_dir = Path(features_dir)
        self.reports_dir = Path(reports_dir)
        for d in (self.model_dir, self.features_dir, self.reports_dir):
            d.mkdir(parents=True, exist_ok=True)

    def run(self, targets: list[str] | None = None, model_names: dict[str, list[str]] | None = None) -> PipelineRun:
        run = PipelineRun()
        targets = targets or list(TARGET_DEFINITIONS.keys())
        model_names = model_names or {}

        builders = {
            "completion_probability": self.builder.build_completion,
            "training_effectiveness_score": self.builder.build_effectiveness,
            "stagnation_risk_future": self.builder.build_stagnation,
            "future_need_probability": self.builder.build_future_need,
        }

        for target in targets:
            if target not in builders:
                continue
            dataset = builders[target]()
            run.datasets[target] = len(dataset.X)

            if not dataset.X.empty:
                self.guard.assert_no_leak(
                    dataset.meta,
                    event_column="event_date",
                    feature_cutoff_column="feature_cutoff_date",
                )
                run.leakage_checked[target] = len(dataset.X)
                dataset.meta.to_csv(self.features_dir / f"{target}_meta.csv", index=False)
                dataset.X.to_csv(self.features_dir / f"{target}_features.csv", index=False)

            result = train(dataset, target, model_names=model_names.get(target))
            run.results[target] = result

            if result.status == "ok":
                drift_baseline = _drift_baseline(dataset.X)
                artifact_dir = self.model_dir / target
                export_artifacts(
                    result,
                    out_dir=artifact_dir,
                    feature_columns=FEATURE_COLUMNS,
                    drift_baseline=drift_baseline,
                )
                run.artifacts[target] = artifact_dir

        self._write_global_report(run)
        return run

    def _write_global_report(self, run: PipelineRun) -> None:
        import json

        (self.reports_dir / "ml_pipeline_report.json").write_text(
            json.dumps(run.summary(), indent=2, ensure_ascii=False), encoding="utf-8"
        )


def _drift_baseline(X: pd.DataFrame) -> dict[str, float]:
    if X.empty:
        return {}
    stats = X.astype(float).describe().T
    return {
        col: {"mean": float(stats.loc[col, "mean"]), "std": float(stats.loc[col, "std"])}
        for col in X.columns
    }
