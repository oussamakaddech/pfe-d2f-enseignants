"""Tests for app/engines/dashboard_engine.py (DashboardEngine)."""

from types import SimpleNamespace
from unittest.mock import MagicMock, patch

from app.engines import dashboard_engine as de


def _row(**kwargs):
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


class TestDashboardRealKpis:
    def test_no_profiles(self):
        db = _mk(scalar=None, count=0, first=(0, 0))
        eng = de.DashboardEngine(db)
        res = eng.real_kpis()
        assert res["nb_enseignants_suivis"] == 0
        assert res["nb_gaps_critiques"] == 0
        assert res["distribution_risques"] == []
        assert "taux_couverture_global" in res

    def test_with_profiles(self):
        db = _mk(count=3, all_rows=[("ELEVE", 2)], first=(0, 0))
        # scalar order: count_suivis, nb_gaps_critiques, count profiles(>0),
        # avg risk(0.7), then the remaining real_kpis count scalars -> 0
        db.query.return_value.scalar.side_effect = [3, 0, 3, 0.7] + [0] * 8
        eng = de.DashboardEngine(db)
        res = eng.real_kpis()
        assert res["nb_profils_risque"] == 3
        assert res["score_risque_moyen"] == 0.7


class TestDashboardKPIs:
    def test_competences_en_declin_empty(self):
        db = _mk(all_rows=[])
        eng = de.DashboardEngine(db)
        assert eng.competences_en_declin() == []

    def test_competences_en_declin_filtre_dept(self):
        db = _mk(all_rows=[], exec_fetch=[(123,)])
        eng = de.DashboardEngine(db)
        res = eng.competences_en_declin(departement_id="DEPT1")
        assert res == []

    def test_competences_en_demande(self):
        db = _mk(all_rows=[_row(competence_id=1, competence_nom="C", domaine_nom="D",
                                nb_gaps=10, nb_critiques=2, nb_besoins_moy=1.0)],
                 scalar=5)
        eng = de.DashboardEngine(db)
        res = eng.competences_en_demande()
        assert res[0]["competence_id"] == 1
        assert res[0]["score_demande"] > 0

    def test_enseignants_a_risque_empty(self):
        db = _mk(all_rows=[])
        eng = de.DashboardEngine(db)
        assert eng.enseignants_a_risque() == []

    def test_enseignants_a_risque_with_rows(self):
        db = _mk(all_rows=[_row(enseignant_id="E1", score_risque=0.8, niveau_risque="ELEVE",
                                nb_gaps_critiques=2, tendance="STABLE",
                                facteurs_risque={"factors": {"no_training": 0.1, "stagnation": 0.2,
                                                             "unmet_needs": 0.3}})])
        with patch("app.routers.all._fetch_teacher_info", return_value={}):
            eng = de.DashboardEngine(db)
            res = eng.enseignants_a_risque()
        assert res[0]["enseignant_id"] == "E1"
        assert isinstance(res[0]["facteurs_risque"], list)

    def test_taux_couverture_departements(self):
        db = _mk(all_rows=[_row(departement_id="D1", total=10, couverts=7),
                           _row(departement_id=None, total=0, couverts=0)])
        eng = de.DashboardEngine(db)
        res = eng.taux_couverture_departements()
        assert res[0]["taux_couverture"] == 70.0

    def test_top_formations_recommandees_empty(self):
        db = _mk(all_rows=[])
        eng = de.DashboardEngine(db)
        assert eng.top_formations_recommandees() == []

    def test_alertes_recentes(self):
        db = _mk(all_rows=[_row(id=1, type_alerte="X", severite="WARNING", titre="t",
                                enseignant_id="E1", created_at=None)])
        eng = de.DashboardEngine(db)
        res = eng.alertes_recentes()
        assert res[0]["id"] == 1

    def test_department_gap_heatmap(self):
        db = _mk(all_rows=[
            _row(enseignant_id="E1", competence_id=1, competence_nom="C", gap_score=2.0),
            _row(enseignant_id="E1", competence_id=1, competence_nom="C", gap_score=4.0),
        ], exec_fetch=[])
        with patch("app.engines.dashboard_engine.execute_query", return_value=[]):
            eng = de.DashboardEngine(db)
            res = eng.department_gap_heatmap()
        assert res[0]["avg_gap"] == 3.0
        assert res[0]["enseignants_count"] == 2

    def test_teachers_by_cell(self):
        db = _mk(all_rows=[_row(enseignant_id="E1", avg_gap=2.0, urgence="HAUTE")])
        with patch("app.engines.dashboard_engine.execute_query",
                    return_value=[{"enseignant_id": "E1", "departement_id": "DEPT1"}]), \
                patch("app.routers.all._fetch_teacher_info", return_value={}):
            eng = de.DashboardEngine(db)
            res = eng.teachers_by_cell("DEPT1", 1)
        assert res[0]["enseignant_id"] == "E1"

    def test_training_effectiveness(self):
        db = _mk(all_rows=[_row(formation_id=1, formation_titre="F", avg_gain=1.5, nb_items=3)])
        with patch("app.services.data_service.DataService") as dsm:
            dsm.return_value.get_formation_completion.return_value = []
            eng = de.DashboardEngine(db)
            res = eng.training_effectiveness()
        assert res[0]["formation_id"] == 1
        assert res[0]["avg_level_gain"] == 1.5

    def test_monthly_risk_evolution(self):
        db = _mk(all_rows=[_row(mois="2024-01", critical=1, high=2)])
        eng = de.DashboardEngine(db)
        res = eng.monthly_risk_evolution(months=6)
        assert res[0]["month"] == "2024-01"

    def test_model_performance(self):
        db = _mk(scalar=0.9)
        eng = de.DashboardEngine(db)
        res = eng.model_performance()
        assert res["recommendation_avg_proba"] == 0.9


