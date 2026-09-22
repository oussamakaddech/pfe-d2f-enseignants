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
    """Dérive KS détectée au serving => None + raison fail-closed explicite.

    La référence compte 20 lignes : avec la correction de Holm, le seuil de
    rejet est le risque de FAMILLE (0,01 réparti sur 29 features), une
    référence de 2 lignes ne pouvait plus produire de p-value assez petite
    pour un rejet honnête, quelle que soit l'ampleur de la dérive.
    """
    port = _port()
    port._model = _FakeModel([0.5])
    port._metadata = _metadata()
    guard = SkewGuard(
        feature_names=TEMPORAL_FEATURE_COLS, min_window=10, p_threshold=0.01
    )
    guard.set_reference_from_matrix(np.full((20, len(TEMPORAL_FEATURE_COLS)), 2.0))
    # Dix enseignants DISTINCTS servis : la fenêtre est indexée par enseignant
    # (correctif C), dix appels pour le même n'auraient donné qu'une observation.
    for i in range(10):
        guard.record_serving(_matrix(5.0), key=f"ENS{i}")
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
    for i in range(5):
        guard.record_serving(window, key=f"ENS{i}")
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



# ---------------------------------------------------------------------------
# 3. Correctifs statistiques : unité d'observation + tests multiples
# ---------------------------------------------------------------------------
def _clustered_blocks(n_teachers: int, rng: np.random.Generator, shift: float = 0.0):
    """Blocs de serving réalistes : 15 features globales constantes par enseignant.

    Reproduit la structure du corpus servi — un appel de prédiction couvre
    toutes les compétences d'UN enseignant, et les features agrégées
    (``avg_level``, ``taux_assiduite``, ``engagement_score``…) ne varient pas
    à l'intérieur de ce bloc.
    """
    blocks = []
    n_features = len(TEMPORAL_FEATURE_COLS)
    for _ in range(n_teachers):
        valeur_globale = rng.uniform(1.0, 5.0)
        rows = rng.uniform(1.0, 5.0, size=(5, n_features))
        rows[:, :15] = valeur_globale
        blocks.append(rows + shift)
    return blocks


def test_skew_guard_block_unit_avoids_false_positive_on_clustered_serving():
    """Serving groupé par enseignant, AUCUNE dérive => aucune alerte.

    Régression : le test KS ligne à ligne comptait les features globales
    autant de fois qu'il y a de compétences dans le bloc (pseudo-réplication)
    et déclenchait sur des données pourtant tirées de la population de
    référence — 47 % d'alertes mesurées sur le corpus servi, ce qui avait
    imposé la désactivation du garde-fou en production.
    """
    rng = np.random.default_rng(0)
    reference_blocks = _clustered_blocks(40, rng)
    reference = np.vstack(reference_blocks)
    labels = np.repeat(np.arange(40), 5)
    fenetre = _clustered_blocks(10, rng)  # même population, aucune dérive

    guard = SkewGuard(TEMPORAL_FEATURE_COLS, min_window=10, p_threshold=0.01)
    assert guard.set_reference_from_matrix(reference, groups=labels) == 40
    for bloc in fenetre:
        guard.record_serving(bloc)

    verdict = guard.evaluate()
    assert verdict.checked is True
    assert verdict.skew_detected is False, verdict.features
    assert verdict.observation_unit == "block"
    assert verdict.window_units == 10  # 10 enseignants
    assert verdict.window_rows == 50   # 50 lignes brutes derrière


def test_skew_guard_row_unit_reproduces_the_false_positive():
    """Témoin : les mêmes données SANS groupage déclenchent à tort.

    Verrouille la cause racine — si ce test cesse d'échouer à détecter une
    fausse dérive, c'est que le mode ligne a changé de sémantique.
    """
    rng = np.random.default_rng(0)
    reference = np.vstack(_clustered_blocks(40, rng))
    fenetre = _clustered_blocks(10, rng)

    guard = SkewGuard(TEMPORAL_FEATURE_COLS, min_window=10, p_threshold=0.01)
    guard.set_reference_from_matrix(reference)  # pas de groupes => mode ligne
    for bloc in fenetre:
        guard.record_serving(bloc)

    verdict = guard.evaluate()
    assert verdict.observation_unit == "row"
    assert verdict.skew_detected is True  # fausse alerte, structurelle


def test_skew_guard_block_unit_still_detects_real_drift():
    """Le correctif ne coûte pas la détection : dérive réelle => fail-closed."""
    rng = np.random.default_rng(0)
    reference = np.vstack(_clustered_blocks(40, rng))
    labels = np.repeat(np.arange(40), 5)

    guard = SkewGuard(TEMPORAL_FEATURE_COLS, min_window=10, p_threshold=0.01)
    guard.set_reference_from_matrix(reference, groups=labels)
    for bloc in _clustered_blocks(10, np.random.default_rng(3), shift=2.5):
        guard.record_serving(bloc)

    verdict = guard.evaluate()
    assert verdict.skew_detected is True
    assert verdict.min_p_value is not None and verdict.min_p_value < 0.01
    assert "Holm" in (verdict.reason or "")


