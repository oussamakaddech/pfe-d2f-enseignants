import json
from pathlib import Path
from unittest.mock import MagicMock, patch

from app.core.exceptions import InsufficientDataError
from app.services import model_trainer as mt


def _make_data_service_mock(teachers=None, comp_levels=None, req_levels=None):
    service = MagicMock()
    service.get_teacher_profile.return_value = teachers if teachers is not None else [{"enseignant_id": "E1"}]
    service.get_competency_levels.return_value = comp_levels if comp_levels is not None else [{"enseignant_id": "E1"}]
    service.get_required_levels.return_value = req_levels if req_levels is not None else [{"competence_id": 1}]
    return service


def test_retrain_with_rollback_returns_no_data_when_sources_are_empty():
    db = MagicMock()
    log_entry = MagicMock(id=101)

    with (
        patch.object(mt, "DataService") as mock_data_service,
        patch.object(mt, "read_current_accuracy", return_value=0.82),
        patch.object(mt, "_log_event", return_value=log_entry) as mock_log_event,
        patch.object(mt, "gap_predictor") as mock_predictor,
    ):
        mock_data_service.return_value = _make_data_service_mock([], [], [])

        result = mt.retrain_with_rollback(db, triggered_by="admin-1")

    assert result["status"] == "no_data"
    assert result["accuracy_before"] == 0.82
    assert result["accuracy_after"] is None
    assert result["dataset_size"] == 0
    assert result["log_id"] == 101
    mock_predictor.train.assert_not_called()
    mock_log_event.assert_called_once()


def test_retrain_with_rollback_returns_insufficient_data_when_training_fails():
    db = MagicMock()
    log_entry = MagicMock(id=102)

    with (
        patch.object(mt, "DataService") as mock_data_service,
        patch.object(mt, "read_current_accuracy", return_value=0.82),
        patch.object(mt, "_backup_artifact", return_value=[("model.bak", "model")]) as mock_backup,
        patch.object(mt, "_cleanup_backup") as mock_cleanup,
        patch.object(mt, "_log_event", return_value=log_entry) as mock_log_event,
        patch.object(mt, "gap_predictor") as mock_predictor,
    ):
        mock_data_service.return_value = _make_data_service_mock()
        mock_predictor.train.side_effect = InsufficientDataError("Données insuffisantes")

        result = mt.retrain_with_rollback(db, triggered_by="admin-2")

    assert result["status"] == "insufficient_data"
    assert result["message"] == "Données insuffisantes"
    assert result["accuracy_before"] == 0.82
    assert result["accuracy_after"] is None
    assert result["dataset_size"] == 0
    assert result["log_id"] == 102
    mock_backup.assert_called_once()
    mock_cleanup.assert_called_once_with([("model.bak", "model")])
    mock_predictor.reload.assert_not_called()
    mock_log_event.assert_called_once()


def test_retrain_with_rollback_restores_when_accuracy_regresses():
    db = MagicMock()
    log_entry = MagicMock(id=103)
    backup = [("model.bak", "model")]

    with (
        patch.object(mt, "DataService") as mock_data_service,
        patch.object(mt, "read_current_accuracy", return_value=0.82),
        patch.object(mt, "_backup_artifact", return_value=backup) as mock_backup,
        patch.object(mt, "_restore_artifact") as mock_restore,
        patch.object(mt, "_cleanup_backup") as mock_cleanup,
        patch.object(mt, "_log_event", return_value=log_entry) as mock_log_event,
        patch.object(mt, "gap_predictor") as mock_predictor,
    ):
        mock_data_service.return_value = _make_data_service_mock()
        mock_predictor.train.return_value = {"test_r2": 0.60, "n_samples": 12}

        result = mt.retrain_with_rollback(db, triggered_by="admin-3")

    assert result["status"] == "rollback"
    assert result["accuracy_before"] == 0.82
    assert result["accuracy_after"] == 0.6
    assert result["max_drop"] == mt.settings.retrain_max_accuracy_drop
    assert result["dataset_size"] == 12
    assert result["log_id"] == 103
    mock_backup.assert_called_once()
    mock_restore.assert_called_once_with(backup)
    mock_predictor.reload.assert_called_once()
    mock_cleanup.assert_not_called()
    mock_log_event.assert_called_once()


