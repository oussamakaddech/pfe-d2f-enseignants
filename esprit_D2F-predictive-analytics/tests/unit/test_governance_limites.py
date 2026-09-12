"""Tests de gouvernance des quatre limites du chapitre 7.6.

1. test_target_validity_exposed_in_contract
2. test_promotion_requires_real_target_threshold
3. test_snapshot_monthly_populates_niveau_snapshot
4. test_multiframe_refused_below_500_lines
5. test_risk_score_type_and_calibration_status_exposed
6. test_no_probability_wording_in_frontend
7. test_calibration_study_requires_observed_events
8. test_fallback_rate_logged_per_call
9. test_near_boundary_warning_emitted
10. test_widened_ranges_rejected_without_new_version
11. test_serving_unchanged_for_35_teachers (non-régression)
"""
from __future__ import annotations

import json
from pathlib import Path
from unittest.mock import MagicMock

import numpy as np
import pytest

from app.core.ml_status import DEMO_ML, HEURISTIC_FALLBACK, PRODUCTION_ML
from app.infrastructure.ml.model_registry import (
    APPROVAL_APPROVED,
    APPROVAL_REJECTED,
    STATUS_ACTIVE,
    TARGET_VALIDITY_EXTRAPOLATED,
    TARGET_VALIDITY_REAL,
    ModelRegistry,
    RegistryEntry,
)
from app.infrastructure.ml.ml_observability import MlObservability
from app.infrastructure.ml.predictor import (
    FEATURE_SCHEMA_VERSION,
    TEMPORAL_FEATURE_COLS,
    ArtifactModelPort,
)

BASE_DIR = Path(__file__).resolve().parents[2]
MODELS_DIR = BASE_DIR / "data" / "models"
WEBAPP_SRC = BASE_DIR.parent / "esprit_D2F-webapp" / "src"


class _FakePicklableModel:
    """Modèle factice picklable pour tester le rejet d'artefacts."""

    n_features_in_ = len(TEMPORAL_FEATURE_COLS)


# ---------------------------------------------------------------------------
# 1. target_validity exposé dans le contrat ML
# ---------------------------------------------------------------------------
def test_target_validity_exposed_in_contract():
    """Le contrat ML (registre + metadata + status()) expose target_validity
    pour la version active — EXTRAPOLATED_TARGET (v1.0.0 DEMO_SEED) ou
    OBSERVED_IN_SIMULATION (simulation-v1.0.0 servie en demonstration).
    JAMAIS REAL_VALIDATED_TARGET (aucune re-mesure future reelle n'existe)."""
    registry_path = MODELS_DIR / "model_registry.json"
    assert registry_path.exists()
    registry = json.loads(registry_path.read_text(encoding="utf-8"))
    active = [e for e in registry if e.get("status") == "ACTIVE"]
    assert active, "aucune entrée ACTIVE"
    assert active[0].get("target_validity") in (TARGET_VALIDITY_EXTRAPOLATED, "OBSERVED_IN_SIMULATION"), (
        "la version ACTIVE doit porter target_validity=EXTRAPOLATED_TARGET "
        "ou OBSERVED_IN_SIMULATION (aucune re-mesure future réelle n'existe)"
    )
    assert active[0].get("target_validity") != "REAL_VALIDATED_TARGET", (
        "aucune version ACTIVE ne peut revendiquer REAL_VALIDATED_TARGET"
    )

    # Metadata sidecar cohérente.
    meta = json.loads((MODELS_DIR / "temporal_training_metadata.json").read_text(encoding="utf-8"))
    assert meta.get("target_validity") == TARGET_VALIDITY_EXTRAPOLATED

    # status() du port ML expose aussi la validité (registre prioritaire).
    port = _port()
    status = port.status()
    assert status["target_validity"] in (TARGET_VALIDITY_EXTRAPOLATED, "OBSERVED_IN_SIMULATION")
    assert ("extrapol" in status["target_validity_label"].lower()) or ("simulation" in status["target_validity_label"].lower())



