"""Couvre les chemins restants du port ML : API publique, chargement des
artefacts (gap/risk/relevance), drift passif, extraction brute de bundle,
toutes les branches de sévérité/trend de _predict_gaps, le classifier de
risque ML (bonus probas + règle métier critical_gaps_rule) et les helpers
_safe_eval/_safe_needs/_stagnation_months."""
import json
from datetime import date, datetime

import numpy as np
import pytest

from app.infrastructure.ml import predictor as predictor_mod
from app.infrastructure.ml.artifact_integrity import ArtifactIntegrityError
from app.infrastructure.ml.predictor import (
    _safe_eval,
    _safe_needs,
    ArtifactModelPort,
)
from app.domain.value_objects.enums import RiskLevel, Severity, Trend
from tests.unit.test_ml_predictor_core import (
    BUNDLE,
    _FakeModel,
    _port,
    _Result,
    _ScriptedDb,
)


def _port_ml(**overrides) -> ArtifactModelPort:
    """Port avec gap predictor 'disponible' (metadata à part synthétique nulle)."""
    from app.infrastructure.ml.dataset_provenance import DatasetProvenanceReport

    defaults = {
        "_metadata": {"feature_ranges": {}, "data_sources": {"synthetic_share_pct": 0.0}},
        "_load_attempted": True,
        "_provenance_report": DatasetProvenanceReport(
            total_rows=100, real_rows=100, synthetic_rows=0,
            synthetic_share_pct=0.0, real_share_pct=100.0,
            dataset_version="v1.0.0", dataset_hash="abc",
        ),
    }
    defaults.update(overrides)
    return _port(**defaults)


def _ml_port_with_gaps(_model, bundle=BUNDLE, db_script=None) -> ArtifactModelPort:
    port = _port_ml(
        _database=_ScriptedDb(db_script if db_script is not None else [_Result(rows=[])]),
        _model=_model,
    )
    port._teacher_feature_bundle = lambda tid: bundle
    return port


FIVE_COMP_BUNDLE = dict(
    BUNDLE,
    savoirs=[
        {"competence_id": 1, "niveau": "N1_DEBUTANT", "date_acquisition": "2024-01-10", "required_level": 3},
        {"competence_id": 2, "niveau": "N2_ELEMENTAIRE", "date_acquisition": "2024-02-10", "required_level": 3},
        {"competence_id": 3, "niveau": "N3_INTERMEDIAIRE", "date_acquisition": "2024-03-10", "required_level": 3},
        {"competence_id": 4, "niveau": "N4_AVANCE", "date_acquisition": "2024-04-10", "required_level": 3},
        {"competence_id": 5, "niveau": "N2_ELEMENTAIRE", "date_acquisition": "2024-05-10", "required_level": 4},
    ],
)


class _FakeRiskModel:
    def __init__(self, proba, classes):
        self._proba = np.asarray(proba, dtype=float)
        self.classes_ = np.asarray(classes)

    def predict_proba(self, X):
        return np.tile(self._proba, (X.shape[0], 1))


# ---------------------------------------------------------- API publique
def test_predict_gaps_public_api_uses_ml_path():
    port = _ml_port_with_gaps(_FakeModel([[1.0], [1.0]]))
    gaps = port.predict_gaps("T001")
    assert gaps is not None
    assert len(gaps) == 2


def test_predict_gaps_public_api_returns_empty_when_no_savoirs():
    """Le modèle est actif (PRODUCTION_ML) mais sans savoirs pour T001,
    predict_gaps retourne [] (pas de gaps à prédire)."""
    port = _port()
    port._teacher_feature_bundle = lambda tid: {"savoirs": []}
    assert port.predict_gaps("T001") == []


def test_predict_risk_public_api_returns_low_when_no_gaps():
    """Le modèle est actif (PRODUCTION_ML) mais sans savoirs pour T001,
    predict_risk retourne un profil LOW (règle métier)."""
    port = _port()
    port._teacher_feature_bundle = lambda tid: {"savoirs": []}
    profile = port.predict_risk("T001")
    assert profile is not None
    assert profile.risk_level == RiskLevel.LOW
    assert profile.risk_score == 0.0


