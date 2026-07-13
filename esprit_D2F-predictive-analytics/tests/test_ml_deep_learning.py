"""Tests for ml/deep_learning.py — MLP pipeline."""

import numpy as np
import pytest


class TestMLPPipeline:
    def test_build_mlp_pipeline_returns_pipeline(self):
        from app.ml.deep_learning import build_mlp_pipeline
        pipe = build_mlp_pipeline()
        assert hasattr(pipe, "fit")
        assert hasattr(pipe, "predict")

    def test_build_mlp_custom_hidden_layers(self):
        from app.ml.deep_learning import build_mlp_pipeline
        pipe = build_mlp_pipeline(hidden_layer_sizes=(32, 16))
        mlp = pipe.named_steps["mlp"]
        assert mlp.hidden_layer_sizes == (32, 16)

    def test_build_mlp_fit_predict(self):
        from app.ml.deep_learning import build_mlp
        rng = np.random.RandomState(42)
        X = rng.rand(100, 5)
        y = (X[:, 0] > 0.5).astype(int)
        pipe = build_mlp(X, y, hidden_layer_sizes=(16,))
        preds = pipe.predict(X)
        assert len(preds) == 100
        assert set(np.unique(preds)).issubset({0, 1})

    def test_cross_validate_mlp(self):
        from app.ml.deep_learning import cross_validate_mlp
        rng = np.random.RandomState(42)
        X = rng.rand(80, 4)
        y = (X[:, 1] > 0.5).astype(int)
        result = cross_validate_mlp(X, y, cv=3, hidden_layer_sizes=(8,))
        assert "mean_score" in result
        assert "std_score" in result
        assert "cv_scores" in result
        assert len(result["cv_scores"]) == 3
        assert result["model_type"] == "MLP"

    def test_get_feature_importance(self):
        from app.ml.deep_learning import build_mlp, get_feature_importance
        rng = np.random.RandomState(42)
        X = rng.rand(60, 3)
        y = (X[:, 0] > 0.5).astype(int)
        pipe = build_mlp(X, y, hidden_layer_sizes=(8,))
        imp = get_feature_importance(pipe)
        assert imp is not None
        assert len(imp) == 3
        assert all(k.startswith("feature_") for k in imp)

    def test_get_feature_importance_no_pipeline(self):
        from app.ml.deep_learning import get_feature_importance
        result = get_feature_importance(None)
        assert result is None
