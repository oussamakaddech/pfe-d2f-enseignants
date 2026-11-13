"""Non-régression de l'audit 2026-09-23 : cohérence de la metadata des modèles.

Quatre constats, quatre familles de tests :
- normalisation (``feature_ranges``) et domaine de validation
  (``validation_ranges``) sont deux rôles distincts au serving ;
- la metadata livrée normalise comme l'entraînement (le rollback v1.1.0
  retombe sur sa RMSE enregistrée) et accepte tout son corpus ;
- ``decision`` suit la règle unique appliquée à son propre lift ;
- le compteur d'observations futures compte des re-mesures, pas des lignes.
"""
from __future__ import annotations

import json
import shutil
from pathlib import Path
from unittest.mock import MagicMock

import joblib
import numpy as np
import pandas as pd
import pytest

from app.core.ml_status import PRODUCTION_ML
from app.infrastructure.ml.model_registry import ModelRegistry
from app.infrastructure.ml.predictor import TEMPORAL_FEATURE_COLS, ArtifactModelPort
from pipelines.baselines import decision_from_lift, served_under_override
from pipelines.train_gap_model import count_real_future_observations, feature_ranges_of

BASE_DIR = Path(__file__).resolve().parents[2]
MODELS_DIR = BASE_DIR / "data" / "models"
CORPUS = BASE_DIR / "data" / "clean" / "training_corpus_provenanced.csv"

# Corpus d'entraînement de chaque modèle livré : v1.3.1-xgb (servi), v1.3.0-xgb
# et v1.3.0-gb (archivés, cibles de rollback) sur le corpus corrigé (ré-extrait
# après V16). Les artefacts v1.2.0-gb et v1.1.0 (corpus 217 lignes) ont été
# supprimés le 2026-10-02 : leurs entrées restent au registre comme historique.

# (version au registre, artefact, metadata, feature_schema versionné, corpus)
MODELES_LIVRES = [
    ("v1.3.1-xgb", "gap_predictor_temporal.joblib", "temporal_training_metadata.json",
     "feature_schema_v130.json", CORPUS),
    ("v1.3.0-xgb", "gap_predictor_temporal_v130-xgb.joblib", "temporal_training_metadata_v130-xgb.json",
     "feature_schema_v130-xgb.json", CORPUS),
    ("v1.3.0-gb", "gap_predictor_temporal_v130-gb.joblib", "temporal_training_metadata_v130-gb.json",
     "feature_schema_v130-gb.json", CORPUS),
]


def _port(models_dir: Path = MODELS_DIR) -> ArtifactModelPort:
    settings = MagicMock()
    settings.models_dir = str(models_dir)
    settings.ml_artifact_path = "gap_predictor_temporal.joblib"
    settings.ml_metadata_path = "temporal_training_metadata.json"
    settings.ml_registry_path = "model_registry.json"
    settings.ml_serving_mode = PRODUCTION_ML
    settings.ml_enabled = True
    return ArtifactModelPort(settings, MagicMock())


def _plages(mini: float, maxi: float) -> dict:
    return {col: {"min": mini, "max": maxi} for col in TEMPORAL_FEATURE_COLS}


# ---------------------------------------------------------------- serving
def test_validation_uses_validation_ranges_not_normalization_ranges():
    """Une valeur hors du train (tolérance comprise) mais dans le corpus est acceptée."""
    port = _port()
    port._metadata = {"feature_ranges": _plages(0.0, 1.0), "validation_ranges": _plages(0.0, 10.0)}
    X = np.full((1, len(TEMPORAL_FEATURE_COLS)), 5.0)  # 5 > 1 + max(0.5, 0.2)
    assert port._serving_vector_error(X, "ENS_TEST") is None


def test_validation_falls_back_to_feature_ranges_without_validation_ranges():
    """Metadata antérieure (sans validation_ranges) : comportement historique conservé."""
    port = _port()
    port._metadata = {"feature_ranges": _plages(0.0, 1.0)}
    X = np.full((1, len(TEMPORAL_FEATURE_COLS)), 5.0)
    error = port._serving_vector_error(X, "ENS_TEST")
    assert error is not None and "hors plage" in error


