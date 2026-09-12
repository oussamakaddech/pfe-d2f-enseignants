"""Couvre les helpers refactorés du port ML : construction de features,
normalisation, prediction de gaps et pertinence ML (avec DB scriptée)."""
from datetime import date, datetime
from pathlib import Path
from unittest.mock import MagicMock

import numpy as np
import pytest

from app.domain.value_objects.enums import Severity
from app.infrastructure.ml.predictor import (
    TEMPORAL_FEATURE_COLS,
    ArtifactModelPort,
)

MODELS_DIR = Path(__file__).parent.parent.parent / "data" / "models"

BUNDLE = {
    "savoirs": [
        {"competence_id": 1, "niveau": "N1_DEBUTANT", "date_acquisition": "2024-01-10", "required_level": 3},
        {"competence_id": 1, "niveau": "N2_ELEMENTAIRE", "date_acquisition": "2024-06-01", "required_level": 3},
        {"competence_id": 1, "niveau": "N3_INTERMEDIAIRE", "date_acquisition": "2025-01-15", "required_level": 3},
        {"competence_id": 2, "niveau": "N4_AVANCE", "date_acquisition": "2024-03-05", "required_level": 4},
        {"competence_id": None, "niveau": "N1_DEBUTANT", "date_acquisition": "2024-01-10", "required_level": 2},
    ],
    "completed": [
        {"etat": "APPROVED", "date_fin": date(2026, 1, 1)},
        {"etat": "APPROVED", "date_fin": date(2026, 2, 1)},
    ],
    "in_progress": [{"etat": "EN_COURS", "date_fin": None}],
    "eval": {"avg_score": 4.0, "nb": 3},
    "needs": {"nb": 2, "nb_approuves": 1},
    "attendance": 0.8,
    "days_since_last": 30.0,
    "months_since_last": 1.0,
    "avg_days_between": 30.0,
}


class _FakeModel:
    def __init__(self, predictions):
        self._predictions = np.asarray(predictions, dtype=float)
        self.n_features_in_ = len(TEMPORAL_FEATURE_COLS)

    def predict(self, X):
        return self._predictions[: X.shape[0]]


class _Mappings:
    def __init__(self, rows):
        self._rows = rows

    def all(self):
        return self._rows

    def first(self):
        return self._rows[0] if self._rows else None


class _Result:
    def __init__(self, rows=None, scalar=None):
        self._rows = rows if rows is not None else []
        self._scalar = scalar

    def mappings(self):
        return _Mappings(self._rows)

    def scalar(self):
        return self._scalar

    def scalar_one_or_none(self):
        return self._scalar


class _ScriptedConn:
    def __init__(self, script):
        self._script = script

    def execute(self, stmt, params=None):
        return self._script.pop(0)


class _ScriptedDb:
    def __init__(self, script):
        self._conn = _ScriptedConn(script)

    def _cm(self):
        from contextlib import contextmanager

        @contextmanager
        def cm():
            yield self._conn

        return cm()

    def read_connection(self):
        return self._cm()

    def session(self):
        return self._cm()


def _port(**overrides) -> ArtifactModelPort:
    settings = MagicMock()
    settings.models_dir = str(MODELS_DIR)
    settings.seuil_gap_critique = 0.75
    settings.seuil_gap_haute = 0.5
    settings.seuil_gap_moyenne = 0.25
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
    port = ArtifactModelPort(settings, database=MagicMock())
    for key, value in overrides.items():
        setattr(port, key, value)
    return port


# ---------------------------------------------------------- Helpers purs
def test_group_savoirs_skips_null_competence_id():
    port = _port()
    grouped = port._group_savoirs(BUNDLE)
    assert sorted(grouped.keys()) == [1, 2]
    assert len(grouped[1]) == 3
    assert len(grouped[2]) == 1


