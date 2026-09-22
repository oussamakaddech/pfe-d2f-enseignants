"""Tests de la règle IC95 (gouvernance) — audit d'autorité 2026-09-22, §2.6.

Constat corrigé : le projet s'était doté de la règle « aucune promotion sur un
avantage numérique non significatif », appliquée à la main — donc contournable.
Le Gradient Boosting `v1.2.0-gb` a ainsi été promu ACTIVE par
`override_decision` alors que sa propre mesure disait `significant: false`,
tandis qu'un gain comparable (XGBoost `v1.2.0`) avait été refusé.

Ces tests verrouillent :
1. le refus AUTOMATIQUE de promotion d'un modèle au gain non significatif ;
2. le fait que la volonté de l'opérateur est un PLAFOND (elle ne peut que
   baisser le mode, jamais l'élever) ;
3. l'honnêteté du contrat : `model_version` = null hors mode ML ;
4. la vérification du `dataset_hash` du corpus au chargement ;
5. l'état réel du registre après la décision de gouvernance.
"""
from __future__ import annotations

import json
from pathlib import Path
from unittest.mock import MagicMock

import numpy as np

from app.core.ml_status import DEMO_ML, HEURISTIC_FALLBACK, PRODUCTION_ML
from app.infrastructure.ml.dataset_provenance import DatasetProvenanceReport
from app.infrastructure.ml.model_registry import (
    APPROVAL_APPROVED,
    APPROVAL_PENDING,
    APPROVAL_REJECTED,
    STATUS_ACTIVE,
    STATUS_CANDIDATE,
    ModelRegistry,
    RegistryEntry,
)
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


def _metadata() -> dict:
    return {
        "model_name": "gap_predictor_temporal",
        "trained_at": "2026-09-17T00:00:00",
        "feature_cols": list(TEMPORAL_FEATURE_COLS),
        "feature_schema_version": FEATURE_SCHEMA_VERSION,
        "metrics": {"test_r2": 0.65, "test_rmse": 0.75, "test_mae": 0.47},
        "feature_ranges": {col: {"min": 0.0, "max": 5.0} for col in TEMPORAL_FEATURE_COLS},
        "data_sources": {"synthetic_share_pct": 0.0},
    }


def _provenance(hash_value: str = "abc") -> DatasetProvenanceReport:
    return DatasetProvenanceReport(
        total_rows=217,
        real_rows=217,
        synthetic_rows=0,
        synthetic_share_pct=0.0,
        real_share_pct=100.0,
        dataset_version="v1.1.0",
        dataset_hash=hash_value,
    )


def _entry(**overrides) -> RegistryEntry:
    entry = RegistryEntry(
        model_name="gap_predictor_temporal",
        model_version="v-test",
        status=STATUS_CANDIDATE,
        created_at="2026-09-22T00:00:00",
        dataset_version="v1.1.0",
        dataset_hash="abc",
        artifact_sha256="a" * 64,
        synthetic_share_pct=0.0,
        feature_names=list(TEMPORAL_FEATURE_COLS),
        feature_schema_version=FEATURE_SCHEMA_VERSION,
        metrics={"rmse": 1.21, "mae": 1.11, "r2": 0.25},
        approval_status=APPROVAL_PENDING,
    )
    for key, value in overrides.items():
        setattr(entry, key, value)
    return entry


# ---------------------------------------------------------------------------
# 1. Règle IC95 : refus automatique de promotion
# ---------------------------------------------------------------------------
def test_promotion_refused_when_lift_not_significant(tmp_path):
    registry = ModelRegistry(tmp_path / "reg.json", MODELS_DIR)
    registry.register(_entry(lift_significant_95=False, lift_rmse_ci95=[-0.1243, 0.1087]))
    error = registry.promotion_validation_error(registry.get("v-test"))
    assert error is not None and "non significatif" in error
    assert registry.approve("v-test") is None
    assert registry.get("v-test").status == STATUS_CANDIDATE
    assert registry.active() is None


def test_promotion_refused_when_ci_includes_zero(tmp_path):
    """Même sans le drapeau booléen : un IC95 contenant 0 suffit à refuser."""
    registry = ModelRegistry(tmp_path / "reg.json", MODELS_DIR)
    registry.register(_entry(lift_rmse_ci95=[-0.09, 0.13]))
    error = registry.promotion_validation_error(registry.get("v-test"))
    assert error is not None and "inclut 0" in error
    assert registry.approve("v-test") is None


