from datetime import datetime, timedelta, date
from types import SimpleNamespace
from unittest.mock import MagicMock

from app.engines import gap_engine, feature_engine


def test_classify_urgence():
    assert gap_engine._classify_urgence(0.8) == "CRITIQUE"
    assert gap_engine._classify_urgence(0.6) == "HAUTE"
    assert gap_engine._classify_urgence(0.3) == "MODEREE"
    assert gap_engine._classify_urgence(0.1) == "FAIBLE"


def _make_mock_last(computed_days_ago: int, niveau_actuel: int = 2):
    dt = datetime.now() - timedelta(days=computed_days_ago)
    return SimpleNamespace(computed_at=dt, niveau_actuel=niveau_actuel)


def test_compute_mois_stagnation_and_regression():
    db = MagicMock()
    # query(...).filter_by(...).order_by(...).first() -> mock object
    db.query.return_value.filter_by.return_value.order_by.return_value.first.return_value = _make_mock_last(90, 3)

    months = gap_engine._compute_mois_stagnation("t1", 101, db)
    assert months >= 2

    # regression: current level lower than last.niveau_actuel
    is_reg = gap_engine._detect_regression("t1", 101, 2, db)
    assert is_reg is True


def test_compute_gaps_and_feature_snapshot():
    # Mock DB that accepts add/flush
    db = MagicMock()

    # FeatureEngine snapshot
    fe = feature_engine.FeatureEngine(db)
    snap = fe.build_snapshot(
        enseignant_id="t1",
        competence_levels=[{"current_level": "N3_INTERMEDIAIRE"}, {"current_level": 2}],
        teacher_profile={"nb_formations_in_progress": 1, "nb_formations_completed": 2, "taux_assiduite": 0.85, "avg_eval_score": 4.2, "nb_evaluations": 3},
        besoins=[{"titre": "Competence 1"}],
        certificats=[{"name": "C1"}],
    )
    assert snap.nb_savoirs_evalues >= 1

    # GapEngine compute_gaps -- simple required_levels vs competence_levels
    # Ensure DB query returns no previous records for mois/regression helpers
    db.query.return_value.filter_by.return_value.order_by.return_value.first.return_value = None
    ge = gap_engine.GapEngine(db)
    required_levels = [{"competence_id": 501, "required_level": "N4_AVANCE", "competence_nom": "Comp501", "domaine_id": 1}]
    competence_levels = []
    besoins = []
    gaps = ge.compute_gaps(
        enseignant_id="t1",
        competence_levels=competence_levels,
        required_levels=required_levels,
        besoins=besoins,
        prediction_result_id=None,
        domaine_demand={501: 0.2},
        total_enseignants=100,
    )
    assert isinstance(gaps, list)
