"""Tests obligatoires des modes ML — PRODUCTION_ML, DEMO_ML, HEURISTIC_FALLBACK.

Chaque test vérifie model_mode, model_version, fallback_reason, dataset_version.
"""
from __future__ import annotations

from pathlib import Path
from unittest.mock import MagicMock

import numpy as np
import pandas as pd
import pytest

from app.core.ml_status import DEMO_ML, HEURISTIC_FALLBACK, PRODUCTION_ML
from app.infrastructure.ml.dataset_provenance import (
    DatasetProvenanceReport,
    compute_provenance,
)
from app.infrastructure.ml.feature_schema import (
    LEAK_COLUMNS,
    validate_feature_spec,
    validate_feature_vector,
)
from app.infrastructure.ml.model_registry import (
    APPROVAL_APPROVED,
    STATUS_ACTIVE,
    ModelRegistry,
    RegistryEntry,
)
from app.infrastructure.ml.predictor import (
    FEATURE_SCHEMA_VERSION,
    TEMPORAL_FEATURE_COLS,
    ArtifactModelPort,
)

MODELS_DIR = Path(__file__).parent.parent / "data" / "models"


class _FakeModel:
    def __init__(self, predictions):
        self._predictions = np.asarray(predictions, dtype=float)
        self.n_features_in_ = len(TEMPORAL_FEATURE_COLS)

    def predict(self, X):
        return self._predictions[: X.shape[0]]


def _settings(**overrides):
    settings = MagicMock()
    settings.models_dir = str(MODELS_DIR)
    settings.ml_artifact_path = "gap_predictor_temporal.joblib"
    settings.ml_metadata_path = "temporal_training_metadata.json"
    settings.ml_registry_path = "model_registry.json"
    settings.ml_synthetic_tolerance_pct = 50.0
    settings.ml_require_real_data = True
    settings.ml_min_real_rows = 50
    settings.ml_min_r2 = 0.0
    settings.ml_max_rmse = 2.0
    settings.ml_max_mae = 1.5
    settings.ml_serving_mode = PRODUCTION_ML
    settings.ml_enabled = True
    settings.seuil_gap_critique = 0.75
    settings.seuil_gap_haute = 0.5
    settings.seuil_gap_moyenne = 0.25
    for key, value in overrides.items():
        setattr(settings, key, value)
    return settings


def _metadata(overrides: dict | None = None) -> dict:
    meta = {
        "model_name": "gradient_boosting",
        "trained_at": "2026-08-16T00:00:00",
        "feature_cols": list(TEMPORAL_FEATURE_COLS),
        "feature_schema_version": FEATURE_SCHEMA_VERSION,
        "metrics": {
            "test_r2": 0.65,
            "test_rmse": 0.75,
            "test_mae": 0.47,
        },
        "feature_ranges": {col: {"min": 0.0, "max": 5.0} for col in TEMPORAL_FEATURE_COLS},
        "data_sources": {"synthetic_share_pct": 0.0},
    }
    if overrides:
        meta.update(overrides)
    return meta


def _registry_with_active(path: Path) -> ModelRegistry:
    registry = ModelRegistry(path, MODELS_DIR)
    entry = RegistryEntry(
        model_name="gradient_boosting",
        model_version="v1.0.0",
        status=STATUS_ACTIVE,
        created_at="2026-08-16T00:00:00",
        dataset_version="v1.0.0",
        dataset_hash="abc",
        artifact_sha256="abc",
        synthetic_share_pct=0.0,
        feature_names=list(TEMPORAL_FEATURE_COLS),
        feature_schema_version=FEATURE_SCHEMA_VERSION,
        metrics={"rmse": 0.75, "mae": 0.47, "r2": 0.65},
        approval_status=APPROVAL_APPROVED,
    )
    registry.register(entry)
    registry.approve("v1.0.0")
    return registry


def _provenance_ok() -> DatasetProvenanceReport:
    return DatasetProvenanceReport(
        total_rows=100,
        real_rows=100,
        synthetic_rows=0,
        synthetic_share_pct=0.0,
        real_share_pct=100.0,
        dataset_version="v1.0.0",
        dataset_hash="abc",
    )


def _port(**overrides):
    settings = _settings()
    database = MagicMock()
    port = ArtifactModelPort(settings, database)
    for key, value in overrides.items():
        setattr(port, key, value)
    return port


