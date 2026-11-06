"""Tests du cache TTL du bundle de features serveur (performance).

- même enseignant => un seul build de bundle dans la fenêtre TTL ;
- TTL expiré => re-build ;
- la copie retournée n'est pas mutée par l'appelant (aucune fuite dans le cache) ;
- TTL 0 => désactivé (re-build à chaque appel).
"""
from __future__ import annotations

from pathlib import Path
from unittest.mock import MagicMock

from app.infrastructure.ml.predictor import ArtifactModelPort

MODELS_DIR = Path(__file__).resolve().parents[2] / "data" / "models"


def _port(ttl: float = 60.0) -> ArtifactModelPort:
    settings = MagicMock()
    settings.models_dir = str(MODELS_DIR)
    settings.ml_artifact_path = "gap_predictor_temporal.joblib"
    settings.ml_metadata_path = "temporal_training_metadata.json"
    settings.ml_registry_path = "model_registry.json"
    settings.ml_feature_cache_ttl = ttl
    settings.ml_enabled = True
    port = ArtifactModelPort(settings, MagicMock())
    # Évite le lazy-load réel (artefact/provenance) : seul le cache est testé.
    port._build_teacher_feature_bundle = MagicMock(side_effect=lambda tid: {"teacher_id": tid, "savoirs": []})
    return port


def test_cache_single_build_within_ttl():
    port = _port()
    b1 = port._teacher_feature_bundle("ENS001")
    b2 = port._teacher_feature_bundle("ENS001")
    assert b1 == b2
    assert port._build_teacher_feature_bundle.call_count == 1, "le bundle doit être construit une seule fois dans le TTL"


def test_cache_expires_and_rebuilds():
    port = _port(ttl=0.01)
    port._teacher_feature_bundle("ENS001")
    import time

    time.sleep(0.03)
    port._teacher_feature_bundle("ENS001")
    assert port._build_teacher_feature_bundle.call_count == 2, "le TTL expiré doit déclencher un re-build"


def test_cache_returns_copy_no_leak():
    port = _port()
    b1 = port._teacher_feature_bundle("ENS001")
    b1["stagnation_months"] = 42.0  # mutation de l'appelant
    b2 = port._teacher_feature_bundle("ENS001")
    assert "stagnation_months" not in b2, "la mutation de l'appelant ne doit pas fuir dans le cache"


def test_cache_disabled_with_ttl_zero():
    port = _port(ttl=0.0)
    port._teacher_feature_bundle("ENS001")
    port._teacher_feature_bundle("ENS001")
    assert port._build_teacher_feature_bundle.call_count == 2, "TTL=0 => cache désactivé"


def test_cache_isolated_per_teacher():
    port = _port()
    b1 = port._teacher_feature_bundle("ENS001")
    b2 = port._teacher_feature_bundle("ENS002")
    assert b1["teacher_id"] == "ENS001" and b2["teacher_id"] == "ENS002"
    assert port._build_teacher_feature_bundle.call_count == 2, "chaque enseignant a son entrée de cache"