def test_predict_risk_public_api_rule_fallback():
    port = _ml_port_with_gaps(_FakeModel([[3.5], [2.0], [1.0], [0.1], [1.0]]), bundle=FIVE_COMP_BUNDLE)
    profile = port.predict_risk("T001")
    assert profile is not None
    # Normalisé : 1 critique -> min(1, 1/2)=0.5 ; 2 hautes -> min(1, 2/1)=1.0 ;
    # avg 0.43 -> 0.5*0.50 + 1.0*0.12 + 0.43*0.40 = 0.542 -> 54.2
    assert profile.risk_level == RiskLevel.HIGH
    assert profile.risk_score == 54.2
    assert profile.is_capped is False
    assert profile.uncapped_score == 0.542


def test_predict_risk_fallback_low_when_no_gaps():
    port = _port_ml(_database=_ScriptedDb([]), _model=_FakeModel([[1.0]]))
    port._teacher_feature_bundle = lambda tid: {"savoirs": []}
    profile = port.predict_risk("T001")
    assert profile.risk_score == 0.0
    assert profile.risk_level == RiskLevel.LOW
    assert profile.factors == ()


def test_predict_risk_fallback_critical_level():
    bundle = dict(
        BUNDLE,
        savoirs=[
            {"competence_id": 1, "niveau": "N1_DEBUTANT", "date_acquisition": "2024-01-10", "required_level": 3},
            {"competence_id": 2, "niveau": "N2_ELEMENTAIRE", "date_acquisition": "2024-02-10", "required_level": 3},
            {"competence_id": 3, "niveau": "N3_INTERMEDIAIRE", "date_acquisition": "2024-03-10", "required_level": 3},
        ],
    )
    port = _ml_port_with_gaps(_FakeModel([[3.5], [3.5], [3.5]]), bundle=bundle)
    profile = port.predict_risk("T001")
    assert profile.risk_level == RiskLevel.CRITICAL
    # Normalisé : 3 critiques -> cap 2 -> 1.0*0.50 ; avg 0.875 -> 0.35 -> 0.85 au total
    assert profile.risk_score == 85.0
    assert profile.is_capped is False


def test_predict_risk_fallback_medium_level():
    bundle = dict(
        BUNDLE,
        savoirs=[
            {"competence_id": 1, "niveau": "N1_DEBUTANT", "date_acquisition": "2024-01-10", "required_level": 3},
            {"competence_id": 2, "niveau": "N2_ELEMENTAIRE", "date_acquisition": "2024-02-10", "required_level": 3},
            {"competence_id": 3, "niveau": "N3_INTERMEDIAIRE", "date_acquisition": "2024-03-10", "required_level": 3},
            {"competence_id": 4, "niveau": "N4_AVANCE", "date_acquisition": "2024-04-10", "required_level": 3},
        ],
    )
    port = _ml_port_with_gaps(_FakeModel([[3.5], [0.5], [0.5], [0.5]]), bundle=bundle)
    profile = port.predict_risk("T001")
    assert profile.risk_level == RiskLevel.MEDIUM
    assert profile.risk_score == 38.75


def test_predict_risk_fallback_low_level():
    bundle = dict(
        BUNDLE,
        savoirs=[
            {"competence_id": 1, "niveau": "N3_INTERMEDIAIRE", "date_acquisition": "2024-01-10", "required_level": 3},
            {"competence_id": 2, "niveau": "N4_AVANCE", "date_acquisition": "2024-02-10", "required_level": 3},
            {"competence_id": 3, "niveau": "N3_INTERMEDIAIRE", "date_acquisition": "2024-03-10", "required_level": 3},
            {"competence_id": 4, "niveau": "N4_AVANCE", "date_acquisition": "2024-04-10", "required_level": 3},
        ],
    )
    port = _ml_port_with_gaps(_FakeModel([[0.1], [0.1], [0.1], [0.1]]), bundle=bundle)
    profile = port.predict_risk("T001")
    assert profile.risk_level == RiskLevel.LOW


# ------------------------------------------------------------ Statut ML
def test_status_reports_active_when_model_loaded():
    """Le modèle est réellement actif (PRODUCTION_ML) : le port charge
    l'artefact réel depuis data/models."""
    port = _port()
    status = port.status()
    assert status["available"] is True
    assert status["model_mode"] == "PRODUCTION_ML"
    assert status["kill_switch"] is False
    assert status["risk_model"]["available"] is False
    assert status["relevance_model"]["available"] is False
    assert status["provenance"]["synthetic_share_pct"] == 0.0
    assert status["provenance"]["dataset_version"] == "v1.0.0"
    # Version = celle de l'entrée ACTIVE du registre réel (évolue à chaque
    # réentraînement/promotion — ne pas coder en dur).
    active_entry = port._registry.active()
    assert status["model_version"] == (active_entry.model_version if active_entry else None)
    assert status["prediction_horizon"] == "3m"


