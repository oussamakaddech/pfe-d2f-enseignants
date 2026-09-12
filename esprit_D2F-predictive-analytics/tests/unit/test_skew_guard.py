"""Tests du skew guard actif (test KS, p < 0,01) et de l'endpoint /model-health.

Gouvernance MLOps — observabilité des modèles :
- dérive de distribution détectée (KS p < seuil) => serving ML refusé
  (fail-closed, raison explicite) ;
- distribution conforme => serving ML normal ;
- fenêtre insuffisante / référence absente => contrôle consultatif, jamais
  de dérive inventée.
"""
from __future__ import annotations

from pathlib import Path
from unittest.mock import MagicMock

import numpy as np
import pytest

from app.infrastructure.ml.predictor import (
    FEATURE_SCHEMA_VERSION,
    TEMPORAL_FEATURE_COLS,
    ArtifactModelPort,
)
from app.infrastructure.ml.skew_guard import SkewGuard

MODELS_DIR = Path(__file__).resolve().parents[2] / "data" / "models"


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
    settings.ml_serving_mode = "PRODUCTION_ML"
    settings.ml_enabled = True
    settings.ml_skew_guard_enabled = True
    settings.ml_skew_p_threshold = 0.01
    settings.ml_skew_window = 30
    settings.ml_skew_min_window = 10
    settings.seuil_gap_critique = 0.75
    settings.seuil_gap_haute = 0.5
    settings.seuil_gap_moyenne = 0.25
    for key, value in overrides.items():
        setattr(settings, key, value)
    return settings


def _metadata() -> dict:
    return {
        "model_name": "gap_predictor_temporal",
        "feature_cols": list(TEMPORAL_FEATURE_COLS),
        "feature_schema_version": FEATURE_SCHEMA_VERSION,
        "metrics": {"test_r2": 0.65, "test_rmse": 0.75, "test_mae": 0.47},
        "feature_ranges": {col: {"min": 0.0, "max": 5.0} for col in TEMPORAL_FEATURE_COLS},
        "data_sources": {"synthetic_share_pct": 0.0},
    }


def _port(**overrides):
    port = ArtifactModelPort(_settings(**overrides), MagicMock())
    port._load_attempted = True  # évite le lazy-load réel qui écraserait la metadata de test
    return port


# ---------------------------------------------------------------------------
# 1. Unitaires SkewGuard
# ---------------------------------------------------------------------------
def test_skew_guard_detects_distribution_shift():
    """Dérive brutale : fenêtre servie constante à 5.0 vs référence à 2.0."""
    guard = SkewGuard(
        feature_names=TEMPORAL_FEATURE_COLS, min_window=10, p_threshold=0.01
    )
    ref = np.full((50, len(TEMPORAL_FEATURE_COLS)), 2.0)
    assert guard.set_reference_from_matrix(ref) == 50
    for _ in range(10):
        guard.record_serving(np.full((1, len(TEMPORAL_FEATURE_COLS)), 5.0))

    verdict = guard.evaluate()
    assert verdict.checked is True
    assert verdict.skew_detected is True
    assert verdict.features, "au moins une feature doit être signalée"
    assert verdict.min_p_value is not None and verdict.min_p_value < 0.01
    assert "dérive KS" in (verdict.reason or "")


def test_skew_guard_passes_on_identical_distribution():
    """Fenêtre identique à la référence => aucune dérive (KS p = 1)."""
    guard = SkewGuard(
        feature_names=TEMPORAL_FEATURE_COLS, min_window=10, p_threshold=0.01
    )
    ref = np.tile(np.linspace(0.0, 5.0, 20), (len(TEMPORAL_FEATURE_COLS), 1)).T
    guard.set_reference_from_matrix(ref)
    window = ref[::2].copy()  # sous-échantillon couvrant toute la plage [0, 5]
    for _ in range(3):
        guard.record_serving(window)

    verdict = guard.evaluate()
    assert verdict.checked is True
    assert verdict.skew_detected is False
    assert verdict.features == []


def test_skew_guard_consultative_without_reference():
    """Sans référence d'entraînement : consultatif, jamais de dérive inventée."""
    guard = SkewGuard(feature_names=TEMPORAL_FEATURE_COLS, min_window=5)
    for _ in range(6):
        guard.record_serving(np.zeros((1, len(TEMPORAL_FEATURE_COLS))))

    verdict = guard.evaluate()
    assert verdict.skew_detected is False
    assert verdict.checked is False
    assert "référence" in (verdict.reason or "")