def test_promotion_allowed_when_gain_significant(tmp_path):
    registry = ModelRegistry(tmp_path / "reg.json", MODELS_DIR)
    registry.register(_entry(lift_significant_95=True, lift_rmse_ci95=[0.10, 0.90]))
    assert registry.promotion_validation_error(registry.get("v-test")) is None
    promoted = registry.approve("v-test")
    assert promoted is not None and promoted.status == STATUS_ACTIVE
    assert promoted.approval_status == APPROVAL_APPROVED


def test_promotion_allowed_when_significance_not_declared(tmp_path):
    """Les entrées antérieures à la règle (aucun résultat déclaré) restent promouvables."""
    registry = ModelRegistry(tmp_path / "reg.json", MODELS_DIR)
    registry.register(_entry())
    assert registry.promotion_validation_error(registry.get("v-test")) is None


# ---------------------------------------------------------------------------
# 2. La volonté opérateur est un PLAFOND
# ---------------------------------------------------------------------------
def _approved_registry(path: Path) -> ModelRegistry:
    registry = ModelRegistry(path, MODELS_DIR)
    registry.register(_entry(lift_significant_95=True, lift_rmse_ci95=[0.10, 0.90]))
    assert registry.approve("v-test") is not None
    return registry


def _port_with(registry, serving_mode: str) -> ArtifactModelPort:
    port = ArtifactModelPort(_settings(ml_serving_mode=serving_mode), MagicMock())
    port._registry = registry
    port._model = _FakeModel([[1.0]])
    port._metadata = _metadata()
    port._load_attempted = True
    port._provenance_report = _provenance()
    return port


def test_operator_heuristic_ceiling_lowers_production_mode(tmp_path):
    registry = _approved_registry(tmp_path / "reg.json")
    port = _port_with(registry, "HEURISTIC")
    assert port._governed_mode() == PRODUCTION_ML
    assert port._effective_mode() == HEURISTIC_FALLBACK
    status = port.status()
    assert status["fallback_reason"] and "heuristique" in status["fallback_reason"]
    # Contrat honnête : aucun modèle n'a produit la réponse -> pas de version.
    assert status["model_version"] is None
    assert status["artifact_name"] is None


def test_operator_ceiling_cannot_lift_unapproved_model(tmp_path):
    """DEMO_ML demandé ne sert JAMAIS un modèle non approuvé en PRODUCTION_ML."""
    registry = ModelRegistry(tmp_path / "reg.json", MODELS_DIR)
    registry.register(_entry(approval_status=APPROVAL_PENDING))
    port = _port_with(registry, "DEMO_ML")
    assert port._effective_mode() == DEMO_ML


def test_unknown_operator_mode_falls_back_to_heuristic(tmp_path):
    """Mode operateur inconnu -> HEURISTIC_FALLBACK, raison explicite.

    Test hermetique : registre isole (tmp) dont le dataset_hash correspond a la
    provenance simulee — la raison testee est celle du mode inconnu, pas un
    conflit de provenance avec le registre reel (qui porte desormais un ACTIVE).
    """
    registry = _approved_registry(tmp_path / "reg.json")
    port = _port_with(registry, "TURBO")
    assert port._effective_mode() == HEURISTIC_FALLBACK
    assert "non reconnu" in port.status()["fallback_reason"]


# ---------------------------------------------------------------------------
# 3. Provenance : le hash du corpus est vérifié contre l'entrée ACTIVE
# ---------------------------------------------------------------------------
def test_dataset_hash_mismatch_triggers_fallback(tmp_path):
    registry = _approved_registry(tmp_path / "reg.json")
    port = _port_with(registry, "PRODUCTION_ML")
    # Le corpus chargé n'est PAS celui du modèle promu (hash "abc" au registre).
    port._provenance_report = _provenance(hash_value="ffffffff")
    error = port._provenance_error()
    assert error is not None and "hash du corpus" in error
    assert port._effective_mode() == HEURISTIC_FALLBACK


def test_dataset_hash_match_keeps_provenance_valid(tmp_path):
    registry = _approved_registry(tmp_path / "reg.json")
    port = _port_with(registry, "PRODUCTION_ML")
    port._provenance_report = _provenance(hash_value="abc")
    assert port._provenance_error() is None
    assert port._effective_mode() == PRODUCTION_ML


