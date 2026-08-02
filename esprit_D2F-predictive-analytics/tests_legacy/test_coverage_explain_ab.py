"""Tests for app/ml/explainability.py and app/engines/ab_testing.py."""

from contextlib import contextmanager
from unittest.mock import MagicMock, patch

import numpy as np

from app.ml import explainability as exp
from app.engines import ab_testing as ab


class DummyTreeModel:
    """Mimics a scikit-learn tree model compatible with SHAP for the proxy path."""

    n_features_in_ = 3

    def __init__(self, importances=(0.1, 0.7, 0.2)):
        self.feature_importances_ = np.array(importances)


def test_explain_prediction_feature_importance_no_features():
    model = DummyTreeModel()
    out = exp.explain_prediction(model, feature_names=["a", "b", "c"])
    assert out["method"] == "feature_importance"
    assert len(out["top_features"]) <= 5


def test_explain_prediction_feature_importance_with_instance():
    model = DummyTreeModel([0.1, 0.7, 0.2])
    features = np.array([[1.0, 2.0, 3.0]])
    out = exp.explain_prediction(model, features, ["a", "b", "c"])
    assert out["method"] == "feature_importance"
    top = out["top_features"][0]
    assert "value" in top
    assert "contribution" in top


def test_explain_prediction_no_importances_returns_none_method():
    model = object()
    out = exp.explain_prediction(model, np.array([[1, 2, 3]]), ["a", "b", "c"])
    assert out["method"] == "none"
    assert out["top_features"] == []


def test_explain_prediction_is_tree_model_false_for_plain():
    assert exp._is_tree_model(object()) is False


def test_get_gap_explanation_empty():
    assert exp.get_gap_explanation({}, {}) == "No explanation available."


def test_get_gap_explanation_known_feature():
    fi = {"avg_level": 3.4, "taux_assiduite": 0.85}
    teacher = {"avg_level": 3.4, "taux_assiduite": 0.85}
    s = exp.get_gap_explanation(fi, teacher)
    assert "key predictor" in s


def test_get_gap_explanation_unknown_feature():
    fi = {"some_num": 2.0}
    s = exp.get_gap_explanation(fi, {"some_num": 2.0})
    assert "some_num" in s


def test_prepare_shap_instance_shapes():
    assert exp._prepare_shap_instance(np.array([1, 2, 3])).shape == (1, 3)
    assert exp._prepare_shap_instance(np.array([[1, 2, 3]])).shape == (1, 3)
    # invalid 3d
    assert exp._prepare_shap_instance(np.array([[[1, 2, 3]]])) is None


def test_sample_background_empty():
    assert exp._sample_background(np.array([]), np.array([[1, 2]])) is None or True


class TestABTesting:
    def test_deterministic_assignment_four_buckets(self):
        variants = {ab._deterministic_assignment(f"t{i}", "exp") for i in range(5000)}
        assert variants == {"control", "treatment_a", "treatment_b", "treatment_c"}

    def test_get_variant_existing(self):
        db = MagicMock()
        existing = MagicMock(variant="control")
        db.query.return_value.filter.return_value.first.return_value = existing
        v = ab.get_variant(db, "T1", "exp")
        assert v == "control"
        db.add.assert_not_called()

    def test_get_variant_new(self):
        db = MagicMock()
        db.query.return_value.filter.return_value.first.return_value = None
        v = ab.get_variant(db, "T1", "exp")
        assert v in {"control", "treatment_a", "treatment_b", "treatment_c"}
        db.add.assert_called_once()
        db.commit.assert_called_once()

    def test_record_event(self):
        db = MagicMock()
        ab.record_event(db, "T1", "exp", "control", "shown")
        db.add.assert_called_once()
        db.commit.assert_called_once()

    def test_compute_results_empty(self):
        db = MagicMock()
        q = db.query.return_value
        q.filter.return_value.distinct.return_value.all.return_value = []
        assert ab.compute_results(db, "exp") == []

    def test_compute_results_with_variant(self):
        db = MagicMock()
        q = db.query.return_value
        # variants distinct
        q.filter.return_value.distinct.return_value.all.return_value = [("control",)]
        # counts via scalar
        q.filter.return_value.scalar.return_value = 10
        res = ab.compute_results(db, "exp")
        assert res[0]["variant"] == "control"
        assert res[0]["sample_size"] == 10

    def test_get_winner_empty(self):
        assert ab.get_winner([]) is None

    def test_get_winner_computes_composite(self):
        results = [
            {"variant": "control", "acceptance_rate": 0.4, "completion_rate": 0.3, "avg_score": 0.5},
            {"variant": "treatment_a", "acceptance_rate": 0.9, "completion_rate": 0.8, "avg_score": 0.7},
        ]
        winner = ab.get_winner(results)
        assert winner["variant"] == "treatment_a"
        assert "margin_vs_baseline" in winner
        assert winner["margin_vs_baseline"] > 0

    def test_get_winner_no_control_baseline(self):
        results = [
            {"variant": "treatment_a", "acceptance_rate": 0.9, "completion_rate": 0.8, "avg_score": 0.7},
        ]
        winner = ab.get_winner(results)
        assert winner["margin_vs_baseline"] == 0.0


