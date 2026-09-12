"""Verifie que le predictor charge le vrai artefact temporel et que son etat
reflete le mode ML. Aucune connexion DB requise : on mock la base pour eviter
les IO externes (predict_gaps/predict_risk necessitent des requetes reelles)."""
from pathlib import Path
from unittest.mock import MagicMock

import pytest

from app.infrastructure.ml.predictor import ArtifactModelPort

MODELS_DIR = Path(__file__).parent.parent.parent / "data" / "models"


@pytest.mark.skipif(
    not (MODELS_DIR / "gap_predictor_temporal.joblib").exists(),
    reason="artefact ML absent",
)
def test_predictor_temporal_model_active_in_production():
    """Le gap predictor temporel est ACTIF en production (PRODUCTION_ML)
    après validation de l'intégrité, de la provenance (0% synthétique),
    des features compatibles et des métriques minimales."""
    settings = MagicMock()
    settings.models_dir = str(MODELS_DIR)
    settings.gap_model_artifact = "gap_predictor_temporal.joblib"
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
    settings.seuil_gap_critique = 0.75
    settings.seuil_gap_haute = 0.5
    settings.seuil_gap_moyenne = 0.25

    port = ArtifactModelPort(settings, database=MagicMock())
    status = port.status()
    assert status["model_mode"] == "PRODUCTION_ML"
    assert status["available"] is True
    assert "drift_check" in status
    assert status["kill_switch"] is False
    assert status["provenance"]["synthetic_share_pct"] == 0.0
    assert status["provenance"]["dataset_version"] == "v1.0.0"
    # Version = celle de l'entrée ACTIVE du registre réel (évolue à chaque
    # réentraînement/promotion — ne pas coder en dur).
    assert status["model_version"] == (
        port._registry.active().model_version if port._registry.active() else None
    )
    assert status["prediction_horizon"] == "3m"


def test_kill_switch_disables_all_ml():
    """ML_ENABLED=false (kill-switch global) : aucun artefact chargé."""
    settings = MagicMock()
    settings.models_dir = str(MODELS_DIR)
    settings.gap_model_artifact = "gap_predictor_temporal.joblib"
    settings.ml_enabled = False

    port = ArtifactModelPort(settings, database=MagicMock())
    assert port.available() is False
    assert port.risk_available() is False
    assert port.relevance_available() is False
    assert port.predict_gaps("X") is None
    assert port.status()["kill_switch"] is True


def test_predictor_unavailable_without_artifact():
    settings = MagicMock()
    settings.models_dir = "definitely/missing"
    settings.gap_model_artifact = "nope.joblib"

    port = ArtifactModelPort(settings, database=MagicMock())
    assert port.available() is False
    assert port.predict_gaps("X") is None
    assert port.predict_risk("X") is None
    assert port.status()["mode"] == "HEURISTIC_FALLBACK"