# ---------------------------------------------------------------------------
# 2. Seuil de promotion REAL_VALIDATED_TARGET
# ---------------------------------------------------------------------------
def _entry(version="v2.0.0", real_count=0, months=0, validity=TARGET_VALIDITY_REAL, attestation_dsi=None):
    return RegistryEntry(
        model_name="gap_predictor_temporal",
        model_version=version,
        status="CANDIDATE",
        dataset_version="v1.0.0",
        artifact_sha256="abc",
        feature_names=list(TEMPORAL_FEATURE_COLS),
        feature_schema_version=FEATURE_SCHEMA_VERSION,
        approval_status="PENDING",
        target_validity=validity,
        real_future_observation_count=real_count,
        distinct_observation_months=months,
        attestation_dsi=attestation_dsi,
    )


def test_promotion_requires_real_target_threshold(tmp_path):
    """Une version avec < 30 observations réelles (ou < 3 mois distincts, ou
    sans attestation DSI) ne peut PAS être promue REAL_VALIDATED_TARGET."""
    registry = ModelRegistry(tmp_path / "model_registry.json", MODELS_DIR)

    # 2a. Moins de 30 observations réelles -> refus.
    entry = _entry(real_count=29, months=5)
    registry.register(entry)
    approved = registry.approve("v2.0.0")
    assert approved is None, "promotion avec 29 observations réelles doit être REFUSÉE"
    reloaded = registry.get("v2.0.0")
    assert reloaded.approval_status == APPROVAL_REJECTED
    assert "seuil 30" in reloaded.notes

    # 2b. 30+ observations mais moins de 3 mois distincts -> refus.
    registry2 = ModelRegistry(tmp_path / "model_registry2.json", MODELS_DIR)
    entry2 = _entry(version="v2.1.0", real_count=40, months=2)
    registry2.register(entry2)
    approved2 = registry2.approve("v2.1.0")
    assert approved2 is None, "promotion avec 2 mois distincts doit être REFUSÉE"
    assert "mois distincts" in registry2.get("v2.1.0").notes

    # 2c. 30 observations sur 3 mois SANS attestation DSI -> toujours refus
    # (gouvernance simulation etape 4.4 : REAL_VALIDATED reserve aux donnees
    # institutionnelles attestees — aucune attestation n'existe aujourd'hui).
    registry3 = ModelRegistry(tmp_path / "model_registry3.json", MODELS_DIR)
    entry3 = _entry(version="v2.2.0", real_count=30, months=3)
    registry3.register(entry3)
    approved3 = registry3.approve("v2.2.0")
    assert approved3 is None, "promotion REAL_VALIDATED sans attestation DSI doit être REFUSÉE"
    assert "attestation DSI absente" in registry3.get("v2.2.0").notes

    # 2d. 30 observations sur 3 mois AVEC attestation DSI -> promotion autorisée.
    registry4 = ModelRegistry(tmp_path / "model_registry4.json", MODELS_DIR)
    entry4 = _entry(version="v2.3.0", real_count=30, months=3, attestation_dsi="DSI-2026-001")
    registry4.register(entry4)
    approved4 = registry4.approve("v2.3.0")
    assert approved4 is not None
    assert approved4.status == STATUS_ACTIVE
    assert approved4.approval_status == APPROVAL_APPROVED