def test_status_reports_drift_when_metadata():
    port = _port(
        _metadata={"trained_at": "2020-01-01T00:00:00", "model_name": "gbm"},
        _load_attempted=True,
    )
    status = port.status()
    assert status["version"] == "2020-01-01T00:00:00"
    assert status["model_name"] == "gbm"
    assert status["drift_check"]["drift_detected"] is True


def test_risk_status_with_metadata():
    port = _port()
    port._risk_load_attempted = True
    port._risk_model = "riskmodel"
    port._risk_metadata = {
        "trained_at": "2026-01-01T00:00:00",
        "n_teachers": 45,
        "metrics": {"macro_f1": 0.7, "f1_per_class": {"LOW": 0.8, "CRITICAL": 0.0}},
    }
    status = port.risk_status()
    assert status["available"] is True
    assert status["version"] == "2026-01-01T00:00:00"
    assert status["macro_f1_cv"] == 0.7
    assert status["f1_per_class"]["CRITICAL"] == 0.0
    assert status["mode"] == "ML"


def test_available_kill_switch_and_cache():
    port = _port()
    port._ml_enabled = False
    assert port.available() is False
    assert port.risk_available() is False
    assert port.relevance_available() is False


def test_available_skips_reload_when_attempted():
    port = _ml_port_with_gaps(_FakeModel([[1.0], [1.0]]))
    assert port.available() is True
    assert port.available() is True  # second appel : _load_attempted -> pas de re-load


def test_risk_available_after_attempt_cache():
    port = _port()
    assert port.risk_available() is False
    assert port.risk_available() is False  # _risk_load_attempted -> pas de re-load


# ------------------------------------------------------------ Drift passif
def test_artifact_drift_check_flags_synthetic_and_stale():
    port = _port()
    flagged = port._artifact_drift_check({
        "data_sources": {"synthetic_share_pct": 80.0},
        "trained_at": "2020-01-01T00:00:00",
    })
    assert flagged["drift_detected"] is True
    assert any("synth" in r for r in flagged["reasons"])
    assert any("age" in r or "âgé" in r or "jours" in r for r in flagged["reasons"])


def test_artifact_drift_check_unreadable_date():
    port = _port()
    check = port._artifact_drift_check({"trained_at": "pas-une-date"})
    assert any("illisible" in r for r in check["reasons"])


def test_artifact_drift_check_clean():
    port = _port()
    check = port._artifact_drift_check({
        "data_sources": {"synthetic_share_pct": 10.0},
        "trained_at": datetime.now().isoformat(),
    })
    assert check["drift_detected"] is False
    assert check["reasons"] == []


def test_artifact_drift_check_no_trained_at():
    port = _port()
    check = port._artifact_drift_check({"data_sources": {"synthetic_share_pct": 10.0}})
    assert check["drift_detected"] is False


# -------------------------------------------------- Chargement gap predictor
def test_load_gap_model_success(monkeypatch, tmp_path):
    artifact = tmp_path / "gap_predictor_temporal.joblib"
    artifact.write_bytes(b"fake")
    meta = tmp_path / "temporal_training_metadata.json"
    meta.write_text(json.dumps({"trained_at": "2026-01-01T00:00:00"}), encoding="utf-8")
    monkeypatch.setattr(predictor_mod, "load_with_integrity_check", lambda p: "gapmodel")
    port = _port()
    port._gap_model_enabled = True
    port._artifact_path = artifact
    port._metadata_path = meta
    assert port.available() is True
    assert port._metadata == {"trained_at": "2026-01-01T00:00:00"}


def test_load_gap_model_missing_artifact(tmp_path):
    port = _port()
    port._gap_model_enabled = True
    port._artifact_path = tmp_path / "missing.joblib"
    assert port.available() is False
    assert port._model is None


def test_load_gap_model_without_metadata_file(monkeypatch, tmp_path):
    artifact = tmp_path / "gap.joblib"
    artifact.write_bytes(b"fake")
    monkeypatch.setattr(predictor_mod, "load_with_integrity_check", lambda p: "gapmodel")
    port = _port()
    port._gap_model_enabled = True
    port._artifact_path = artifact
    port._metadata_path = tmp_path / "missing.json"
    assert port.available() is True
    assert port._metadata == {}