# ---------------------------------------------------------------------------
# 1. Provenance calculée depuis les lignes du dataset
# ---------------------------------------------------------------------------
def test_provenance_computed_from_rows():
    df = pd.DataFrame({
        "teacher_id": ["T1", "T1", "T2"],
        "source_type": ["postgresql_d2f", "postgresql_d2f", "synthetic_generator"],
        "source_id": ["T1_1", "T1_2", "T2_1"],
        "is_synthetic": [False, False, True],
        "created_at": ["2026-01-01", "2026-01-02", "2026-01-03"],
        "gap_next_3m": [1.0, 2.0, 3.0],
        "dataset_version": ["v1.0.0"] * 3,
    })
    report = compute_provenance(df, dataset_version="v1.0.0")
    assert report.total_rows == 3
    assert report.real_rows == 2
    assert report.synthetic_rows == 1
    assert report.synthetic_share_pct == pytest.approx(33.33, abs=0.1)
    assert report.real_share_pct == pytest.approx(66.67, abs=0.1)
    assert report.is_valid_for_production(tolerance_pct=50.0, require_real=True, min_real_rows=2) is True


def test_provenance_missing_columns_fails_closed():
    df = pd.DataFrame({"teacher_id": ["T1"]})
    report = compute_provenance(df)
    assert report.errors, "L'absence de colonnes provenance doit produire une erreur"
    assert report.is_valid_for_production(50.0) is False


# ---------------------------------------------------------------------------
# 2. Validation des features
# ---------------------------------------------------------------------------
def test_feature_schema_valid_when_identical():
    result = validate_feature_spec(
        list(TEMPORAL_FEATURE_COLS), FEATURE_SCHEMA_VERSION,
        list(TEMPORAL_FEATURE_COLS), FEATURE_SCHEMA_VERSION,
    )
    assert result.valid is True


def test_feature_schema_missing_columns():
    missing = list(TEMPORAL_FEATURE_COLS[:-2])
    result = validate_feature_spec(
        missing, FEATURE_SCHEMA_VERSION,
        list(TEMPORAL_FEATURE_COLS), FEATURE_SCHEMA_VERSION,
    )
    assert result.valid is False
    assert any("manquantes" in e for e in result.errors)


def test_feature_schema_wrong_order():
    reversed_cols = list(reversed(TEMPORAL_FEATURE_COLS))
    result = validate_feature_spec(
        reversed_cols, FEATURE_SCHEMA_VERSION,
        list(TEMPORAL_FEATURE_COLS), FEATURE_SCHEMA_VERSION,
    )
    assert result.valid is False
    assert any("ordre" in e for e in result.errors)


def test_feature_vector_wrong_type_fails():
    X = np.array([["a"] * len(TEMPORAL_FEATURE_COLS)], dtype=object)
    result = validate_feature_vector(X, TEMPORAL_FEATURE_COLS, {})
    assert result.valid is False
    assert any("type" in e for e in result.errors)


def test_feature_vector_out_of_range_fails():
    X = np.zeros((1, len(TEMPORAL_FEATURE_COLS)))
    X[0, 0] = 999.0
    ranges = {TEMPORAL_FEATURE_COLS[0]: {"min": 0.0, "max": 5.0}}
    result = validate_feature_vector(X, TEMPORAL_FEATURE_COLS, ranges)
    assert result.valid is False
    assert any("hors plage" in e for e in result.errors)


def test_no_leak_columns_in_feature_set():
    leaks = [c for c in TEMPORAL_FEATURE_COLS if c in LEAK_COLUMNS]
    assert leaks == [], f"Colonnes de fuite dans X : {leaks}"


# ---------------------------------------------------------------------------
# 3. Modes d'exécution
# ---------------------------------------------------------------------------
def test_heuristic_fallback_when_artifact_absent(tmp_path):
    settings = _settings(models_dir=str(tmp_path))
    port = ArtifactModelPort(settings, MagicMock())
    assert port._effective_mode() == HEURISTIC_FALLBACK
    assert port.status()["fallback_reason"]


def test_heuristic_fallback_when_invalid_hash(tmp_path):
    artifact = tmp_path / "gap_predictor_temporal.joblib"
    artifact.write_bytes(b"pickle-invalid")
    sidecar = tmp_path / "gap_predictor_temporal.joblib.sha256"
    sidecar.write_text("0" * 64, encoding="utf-8")
    settings = _settings(models_dir=str(tmp_path))
    port = ArtifactModelPort(settings, MagicMock())
    assert port._effective_mode() == HEURISTIC_FALLBACK