def test_skew_guard_insufficient_window():
    """Fenêtre sous le minimum : contrôle non déclenché."""
    guard = SkewGuard(
        feature_names=TEMPORAL_FEATURE_COLS, min_window=10, p_threshold=0.01
    )
    guard.set_reference_from_matrix(np.zeros((20, len(TEMPORAL_FEATURE_COLS))))
    for _ in range(3):
        guard.record_serving(np.full((1, len(TEMPORAL_FEATURE_COLS)), 5.0))

    verdict = guard.evaluate()
    assert verdict.checked is False
    assert verdict.skew_detected is False
    assert "insuffisante" in (verdict.reason or "")


def test_skew_guard_disabled():
    """Guard désactivé par config : statut honnête, aucun blocage."""
    guard = SkewGuard(feature_names=TEMPORAL_FEATURE_COLS, enabled=False)
    guard.set_reference_from_matrix(np.zeros((20, len(TEMPORAL_FEATURE_COLS))))
    verdict = guard.evaluate()
    assert verdict.skew_detected is False
    assert "désactivé" in (verdict.reason or "")


# ---------------------------------------------------------------------------
# 2. Intégration serving — ArtifactModelPort
# ---------------------------------------------------------------------------
def _matrix(value: float) -> np.ndarray:
    return np.full((2, len(TEMPORAL_FEATURE_COLS)), value)


def _wire_serving(port: ArtifactModelPort, matrix: np.ndarray) -> None:
    """Branche le port sur des features et une base simulées (sans DB réelle)."""
    port._teacher_feature_bundle = lambda teacher_id: {}
    port._build_feature_matrix = lambda bundle: (matrix, [1], np.array([3.0]))
    conn = port._database.read_connection.return_value.__enter__.return_value
    conn.execute.return_value.mappings.return_value.all.return_value = [
        {"id": 1, "code": "C1", "nom": "Competence 1"}
    ]


def test_predict_gaps_falls_back_on_ks_skew():
    """Dérive KS détectée au serving => None + raison fail-closed explicite."""
    port = _port()
    port._model = _FakeModel([0.5])
    port._metadata = _metadata()
    guard = SkewGuard(
        feature_names=TEMPORAL_FEATURE_COLS, min_window=10, p_threshold=0.01
    )
    guard.set_reference_from_matrix(_matrix(2.0))
    for _ in range(10):
        guard.record_serving(_matrix(5.0))
    port._skew_guard = guard
    _wire_serving(port, _matrix(5.0))

    result = port._predict_gaps("T1")
    assert result is None
    assert port._fallback_reason is not None
    assert "dérive KS" in port._fallback_reason


def test_predict_gaps_serves_ml_without_skew():
    """Distribution conforme => le serving ML produit bien les gaps."""
    port = _port()
    port._model = _FakeModel([1.0])
    port._metadata = _metadata()
    guard = SkewGuard(
        feature_names=TEMPORAL_FEATURE_COLS, min_window=10, p_threshold=0.01
    )
    ref = np.tile(np.linspace(0.0, 5.0, 20), (len(TEMPORAL_FEATURE_COLS), 1)).T
    guard.set_reference_from_matrix(ref)
    window = ref[::2].copy()  # sous-échantillon couvrant toute la plage [0, 5]
    for _ in range(5):
        guard.record_serving(window)
    port._skew_guard = guard
    _wire_serving(port, window)

    result = port._predict_gaps("T1")
    assert result is not None
    assert len(result) == 1
    assert result[0].competence_code == "C1"


def test_model_health_payload():
    """model_health expose r2/mae/rmse + état du skew guard (skew_detected)."""
    port = _port()
    port._metadata = _metadata()
    payload = port.model_health()
    assert payload["r2"] == 0.65
    assert payload["mae"] == 0.47
    assert payload["rmse"] == 0.75
    assert "skew_detected" in payload
    assert payload["skew_guard"]["test"] == "kolmogorov_smirnov_2samp"
    assert payload["skew_guard"]["p_threshold"] == pytest.approx(0.01)


def test_port_wires_skew_guard_from_settings():
    """Le port construit son skew guard depuis les réglages ml_skew_*."""
    port = _port(ml_skew_p_threshold=0.005, ml_skew_window=7, ml_skew_min_window=3)
    assert port._skew_guard.p_threshold == pytest.approx(0.005)
    assert port._skew_guard.window_size == 7
    assert port._skew_guard.min_window == 3

