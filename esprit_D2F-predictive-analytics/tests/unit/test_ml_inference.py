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
def test_predictor_temporal_model_disabled_by_audit():
    """Audit DSI : le gap predictor temporel est DÉSACTIVÉ en production
    (_gap_model_enabled=False, corpus 98% synthétique). available() doit
    rester False malgré la présence de l'artefact, et le status doit
    l'exposer via drift_check + kill_switch."""
    settings = MagicMock()
    settings.models_dir = str(MODELS_DIR)
    settings.gap_model_artifact = "gap_predictor_temporal.joblib"

    port = ArtifactModelPort(settings, database=MagicMock())
    assert port.available() is False
    assert port._gap_model_enabled is False

    status = port.status()
    assert status["mode"] == "HEURISTIC_FALLBACK"
    assert status["available"] is False
    assert "drift_check" in status
    assert status["kill_switch"] is False


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