def test_retrain_with_rollback_keeps_model_on_success():
    db = MagicMock()
    log_entry = MagicMock(id=104)
    backup = [("model.bak", "model")]

    with (
        patch.object(mt, "DataService") as mock_data_service,
        patch.object(mt, "read_current_accuracy", return_value=0.82),
        patch.object(mt, "_backup_artifact", return_value=backup) as mock_backup,
        patch.object(mt, "_restore_artifact") as mock_restore,
        patch.object(mt, "_cleanup_backup") as mock_cleanup,
        patch.object(mt, "_log_event", return_value=log_entry) as mock_log_event,
        patch.object(mt, "gap_predictor") as mock_predictor,
    ):
        mock_data_service.return_value = _make_data_service_mock()
        mock_predictor.train.return_value = {"test_r2": 0.91, "n_samples": 48}

        result = mt.retrain_with_rollback(db, triggered_by="admin-4")

    assert result["status"] == "success"
    assert result["accuracy_before"] == 0.82
    assert result["accuracy_after"] == 0.91
    assert result["dataset_size"] == 48
    assert result["log_id"] == 104
    assert result["metrics"] == {"test_r2": 0.91, "n_samples": 48}
    mock_backup.assert_called_once()
    mock_cleanup.assert_called_once_with(backup)
    mock_restore.assert_not_called()
    mock_predictor.reload.assert_not_called()
    mock_log_event.assert_called_once()


def test_read_current_accuracy_and_artifact_helpers(tmp_path):
    model_path = tmp_path / "gap_predictor.joblib"
    sidecar_sha = tmp_path / "gap_predictor.joblib.sha256"
    sidecar_hmac = tmp_path / "gap_predictor.joblib.hmac"
    metadata_path = tmp_path / "training_metadata.json"

    model_path.write_text("model-v1", encoding="utf-8")
    sidecar_sha.write_text("sha-v1", encoding="utf-8")
    sidecar_hmac.write_text("hmac-v1", encoding="utf-8")
    metadata_path.write_text(json.dumps({"metrics": {"test_r2": 0.73}}), encoding="utf-8")

    with patch.object(mt.gp_module, "MODEL_PATH", str(model_path)), \
            patch.object(mt, "_metadata_path", return_value=str(metadata_path)):
        assert mt.read_current_accuracy() == 0.73

        backup_pairs = mt._backup_artifact()
        assert len(backup_pairs) == 4
        assert all(Path(bak).exists() for bak, _orig in backup_pairs)

        model_path.write_text("model-v2", encoding="utf-8")
        sidecar_sha.write_text("sha-v2", encoding="utf-8")
        sidecar_hmac.write_text("hmac-v2", encoding="utf-8")
        metadata_path.write_text(json.dumps({"metrics": {"test_r2": 0.11}}), encoding="utf-8")

        mt._restore_artifact(backup_pairs)

        assert model_path.read_text(encoding="utf-8") == "model-v1"
        assert sidecar_sha.read_text(encoding="utf-8") == "sha-v1"
        assert sidecar_hmac.read_text(encoding="utf-8") == "hmac-v1"
        assert json.loads(metadata_path.read_text(encoding="utf-8"))["metrics"]["test_r2"] == 0.73
        assert all(not Path(bak).exists() for bak, _orig in backup_pairs)

        extra_backup = tmp_path / "extra.bak"
        extra_backup.write_text("cleanup", encoding="utf-8")
        mt._cleanup_backup([(str(extra_backup), "extra")])
        assert not extra_backup.exists()

    with patch.object(mt, "_metadata_path", return_value=str(tmp_path / "missing.json")):
        assert mt.read_current_accuracy() is None


def test_metadata_path_and_safe_remove_handles_oserror(tmp_path):
    assert mt._metadata_path().endswith("training_metadata.json")

    target = tmp_path / "blocked.bak"
    target.write_text("locked", encoding="utf-8")

    with patch.object(mt.os.path, "exists", return_value=True), \
            patch.object(mt.os, "remove", side_effect=OSError("locked")):
        mt._safe_remove(str(target))

    assert target.exists()