def test_holm_correction_rejects_isolated_marginal_p_value():
    """Une p-value marginale isolée ne suffit plus à bloquer le serving.

    29 features testées à 0,01 donnent ~25 % d'erreur de famille : le seuil
    est désormais un risque de famille, traité par Holm.
    """
    guard = SkewGuard(TEMPORAL_FEATURE_COLS, p_threshold=0.01)
    p_values = {col: 0.9 for col in TEMPORAL_FEATURE_COLS}
    p_values[TEMPORAL_FEATURE_COLS[0]] = 0.005  # < 0,01 brut, > 0,01/29 corrigé
    assert guard._holm_rejections(p_values) == []

    p_values[TEMPORAL_FEATURE_COLS[0]] = 1e-6   # évidence réelle
    assert guard._holm_rejections(p_values) == [TEMPORAL_FEATURE_COLS[0]]


def test_skew_guard_status_documents_the_statistical_contract():
    """/model-health expose l'unité d'observation et la correction appliquée."""
    guard = SkewGuard(TEMPORAL_FEATURE_COLS, p_threshold=0.01)
    reference = np.vstack(_clustered_blocks(12, np.random.default_rng(1)))
    guard.set_reference_from_matrix(reference, groups=np.repeat(np.arange(12), 5))
    status = guard.status()
    assert status["multiple_testing_correction"] == "holm"
    assert status["p_threshold_semantics"] == "family_wise_alpha"
    assert status["observation_unit"] == "block"
    assert status["reference_units"] == 12
    assert status["reference_rows"] == 60


def test_model_health_expose_les_features_inertes():
    """Une feature à plage dégénérée ne transporte aucune information.

    Elle est normalisée à 0 au serving : l'exposer évite de laisser croire
    que les 29 entrées du schéma pèsent toutes dans la prédiction.
    """
    port = _port()
    metadata = _metadata()
    metadata["feature_ranges"]["nb_besoins_exprimes"] = {"min": 0.0, "max": 0.0}
    port._metadata = metadata
    payload = port.model_health()
    assert payload["inert_features"] == ["nb_besoins_exprimes"]


# ---------------------------------------------------------------------------
# 4. Une observation par enseignant distinct (correctif C)
# ---------------------------------------------------------------------------
def test_window_keyed_par_enseignant_ignore_les_consultations_repetees():
    """Rafraîchir la fiche d'un enseignant ne remplit pas la fenêtre de copies.

    Régression observée en production : la page d'un enseignant consultée en
    boucle plaçait 30 blocs identiques dans la fenêtre, qui devenait une masse
    ponctuelle face à une référence multi-enseignants — dérive détectée avec
    p = 0 sur des données pourtant issues du corpus d'entraînement, et tout le
    serving basculait en heuristique.
    """
    rng = np.random.default_rng(0)
    reference = np.vstack(_clustered_blocks(40, rng))
    labels = np.repeat(np.arange(40), 5)
    fenetre = _clustered_blocks(3, rng)  # seulement 3 enseignants distincts

    guard = SkewGuard(TEMPORAL_FEATURE_COLS, min_window=10, p_threshold=0.01)
    guard.set_reference_from_matrix(reference, groups=labels)
    for _ in range(10):  # 30 appels, 3 enseignants
        for i, bloc in enumerate(fenetre):
            guard.record_serving(bloc, key=f"ENS{i}")

    verdict = guard.evaluate()
    assert verdict.window_units == 3, "une observation par enseignant, pas par appel"
    assert verdict.checked is False  # 3 < min_window : aucune conclusion
    assert verdict.skew_detected is False
    assert "insuffisante" in (verdict.reason or "")
    assert guard.status()["window_keyed_by_unit"] is True


def test_window_keyed_conserve_la_detection_sur_assez_d_enseignants():
    """Avec assez d'enseignants distincts, une dérive réelle est toujours vue."""
    rng = np.random.default_rng(0)
    reference = np.vstack(_clustered_blocks(40, rng))
    labels = np.repeat(np.arange(40), 5)

    guard = SkewGuard(TEMPORAL_FEATURE_COLS, min_window=10, p_threshold=0.01)
    guard.set_reference_from_matrix(reference, groups=labels)
    for i, bloc in enumerate(_clustered_blocks(15, rng, shift=2.5)):
        guard.record_serving(bloc, key=f"ENS{i}")

    verdict = guard.evaluate()
    assert verdict.window_units == 15
    assert verdict.skew_detected is True


def test_window_keyed_garde_la_derniere_observation():
    """Un nouvel appel pour le même enseignant remplace la précédente valeur."""
    guard = SkewGuard(TEMPORAL_FEATURE_COLS, min_window=1, p_threshold=0.01)
    guard.set_reference_from_matrix(
        np.vstack(_clustered_blocks(12, np.random.default_rng(1))),
        groups=np.repeat(np.arange(12), 5),
    )
    n = len(TEMPORAL_FEATURE_COLS)
    guard.record_serving(np.full((2, n), 1.0), key="ENS1")
    guard.record_serving(np.full((2, n), 4.0), key="ENS1")
    fenetre = guard._window_matrix()
    assert fenetre is not None and fenetre.shape[0] == 1
    assert fenetre[0][0] == pytest.approx(4.0)  # la plus récente


def test_window_sans_cle_conserve_le_comportement_historique():
    """Sans clé, la fenêtre reste indexée par appel (compatibilité)."""
    guard = SkewGuard(TEMPORAL_FEATURE_COLS, min_window=2, p_threshold=0.01)
    guard.set_reference_from_matrix(np.zeros((20, len(TEMPORAL_FEATURE_COLS))))
    for _ in range(3):
        guard.record_serving(np.zeros((1, len(TEMPORAL_FEATURE_COLS))))
    assert guard.status()["window_keyed_by_unit"] is False
    assert guard.status()["window_units"] == 3