def test_global_features_computes_aggregates():
    port = _port()
    gf = port._global_features(BUNDLE)
    assert gf["nb_completed"] == 2.0
    assert gf["nb_in_prog"] == 1.0
    assert gf["taux"] == 0.8
    assert gf["avg_eval"] == 4.0
    assert gf["nb_eval"] == 3.0
    assert gf["nb_needs"] == 2.0
    assert gf["nb_needs_ok"] == 1.0
    assert gf["days_since"] == 30.0
    assert gf["is_long_absent"] == 0.0
    assert gf["is_stagnant"] == 0.0
    assert gf["freq_month"] > 0.0
    assert gf["engagement"] > 0.0


def test_global_features_long_absence_flags():
    port = _port()
    bundle = dict(BUNDLE, days_since_last=200.0)
    gf = port._global_features(bundle)
    assert gf["is_long_absent"] == 1.0


def test_competence_feature_row_pads_history():
    port = _port()
    row = port._competence_feature_row(
        savs=BUNDLE["savoirs"][:3], max_savoirs=3, nb_competences=2, globals_f=port._global_features(BUNDLE)
    )
    assert len(row) == len(TEMPORAL_FEATURE_COLS)
    # hist padde [1,1,2,3] -> t3=1, t2=1, t1=2, t=3
    assert row[0] == 1.0 and row[1] == 1.0 and row[2] == 2.0 and row[3] == 3.0
    assert row[4] == 0.0  # lag32
    assert row[5] == 1.0  # lag21
    assert row[6] == 1.0  # lag1t
    assert abs(row[7] - (3.0 - 1.0) / 3.0) < 1e-9  # rolling


def test_build_feature_matrix_shape_and_ids():
    port = _port()
    X, comp_ids, required = port._build_feature_matrix(BUNDLE)
    assert X.shape == (2, len(TEMPORAL_FEATURE_COLS))
    assert comp_ids == [1, 2]
    assert list(required) == [3.0, 4.0]


def test_build_feature_matrix_empty_without_savoirs():
    port = _port()
    X, comp_ids, required = port._build_feature_matrix({"savoirs": []})
    assert X.shape == (0, len(TEMPORAL_FEATURE_COLS))
    assert comp_ids == []
    assert required.size == 0


def test_normalize_applies_ranges_and_zeroes_unknown():
    port = _port()
    X = np.zeros((2, len(TEMPORAL_FEATURE_COLS)))
    X[0, 0], X[1, 0] = 0.0, 5.0
    X[:, 1] = 5.0  # range [0,1] -> 1.0
    X[:, 2] = 3.0  # range [2,2] -> max <= min -> 0.0
    ranges = {
        TEMPORAL_FEATURE_COLS[0]: {"min": 0.0, "max": 5.0},
        TEMPORAL_FEATURE_COLS[1]: {"min": 0.0, "max": 1.0},
        TEMPORAL_FEATURE_COLS[2]: {"min": 2.0, "max": 2.0},
    }
    xn = port._normalize(X, ranges)
    assert xn[0, 0] == 0.0 and xn[1, 0] == 1.0
    assert xn[0, 1] == 1.0
    assert xn[0, 2] == 0.0


def test_predict_gaps_returns_empty_without_savoirs():
    port = _port()
    port._teacher_feature_bundle = lambda tid: {"savoirs": []}
    assert port._predict_gaps("T001") == []


