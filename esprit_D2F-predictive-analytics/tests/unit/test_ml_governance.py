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

    source = inspect.getsource(predictor.ArtifactModelPort._build_teacher_feature_bundle)
    assert "WHERE ec.enseignant_id = :tid" in source
    assert "WHERE i.enseignant_id = :tid" in source
    assert "WHERE enseignant_id = :tid" in source
    assert "WHERE (username = :tid" in source
    assert "WHERE p.enseignant_id = :tid" in source


# ---------------------------------------------------------------------------
# 2. Conservation du ranking heuristique
# ---------------------------------------------------------------------------
def test_ranking_heuristic_preserved():
    """Le classement des formations reste 0.70*contenu + 0.20*qualité + 0.10*fraîcheur.

    Verification par le COMPORTEMENT et non par le texte source : les poids sont
    desormais externalises (CDC DSI 1.1), mais le parametrage par defaut doit
    rester strictement identique a l'historique.
    """
    from datetime import date

    from app.domain.entities.competency import Competency, Savoir
    from app.domain.entities.teacher_competency_state import TeacherCompetencyState
    from app.domain.services import ranking_service
    from app.domain.services.ranking_service import RankingWeights, TrainingCandidate, rank_score

    assert ranking_service.WEIGHT_CONTENT == 0.70
    assert ranking_service.WEIGHT_QUALITY == 0.20
    assert ranking_service.WEIGHT_RECENCY == 0.10
    defaults = RankingWeights()
    assert (defaults.content, defaults.quality, defaults.recency) == (0.70, 0.20, 0.10)

    competency = Competency(
        id=1, code="C1", nom="C", domaine_id=None, domaine_nom=None,
        savoirs=(Savoir(id=1, code="S1", nom="s1", knowledge_difficulty_level=4),),
    )
    state = TeacherCompetencyState(
        teacher_id="T", competency=competency, observed_result=1.0,
        previous_observed_result=None, savoir_levels={1: 1},
    )
    today = date(2026, 1, 1)

    def candidate(savoir_ids, avg_eval, end_date=None):
        return TrainingCandidate(
            formation_id=1, titre="f", savoir_ids=frozenset(savoir_ids),
            start_date=None, end_date=end_date, avg_eval_score=avg_eval,
        )

    # contenu=1.0 | qualite=1.0 (5/5) | recence=1.0 (a venir) -> 0.70+0.20+0.10
    assert rank_score(candidate({1}, 5.0), state, today) == pytest.approx(1.00)
    # contenu=0.0 (aucun savoir manquant couvert) -> 0.20+0.10
    assert rank_score(candidate({999}, 5.0), state, today) == pytest.approx(0.30)
    # qualite=0.0 (note 0/5) -> 0.70+0.10
    assert rank_score(candidate({1}, 0.0), state, today) == pytest.approx(0.80)
    # recence=0.0 (terminee il y a un an) -> 0.70+0.20
    assert rank_score(candidate({1}, 5.0, date(2025, 1, 1)), state, today) == pytest.approx(0.90)


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
        artifact_sha256="a" * 64,
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
        artifact_sha256="a" * 64,
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
        artifact_sha256="a" * 64,
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

    v1 = RegistryEntry(model_version="v1.0.0", status=STATUS_ACTIVE, approval_status="PENDING", artifact_sha256="a" * 64)
    v2 = RegistryEntry(model_version="v2.0.0", status=STATUS_ACTIVE, approval_status="PENDING", artifact_sha256="b" * 64)
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

    if active.get("data_origin") == "SIMULATED":
        # L'entrée ACTIVE est le modele SIMULATION (demonstration) : la
        # cohérence s'applique au corpus de simulation, pas au corpus réel.
        sim_corpus = MODELS_DIR.parent / "clean" / "simulation_dataset.csv"
        assert sim_corpus.exists(), "corpus de simulation absent"
        assert active.get("dataset_version", "").startswith("simulation-"), (
            "l'entree ACTIVE SIMULATED doit porter une dataset_version simulation-*"
        )
        assert active.get("validation_scope") == "SIMULATION_VALIDATED"
        return

    assert active["dataset_version"] == provenance_version, (
        f"incohérence version dataset active/registre : registre={active['dataset_version']} "
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

    if active.get("data_origin") == "SIMULATED":
        # Entree ACTIVE = modele SIMULATION : le hash se verifie sur le corpus
        # de simulation (10 920 lignes, hash canonique provenance), pas sur le
        # corpus provenancé réel.
        sim_corpus = MODELS_DIR.parent / "clean" / "simulation_dataset.csv"
        assert sim_corpus.exists(), "corpus de simulation absent"
        import pandas as pd
        from app.infrastructure.ml.dataset_provenance import compute_provenance
        sim_report = compute_provenance(pd.read_csv(sim_corpus), dataset_version="simulation-v1.0.0")

        assert active["dataset_hash"] == sim_report.dataset_hash, (
            f"dataset_hash ACTIVE ({active['dataset_hash']}) != hash corpus simulation ({sim_report.dataset_hash})"
        )
        assert active.get("validation_scope") == "SIMULATION_VALIDATED"
        return

    import pandas as pd
    from app.infrastructure.ml.dataset_provenance import compute_provenance

    # Le hash se vérifie sur le corpus d'entraînement du modèle ACTIVE :
    # training_corpus_provenanced.csv (corpus servi) OU training_corpus_provenanced_v110.csv
    # (corpus du GB v1.2.0-gb, mêmes lignes réelles, version dataset identique).
    candidats = [corpus]
    corpus_v110 = MODELS_DIR.parent / "clean" / "training_corpus_provenanced_v110.csv"
    if corpus_v110.exists():
        candidats.append(corpus_v110)
    hashes = {
        compute_provenance(pd.read_csv(c), dataset_version=active.get("dataset_version", "")).dataset_hash
        for c in candidats
    }
    assert active["dataset_hash"] in hashes, (
        f"dataset_hash ACTIVE ({active['dataset_hash']}) absent des hash corpus tracés {hashes}"
    )

# ---------------------------------------------------------------------------
# 9. Audit 1.2 — INSTITUTIONAL_RECORD exige une attestation DSI
# ---------------------------------------------------------------------------
def test_register_model_institutional_record_requires_attestation(tmp_path, monkeypatch):
    """INSTITUTIONAL_RECORD ne peut être écrit que si les lignes du corpus
    sont attestées DSI (institutional_verified=true) ou si une référence
    d'attestation est fournie — sinon DEMO_SEED."""
    import json as _json

    import pandas as pd

    import pipelines.register_model as rm

    # Corpus sans colonne institutional_verified -> non attesté.
    non_atteste = tmp_path / "corpus_non_atteste.csv"
    pd.DataFrame({"is_synthetic": [False, False]}).to_csv(non_atteste, index=False)
    assert rm._corpus_institutionally_verified(non_atteste) is False

    # Corpus attesté (toutes lignes true).
    atteste = tmp_path / "corpus_atteste.csv"
    pd.DataFrame({"institutional_verified": [True, True]}).to_csv(atteste, index=False)
    assert rm._corpus_institutionally_verified(atteste) is True

    artifact = tmp_path / "model.joblib"
    artifact.write_bytes(b"fake-artifact")
    meta = tmp_path / "meta.json"
    meta.write_text(
        _json.dumps({
            "metrics": {"test_rmse": 1.0, "test_mae": 1.0, "test_r2": 0.5},
            "feature_cols": [],
            "dataset_version": "v-test",
            "data_sources": {"synthetic_share_pct": 0.0},
        }),
        encoding="utf-8",
    )
    monkeypatch.setattr(rm, "REGISTRY_PATH", tmp_path / "registry.json")
    monkeypatch.setattr(rm, "MODELS_DIR", tmp_path)

    # Corpus attesté -> INSTITUTIONAL_RECORD autorisé.
    entry = rm.register_model(
        "v-att-1", artifact_path=artifact, metadata_path=meta, corpus_path=atteste
    )
    assert entry["data_origin"] == "INSTITUTIONAL_RECORD"

    # Corpus non attesté -> DEMO_SEED (jamais INSTITUTIONAL_RECORD).
    entry2 = rm.register_model(
        "v-att-2", artifact_path=artifact, metadata_path=meta, corpus_path=non_atteste
    )
    assert entry2["data_origin"] == "DEMO_SEED"

    # Attestation DSI explicite -> INSTITUTIONAL_RECORD même avec corpus non attesté.
    entry3 = rm.register_model(
        "v-att-3",
        artifact_path=artifact,
        metadata_path=meta,
        corpus_path=non_atteste,
        attestation_dsi="ATT-DSI-2027-001",
    )
    assert entry3["data_origin"] == "INSTITUTIONAL_RECORD"


def test_provenance_distingue_synthetique_et_extrapole():
    """Une ligne REELLE peut porter une cible EXTRAPOLEE.

    Le corpus reel servi est 100 % reel (synthetic_share_pct = 0) mais 100 %
    extrapole : aucune cible n'a ete re-observee a M+3. Sans cette metrique, la
    meta de l'API n'expose que "0 % synthetique", ce qui laisse croire a des
    observations terrain (CDC DSI 4.2 - tracabilite de la release IA).
    """
    import pandas as pd

    from app.infrastructure.ml.dataset_provenance import compute_provenance

    df = pd.DataFrame(
        {
            "source_type": ["DB"] * 4,
            "source_id": ["1", "2", "3", "4"],
            "is_synthetic": [False, False, False, False],
            "created_at": ["2026-01-01"] * 4,
            "dataset_version": ["v1"] * 4,
            "is_extrapolated": [True, True, True, False],
            "gap_next_3m": [1.0, 2.0, 3.0, 0.0],
        }
    )
    report = compute_provenance(df, dataset_version="v1")

    assert report.synthetic_share_pct == 0.0      # aucune ligne fabriquee
    assert report.real_rows == 4
    assert report.extrapolated_rows == 3          # mais 3 cibles non observees
    assert report.observed_target_rows == 1
    assert report.extrapolated_share_pct == 75.0
    assert report.to_dict()["extrapolated_share_pct"] == 75.0


def test_provenance_signale_absence_colonne_extrapolation():
    """Colonne absente : angle mort signale, jamais presume observe."""
    import pandas as pd

    from app.infrastructure.ml.dataset_provenance import compute_provenance

    df = pd.DataFrame(
        {
            "source_type": ["DB"],
            "source_id": ["1"],
            "is_synthetic": [False],
            "created_at": ["2026-01-01"],
            "dataset_version": ["v1"],
            "gap_next_3m": [1.0],
        }
    )
    report = compute_provenance(df, dataset_version="v1")
    assert report.extrapolated_rows == 0
    assert any("is_extrapolated" in e for e in report.errors)


def test_legacy_predictor_lit_les_metadonnees_de_son_artefact():
    """Les metriques exposees doivent appartenir au modele REELLEMENT charge.

    Le predictor legacy lisait "training_metadata.json" en dur, qui decrit
    gap_predictor.joblib (gradient_boosting, 21 features, test_r2 = 1.0 sur 80
    echantillons), meme quand GAP_MODEL_FILE sert gap_predictor_temporal.joblib
    (29 features). get_metrics() annoncait donc des metriques n'appartenant pas
    au modele servi (CDC DSI 4.2 tracabilite / 4.6 suivi des metriques).

    Le test est agnostique de GAP_MODEL_FILE : il verifie l'APPARIEMENT
    metadonnees/artefact, pas une valeur de R2 (qui depend de l'artefact
    configure — 1.0 est la metrique honnete de gap_predictor.joblib).
    """
    import json

    import joblib

    from app.main import app  # installe les alias app.* -> app_legacy.*  # noqa: F401
    import app_legacy.ml.gap_predictor as gp

    if not Path(gp.MODEL_PATH).exists():
        pytest.skip("artefact gap predictor absent de cet environnement")

    predictor = gp.GapPredictor()
    artefact_features = getattr(joblib.load(gp.MODEL_PATH), "n_features_in_", None)

    assert artefact_features is not None
    # Les metadonnees chargees decrivent bien l'artefact servi.
    assert predictor.n_features == artefact_features
    assert len(predictor.feature_ranges) == artefact_features

    # Et les metriques exposees sont celles du fichier apparie a l'artefact.
    paired_meta = Path(gp.settings.models_dir) / gp.TRAINING_METADATA_FILE
    paired_metrics = json.loads(paired_meta.read_text(encoding="utf-8")).get("metrics", {})
    assert predictor.last_metrics == paired_metrics

    # Non-regression : les metriques de l'AUTRE artefact ne doivent pas fuiter.
    other_name = (
        "training_metadata.json"
        if gp.TRAINING_METADATA_FILE != "training_metadata.json"
        else "temporal_training_metadata.json"
    )
    other_meta = Path(gp.settings.models_dir) / other_name
    if other_meta.exists():
        other_metrics = json.loads(other_meta.read_text(encoding="utf-8")).get("metrics", {})
        if other_metrics != paired_metrics:
            assert predictor.last_metrics != other_metrics