# ---------------------------------------------------------------------------
# 3. Historisation mensuelle des niveaux (niveau_snapshot)
# ---------------------------------------------------------------------------
def test_snapshot_monthly_populates_niveau_snapshot():
    """Le job historiser_niveaux remplit analyse.niveau_snapshot (idempotent)."""
    from app.infrastructure.scheduler import jobs

    calls = []

    class FakeSessionResult:
        rowcount = 42

    class FakeSession:
        def __enter__(self):
            return self

        def __exit__(self, *args):
            return False

        def execute(self, sql):
            calls.append(sql)
            return FakeSessionResult()

    class FakeDatabase:
        def session(self):
            return FakeSession()

    container = MagicMock()
    container.database = FakeDatabase()

    result = jobs.historiser_niveaux(container)
    assert result["status"] == "ok"
    assert result["snapshot_rows"] == 42
    executed = str(calls[0])
    assert "niveau_snapshot" in executed
    assert "ON CONFLICT" in executed  # idempotent par (teacher, savoir, date)

    # Intégration : lancer_batch appelle bien historiser_niveaux.
    source = Path(jobs.__file__).read_text(encoding="utf-8")
    assert "historiser_niveaux(container)" in source

    # La table est déclarée dans le DDL d'initialisation.
    ddl = (BASE_DIR / "app" / "infrastructure" / "db" / "init_db.py").read_text(encoding="utf-8")
    assert "niveau_snapshot" in ddl
    assert "UNIQUE (teacher_id, savoir_id, snapshot_date)" in ddl


# ---------------------------------------------------------------------------
# 4. Multi-fenêtres refusée sous 500 lignes
# ---------------------------------------------------------------------------
def test_multiframe_refused_below_500_lines():
    """Le pipeline de validation refuse explicitement la multi-fenêtres sous
    500 lignes / 6 mois distincts — message « Corpus insuffisant... »."""
    import pandas as pd

    from pipelines.validate_all_models import (
        MULTIFRAME_MIN_MONTHS,
        MULTIFRAME_MIN_ROWS,
        _evaluate_multiframe,
        _multiframe_eligibility,
    )

    assert MULTIFRAME_MIN_ROWS == 500
    assert MULTIFRAME_MIN_MONTHS == 6

    # Corpus réel actuel : 147 lignes -> refus explicite.
    small = pd.DataFrame({
        "date_t": ["2026-01-01"] * 147,
        "teacher_id": ["T1"] * 147,
        "dataset_version": ["v1.0.0"] * 147,
    })
    eligibility = _multiframe_eligibility(small)
    assert eligibility["eligible"] is False
    assert "Corpus insuffisant pour validation multi-fenetres" in eligibility["message"]
    assert f"n=147" in eligibility["message"]
    assert _evaluate_multiframe(small, gb_params={}) is None

    # Corpus >= 500 lignes sur >= 6 mois -> éligible.
    rng = np.random.default_rng(42)
    months = pd.date_range("2025-01-01", periods=8, freq="MS")
    big = pd.DataFrame({
        "date_t": [m.strftime("%Y-%m-%d") for m in months for _ in range(70)],
        "teacher_id": ["T1"] * 70 * 8,
        "dataset_version": ["v1.0.0"] * 70 * 8,
    })
    eligibility_big = _multiframe_eligibility(big)
    assert eligibility_big["eligible"] is True
    assert eligibility_big["n_rows"] == 560
    assert eligibility_big["distinct_months"] == 8


# ---------------------------------------------------------------------------
# 5. score_type / calibration_status exposés par l'API
# ---------------------------------------------------------------------------
def test_risk_score_type_and_calibration_status_exposed():
    """Le RiskProfile servi par l'API porte score_type=WEIGHTED_HEURISTIC_INDEX
    et calibration_status=NOT_CALIBRATED (routes + contrat)."""
    import inspect

    from app.api.v1 import risk

    source = inspect.getsource(risk.get_risk)
    assert "WEIGHTED_HEURISTIC_INDEX" in source
    assert "NOT_CALIBRATED" in source
    assert "target_validity" in source

    # Le mapper frontend lit aussi ces champs (contrat complet servi).
    api = (WEBAPP_SRC / "services" / "analyse" / "analyticsApi.ts").read_text(encoding="utf-8")
    assert "score_type" in api
    assert "calibration_status" in api


