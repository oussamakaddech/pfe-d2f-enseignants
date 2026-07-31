"""Tests ML: qualité, anti-fuite, split temporel, pipeline, sérialisation."""

from __future__ import annotations

from datetime import date, timedelta
from pathlib import Path

import numpy as np
import pandas as pd
import pytest

from app.infrastructure.repositories.curated_repository import CuratedRepository
from app.ml.datasets.dataset_builder import DatasetBuilder
from app.ml.datasets.leakage import (
    LeakageGuard,
    TargetLeakageError,
)
from app.ml.features.feature_engineering import build_feature_vector
from app.ml.training.split import temporal_split
from app.ml.training.train import build_pipeline, export_artifacts, train
from tests.fixtures import build_context, record

from app.ml.features.feature_schema import FEATURE_COLUMNS


class TestFeatureVector:
    def test_feature_vector_built_from_context(self):
        ctx = build_context(
            records=[
                record("KN-ALGO-1", level=1),
                record("KN-ALGO-2", level=1),
            ]
        )
        vec = build_feature_vector(ctx)
        assert vec is not None
        for col in FEATURE_COLUMNS:
            assert col in vec
        assert vec["nb_gaps_open"] >= 1
        assert vec["feature_cutoff_date"]

    def test_no_records_returns_none(self):
        assert build_feature_vector(build_context(records=[])) is None


class TestLeakageGuard:
    def test_leakage_detected(self):
        df = pd.DataFrame(
            {
                "event_date": ["2026-01-01"],
                "feature_cutoff_date": ["2026-02-01"],  # après l'événement
            }
        )
        check = LeakageGuard().check(df, event_column="event_date")
        assert check.has_leakage
        with pytest.raises(TargetLeakageError):
            LeakageGuard().assert_no_leak(df, event_column="event_date")

    def test_no_leakage_when_cutoff_before_event(self):
        df = pd.DataFrame(
            {
                "event_date": ["2026-03-01"],
                "feature_cutoff_date": ["2026-03-01"],  # connue au moment T
            }
        )
        check = LeakageGuard().check(df, event_column="event_date")
        assert not check.has_leakage


class TestTemporalSplit:
    def test_train_before_test(self):
        dates = pd.Series(
            pd.date_range("2024-01-01", periods=20, freq="30D")
        )
        split = temporal_split(dates, test_size=0.2)
        train_dates = dates.iloc[split.train_indices]
        test_dates = dates.iloc[split.test_indices]
        assert train_dates.max() <= split.split_date
        assert test_dates.min() >= split.split_date
        assert train_dates.max() <= test_dates.min()

    def test_insufficient_data_raises(self):
        with pytest.raises(ValueError):
            temporal_split(pd.Series(pd.date_range("2026-01-01", periods=5)))


class TestNoTargetLeakageInDatasetBuilder:
    def test_completion_cutoff_never_after_event(self, sample_repo):
        dataset = DatasetBuilder(sample_repo).build_completion()
        assert not dataset.X.empty
        cutoffs = pd.to_datetime(dataset.meta["feature_cutoff_date"])
        events = pd.to_datetime(dataset.meta["event_date"])
        assert (events >= cutoffs).all(), "feature_cutoff doit être <= event_date"

    def test_effectiveness_target_future(self, sample_repo):
        dataset = DatasetBuilder(sample_repo).build_effectiveness()
        assert not dataset.X.empty
        assert dataset.y.between(0.0, 1.0).all()


class TestPipelineFitPredict:
    def test_fit_predict_classification(self, sample_repo):
        dataset = DatasetBuilder(sample_repo).build_completion()
        result = train(dataset, "completion_probability", model_names=["logistic_regression"])
        assert result.pipeline is not None
        preds = result.pipeline.predict(dataset.X.head(5))
        assert preds.shape == (5,)

    def test_fit_predict_regression(self, sample_repo):
        dataset = DatasetBuilder(sample_repo).build_effectiveness()
        result = train(dataset, "training_effectiveness_score", model_names=["ridge"])
        assert result.pipeline is not None
        preds = result.pipeline.predict(dataset.X.head(5))
        assert preds.shape == (5,)

    def test_build_pipeline(self):
        pipe = build_pipeline("logistic_regression", "classification")
        assert pipe is not None


class TestSerialization:
    def test_export_artifacts(self, sample_repo, tmp_path):
        dataset = DatasetBuilder(sample_repo).build_completion()
        result = train(dataset, "completion_probability", model_names=["logistic_regression"])
        out = export_artifacts(
            result,
            out_dir=tmp_path / "models",
            feature_columns=FEATURE_COLUMNS,
            drift_baseline={"nb_gaps_open": 1.0},
        )
        assert (out / "completion_probability_model.joblib").exists()
        assert (out / "completion_probability_model_card.json").exists()
        assert (out / "completion_probability_metrics.json").exists()
        assert (out / "completion_probability_feature_schema.json").exists()

    def test_model_roundtrip_joblib(self, sample_repo, tmp_path):
        dataset = DatasetBuilder(sample_repo).build_completion()
        result = train(dataset, "completion_probability", model_names=["logistic_regression"])
        path = tmp_path / "model.joblib"
        import joblib

        joblib.dump(result.pipeline, path)
        loaded = joblib.load(path)
        preds = loaded.predict(dataset.X.head(3))
        assert len(preds) == 3


class TestInferenceScoring:
    def _scoring(self, sample_repo, target, task, tmp_path):
        from joblib import dump

        from app.ml.inference.scoring import InferenceService
        from app.ml.training.train import train

        dataset_builder = getattr(DatasetBuilder(sample_repo), {
            "completion_probability": "build_completion",
            "training_effectiveness_score": "build_effectiveness",
        }[target])()
        model_name = "logistic_regression" if task == "classification" else "ridge"
        result = train(dataset_builder, target, model_names=[model_name])
        assert result.status == "ok", result.message
        out = tmp_path / "models"
        out.mkdir()
        dump(result.pipeline, out / f"{target}_model.joblib")
        import json

        (out / f"{target}_model_card.json").write_text(
            json.dumps({"task": task, "model_version": "test", "trained_at": "2026-01-01"}),
            encoding="utf-8",
        )
        service = InferenceService(sample_repo, out)
        assert target in service.available_targets()
        return service

    def test_score_classification_ok(self, sample_repo, tmp_path):
        service = self._scoring(
            sample_repo, "completion_probability", "classification", tmp_path
        )
        response = service.score("completion_probability", "ENS001")
        assert response.status == "OK"
        assert 0.0 <= response.score <= 1.0

    def test_score_regression_ok(self, sample_repo, tmp_path):
        service = self._scoring(
            sample_repo, "training_effectiveness_score", "regression", tmp_path
        )
        response = service.score("training_effectiveness_score", "ENS001")
        assert response.status == "OK"
        assert 0.0 <= response.score <= 1.0

    def test_score_model_unavailable(self, sample_repo, tmp_path):
        from app.ml.inference.scoring import InferenceService

        service = InferenceService(sample_repo, tmp_path / "missing")
        response = service.score("completion_probability", "ENS001")
        assert response.status == "MODEL_UNAVAILABLE"

    def test_score_unknown_teacher(self, sample_repo, tmp_path):
        service = self._scoring(
            sample_repo, "completion_probability", "classification", tmp_path
        )
        response = service.score("completion_probability", "ENS999")
        assert response.status == "INSUFFICIENT_HISTORICAL_DATA"
