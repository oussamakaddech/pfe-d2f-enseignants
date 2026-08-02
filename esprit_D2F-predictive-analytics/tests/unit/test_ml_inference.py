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
def test_predictor_loads_real_temporal_model():
    settings = MagicMock()
    settings.models_dir = str(MODELS_DIR)
    settings.gap_model_artifact = "gap_predictor_temporal.joblib"

    port = ArtifactModelPort(settings, database=MagicMock())
    assert port.available() is True

    status = port.status()
    assert status["mode"] == "ML"
    assert status["available"] is True
    assert status["n_features"] == 29
    assert status["model_name"] in {"gradient_boosting", "xgboost", "mlp"}

    # Artefact reel entraine
    assert port._model is not None
    assert getattr(port._model, "n_features_in_", None) == 29


def test_predictor_unavailable_without_artifact():
    settings = MagicMock()
    settings.models_dir = "definitely/missing"
    settings.gap_model_artifact = "nope.joblib"

    port = ArtifactModelPort(settings, database=MagicMock())
    assert port.available() is False
    assert port.predict_gaps("X") is None
    assert port.predict_risk("X") is None
    assert port.status()["mode"] == "HEURISTIC_FALLBACK"