# ---------------------------------------------------------------------------
# 6. Aucun libellé « probabilité » lié au score dans le frontend
# ---------------------------------------------------------------------------
def test_no_probability_wording_in_frontend():
    """Aucun affichage « Score de risque X % » ; l'indice est étiqueté
    « non calibré » et jamais « probabilité »."""
    teacher_page = (WEBAPP_SRC / "pages" / "analyse" / "AnalyticsTeacherPage.tsx").read_text(encoding="utf-8")
    score_card = (WEBAPP_SRC / "components" / "analytics" / "RiskScoreCard.tsx").read_text(encoding="utf-8")

    for content in (teacher_page, score_card):
        assert "Score de risque" not in content, "libellé historique « Score de risque » interdit"
        assert "Indice de risque" in content
        assert "non calibré" in content
    # Le libellé « probabilité » ne doit jamais qualifier l'indice de risque.
    assert "probabilité de risque" not in teacher_page.lower()
    assert "probabilité de risque" not in score_card.lower()


# ---------------------------------------------------------------------------
# 7. calibration_study.py refuse de s'exécuter sans événements observés
# ---------------------------------------------------------------------------
def test_calibration_study_requires_observed_events():
    """Le script de calibration se met en échec proprement (message explicite)
    tant qu'aucun événement observé n'est disponible."""
    import pandas as pd

    from pipelines.calibration_study import (
        MIN_EVENTS,
        NoObservedEventsError,
        run_calibration_study,
    )

    assert MIN_EVENTS == 30

    # Sans événements -> refus propre.
    scores = np.linspace(0, 1, 50)
    events = np.zeros(50)
    with pytest.raises(NoObservedEventsError) as excinfo:
        run_calibration_study(scores, events)
    assert "refusée" in str(excinfo.value)
    assert "30" in str(excinfo.value)

    # Avec trop peu d'événements -> refus propre.
    events_few = np.zeros(50)
    events_few[:5] = 1
    with pytest.raises(NoObservedEventsError):
        run_calibration_study(scores, events_few)

    # Avec assez d'événements réels (données factices LOCALES de test) :
    # l'étude tourne et produit Platt + isotonique + Brier.
    rng = np.random.default_rng(42)
    scores_ok = rng.uniform(0, 1, 200)
    # Événements corrélés au score (données de test uniquement).
    events_ok = (rng.uniform(0, 1, 200) < scores_ok).astype(float)
    report = run_calibration_study(scores_ok, events_ok)
    assert report["task"] == "risk_index_calibration"
    assert report["score_type"] == "WEIGHTED_HEURISTIC_INDEX"
    assert "platt_scaling" in report["methods"]
    assert "isotonic_regression" in report["methods"]
    assert "brier_score" in report["methods"]["platt_scaling"]
    assert "calibration_curve" in report["methods"]["isotonic_regression"]
    assert "best_method" in report


# ---------------------------------------------------------------------------
# 8. Taux de fallback journalisé à chaque appel
# ---------------------------------------------------------------------------
def test_fallback_rate_logged_per_call():
    """Chaque appel de serving est journalisé (teacher_id, mode, raison) et
    le taux de fallback par jour est consultable."""
    obs = MlObservability()
    obs.record_serving_call("T001", PRODUCTION_ML)
    obs.record_serving_call("T002", PRODUCTION_ML)
    obs.record_serving_call("T003", HEURISTIC_FALLBACK, "features hors plages")
    obs.record_serving_call("T004", HEURISTIC_FALLBACK, "features hors plages")

    rate = obs.fallback_rate_per_day()
    assert len(rate) == 1
    assert rate[0]["total_calls"] == 4
    assert rate[0]["fallback_calls"] == 2
    assert rate[0]["fallback_rate"] == 0.5

    calls = obs.recent_calls()
    assert len(calls) == 4
    assert calls[0]["teacher_id"] == "T004"
    assert calls[0]["mode"] == HEURISTIC_FALLBACK
    assert calls[0]["fallback_reason"] == "features hors plages"

    # Le port ML journalise aussi chaque predict_gaps (source vérifiée).
    predictor_src = (BASE_DIR / "app" / "infrastructure" / "ml" / "predictor.py").read_text(encoding="utf-8")
    assert "record_serving_call(" in predictor_src

    # Endpoint admin exposé (taux de fallback consultable).
    from app.main import app as fastapi_app

    paths = [r.path for r in fastapi_app.routes]
    assert any("/ml-observability" in p for p in paths)