# ---------------------------------------------------------------------------
# 4. État réel du registre après la décision de gouvernance (2026-09-22)
# ---------------------------------------------------------------------------
def test_registry_state_after_governance_decision():
    """Etat du registre : ACTIVE sous override declare (decision projet 2026-09-22)."""
    registry = json.loads((MODELS_DIR / "model_registry.json").read_text(encoding="utf-8"))
    active = [e for e in registry if e.get("status") == STATUS_ACTIVE]
    for entry in active:
        if entry.get("lift_significant_95") is False:
            assert entry.get("override_decision") is True, (
                "une entree ACTIVE non significative doit porter un override declare"
            )
    gb = [e for e in registry if e.get("model_version") == "v1.2.0-gb"][0]
    assert gb["status"] == STATUS_ACTIVE and gb["approval_status"] == APPROVAL_APPROVED
    assert gb["lift_significant_95"] is False
    assert gb["lift_rmse_ci95"] == [-0.1243, 0.1087]
    assert gb["override_decision"] is True
    assert gb["override_actor"] and gb["override_date"] and gb["override_justification"]
    assert "OVERRIDE DECLARE" in gb["notes"]
    risk = [e for e in registry if e.get("model_version") == "risk-simulation-v1.0.0"][0]
    assert risk["approval_status"] == APPROVAL_REJECTED, (
        "une entree dont les notes declarent decision=reject ne peut pas rester APPROVED"
    )

def test_real_gb_entry_blocked_without_override(tmp_path):
    """Sans override declare, la vraie entree GB reste impromouvable (regle 2.6)."""
    source = json.loads((MODELS_DIR / "model_registry.json").read_text(encoding="utf-8"))
    gb = [e for e in source if e.get("model_version") == "v1.2.0-gb"][0]
    stripped = {**gb, "status": STATUS_CANDIDATE, "approval_status": APPROVAL_PENDING,
                "override_decision": False, "override_actor": None,
                "override_date": None, "override_justification": None}
    registry = ModelRegistry(tmp_path / "reg.json", MODELS_DIR)
    registry.register(RegistryEntry.from_dict(stripped))
    registry.approve("v1.2.0-gb")
    assert registry.active() is None, "la promotion doit etre refusee (gain non significatif)"
    assert registry.get("v1.2.0-gb").approval_status == APPROVAL_REJECTED




def test_real_gb_entry_promotable_with_declared_override(tmp_path):
    """Avec override declare (acteur + justification), la promotion passe ? tracee."""
    source = json.loads((MODELS_DIR / "model_registry.json").read_text(encoding="utf-8"))
    gb = [e for e in source if e.get("model_version") == "v1.2.0-gb"][0]
    stripped = {**gb, "status": STATUS_CANDIDATE, "approval_status": APPROVAL_PENDING,
                "override_decision": False, "override_actor": None,
                "override_date": None, "override_justification": None}
    registry = ModelRegistry(tmp_path / "reg.json", MODELS_DIR)
    registry.register(RegistryEntry.from_dict(stripped))
    declared = registry.declare_override("v1.2.0-gb", "test:actor", "justification de test")
    assert declared is not None and declared.override_decision is True
    promoted = registry.approve("v1.2.0-gb", actor="test:actor")
    assert promoted is not None and promoted.status == STATUS_ACTIVE
    entry = registry.get("v1.2.0-gb")
    assert entry.approval_status == APPROVAL_APPROVED
    assert entry.lift_significant_95 is False, "la mesure honnete est conservee"
    assert entry.override_actor == "test:actor" and entry.override_date




def test_enforce_script_respects_declared_override():
    """L'enforce 2.6 ne retrograde jamais une entree ACTIVE portant un override declare."""
    from pipelines.enforce_governance_ic95 import apply_governance

    entries = [{
        "model_version": "v1.2.0-gb", "status": STATUS_ACTIVE,
        "approval_status": APPROVAL_APPROVED, "lift_significant_95": False,
        "lift_rmse_ci95": [-0.1243, 0.1087], "override_decision": True,
        "override_actor": "decision-projet:2026-09-22",
        "override_date": "2026-09-22T00:00:00Z", "notes": "",
    }]
    updated, actions = apply_governance(entries)
    assert updated[0]["status"] == STATUS_ACTIVE
    assert any("maintien ACTIVE" in a for a in actions)
    entries[0]["override_decision"] = False
    updated2, actions2 = apply_governance(entries)
    assert updated2[0]["status"] == STATUS_CANDIDATE
    assert any("ACTIVE -> CANDIDATE" in a for a in actions2)