def test_load_gap_model_integrity_error(monkeypatch, tmp_path):
    artifact = tmp_path / "gap.joblib"
    artifact.write_bytes(b"fake")
    monkeypatch.setattr(
        predictor_mod,
        "load_with_integrity_check",
        lambda p: (_ for _ in ()).throw(ArtifactIntegrityError("mismatch")),
    )
    port = _port()
    port._gap_model_enabled = True
    port._artifact_path = artifact
    assert port.available() is False
    assert port._model is None


# ---------------------------------------------- Extraction brute du bundle
def test_teacher_feature_bundle_queries_db():
    script = [
        _Result(rows=[
            {"savoir_id": 101, "niveau": "N1_DEBUTANT", "date_acquisition": date(2024, 1, 10),
             "competence_id": 1, "required_level": 3},
            {"savoir_id": 102, "niveau": "N3_INTERMEDIAIRE", "date_acquisition": date(2026, 1, 10),
             "competence_id": 2, "required_level": 4},
        ]),
        _Result(rows=[
            {"formation_id": 10, "etat": "APPROVED", "date_demande": date(2025, 6, 1),
             "date_fin": date(2025, 7, 1), "savoir_ids": [101]},
            {"formation_id": 11, "etat": "APPROVED", "date_demande": date(2025, 9, 1),
             "date_fin": date(2025, 10, 1), "savoir_ids": [102]},
            {"formation_id": 12, "etat": "EN_COURS", "date_demande": date(2026, 1, 1),
             "date_fin": None, "savoir_ids": []},
        ]),
        _Result(rows=[{"avg_score": 4.0, "nb": 3}]),
        _Result(rows=[{"nb": 2, "nb_approuves": 1}]),
        _Result(rows=[{"rate": 0.8}]),
    ]
    port = _port(_database=_ScriptedDb(script))
    bundle = port._teacher_feature_bundle("T001")
    assert len(bundle["savoirs"]) == 2
    assert len(bundle["completed"]) == 2
    assert len(bundle["in_progress"]) == 3
    assert bundle["attendance"] == 0.8
    assert bundle["days_since_last"] > 0
    assert bundle["months_since_last"] > 0
    assert bundle["avg_days_between"] == pytest.approx(92.0)


def test_teacher_feature_bundle_attendance_null():
    script = [
        _Result(rows=[]),
        _Result(rows=[]),
        _Result(rows=[{"avg_score": None, "nb": 0}]),
        _Result(rows=[{"nb": 0, "nb_approuves": 0}]),
        _Result(rows=[{"rate": None}]),
    ]
    port = _port(_database=_ScriptedDb(script))
    bundle = port._teacher_feature_bundle("T001")
    assert bundle["attendance"] == 0.0
    assert bundle["days_since_last"] == 365
    assert bundle["avg_days_between"] == 0.0


def test_safe_level_int_variants():
    port = _port()
    assert port._safe_level_int(None) == 0
    assert port._safe_level_int(2) == 2
    assert port._safe_level_int(3.7) == 3
    assert port._safe_level_int("N3_INTERMEDIAIRE") == 3
    assert port._safe_level_int("INCONNU") == 0


# ------------------------------------------- _predict_gaps : branches complètes
def test_predict_gaps_all_severities_and_trends():
    """5 compétences couvrent les 4 sévérités + les 3 trends + fallback de noms."""
    port = _ml_port_with_gaps(
        _FakeModel([[3.5], [2.0], [1.0], [0.1], [1.0]]),
        bundle=FIVE_COMP_BUNDLE,
    )
    gaps = port._predict_gaps("T001")
    assert [g.severity for g in gaps] == [
        Severity.CRITICAL, Severity.HIGH, Severity.MEDIUM, Severity.LOW, Severity.HIGH,
    ]
    assert [g.trend for g in gaps] == [Trend.WORSENING, Trend.WORSENING, Trend.WORSENING,
                                       Trend.DECLARED_ML, Trend.IMPROVING]
    assert [g.competence_code for g in gaps] == ["C1", "C2", "C3", "C4", "C5"]
    assert gaps[0].competence_nom == "Competence 1"