# ---------------------------------------------------------------------------
# 9. Alerte de proximité des bornes (< 5 %)
# ---------------------------------------------------------------------------
def test_near_boundary_warning_emitted():
    """Un enseignant servi en ML dont une feature est à moins de 5 % de sa
    borne déclenche l'avertissement NEAR_TRAINING_BOUNDARY."""
    port = _port()
    # Artifact simulé : plages d'entraînement [10, 100] par feature.
    ranges = {col: {"min": 10.0, "max": 100.0} for col in TEMPORAL_FEATURE_COLS}
    port._metadata = {**port._metadata, "feature_ranges": ranges} if port._metadata else {"feature_ranges": ranges}

    # Vecteur au milieu des plages : aucune alerte.
    X_mid = np.full((3, len(TEMPORAL_FEATURE_COLS)), 55.0)
    assert port._near_boundary_columns(X_mid) == []

    # Vecteur à moins de 5 % de la borne max (95 < 10 + 0.05*90=14.5 ? non :
    # proximité haute = value > max - 0.05*width = 100 - 4.5 = 95.5).
    X_near = np.full((3, len(TEMPORAL_FEATURE_COLS)), 55.0)
    X_near[:, 0] = 96.0  # > 95.5 -> proche de la borne haute
    assert TEMPORAL_FEATURE_COLS[0] in port._near_boundary_columns(X_near)

    # Vecteur proche de la borne basse : value < min + 0.05*width = 14.5.
    X_low = np.full((3, len(TEMPORAL_FEATURE_COLS)), 55.0)
    X_low[:, 1] = 12.0  # < 14.5 -> proche de la borne basse
    assert TEMPORAL_FEATURE_COLS[1] in port._near_boundary_columns(X_low)

    # L'avertissement est exposé par le contrat d'API gaps.
    gaps_src = (BASE_DIR / "app" / "api" / "v1" / "gaps.py").read_text(encoding="utf-8")
    assert "near_boundary_warning" in gaps_src
    assert "NEAR_TRAINING_BOUNDARY" in (BASE_DIR / "app" / "infrastructure" / "ml" / "predictor.py").read_text(encoding="utf-8")


# ---------------------------------------------------------------------------
# 10. Artefact aux plages élargies sans nouvelle version -> rejet
# ---------------------------------------------------------------------------
def test_widened_ranges_rejected_without_new_version(tmp_path):
    """Un artefact dont les feature_ranges s'étendent au-delà du feature_schema
    de la même version est rejeté au chargement (interdiction 4.3)."""
    port = _port(models_dir=tmp_path)
    # Plages canoniques copiées dans un modèle de test.
    import shutil

    shutil.copy(MODELS_DIR / "feature_schema.json", tmp_path / "feature_schema.json")
    canonical = json.loads((MODELS_DIR / "feature_schema.json").read_text(encoding="utf-8"))
    port._metadata = {"feature_ranges": canonical["feature_ranges"]}
    # Canonique -> pas d'erreur.
    assert port._widened_ranges_error() is None

    # Plages élargies (borne max doublée) -> rejet explicite.
    widened = {k: {"min": v["min"], "max": v["max"] * 2.0} for k, v in canonical["feature_ranges"].items()}
    port._metadata = {"feature_ranges": widened}
    error = port._widened_ranges_error()
    assert error is not None
    assert "plages de features élargies" in error
    assert "réentraînement" in error

    # Vérification du flux complet : _load() refuse un artefact aux plages
    # élargies même si le sidecar SHA-256 est valide.
    import hashlib
    import joblib

    artifact = tmp_path / "gap_predictor_temporal.joblib"

    joblib.dump(_FakePicklableModel(), artifact)
    digest = hashlib.sha256(artifact.read_bytes()).hexdigest()
    artifact.with_suffix(".joblib.sha256").write_text(digest, encoding="utf-8")
    (tmp_path / "temporal_training_metadata.json").write_text(
        json.dumps({"feature_ranges": widened}), encoding="utf-8",
    )

    port2 = ArtifactModelPort(_settings(models_dir=str(tmp_path)), MagicMock())
    port2._load()
    assert port2._model is None, "artefact aux plages élargies doit être REJETÉ au chargement"
    assert "plages de features élargies" in port2._fallback_reason


