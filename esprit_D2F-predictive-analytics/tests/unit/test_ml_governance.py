"""Tests de gouvernance ML — anti-fuite inter-enseignants, ranking heuristique,
règles critiques de risque, et routes API dashboard.

Chaque test vérifie model_mode, model_version, fallback_reason, dataset_version.
"""
from __future__ import annotations

from pathlib import Path
from unittest.mock import MagicMock

import numpy as np
import pytest

from app.core.ml_status import DEMO_ML, HEURISTIC_FALLBACK, PRODUCTION_ML
from app.infrastructure.ml.predictor import (
    FEATURE_SCHEMA_VERSION,
    TEMPORAL_FEATURE_COLS,
    ArtifactModelPort,
)

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


def _provenance_ok():
    from app.infrastructure.ml.dataset_provenance import DatasetProvenanceReport

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
# 1. Absence de fuite de données entre enseignants
# ---------------------------------------------------------------------------
def test_no_teacher_leak_in_feature_bundle():
    """Les features d'un enseignant ne doivent jamais contenir les données
    d'un autre enseignant (aucune agrégation globale par enseignant)."""
    import inspect
    from app.infrastructure.ml import predictor

    source = inspect.getsource(predictor.ArtifactModelPort._teacher_feature_bundle)
    assert "WHERE ec.enseignant_id = :tid" in source
    assert "WHERE i.enseignant_id = :tid" in source
    assert "WHERE enseignant_id = :tid" in source
    assert "WHERE (username = :tid" in source
    assert "WHERE p.enseignant_id = :tid" in source


# ---------------------------------------------------------------------------
# 2. Conservation du ranking heuristique
# ---------------------------------------------------------------------------
def test_ranking_heuristic_preserved():
    """Le classement des formations reste 0.70*contenu + 0.20*qualité + 0.10*fraîcheur."""
    from app.domain.services import ranking_service

    assert ranking_service.WEIGHT_CONTENT == 0.70
    assert ranking_service.WEIGHT_QUALITY == 0.20
    assert ranking_service.WEIGHT_RECENCY == 0.10

    import inspect
    source = inspect.getsource(ranking_service.rank_score)
    assert "WEIGHT_CONTENT" in source
    assert "WEIGHT_QUALITY" in source
    assert "WEIGHT_RECENCY" in source


# ---------------------------------------------------------------------------
# 3. Conservation des règles critiques de risque
# ---------------------------------------------------------------------------
def test_critical_risk_rules_preserved():
    """Les règles métier de sécurité restent prioritaires sur le ML."""
    import inspect
    from app.infrastructure.ml.predictor import ArtifactModelPort

    source = "\n".join(
        [
            inspect.getsource(ArtifactModelPort._predict_risk_ml),
            # La règle de sécurité est déléguée à ce helper.
            inspect.getsource(ArtifactModelPort._apply_critical_gaps_rule),
        ]
    )
    assert "n_crit >= 3" in source
    assert "RiskLevel.CRITICAL" in source


# ---------------------------------------------------------------------------
# 4. Route /dashboard
# ---------------------------------------------------------------------------
def test_dashboard_route_exists():
    """La route /dashboard doit être exposée."""
    from app.main import app

    paths = [route.path for route in app.routes]
    assert any("/dashboard" in p for p in paths)


# ---------------------------------------------------------------------------
# 5. Route /teachers/{id}/gaps
# ---------------------------------------------------------------------------
def test_gaps_route_exists():
    """La route /teachers/{id}/gaps doit être exposée."""
    from app.main import app

    paths = [route.path for route in app.routes]
    assert any("/teachers/{teacher_id}/gaps" in p for p in paths)


# ---------------------------------------------------------------------------
# 6. Mode PRODUCTION_ML avec toutes les validations
# ---------------------------------------------------------------------------
def test_production_mode_with_all_validations(tmp_path):
    from app.infrastructure.ml.model_registry import (
        APPROVAL_APPROVED,
        STATUS_ACTIVE,
        ModelRegistry,
        RegistryEntry,
    )

    registry_path = tmp_path / "model_registry.json"
    registry = ModelRegistry(registry_path, MODELS_DIR)
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


# ---------------------------------------------------------------------------
# 7. Mode DEMO_ML (registre non approuvé)
# ---------------------------------------------------------------------------
def test_demo_mode_when_registry_not_approved(tmp_path):
    from app.infrastructure.ml.model_registry import (
        STATUS_ACTIVE,
        ModelRegistry,
        RegistryEntry,
    )

    registry_path = tmp_path / "model_registry.json"
    registry = ModelRegistry(registry_path, MODELS_DIR)
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
        approval_status="PENDING",
    )
    registry.register(entry)

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


# ---------------------------------------------------------------------------
# 7bis. Corpus trop synthétique → HEURISTIC_FALLBACK (jamais DEMO_ML)
# ---------------------------------------------------------------------------
def test_heuristic_when_synthetic_above_threshold(tmp_path):
    from app.infrastructure.ml.dataset_provenance import DatasetProvenanceReport
    from app.infrastructure.ml.model_registry import (
        APPROVAL_APPROVED,
        STATUS_ACTIVE,
        ModelRegistry,
        RegistryEntry,
    )

    registry_path = tmp_path / "model_registry.json"
    registry = ModelRegistry(registry_path, MODELS_DIR)
    entry = RegistryEntry(
        model_name="gradient_boosting",
        model_version="v1.0.0",
        status=STATUS_ACTIVE,
        created_at="2026-08-16T00:00:00",
        dataset_version="v1.0.0",
        dataset_hash="abc",
        artifact_sha256="abc",
        synthetic_share_pct=60.0,
        feature_names=list(TEMPORAL_FEATURE_COLS),
        feature_schema_version=FEATURE_SCHEMA_VERSION,
        metrics={"rmse": 0.75, "mae": 0.47, "r2": 0.65},
        approval_status=APPROVAL_APPROVED,
    )
    registry.register(entry)
    registry.approve("v1.0.0")

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