# ------------------------------------------------------- Risk ML dédié
def test_predict_risk_scoped_to_department_drops_out_of_scope_gaps():
    """Régression audit (ENS014) : le risque doit être calculé sur les gaps DU
    PÉRIMÈTRE (Département Génie Civil = compétences 10/11/12) et non sur les
    prédictions ML de compétences hors périmètre (1..5).

    Les prédictions ML couvrent les compétences 1..5 (hors périmètre) ->
    filtrées à vide -> retombe sur le snapshot persisté (compétences 10/11/12,
    3 gaps critiques) -> facteur brut = 3, jamais 5.
    """
    script = [
        # _predict_gaps : noms des compétences couvertes (hors périmètre)
        _Result(rows=[
            {"id": 1, "code": "DEV.BACK", "nom": "Développement Backend"},
            {"id": 2, "code": "DEV.FRONT", "nom": "Développement Frontend"},
            {"id": 3, "code": "DEV.QA", "nom": "Qualité & Tests"},
            {"id": 4, "code": "RES.SEC", "nom": "Sécurité Applicative"},
            {"id": 5, "code": "RES.INFRA", "nom": "Infrastructure & Cloud"},
        ]),
        # _scoped_competence_ids : enseignant rattaché (DEPT_GC)
        _Result(rows=[{"up_id": "UP_GC", "dept_id": "DEPT_GC", "specialite": None}]),
        # _scoped_competence_ids : 3 compétences du périmètre GC
        _Result(rows=[{"id": 10}, {"id": 11}, {"id": 12}]),
        # _teacher_scope_info : infos du scope (département)
        _Result(rows=[{"up_id": "UP_GC", "dept_id": "DEPT_GC", "specialite": None,
                       "up_libelle": "Génie Civil", "dept_libelle": "Génie Civil",
                       "prenom": "Wafa", "nom": "BenYoussef"}]),
        # _persisted_gaps : MAX(computed_at) du snapshot
        _Result(scalar="2026-08-19T04:59:51.787114"),
        # _persisted_gaps : snapshot scopé (3 gaps critiques GC)
        _Result(rows=[
            {"competence_id": 10, "gap_score": 1.0, "niveau_urgence": "CRITIQUE"},
            {"competence_id": 11, "gap_score": 1.0, "niveau_urgence": "CRITIQUE"},
            {"competence_id": 12, "gap_score": 1.0, "niveau_urgence": "CRITIQUE"},
        ]),
    ]
    bundle = dict(
        BUNDLE,
        savoirs=[
            {"competence_id": 1, "niveau": "N1_DEBUTANT", "date_acquisition": "2024-01-10", "required_level": 3},
            {"competence_id": 2, "niveau": "N2_ELEMENTAIRE", "date_acquisition": "2024-02-10", "required_level": 3},
            {"competence_id": 3, "niveau": "N3_INTERMEDIAIRE", "date_acquisition": "2024-03-10", "required_level": 3},
            {"competence_id": 4, "niveau": "N4_AVANCE", "date_acquisition": "2024-04-10", "required_level": 3},
            {"competence_id": 5, "niveau": "N2_ELEMENTAIRE", "date_acquisition": "2024-05-10", "required_level": 4},
        ],
    )
    port = _ml_port_with_gaps(_FakeModel([[3.5], [3.5], [3.5], [3.5], [3.5]]), bundle=bundle, db_script=script)
    profile = port._predict_risk("ENS014")
    by_code = {f.feature: f for f in profile.factors}
    assert by_code["critical_gaps"].value == 3.0  # JAMAIS 5 (gaps hors périmètre)
    assert by_code["critical_gaps"].scope == "DEPARTMENT"
    assert by_code["critical_gaps"].label == "Gaps critiques"
    assert by_code["critical_gaps"].scope_type == "DEPARTMENT"
    assert by_code["critical_gaps"].scope_id == "DEPT_GC"
    assert by_code["critical_gaps"].scope_label == "Département Génie Civil"
    assert by_code["high_gaps"].label == "Gaps de haute urgence"
    assert profile.risk_score == 90.0  # 3/2->1.0*0.50 + 0 + 1.0*0.40
    assert profile.risk_level is RiskLevel.CRITICAL