def test_normalization_ignores_validation_ranges():
    """La normalisation reste celle du train, quelle que soit la plage de validation."""
    X = np.full((1, len(TEMPORAL_FEATURE_COLS)), 0.5)
    xn = ArtifactModelPort._normalize(X, _plages(0.0, 1.0))
    assert np.allclose(xn, 0.5)  # et non 0.05, qu'aurait donné [0, 10]


def test_widened_validation_ranges_rejected_against_versioned_schema(tmp_path):
    """Élargir validation_ranges sans le versionner au schéma est refusé (garde 4.3)."""
    schema = {"feature_ranges": _plages(0.0, 1.0), "validation_ranges": _plages(0.0, 2.0)}
    (tmp_path / "feature_schema.json").write_text(json.dumps(schema), encoding="utf-8")
    port = _port(tmp_path)

    port._metadata = {"feature_ranges": _plages(0.0, 1.0), "validation_ranges": _plages(0.0, 2.0)}
    assert port._widened_ranges_error() is None

    port._metadata = {"feature_ranges": _plages(0.0, 1.0), "validation_ranges": _plages(0.0, 9.0)}
    error = port._widened_ranges_error()
    assert error is not None and "domaine de validation" in error

    port._metadata = {"feature_ranges": _plages(0.0, 1.0)}  # retirée en silence
    assert port._widened_ranges_error() is not None


def test_schema_without_validation_ranges_keeps_historical_behaviour(tmp_path):
    """Schéma et metadata historiques (une seule plage) : aucune nouvelle erreur."""
    shutil.copy(MODELS_DIR / "feature_schema.json", tmp_path / "feature_schema.json")
    canonique = json.loads((MODELS_DIR / "feature_schema.json").read_text(encoding="utf-8"))
    port = _port(tmp_path)
    port._metadata = {"feature_ranges": canonique["feature_ranges"]}
    assert port._widened_ranges_error() is None


# ------------------------------------------------------------ règles pures
def test_decision_rule():
    assert decision_from_lift(0.2, True, 43) == "accept"
    assert decision_from_lift(0.007, False, 43) == "reject"  # cas v1.2.0-gb
    assert decision_from_lift(-0.01, False, 43) == "reject"
    assert decision_from_lift(0.2, True, 19) == "reject"
    assert decision_from_lift(None, None, 43) == "reject"


def test_served_under_override_only_for_declared_override():
    entree = MagicMock(override_decision=True, model_version="vX", status="ACTIVE",
                       override_actor="decision-projet", override_date="2026-09-22",
                       override_justification="exception tracée")
    assert served_under_override("reject", entree)["override_actor"] == "decision-projet"
    assert served_under_override("accept", entree) is None
    assert served_under_override("reject", MagicMock(override_decision=False)) is None


def test_real_future_observations_count_remeasures_not_rows():
    frame = pd.DataFrame({
        "target_observation_date": [None, "", "2026-01-15", "2026-02-10", "2026-02-20"],
        "is_extrapolated": [True, True, False, False, True],
    })
    # 2026-02-20 est daté mais extrapolé : il ne compte pas.
    assert count_real_future_observations(frame) == (2, 2)
    assert count_real_future_observations(pd.DataFrame({"x": [1, 2]})) == (0, 0)


# ------------------------------------------------- metadata livrée (données)
def _corpus(path) -> pd.DataFrame:
    return pd.read_csv(path).reset_index(drop=True)


@pytest.fixture(scope="module")
def corpus() -> pd.DataFrame:
    """Corpus du modèle servi."""
    return _corpus(CORPUS)