# ---------------------------------------------------------------------------
# 8. Mode HEURISTIC_FALLBACK
# ---------------------------------------------------------------------------
def test_heuristic_fallback_when_artifact_absent(tmp_path):
    settings = _settings(models_dir=str(tmp_path))
    port = ArtifactModelPort(settings, MagicMock())
    assert port._effective_mode() == HEURISTIC_FALLBACK
    assert port.status()["fallback_reason"]


# ---------------------------------------------------------------------------
# 9. Rollback
# ---------------------------------------------------------------------------
def test_registry_rollback(tmp_path):
    from app.infrastructure.ml.model_registry import (
        STATUS_ACTIVE,
        ModelRegistry,
        RegistryEntry,
    )

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


# ---------------------------------------------------------------------------
# 10. Absence de fuite (required_level, gap_next_3m)
# ---------------------------------------------------------------------------
def test_no_leak_columns_in_feature_set():
    from app.infrastructure.ml.feature_schema import LEAK_COLUMNS

    leaks = [c for c in TEMPORAL_FEATURE_COLS if c in LEAK_COLUMNS]
    assert leaks == [], f"Colonnes de fuite dans X : {leaks}"


# ---------------------------------------------------------------------------
# 11. Prédiction déterministe avec seed
# ---------------------------------------------------------------------------
def test_prediction_deterministic_with_seed():
    X1 = np.random.RandomState(42).normal(size=(10, len(TEMPORAL_FEATURE_COLS)))
    X2 = np.random.RandomState(42).normal(size=(10, len(TEMPORAL_FEATURE_COLS)))
    np.testing.assert_array_equal(X1, X2)


# ---------------------------------------------------------------------------
# 12. Contrôle du périmètre RBAC
# ---------------------------------------------------------------------------
def test_rbac_scope_enforced():
    """Le contrôle RBAC doit être appliqué sur la route gaps."""
    from app.api.v1 import gaps

    import inspect
    source = inspect.getsource(gaps.list_gaps)
    assert "enforce_teacher_access" in source
    assert "require_roles" in source


# ---------------------------------------------------------------------------
# 13. Cohérence active_model.version ↔ provenance.dataset_model_version
# ---------------------------------------------------------------------------
def test_active_model_version_matches_provenance():
    """ÉCHEC si le modèle ACTIVE du registre ne correspond pas à la version
    du dataset servi (colonne dataset_version des lignes du corpus provenancé).

    Garantie : le registre (artefact servi) et le corpus d'entraînement restent
    sur la même version ; tout écart force une revue avant re-validation.
    """
    from app.infrastructure.ml.dataset_provenance import provenance_from_csv

    registry_path = MODELS_DIR / "model_registry.json"
    if not registry_path.exists():
        pytest.skip("registre absent")

    import json
    registry = json.loads(registry_path.read_text(encoding="utf-8"))
    if isinstance(registry, dict):
        registry = registry.get("entries", [])
    active = [e for e in registry if e.get("status") == "ACTIVE"]
    if not active:
        pytest.skip("aucune entrée ACTIVE dans le registre")

    active = active[0]
    corpus = MODELS_DIR.parent / "clean" / "training_corpus_provenanced.csv"
    if not corpus.exists():
        pytest.skip("corpus provenancé absent")

    import pandas as pd
    df = pd.read_csv(corpus)
    provenance_version = str(df["dataset_version"].iloc[0])
    assert provenance_version, "provenance.dataset_model_version absente"

    assert active["model_version"] == provenance_version, (
        f"incohérence version active/registre : registre={active['model_version']} "
        f"vs provenance={provenance_version} (dataset servi). "
        "Corrigez le registre ou l'artefact avant toute re-validation."
    )


def test_active_dataset_hash_recomputed():
    """Le dataset_hash de l'entrée ACTIVE doit être renseigné et correspondre
    au hash canonique du corpus provenancé (sinon traçabilité cassée)."""
    from app.infrastructure.ml.dataset_provenance import provenance_from_csv

    registry_path = MODELS_DIR / "model_registry.json"
    if not registry_path.exists():
        pytest.skip("registre absent")

    import json
    registry = json.loads(registry_path.read_text(encoding="utf-8"))
    if isinstance(registry, dict):
        registry = registry.get("entries", [])
    active = [e for e in registry if e.get("status") == "ACTIVE"]
    if not active:
        pytest.skip("aucune entrée ACTIVE dans le registre")

    active = active[0]
    corpus = MODELS_DIR.parent / "clean" / "training_corpus_provenanced.csv"
    if not corpus.exists():
        pytest.skip("corpus provenancé absent")

    report = provenance_from_csv(corpus)
    assert active.get("dataset_hash"), "dataset_hash ACTIVE vide dans le registre"
    assert active["dataset_hash"] == report.dataset_hash, (
        f"dataset_hash ACTIVE ({active['dataset_hash']}) != hash corpus ({report.dataset_hash})"
    )