def test_production_mode_when_all_validations_pass(tmp_path):
    registry_path = tmp_path / "model_registry.json"
    registry = _registry_with_active(registry_path)
    port = _port(
        _registry=registry,
        _model=_FakeModel([[1.0]]),
        _metadata=_metadata(),
        _load_attempted=True,
        _provenance_report=_provenance_ok(),
    )
    port._ml_enabled = True
    status = port.status()
    assert status["model_mode"] == PRODUCTION_ML
    assert status["model_version"] == "v1.0.0"
    assert status["fallback_reason"] is None
    assert status["provenance"]["dataset_version"] == "v1.0.0"
    assert status["prediction_horizon"] == "3m"


def test_demo_mode_when_registry_not_approved(tmp_path):
    registry_path = tmp_path / "model_registry.json"
    registry = ModelRegistry(registry_path, MODELS_DIR)
    registry.register(RegistryEntry(model_version="v1.0.0", status=STATUS_ACTIVE, approval_status="PENDING"))
    port = _port(
        _registry=registry,
        _model=_FakeModel([[1.0]]),
        _metadata=_metadata(),
        _load_attempted=True,
        _provenance_report=_provenance_ok(),
    )
    port._ml_enabled = True
    assert port._effective_mode() == DEMO_ML
    assert "approuve" in port.status()["fallback_reason"]


def test_heuristic_when_synthetic_above_threshold(tmp_path):
    registry_path = tmp_path / "model_registry.json"
    registry = _registry_with_active(registry_path)
    port = _port(
        _registry=registry,
        _model=_FakeModel([[1.0]]),
        _metadata=_metadata(),
        _load_attempted=True,
        _provenance_report=DatasetProvenanceReport(
            total_rows=100, real_rows=40, synthetic_rows=60,
            synthetic_share_pct=60.0, real_share_pct=40.0,
            dataset_version="v1.0.0", dataset_hash="abc",
        ),
    )
    port._ml_enabled = True
    assert port._effective_mode() == HEURISTIC_FALLBACK
    assert "synthetique" in port.status()["fallback_reason"]


def test_heuristic_when_real_rows_insufficient(tmp_path):
    registry_path = tmp_path / "model_registry.json"
    registry = _registry_with_active(registry_path)
    port = _port(
        _registry=registry,
        _model=_FakeModel([[1.0]]),
        _metadata=_metadata(),
        _load_attempted=True,
        _provenance_report=DatasetProvenanceReport(
            total_rows=30, real_rows=30, synthetic_rows=0,
            synthetic_share_pct=0.0, real_share_pct=100.0,
            dataset_version="v1.0.0", dataset_hash="abc",
        ),
    )
    port._ml_enabled = True
    assert port._effective_mode() == HEURISTIC_FALLBACK
    assert "insuffisantes" in port.status()["fallback_reason"]


# ---------------------------------------------------------------------------
# 4. Prédiction déterministe avec seed
# ---------------------------------------------------------------------------
def test_prediction_deterministic_with_seed():
    X1 = np.random.RandomState(42).normal(size=(10, len(TEMPORAL_FEATURE_COLS)))
    X2 = np.random.RandomState(42).normal(size=(10, len(TEMPORAL_FEATURE_COLS)))
    np.testing.assert_array_equal(X1, X2)


# ---------------------------------------------------------------------------
# 5. Rollback du registre
# ---------------------------------------------------------------------------
def test_registry_rollback(tmp_path):
    registry_path = tmp_path / "model_registry.json"
    registry = ModelRegistry(registry_path, MODELS_DIR)

    v1 = RegistryEntry(model_version="v1.0.0", status=STATUS_ACTIVE, approval_status="PENDING")
    v2 = RegistryEntry(model_version="v2.0.0", status=STATUS_ACTIVE, approval_status="PENDING")
    registry.register(v1)
    registry.register(v2)
    registry.approve("v1.0.0")
    registry.approve("v2.0.0")
    assert registry.active().model_version == "v2.0.0"

    rolled = registry.rollback()
    assert rolled is not None
    assert registry.active().model_version == "v1.0.0"