def test_predict_risk_teacher_scope_when_no_affiliation():
    """Enseignant sans rattachement : périmètre TEACHER, facteurs non scopés,
    les prédictions ML de toutes ses compétences sont comptées."""
    script = [
        # _predict_gaps : noms des compétences couvertes
        _Result(rows=[
            {"id": 1, "code": "C1", "nom": "Pedagogie"},
            {"id": 2, "code": "C2", "nom": "Numerique"},
            {"id": 3, "code": "C3", "nom": "Conception"},
            {"id": 4, "code": "C4", "nom": "Evaluation"},
        ]),
        # _scoped_competence_ids : aucun rattachement
        _Result(rows=[{"up_id": None, "dept_id": None, "specialite": None}]),
        # _teacher_scope_info : enseignant sans rattachement -> TEACHER
        _Result(rows=[{"up_id": None, "dept_id": None, "specialite": None,
                       "up_libelle": None, "dept_libelle": None,
                       "prenom": "Karim", "nom": "Bougherara"}]),
    ]
    bundle = dict(
        BUNDLE,
        savoirs=[
            {"competence_id": 1, "niveau": "N1_DEBUTANT", "date_acquisition": "2024-01-10", "required_level": 3},
            {"competence_id": 2, "niveau": "N2_ELEMENTAIRE", "date_acquisition": "2024-02-10", "required_level": 3},
            {"competence_id": 3, "niveau": "N3_INTERMEDIAIRE", "date_acquisition": "2024-03-10", "required_level": 3},
            {"competence_id": 4, "niveau": "N4_AVANCE", "date_acquisition": "2024-04-10", "required_level": 3},
        ],
    )
    port = _ml_port_with_gaps(_FakeModel([[3.5], [3.5], [3.5], [3.5]]), bundle=bundle, db_script=script)
    profile = port._predict_risk("T099")
    by_code = {f.feature: f for f in profile.factors}
    assert by_code["critical_gaps"].value == 4.0
    assert by_code["critical_gaps"].scope == "TEACHER"
    assert by_code["critical_gaps"].label == "Gaps critiques"
    assert by_code["critical_gaps"].scope_type == "TEACHER"
    assert by_code["critical_gaps"].scope_id == "T099"
    assert by_code["critical_gaps"].scope_label == "Karim Bougherara"
    assert profile.risk_level is RiskLevel.CRITICAL


def test_predict_risk_department_scope_keeps_scoped_predictions():
    """Enseignant rattaché avec prédictions ML DANS son périmètre : les gaps
    hors périmètre sont retirés, ceux du périmètre sont comptés."""
    script = [
        # _predict_gaps : noms (compétence 3 hors périmètre incluse)
        _Result(rows=[
            {"id": 1, "code": "DEV.BACK", "nom": "Développement Backend"},
            {"id": 2, "code": "DEV.FRONT", "nom": "Développement Frontend"},
            {"id": 3, "code": "AI.ML", "nom": "Machine Learning"},
        ]),
        # _scoped_competence_ids : enseignant rattaché (DEP_GL)
        _Result(rows=[{"up_id": "UP_GL", "dept_id": "DEPT_GL", "specialite": None}]),
        # _scoped_competence_ids : compétences 1 et 2 du périmètre
        _Result(rows=[{"id": 1}, {"id": 2}]),
        # _teacher_scope_info : infos du scope (département)
        _Result(rows=[{"up_id": "UP_GL", "dept_id": "DEPT_GL", "specialite": None,
                       "up_libelle": "Génie Logiciel", "dept_libelle": "Génie Logiciel",
                       "prenom": "Test", "nom": "Enseignant"}]),
    ]
    bundle = dict(
        BUNDLE,
        savoirs=[
            {"competence_id": 1, "niveau": "N1_DEBUTANT", "date_acquisition": "2024-01-10", "required_level": 3},
            {"competence_id": 2, "niveau": "N2_ELEMENTAIRE", "date_acquisition": "2024-02-10", "required_level": 3},
            {"competence_id": 3, "niveau": "N3_INTERMEDIAIRE", "date_acquisition": "2024-03-10", "required_level": 3},
        ],
    )
    port = _ml_port_with_gaps(_FakeModel([[3.5], [3.5], [1.0]]), bundle=bundle, db_script=script)
    profile = port._predict_risk("T007")
    by_code = {f.feature: f for f in profile.factors}
    # 2 critiques scopées (la 3e compétence, hors périmètre, est exclue)
    assert by_code["critical_gaps"].value == 2.0
    assert by_code["critical_gaps"].scope == "DEPARTMENT"
    assert by_code["critical_gaps"].scope_type == "DEPARTMENT"
    assert by_code["critical_gaps"].scope_id == "DEPT_GL"
    assert by_code["critical_gaps"].scope_label == "Département Génie Logiciel"
    # avg sur les 2 gaps scopés : (0.875 + 0.875) / 2 = 0.875
    assert by_code["avg_gap_score"].value == pytest.approx(0.875, abs=1e-3)
    assert profile.risk_score == pytest.approx(85.0)  # 1.0*0.50 + 0 + 0.875*0.40