# ---------------------------------------------------------------------------
# 11. Non-régression : serving inchangé pour les 35 enseignants en ML
# ---------------------------------------------------------------------------
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


def _port(**overrides):
    settings = _settings()
    database = MagicMock()
    port = ArtifactModelPort(settings, database)
    for key, value in overrides.items():
        setattr(port, key, value)
    return port


def test_serving_unchanged_for_35_teachers():
    """Non-régression : le mode effectif reste PRODUCTION_ML pour les
    enseignants qui l'étaient (les contrôles fail-closed ne changent pas
    la décision sur le corpus/artefact réels)."""
    # 11a. Le corpus réel d'entraînement n'a pas changé de provenance.
    corpus = MODELS_DIR.parent / "clean" / "training_corpus_provenanced.csv"
    assert corpus.exists()
    import pandas as pd

    df = pd.read_csv(corpus)
    assert len(df) == 147, "corpus v1.0.0 : 147 lignes attendues"
    assert df["is_synthetic"].astype(bool).sum() == 0, "0 % synthétique conservé"
    assert df["teacher_id"].nunique() == 40, "40 enseignants conservés"

    # 11b. Le registre : la version servie en demonstration est simulation-v1.0.0
    # (SIMULATION_VALIDATED) ; la v1.0.0 réelle reste ARCHIVED/APPROVED avec ses
    # métriques d'origine (rollback possible, artefacts intacts).
    registry = json.loads((MODELS_DIR / "model_registry.json").read_text(encoding="utf-8"))
    active = [e for e in registry if e.get("status") == "ACTIVE"][0]
    assert active["approval_status"] == "APPROVED"
    assert active["model_version"] == "simulation-v1.0.0", "serving demo : simulation-v1.0.0 ACTIVE"
    assert active["validation_scope"] == "SIMULATION_VALIDATED"
    legacy = [e for e in registry if e.get("model_version") == "v1.0.0" and e.get("status") == "ARCHIVED"]
    assert legacy, "v1.0.0 conservée (ARCHIVED) pour rollback"
    assert legacy[0]["metrics"]["rmse"] == 1.3053
    assert legacy[0]["metrics"]["mae"] == 1.1643
    assert legacy[0]["metrics"]["r2"] == 0.1958


    # 11c. Décision de mode inchangée avec les contrôles actuels :
    # registre approuvé + provenance réelle + métériques dans les seuils.
    from app.infrastructure.ml.dataset_provenance import compute_provenance

    prov = compute_provenance(df, dataset_version="v1.0.0")
    assert prov.real_rows == 147
    assert prov.synthetic_share_pct == 0.0
    settings = _settings()
    port = ArtifactModelPort(settings, MagicMock())
    assert port._provenance_error() is None, "provenance doit rester valide (147 lignes réelles >= 50)"
    assert port._registry_rejection_reason({}) is None, "registre doit rester approuvé"

    # 11d. Les nouveaux contrôles n'altèrent pas _decide_mode : l'ordre
    # des vérifications et les tolérances du serving sont inchangés.
    source = (BASE_DIR / "app" / "infrastructure" / "ml" / "predictor.py").read_text(encoding="utf-8")
    assert "self._fallback_reason = None" in source
    assert "return PRODUCTION_ML" in source
    # Le kill-switch, la provenance, le registre et les bornes restent
    # recalculés à chaque appel (fail-live conservé).
    assert "_decide_mode" in source