def test_predict_gaps_uses_model_and_names():
    names_script = [
        _Result(rows=[
            {"id": 1, "code": "C1", "nom": "Pedagogie"},
            {"id": 2, "code": "C2", "nom": "Numerique"},
        ])
    ]
    port = _port(
        _database=_ScriptedDb(names_script),
        _model=_FakeModel([[1.0], [1.0]]),
        # data_sources.synthetic_share_pct <= tolérance (50%) : chemin ML actif
        _metadata={"feature_ranges": {}, "data_sources": {"synthetic_share_pct": 0.0}},
    )
    port._teacher_feature_bundle = lambda tid: BUNDLE

    gaps = port._predict_gaps("T001")
    assert len(gaps) == 2
    first = gaps[0]
    assert first.competence_id == 1
    assert first.competence_code == "C1"
    assert first.competence_nom == "Pedagogie"
    assert first.observed_result == 3.0
    assert first.knowledge_difficulty_level == 3.0
    # La prédiction ML (1.0) est RÉELLEMENT utilisée (corrigé par audit) :
    # effective_gap = max(0, 1.0) -> score = 1.0/4 = 0.25 -> MEDIUM,
    # trend WORSENING car la prédiction dépasse le gap structurel de 0.5.
    assert first.gap_score == 0.25
    assert first.severity == Severity.MEDIUM
    assert first.as_of == date.today()


def test_predict_gaps_falls_back_when_corpus_synthetic():
    """Politique fail-closed : sans data_sources déclarée (ou part synthétique
    > 50%), _predict_gaps retourne None -> l'appelant utilise l'heuristique."""
    port = _port(
        _database=_ScriptedDb([]),
        _model=_FakeModel([[1.0]]),
        _metadata={"feature_ranges": {}},
    )
    port._teacher_feature_bundle = lambda tid: BUNDLE
    assert port._predict_gaps("T001") is None

    port = _port(
        _database=_ScriptedDb([]),
        _model=_FakeModel([[1.0]]),
        _metadata={"feature_ranges": {}, "data_sources": {"synthetic_share_pct": 100.0}},
    )
    port._teacher_feature_bundle = lambda tid: BUNDLE
    assert port._predict_gaps("T001") is None


def test_formation_age_default_when_no_date():
    port = _port()
    assert port._formation_age(None) == 365.0
    assert port._formation_age({"date_fin": None}) == 365.0


def test_formation_age_from_date_and_datetime():
    port = _port()
    from_d = port._formation_age({"date_fin": date(2026, 1, 1)})
    assert 100.0 < from_d < 400.0
    from_dt = port._formation_age({"date_fin": datetime(2026, 1, 1, 10, 30)})
    assert from_dt == pytest.approx(from_d, abs=2.0)


# ------------------------------------------------------- Pertinence ML
def _relevance_db_script():
    return [
        _Result(rows=[
            {"savoir_id": 101, "niveau": "N3_INTERMEDIAIRE"},
            {"savoir_id": 102, "niveau": "N2_ELEMENTAIRE"},
        ]),
        _Result(rows=[{"savoir_id": 101, "niveau": "N3_INTERMEDIAIRE"}]),
        _Result(rows=[{"n": 4.5, "nb": 2}]),
        _Result(rows=[{"date_fin": date(2026, 1, 1)}]),
        _Result(scalar=date(2025, 1, 1)),
    ]


def test_relevance_features_builds_vector():
    port = _port(_database=_ScriptedDb(_relevance_db_script()))
    X = port._relevance_features("T001", 100, 0.5)
    assert X.shape == (1, 13)
    assert X[0, 0] == 0.5  # content_match_heuristic
    assert X[0, 1] == 1.0  # nb_couverts (101 couvert, 102 non)
    assert X[0, 2] == 2.0  # nb_cibles
    assert X[0, 3] == 0.5  # coverage
    assert X[0, 7] == 3.0  # avg_teacher
    assert X[0, 10] == 4.5  # avg eval
    assert X[0, 12] == 1.0


def test_score_relevance_none_when_unavailable():
    port = _port(_relevance_load_attempted=True, _relevance_model=None)
    assert port.score_relevance("T001", 100, 0.5) is None


def test_score_relevance_returns_clipped_model_score():
    port = _port(_database=_ScriptedDb(_relevance_db_script()),
                  _relevance_load_attempted=True,
                  _relevance_model=_FakeModel([[1.4]]))
    assert port.score_relevance("T001", 100, 0.5) == 1.0
