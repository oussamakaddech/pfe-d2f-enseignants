"""Tests for app/services/model_trainer.py — early-return and fallback paths.

Heavy training paths (real model fit) are not exercised here; we cover the
business branches that are safe and fast: no_data, insufficient_data, and the
incremental fallback when no model exists.
"""

from unittest.mock import MagicMock, patch

from app.services import model_trainer as mt


def test_read_current_accuracy_no_file(tmp_path, monkeypatch):
    monkeypatch.setattr(mt, "_metadata_path", lambda: str(tmp_path / "missing.json"))
    assert mt.read_current_accuracy() is None


def test_retrain_no_data():
    db = MagicMock()
    data = MagicMock()
    data.get_teacher_profile.return_value = []
    data.get_competency_levels.return_value = [1]
    data.get_required_levels.return_value = [1]
    with patch("app.services.model_trainer.DataService", return_value=data):
        out = mt.retrain_with_rollback(db, "test")
    assert out["status"] == "no_data"
    assert out["dataset_size"] == 0
    db.add.assert_called()


def test_retrain_insufficient_data():
    db = MagicMock()
    data = MagicMock()
    data.get_teacher_profile.return_value = [1]
    data.get_competency_levels.return_value = [1]
    data.get_required_levels.return_value = [1]
    with patch("app.services.model_trainer.DataService", return_value=data), \
            patch("app.services.model_trainer.read_current_accuracy", return_value=0.9), \
            patch("app.services.model_trainer._backup_artifact", return_value=[("b", "o")]), \
            patch("app.services.model_trainer.gap_predictor") as gp, \
            patch("app.services.model_trainer._cleanup_backup") as cleanup:
        from app.core.exceptions import InsufficientDataError
        gp.train.side_effect = InsufficientDataError("pas assez")
        out = mt.retrain_with_rollback(db, "test")
    assert out["status"] == "insufficient_data"
    cleanup.assert_called_once()
    assert out["accuracy_before"] == 0.9


def test_incremental_no_data():
    db = MagicMock()
    data = MagicMock()
    data.get_teacher_profile.return_value = []
    data.get_competency_levels.return_value = [1]
    data.get_required_levels.return_value = [1]
    with patch("app.services.model_trainer.DataService", return_value=data):
        out = mt.incremental_update(db, "test")
    assert out["status"] == "no_data"


def test_incremental_falls_back_when_no_model():
    db = MagicMock()
    data = MagicMock()
    data.get_teacher_profile.return_value = [1]
    data.get_competency_levels.return_value = [1]
    data.get_required_levels.return_value = [1]
    with patch("app.services.model_trainer.DataService", return_value=data), \
            patch.object(mt.gap_predictor, "model", None), \
            patch("app.services.model_trainer.retrain_with_rollback",
                  return_value={"status": "no_data"}) as rt:
        out = mt.incremental_update(db, "test")
    assert rt.called
    assert out["status"] == "no_data"


def test_incremental_success():
    db = MagicMock()
    data = MagicMock()
    data.get_teacher_profile.return_value = [1]
    data.get_competency_levels.return_value = [1]
    data.get_required_levels.return_value = [1]
    with patch("app.services.model_trainer.DataService", return_value=data), \
            patch("app.services.model_trainer.read_current_accuracy", return_value=0.9), \
            patch("app.services.model_trainer._warm_start_train",
                  return_value={"test_r2": 0.95, "n_samples": 10}), \
            patch.object(mt.gap_predictor, "model", object()), \
            patch.object(mt.gap_predictor, "_save_model") as save, \
            patch.object(mt.gap_predictor, "reload"):
        out = mt.incremental_update(db, "test")
    assert out["status"] == "success"
    assert out["accuracy_after"] == 0.95
    save.assert_called_once()
    db.add.assert_called()


def test_incremental_rollback():
    db = MagicMock()
    data = MagicMock()
    data.get_teacher_profile.return_value = [1]
    data.get_competency_levels.return_value = [1]
    data.get_required_levels.return_value = [1]
    with patch("app.services.model_trainer.DataService", return_value=data), \
            patch("app.services.model_trainer.read_current_accuracy", return_value=0.95), \
            patch("app.services.model_trainer._warm_start_train",
                  return_value={"test_r2": 0.1, "n_samples": 10}), \
            patch.object(mt.gap_predictor, "model", object()), \
            patch.object(mt.gap_predictor, "reload") as reload:
        out = mt.incremental_update(db, "test")
    assert out["status"] == "rollback"
    reload.assert_called_once()


def test_incremental_insufficient_data():
    db = MagicMock()
    data = MagicMock()
    data.get_teacher_profile.return_value = [1]
    data.get_competency_levels.return_value = [1]
    data.get_required_levels.return_value = [1]
    from app.core.exceptions import InsufficientDataError
    with patch("app.services.model_trainer.DataService", return_value=data), \
            patch("app.services.model_trainer.read_current_accuracy", return_value=0.9), \
            patch("app.services.model_trainer._warm_start_train",
                  side_effect=InsufficientDataError("pas assez")), \
            patch.object(mt.gap_predictor, "model", object()):
        out = mt.incremental_update(db, "test")
    assert out["status"] == "insufficient_data"
    assert out["accuracy_before"] == 0.9


def test_warm_start_train_real():
    """Exercise _warm_start_train end-to-end with a real (tiny) sklearn model."""
    import numpy as np
    from sklearn.ensemble import GradientBoostingRegressor
    from app.ml import gap_predictor as gp

    teachers = [
        {"enseignant_id": f"E{i}",
         "nb_formations_completed": i, "nb_formations_in_progress": 0,
         "taux_assiduite": 0.9, "nb_besoins_exprimes": 1, "nb_besoins_approuves": 1,
         "avg_eval_score": 3.0, "nb_evaluations": 2,
         "days_since_last_training": 10}
        for i in range(12)
    ]
    comp_levels = [
        {"enseignant_id": f"E{i}", "competence_id": 1, "savoir_id": 1, "current_level": float(i % 5)}
        for i in range(12)
    ]
    req_levels = [{"competence_id": 1, "savoir_id": 1, "required_level": 5.0}]

    model = GradientBoostingRegressor(n_estimators=10, random_state=0)
    predictor = MagicMock()
    predictor.model = model
    predictor.model_name = "gradient_boosting"
    predictor.feature_ranges = None
    predictor.feature_importances = {}
    predictor.last_metrics = {}

    with patch.object(mt.settings, "min_training_samples", 2), \
            patch.object(mt.settings, "cv_folds", 2), \
            patch.object(gp, "FEATURE_COLS", gp.FEATURE_COLS):
        metrics = mt._warm_start_train(predictor, teachers, comp_levels, req_levels)

    assert "test_r2" in metrics
    assert metrics["n_samples"] >= 2


def test_retrain_success():
    db = MagicMock()
    data = MagicMock()
    data.get_teacher_profile.return_value = [1]
    data.get_competency_levels.return_value = [1]
    data.get_required_levels.return_value = [1]
    with patch("app.services.model_trainer.DataService", return_value=data), \
            patch("app.services.model_trainer.read_current_accuracy", return_value=None), \
            patch.object(mt.gap_predictor, "train", return_value={"test_r2": 0.95, "n_samples": 100}), \
            patch.object(mt.gap_predictor, "reload"):
        out = mt.retrain_with_rollback(db, "test")
    assert out["status"] == "success"
    assert out["accuracy_after"] == 0.95
    db.add.assert_called()