@pytest.mark.parametrize("version,artefact,metadata,schema,corpus_path", MODELES_LIVRES)
def test_shipped_metadata_ranges_roles(version, artefact, metadata, schema, corpus_path):
    corpus = _corpus(corpus_path)
    meta = json.loads((MODELS_DIR / metadata).read_text(encoding="utf-8"))
    train = corpus.iloc[: int(meta["n_train"])]
    assert meta["feature_ranges"] == feature_ranges_of(train), "normalisation = train"
    assert meta["validation_ranges"] == feature_ranges_of(corpus), "domaine = corpus complet"
    reference = json.loads((MODELS_DIR / schema).read_text(encoding="utf-8"))
    assert reference["feature_ranges"] == meta["feature_ranges"]
    assert reference["validation_ranges"] == meta["validation_ranges"]


@pytest.mark.parametrize("version,artefact,metadata,schema,corpus_path", MODELES_LIVRES)
def test_shipped_metadata_reproduces_registered_rmse(version, artefact, metadata, schema, corpus_path):
    """Servi avec SA metadata, chaque artefact retombe sur la RMSE du registre."""
    corpus = _corpus(corpus_path)
    meta = json.loads((MODELS_DIR / metadata).read_text(encoding="utf-8"))
    entree = ModelRegistry(MODELS_DIR / "model_registry.json", MODELS_DIR).get(version)
    test = corpus.iloc[int(meta["n_train"]):]
    X = test[TEMPORAL_FEATURE_COLS].to_numpy(dtype=float)
    pred = np.clip(joblib.load(MODELS_DIR / artefact).predict(
        ArtifactModelPort._normalize(X, meta["feature_ranges"])), 0.0, 5.0)
    rmse = float(np.sqrt(np.mean((test["gap_next_3m"].to_numpy(dtype=float) - pred) ** 2)))
    assert rmse == pytest.approx(entree.metrics["rmse"], abs=5e-4)


@pytest.mark.parametrize("version,artefact,metadata,schema,corpus_path", MODELES_LIVRES)
def test_shipped_metadata_decision_and_counters_are_coherent(version, artefact, metadata, schema, corpus_path):
    corpus = _corpus(corpus_path)
    meta = json.loads((MODELS_DIR / metadata).read_text(encoding="utf-8"))
    m = meta["metrics"]
    assert meta["decision"] == decision_from_lift(m["lift_rmse"], m["lift_significant_95"], meta["n_test"])
    observations, mois = count_real_future_observations(corpus)
    assert meta["real_future_observation_count"] == observations
    entree = ModelRegistry(MODELS_DIR / "model_registry.json", MODELS_DIR).get(version)
    assert entree.real_future_observation_count == observations
    assert entree.distinct_observation_months == mois
    # Un modèle « reject » servi ACTIVE porte la trace de son override.
    if entree.status == "ACTIVE" and meta["decision"] != "accept":
        assert entree.override_decision
        assert meta["served_under_override"]["override_actor"] == entree.override_actor


def test_served_domain_accepts_whole_corpus(corpus):
    """Aucune ligne du corpus du modèle servi n'est rejetée par son propre domaine."""
    port = _port()
    port._metadata = json.loads((MODELS_DIR / "temporal_training_metadata.json").read_text(encoding="utf-8"))
    X = corpus[TEMPORAL_FEATURE_COLS].to_numpy(dtype=float)
    rejets = [i for i in range(len(X)) if port._serving_vector_error(X[i:i + 1], "corpus")]
    assert rejets == []


def test_served_target_is_labelled_as_coverage_gap_not_mastery():
    """Le niveau N1-N5 décrit le savoir (docs/KNOWLEDGE_DIFFICULTY_LEVEL_POLICY.md) :
    l'écart prédit doit être présenté comme un écart de couverture, jamais comme
    une mesure de la maîtrise de l'enseignant."""
    from app.infrastructure.ml.predictor import TARGET_MEANING

    assert "couverture" in TARGET_MEANING
    assert "pas une mesure de la maîtrise" in TARGET_MEANING
    assert _port().model_health()["target_meaning"] == TARGET_MEANING