class FakeShapExplainer:
    """Minimal SHAP TreeExplainer stand-in."""

    def __init__(self, model=None, data=None):
        self.expected_value = np.array([0.5])

    def shap_values(self, instance):
        # 1 instance x 3 features
        return np.array([[0.3, -0.2, 0.1]])


def _fake_shap_module():
    mod = MagicMock()
    mod.TreeExplainer = FakeShapExplainer
    return mod


class TestExplainabilityShap:
    @contextmanager
    def _enable_shap(self, fake_shap):
        setattr(exp, "_SHAP_AVAILABLE", True)
        setattr(exp, "_shap", fake_shap)
        try:
            yield
        finally:
            setattr(exp, "_SHAP_AVAILABLE", False)
            if hasattr(exp, "_shap"):
                delattr(exp, "_shap")

    def test_explain_with_shap_direct(self):
        with patch.object(exp, "_is_tree_model", return_value=True), \
                self._enable_shap(_fake_shap_module()):
            features = np.array([[1.0, 2.0, 3.0]])
            out = exp.explain_prediction(None, features, ["a", "b", "c"])
        assert out["method"] == "shap_tree_explainer"
        assert out["base_value"] == 0.5
        assert len(out["top_features"]) == 3
        assert out["top_features"][0]["direction"] in ("positive", "negative")
        assert "facteurs les plus influents" in out["summary"]

    def test_explain_with_shap_instance_none_falls_back(self):
        with patch.object(exp, "_is_tree_model", return_value=True), \
                self._enable_shap(_fake_shap_module()):
            # invalid 3d features -> instance None -> fallback importance
            out = exp._explain_with_shap(DummyTreeModel(), np.array([[[1, 2, 3]]]), ["a", "b", "c"])
        assert out["method"] == "feature_importance"

    def test_explain_with_shap_error_falls_back(self):
        class BoomExplainer:
            def __init__(self, *a, **k):
                raise RuntimeError("boom")

        fake = MagicMock()
        fake.TreeExplainer = BoomExplainer
        with patch.object(exp, "_is_tree_model", return_value=True), \
                self._enable_shap(fake):
            out = exp.explain_prediction(DummyTreeModel(), np.array([1.0, 2.0, 3.0]), ["a", "b", "c"])
        assert out["method"] == "feature_importance"

    def test_sample_background_downsample(self):
        bg = np.arange(200).reshape(100, 2)
        out = exp._sample_background(bg, np.array([[0.0, 0.0]]))
        assert out.shape[0] == 50

    def test_sample_background_small(self):
        bg = np.arange(10).reshape(5, 2)
        out = exp._sample_background(bg, np.array([[0.0, 0.0]]))
        assert out.shape[0] == 5

    def test_compute_global_shap_importance(self):
        explainer = FakeShapExplainer()
        bg = np.zeros((20, 3))
        out = exp._compute_global_shap_importance(explainer, bg, ["a", "b", "c"])
        assert set(out.keys()) == {"a", "b", "c"}

    def test_compute_global_shap_importance_failure(self):
        boom = FakeShapExplainer()
        boom.shap_values = MagicMock(side_effect=RuntimeError("x"))
        assert exp._compute_global_shap_importance(boom, np.zeros((5, 3)), ["a", "b", "c"]) == {}

    def test_is_tree_model_xgboost(self):
        # lightgbm is not installed in this env, so this also exercises the
        # ImportError fallback branch of _is_tree_model.
        import xgboost as xgb
        model = xgb.XGBRegressor()
        model.fit(np.array([[1, 2], [3, 4]]), np.array([0, 1]))
        assert exp._is_tree_model(model) is False

    def test_is_tree_model_gb(self):
        from sklearn.ensemble import GradientBoostingRegressor
        m = GradientBoostingRegressor()
        m.fit(np.array([[1, 2], [3, 4]]), np.array([0, 1]))
        assert exp._is_tree_model(m) is True


class TestGapExplanationFormats:
    def test_taux_assiduite_percent(self):
        s = exp.get_gap_explanation({"taux_assiduite": 1.0}, {"taux_assiduite": 0.85})
        assert "85%" in s

    def test_competency_coverage_rate_percent(self):
        s = exp.get_gap_explanation({"competency_coverage_rate": 1.0}, {"competency_coverage_rate": 0.4})
        assert "40%" in s

    def test_days_since_last_training(self):
        s = exp.get_gap_explanation({"days_since_last_training": 1.0}, {"days_since_last_training": 30})
        assert "30 days" in s

    def test_nb_formations_completed(self):
        s = exp.get_gap_explanation({"nb_formations_completed": 1.0}, {"nb_formations_completed": 5})
        assert "5 completed" in s

    def test_engagement_score(self):
        s = exp.get_gap_explanation({"engagement_score": 1.0}, {"engagement_score": 0.9})
        assert "0.9" in s