class TestDashboardComputeAll:
    def test_compute_all_persists_snapshot(self):
        db = _mk(scalar=None, count=0, all_rows=[], first=None, exec_fetch=[])
        # side_effect order: get_cached (None) -> coverage (0,0) ->
        # model_performance last_log (None) -> caching (None => new snapshot)
        db.query.return_value.first.side_effect = [None, (0, 0), None, None]
        with patch("app.services.data_service.DataService") as dsm, \
                patch("app.routers.all._fetch_teacher_info", return_value={}), \
                patch("app.engines.dashboard_engine.execute_query", return_value=[]):
            dsm.return_value.get_formation_completion.return_value = []
            eng = de.DashboardEngine(db)
            res = eng.compute_all()
        assert "competences_en_declin" in res
        db.add.assert_called()
        db.flush.assert_called()

    def test_compute_all_snapshot_persist_failure(self):
        db = _mk(scalar=None, count=0, all_rows=[], first=None, exec_fetch=[])
        db.query.return_value.first.side_effect = [None, (0, 0), None, None]
        db.flush.side_effect = RuntimeError("db down")
        with patch("app.services.data_service.DataService") as dsm, \
                patch("app.routers.all._fetch_teacher_info", return_value={}), \
                patch("app.engines.dashboard_engine.execute_query", return_value=[]):
            dsm.return_value.get_formation_completion.return_value = []
            eng = de.DashboardEngine(db)
            res = eng.compute_all()  # must not raise
        assert "competences_en_declin" in res


class TestDashboardMoreBranches:
    def test_competences_en_declin_filtre_up(self):
        db = _mk(all_rows=[], exec_fetch=[(456,)])
        eng = de.DashboardEngine(db)
        res = eng.competences_en_declin(up_id="UP1")
        assert res == []

    def test_competences_en_declin_with_decline(self):
        recent_rows = [_row(competence_id=1, competence_nom="C", domaine_nom="D",
                            niveau_moy_actuel=2.0)]
        old_rows = [_row(competence_id=1, niveau_moy_ancien=3.0)]
        db = _mk(all_rows=recent_rows)
        db.query.return_value.all.side_effect = [recent_rows, old_rows]
        eng = de.DashboardEngine(db)
        res = eng.competences_en_declin()
        assert len(res) == 1
        assert res[0]["delta"] == -1.0

    def test_top_formations_avec_recs(self):
        formation_rows = [
            _row(formation_id=10, formation_titre="F10", nb_recommandations=3,
                 nb_enseignants=2, score_moy=0.7, proba_moy=0.8),
            _row(formation_id=11, formation_titre="F11", nb_recommandations=1,
                 nb_enseignants=1, score_moy=0.4, proba_moy=0.5),
        ]
        recs_rows = [
            _row(formation_id=10, enseignant_id="E1", competence_id="5"),
            _row(formation_id=11, enseignant_id="E2", competence_id="6"),
        ]
        comp_rows = [
            _row(competence_id=5, competence_nom="CompA"),
            _row(competence_id=6, competence_nom="CompB"),
        ]
        db = _mk(all_rows=formation_rows)
        # .all() calls: 1) formation rows, 2) recs, 3) comp_noms
        db.query.return_value.all.side_effect = [formation_rows, recs_rows, comp_rows]
        with patch("app.routers.all._fetch_teacher_info",
                   return_value={"E1": {"department": "D1"}, "E2": {"department": "D2"}}):
            eng = de.DashboardEngine(db)
            res = eng.top_formations_recommandees()
        assert len(res) == 2
        f10 = next(r for r in res if r["formation_id"] == 10)
        assert f10["enseignants_cibles"] == 1
        assert "D1" in f10["departements"]

    def test_ens_dept_map_cache_hit(self):
        db = _mk()
        eng = de.DashboardEngine(db)
        eng._ens_dept_cache = {"X": "D9"}
        assert eng._ens_dept_map() == {"X": "D9"}

    def test_teachers_by_cell_dept_mismatch_skip(self):
        db = _mk(all_rows=[_row(enseignant_id="E1", avg_gap=2.0, urgence="HAUTE")])
        with patch("app.engines.dashboard_engine.execute_query",
                    return_value=[{"enseignant_id": "E1", "departement_id": "OTHER"}]), \
                patch("app.routers.all._fetch_teacher_info", return_value={}):
            eng = de.DashboardEngine(db)
            res = eng.teachers_by_cell("DEPT1", 1)
        assert res == []

    def test_training_effectiveness_completion_error(self):
        db = _mk(all_rows=[_row(formation_id=1, formation_titre="F", avg_gain=1.5, nb_items=3)])
        with patch("app.services.data_service.DataService") as dsm:
            dsm.return_value.get_formation_completion.side_effect = RuntimeError("boom")
            eng = de.DashboardEngine(db)
            res = eng.training_effectiveness()
        assert res[0]["formation_id"] == 1

    def test_model_performance_log_error_and_fallback(self):
        from sqlalchemy.exc import SQLAlchemyError
        db = _mk(scalar=0.9)
        db.query.return_value.first.side_effect = SQLAlchemyError("no table")
        eng = de.DashboardEngine(db)
        res = eng.model_performance()
        assert res["last_retrain_status"] is None

    def test_model_performance_fallback_from_log(self):
        db = _mk(scalar=0.9)
        log = SimpleNamespace(retrained_at=None, statut="success", accuracy_after=0.88)
        db.query.return_value.first.side_effect = [log]
        with patch("app.services.model_trainer.read_current_accuracy", return_value=None):
            eng = de.DashboardEngine(db)
            res = eng.model_performance()
        assert res["gap_model_accuracy"] == 0.88