def test_predict_risk_ml_bonus_critical_proba():
    port = _port_ml(
        _database=_ScriptedDb([
            _Result(rows=[]),
            _Result(rows=[{"up_id": None, "dept_id": None, "specialite": None,
                           "up_libelle": None, "dept_libelle": None,
                           "prenom": "Test", "nom": "Enseignant"}]),
        ]),
        _model=_FakeModel([[3.5], [2.0], [1.0], [0.1], [1.0]]),
        _risk_model=_FakeRiskModel([0.3, 0.7], ["CRITICAL", "LOW"]),
    )
    port._teacher_feature_bundle = lambda tid: FIVE_COMP_BUNDLE
    profile = port._predict_risk("T001")
    # expected = 0.3*87.5 + 0.7*10 = 33.25 ; bonus CRITICAL 15 + 1 gap critique * 7
    assert profile.risk_score == 55.25
    assert profile.risk_level == RiskLevel.LOW  # argmax -> LOW
    features = {f.feature for f in profile.factors}
    assert "CRITICAL_proba" in features
    assert "n_critical_gaps" in features
    assert "stagnation_months" in features


def test_predict_risk_ml_critical_rule_override():
    """>= 3 gaps critiques => CRITICAL garanti (règle métier traçable)."""
    port = _port_ml(
        _database=_ScriptedDb([
            _Result(rows=[]),
            _Result(rows=[{"up_id": None, "dept_id": None, "specialite": None,
                           "up_libelle": None, "dept_libelle": None,
                           "prenom": "Test", "nom": "Enseignant"}]),
        ]),
        _model=_FakeModel([[3.5], [3.5], [3.5], [0.1], [0.1]]),
        _risk_model=_FakeRiskModel([0.3, 0.7], ["CRITICAL", "LOW"]),
    )
    port._teacher_feature_bundle = lambda tid: FIVE_COMP_BUNDLE
    profile = port._predict_risk("T001")
    assert profile.risk_level == RiskLevel.CRITICAL
    assert profile.risk_score == 75.0
    assert any(f.feature == "critical_gaps_rule" for f in profile.factors)


def test_predict_risk_ml_high_bonus():
    port = _port_ml(
        _database=_ScriptedDb([
            _Result(rows=[]),
            _Result(rows=[{"up_id": None, "dept_id": None, "specialite": None,
                           "up_libelle": None, "dept_libelle": None,
                           "prenom": "Test", "nom": "Enseignant"}]),
        ]),
        _model=_FakeModel([[3.5], [2.0], [1.0], [0.1], [1.0]]),
        _risk_model=_FakeRiskModel([0.5, 0.5], ["LOW", "HIGH"]),
    )
    port._teacher_feature_bundle = lambda tid: FIVE_COMP_BUNDLE
    profile = port._predict_risk("T001")
    # expected = 0.5*10 + 0.5*62.5 = 36.25 ; bonus HIGH 8 + 1 gap critique * 7
    assert profile.risk_score == 51.25
    assert profile.risk_level == RiskLevel.LOW


def test_predict_risk_ml_unknown_label_maps_medium():
    port = _port_ml(
        _database=_ScriptedDb([
            _Result(rows=[]),
            _Result(rows=[{"up_id": None, "dept_id": None, "specialite": None,
                           "up_libelle": None, "dept_libelle": None,
                           "prenom": "Test", "nom": "Enseignant"}]),
        ]),
        _model=_FakeModel([[0.1], [0.1], [0.1], [0.1], [0.1]]),
        _risk_model=_FakeRiskModel([1.0], ["INCONNU"]),
    )
    port._teacher_feature_bundle = lambda tid: FIVE_COMP_BUNDLE
    profile = port._predict_risk("T001")
    assert profile.risk_level == RiskLevel.MEDIUM


