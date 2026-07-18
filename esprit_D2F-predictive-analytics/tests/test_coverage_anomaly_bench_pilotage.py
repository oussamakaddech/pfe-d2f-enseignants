"""Tests for anomaly_engine, benchmark_engine, pilotage_dashboard_engine."""

from types import SimpleNamespace
from unittest.mock import MagicMock, patch

from app.engines import anomaly_engine as ae
from app.engines import benchmark_engine as be
from app.engines import pilotage_dashboard_engine as pde


def _entity(**kwargs):
    return SimpleNamespace(**kwargs)


def _mk(scalar=None, count=0, all_rows=None, first=None, exec_fetch=None):
    db = MagicMock()
    q = db.query.return_value
    for m in ("filter", "filter_by", "order_by", "offset", "limit", "group_by",
              "having", "join", "outerjoin", "options", "distinct", "with_entities",
              "select_from", "params"):
        getattr(q, m).return_value = q
    q.scalar.return_value = scalar
    q.count.return_value = count
    q.all.return_value = all_rows if all_rows is not None else []
    q.first.return_value = first
    res = db.execute.return_value
    res.fetchall.return_value = exec_fetch if exec_fetch is not None else []
    res.mappings.return_value.all.return_value = []
    res.scalar.return_value = 0
    return db


class TestAnomalyEngine:
    def test_already_open_true(self):
        db = _mk(first=_entity(id=1))
        eng = ae.AnomalyEngine(db)
        assert eng._already_open("E1", "level_drop") is True

    def test_already_open_false(self):
        db = _mk(first=None)
        eng = ae.AnomalyEngine(db)
        assert eng._already_open("E1", "level_drop") is False

    def test_detect_level_drop_insufficient_snapshots(self):
        db = _mk(all_rows=[_entity(niveau_moyen_competences=2.0)])
        eng = ae.AnomalyEngine(db)
        assert eng._detect_level_drop("E1", None) == []

    def test_detect_level_drop_triggers(self):
        db = _mk(all_rows=[_entity(niveau_moyen_competences=2.0),
                           _entity(niveau_moyen_competences=5.0)])
        eng = ae.AnomalyEngine(db)
        out = eng._detect_level_drop("E1", "DEPT1")
        assert len(out) == 1
        assert out[0].severite == "CRITICAL"

    def test_detect_level_drop_no_drop(self):
        db = _mk(all_rows=[_entity(niveau_moyen_competences=5.0),
                           _entity(niveau_moyen_competences=5.0)])
        eng = ae.AnomalyEngine(db)
        assert eng._detect_level_drop("E1", None) == []

    def test_detect_inactivity_spike_none(self):
        db = _mk()
        db.execute.return_value.fetchone.return_value = None
        eng = ae.AnomalyEngine(db)
        assert eng._detect_inactivity_spike("E1", None) == []

    def test_detect_inactivity_spike_triggers(self):
        db = _mk()
        db.execute.return_value.fetchone.return_value = (400,)
        eng = ae.AnomalyEngine(db)
        out = eng._detect_inactivity_spike("E1", None)
        assert len(out) == 1

    def test_detect_gap_surge(self):
        db = _mk(scalar=6)
        eng = ae.AnomalyEngine(db)
        out = eng._detect_gap_surge("E1", None)
        assert len(out) == 1
        db.execute.return_value  # no-op
        # below threshold
        db2 = _mk(scalar=0)
        assert ae.AnomalyEngine(db2)._detect_gap_surge("E1", None) == []

    def test_detect_regression(self):
        db = _mk(all_rows=[_entity(competence_id=1, competence_nom="C", niveau_actuel=2)])
        eng = ae.AnomalyEngine(db)
        out = eng._detect_regression("E1", None)
        assert len(out) == 1

    def test_detect_for_teacher(self):
        db = _mk(all_rows=[_entity(niveau_moyen_competences=2.0),
                           _entity(niveau_moyen_competences=5.0)],
                 scalar=0, exec_fetch=[])
        db.execute.return_value.fetchone.return_value = None
        eng = ae.AnomalyEngine(db)
        res = eng.detect_for_teacher("E1", "DEPT1")
        assert res["enseignant_id"] == "E1"
        assert "nb_anomalies" in res

    def test_detect_department(self):
        db = _mk(exec_fetch=[(1,), (2,)])
        with patch.object(ae.AnomalyEngine, "detect_for_teacher",
                          return_value={"nb_anomalies": 1}):
            eng = ae.AnomalyEngine(db)
            res = eng.detect_department("DEPT1")
        assert res["departement_id"] == "DEPT1"
        assert res["nb_enseignants_scannes"] == 2
        assert res["nb_anomalies"] == 2


class TestBenchmarkEngine:
    def test_peer_scope_no_profile(self):
        db = _mk()
        with patch("app.services.data_service.DataService") as dsm:
            dsm.return_value.get_teacher_profile.return_value = []
            eng = be.PeerBenchmarkEngine(db)
            dept, up, peers = eng._peer_scope("E1")
        assert dept is None and peers == []

    def test_peer_scope_no_dept(self):
        db = _mk()
        with patch("app.services.data_service.DataService") as dsm:
            dsm.return_value.get_teacher_profile.return_value = [
                {"departement_id": None, "up_id": None},
            ]
            eng = be.PeerBenchmarkEngine(db)
            dept, up, peers = eng._peer_scope("E1")
        assert dept is None

    def test_benchmark_unavailable(self):
        db = _mk(exec_fetch=[])
        with patch("app.services.data_service.DataService") as dsm:
            dsm.return_value.get_teacher_profile.return_value = [
                {"departement_id": None, "up_id": None},
            ]
            eng = be.PeerBenchmarkEngine(db)
            res = eng.benchmark("E1")
        assert res["disponible"] is False

    def test_benchmark_available(self):
        db = _mk(all_rows=[(3.0,), (4.0,)], scalar=0.0)
        with patch.object(be.PeerBenchmarkEngine, "_peer_scope",
                          return_value=("D1", "U1", ["E2"])):
            eng = be.PeerBenchmarkEngine(db)
            res = eng.benchmark("E1")
        assert "niveau_moyen" in res

    def test_percentile(self):
        eng = be.PeerBenchmarkEngine(_mk())
        assert eng._percentile(5.0, [1, 2, 3, 4, 5]) == 80.0
        assert eng._percentile(1.0, []) == 50.0


class TestPilotageDashboard:
    def test_compute_all(self):
        db = _mk(scalar=None, count=0, all_rows=[], exec_fetch=[])
        eng = pde.PilotageDashboardEngine(db)
        res = eng.compute_all(horizon_mois=6)
        assert set(res.keys()) == {
            "forecast_kpis", "benchmark_departements",
            "anomalies_live", "correlation_besoins_gaps", "generated_at",
        }

    def test_forecast_kpis_empty(self):
        db = _mk(all_rows=[])
        eng = pde.PilotageDashboardEngine(db)
        res = eng.forecast_kpis()
        assert res["nb_enseignants"] == 0

    def test_correlation_insufficient(self):
        db = _mk(all_rows=[])
        eng = pde.PilotageDashboardEngine(db)
        res = eng.correlation_besoins_gaps()
        assert res["coefficient_pearson"] is None

    def test_correlation_with_data(self):
        db = _mk(all_rows=[(1, 5), (2, 5)], exec_fetch=[(1, 5), (2, 5)])
        eng = pde.PilotageDashboardEngine(db)
        res = eng.correlation_besoins_gaps()
        assert res["coefficient_pearson"] is not None
        assert len(res["top_paires"]) == 2