def test_stagnation_months_edges():
    port = _port()
    assert port._stagnation_months({"savoirs": []}) == 18.0
    assert port._stagnation_months({"savoirs": [{"date_acquisition": None}]}) == 18.0
    from_date = port._stagnation_months({"savoirs": [{"date_acquisition": date(2026, 1, 1)}]})
    assert from_date > 0.0
    from_dt = port._stagnation_months({"savoirs": [{"date_acquisition": datetime(2026, 1, 1, 10, 30)}]})
    assert from_dt == pytest.approx(from_date, abs=2.0)


# ------------------------------------------------------- Risk model loading
def test_load_risk_model_success(monkeypatch, tmp_path):
    artifact = tmp_path / "risk_classifier.joblib"
    artifact.write_bytes(b"fake")
    meta = tmp_path / "risk_training_metadata.json"
    meta.write_text(json.dumps({"trained_at": "2026-01-01T00:00:00"}), encoding="utf-8")
    monkeypatch.setattr(predictor_mod, "load_with_integrity_check", lambda p: "riskmodel")
    port = _port()
    port._risk_artifact_path = artifact
    port._risk_metadata_path = meta
    assert port.risk_available() is True
    assert port._risk_model == "riskmodel"
    assert port._risk_metadata == {"trained_at": "2026-01-01T00:00:00"}


def test_load_risk_model_without_metadata_file(monkeypatch, tmp_path):
    artifact = tmp_path / "risk_classifier.joblib"
    artifact.write_bytes(b"fake")
    monkeypatch.setattr(predictor_mod, "load_with_integrity_check", lambda p: "riskmodel")
    port = _port()
    port._risk_artifact_path = artifact
    port._risk_metadata_path = tmp_path / "missing.json"
    assert port.risk_available() is True
    assert port._risk_metadata == {}


def test_load_risk_model_integrity_error(monkeypatch, tmp_path):
    artifact = tmp_path / "risk_classifier.joblib"
    artifact.write_bytes(b"fake")
    monkeypatch.setattr(
        predictor_mod,
        "load_with_integrity_check",
        lambda p: (_ for _ in ()).throw(ArtifactIntegrityError("mismatch")),
    )
    port = _port()
    port._risk_artifact_path = artifact
    assert port.risk_available() is False
    assert port._risk_model is None


def test_load_relevance_model_success(monkeypatch, tmp_path):
    artifact = tmp_path / "relevance_model.joblib"
    artifact.write_bytes(b"fake")
    meta = tmp_path / "relevance_training_metadata.json"
    meta.write_text(json.dumps({"trained_at": "2026-01-01T00:00:00"}), encoding="utf-8")
    monkeypatch.setattr(predictor_mod, "load_with_integrity_check", lambda p: "relevance")
    port = _port()
    port.relevance_artifact_path = artifact
    port.relevance_metadata_path = meta
    assert port.relevance_available() is True
    assert port._relevance_model == "relevance"
    assert port._relevance_metadata == {"trained_at": "2026-01-01T00:00:00"}


def test_load_relevance_model_without_metadata(monkeypatch, tmp_path):
    artifact = tmp_path / "relevance_model.joblib"
    artifact.write_bytes(b"fake")
    monkeypatch.setattr(predictor_mod, "load_with_integrity_check", lambda p: "relevance")
    port = _port()
    port.relevance_artifact_path = artifact
    port.relevance_metadata_path = tmp_path / "missing.json"
    assert port.relevance_available() is True
    assert port._relevance_metadata is None


def test_load_relevance_model_integrity_error(monkeypatch, tmp_path):
    artifact = tmp_path / "relevance_model.joblib"
    artifact.write_bytes(b"fake")
    monkeypatch.setattr(
        predictor_mod,
        "load_with_integrity_check",
        lambda p: (_ for _ in ()).throw(ArtifactIntegrityError("mismatch")),
    )
    port = _port()
    port.relevance_artifact_path = artifact
    assert port.relevance_available() is False
    assert port.score_relevance("T001", 100, 0.5) is None


def test_relevance_unavailable_when_artifact_missing():
    port = _port()
    assert port.relevance_available() is False
    assert port.score_relevance("T001", 100, 0.5) is None


# ------------------------------------------------------- Helpers module
def test_safe_eval_and_needs_edges():
    assert _safe_eval(None) == (0.0, 0)
    assert _safe_eval({"avg_score": None, "nb": 2}) == (0.0, 2)
    assert _safe_eval({"avg_score": 4.2, "nb": 0}) == (4.2, 0)
    assert _safe_needs(None) == (0, 0)
    assert _safe_needs({"nb": None, "nb_approuves": 1}) == (0, 1)
