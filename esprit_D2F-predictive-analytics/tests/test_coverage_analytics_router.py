"""Tests for selected endpoints in app/routers/analytics.py (router-level coverage)."""

from types import SimpleNamespace
from unittest.mock import MagicMock, patch

from fastapi.testclient import TestClient

from app.main import app
from app.core.db import get_db

BASE = "/api/v1/analytics"


def _client_with(db):
    app.dependency_overrides[get_db] = lambda: db
    return TestClient(app)


class TestAnalyticsEndpoints:
    def test_get_gaps(self):
        db = MagicMock()
        q = db.query.return_value
        q.filter.return_value.order_by.return_value.count.return_value = 1
        q.filter.return_value.order_by.return_value.offset.return_value.limit.return_value.all.return_value = [
            SimpleNamespace(id=1, competence_id=1, competence_nom="C", domaine_nom="D",
                            niveau_actuel=1, niveau_requis=3, niveau_vise=4,
                            gap_score=0.8, priorite_score=0.9, niveau_urgence="HAUTE",
                            mois_stagnation=2, en_regression=False, justification="j",
                            computed_at=None),
        ]
        c = _client_with(db)
        r = c.get(f"{BASE}/gaps/E1")
        assert r.status_code == 200
        assert r.json()["total"] == 1
        app.dependency_overrides.clear()

    def test_get_risk_404(self):
        db = MagicMock()
        q = db.query.return_value
        q.filter_by.return_value.first.return_value = None
        c = _client_with(db)
        r = c.get(f"{BASE}/risk/E1")
        assert r.status_code == 404
        app.dependency_overrides.clear()

    def test_get_risk_ok(self):
        db = MagicMock()
        q = db.query.return_value
        q.filter_by.return_value.first.return_value = SimpleNamespace(
            score_risque=0.8, niveau_risque="ELEVE", tendance="STABLE",
            precedent_score_risque=0.6, facteurs_risque={"factors": {"no_training": 0.1},
                                                         "contributions": {"no_training": 0.1},
                                                         "weights": {"no_training": 0.2}},
            computed_at=None,
        )
        c = _client_with(db)
        r = c.get(f"{BASE}/risk/E1")
        assert r.status_code == 200
        assert r.json()["score"] == 0.8
        app.dependency_overrides.clear()

    def test_update_recommendation_status_invalid(self):
        db = MagicMock()
        c = _client_with(db)
        r = c.patch(f"{BASE}/recommendations/1/status?statut=BAD")
        assert r.status_code == 400
        app.dependency_overrides.clear()

    def test_update_recommendation_status_404(self):
        db = MagicMock()
        q = db.query.return_value
        q.filter_by.return_value.first.return_value = None
        c = _client_with(db)
        r = c.patch(f"{BASE}/recommendations/1/status?statut=ACCEPTEE")
        assert r.status_code == 404
        app.dependency_overrides.clear()

    def test_update_recommendation_status_ok(self):
        db = MagicMock()
        q = db.query.return_value
        reco = SimpleNamespace(id=1, statut=None, formation_titre="F")
        q.filter_by.return_value.first.return_value = reco
        c = _client_with(db)
        r = c.patch(f"{BASE}/recommendations/1/status?statut=ACCEPTEE")
        assert r.status_code == 200
        assert r.json()["statut"] == "ACCEPTEE"
        app.dependency_overrides.clear()

    def test_update_alert_400(self):
        db = MagicMock()
        c = _client_with(db)
        r = c.patch(f"{BASE}/alerts/1?statut=BAD")
        assert r.status_code == 400
        app.dependency_overrides.clear()

    def test_get_alerts_with_filters(self):
        db = MagicMock()
        q = db.query.return_value
        q.order_by.return_value.count.return_value = 0
        q.order_by.return_value.offset.return_value.limit.return_value.all.return_value = []
        c = _client_with(db)
        r = c.get(f"{BASE}/alerts?type_alerte=X&severite=WARNING&statut=NOUVELLE")
        assert r.status_code == 200
        app.dependency_overrides.clear()

    def test_dashboard_training_impact(self):
        db = MagicMock()
        q = db.query.return_value
        q.filter.return_value.all.return_value = []
        q.filter.return_value.count.return_value = 0
        c = _client_with(db)
        with patch("app.routers.analytics.TrainingImpactEngine") as tie:
            tie.return_value.compute_global_impact.return_value = {
                "nb_enseignants_suivis": 0, "nb_chemins_termines": 0,
                "nb_formations_suivies": 0, "gain_niveau_moyen": 0.0,
                "reduction_risque_moyenne": 0.0, "nb_risque_reduit": 0,
                "nb_risque_augmente": 0,
            }
            r = c.get(f"{BASE}/dashboard/training-impact")
        assert r.status_code == 200
        app.dependency_overrides.clear()

    def test_dashboard_teachers_by_cell(self):
        db = MagicMock()
        c = _client_with(db)
        with patch("app.routers.analytics.DashboardEngine") as de:
            de.return_value.teachers_by_cell.return_value = []
            r = c.get(f"{BASE}/dashboard/teachers-by-cell?departement=D1&competence_id=1")
        assert r.status_code == 200
        app.dependency_overrides.clear()

    def test_health(self):
        db = MagicMock()
        q = db.query.return_value
        q.count.return_value = 0
        q.filter.return_value.count.return_value = 0
        c = _client_with(db)
        r = c.get(f"{BASE}/health")
        assert r.status_code == 200
        assert r.json()["status"] == "healthy"
        app.dependency_overrides.clear()

    def test_recommendations_grouped_invalid(self):
        db = MagicMock()
        c = _client_with(db)
        r = c.get(f"{BASE}/recommendations/E1/grouped?group_by=foo")
        assert r.status_code == 400
        app.dependency_overrides.clear()

    def test_dashboard_global_cached_and_compute(self):
        db = MagicMock()
        c = _client_with(db)
        with patch("app.routers.analytics.DashboardEngine") as de:
            inst = de.return_value
            inst.get_cached.return_value = None
            inst.compute_all.return_value = {"ok": True}
            r = c.get(f"{BASE}/dashboard/global")
        assert r.status_code == 200
        assert r.json() == {"ok": True}
        app.dependency_overrides.clear()

    def test_dashboard_global_with_period(self):
        db = MagicMock()
        c = _client_with(db)
        with patch("app.routers.analytics.DashboardEngine") as de:
            de.return_value.compute_all.return_value = {"period": True}
            r = c.get(f"{BASE}/dashboard/global?periode_debut=2024-01-01")
        assert r.status_code == 200
        app.dependency_overrides.clear()

    def test_dashboard_competences_declining(self):
        db = MagicMock()
        c = _client_with(db)
        with patch("app.routers.analytics.DashboardEngine") as de:
            de.return_value.competences_en_declin.return_value = [{"competence_id": 1}]
            r = c.get(f"{BASE}/dashboard/competences-declining?up_id=UP1")
        assert r.status_code == 200
        app.dependency_overrides.clear()

    def test_dashboard_teachers_at_risk(self):
        db = MagicMock()
        c = _client_with(db)
        with patch("app.routers.analytics.DashboardEngine") as de:
            de.return_value.enseignants_a_risque.return_value = [{"enseignant_id": "E1"}]
            r = c.get(f"{BASE}/dashboard/teachers-at-risk")
        assert r.status_code == 200
        app.dependency_overrides.clear()

    def test_dashboard_gap_heatmap(self):
        db = MagicMock()
        c = _client_with(db)
        with patch("app.routers.analytics.DashboardEngine") as de:
            de.return_value.department_gap_heatmap.return_value = [{"avg_gap": 1.0}]
            r = c.get(f"{BASE}/dashboard/gap-heatmap")
        assert r.status_code == 200
        app.dependency_overrides.clear()

    def test_dashboard_training_effectiveness(self):
        db = MagicMock()
        c = _client_with(db)
        with patch("app.routers.analytics.DashboardEngine") as de:
            de.return_value.training_effectiveness.return_value = [{"formation_id": 1}]
            r = c.get(f"{BASE}/dashboard/training-effectiveness")
        assert r.status_code == 200
        app.dependency_overrides.clear()

    def test_dashboard_top_formations(self):
        db = MagicMock()
        c = _client_with(db)
        with patch("app.routers.analytics.DashboardEngine") as de:
            de.return_value.top_formations_recommandees.return_value = []
            r = c.get(f"{BASE}/dashboard/top-formations")
        assert r.status_code == 200
        app.dependency_overrides.clear()

    def test_dashboard_risk_evolution(self):
        db = MagicMock()
        c = _client_with(db)
        with patch("app.routers.analytics.DashboardEngine") as de:
            de.return_value.monthly_risk_evolution.return_value = [{"month": "2024-01"}]
            r = c.get(f"{BASE}/dashboard/risk-evolution?months=3")
        assert r.status_code == 200
        app.dependency_overrides.clear()

    def test_dashboard_model_performance(self):
        db = MagicMock()
        c = _client_with(db)
        with patch("app.routers.analytics.DashboardEngine") as de:
            de.return_value.model_performance.return_value = {"gap_model_accuracy": 0.9}
            r = c.get(f"{BASE}/dashboard/model-performance")
        assert r.status_code == 200
        app.dependency_overrides.clear()

    def test_dashboard_pilotage(self):
        db = MagicMock()
        c = _client_with(db)
        with patch("app.routers.analytics.PilotageDashboardEngine") as pe:
            pe.return_value.compute_all.return_value = {"modules": 4}
            r = c.get(f"{BASE}/pilotage")
        assert r.status_code == 200
        app.dependency_overrides.clear()

    def test_trigger_batch_no_teachers(self):
        db = MagicMock()
        c = _client_with(db)
        with patch("app.routers.analytics.DataService") as ds:
            ds.return_value.get_all_enseignants.return_value = []
            r = c.post(f"{BASE}/trigger-batch-analysis")
        assert r.status_code == 202
        assert r.json()["nb_queued"] == 0
        app.dependency_overrides.clear()

    def test_trigger_batch_with_teachers(self):
        db = MagicMock()
        c = _client_with(db)
        with patch("app.routers.analytics.DataService") as ds:
            ds.return_value.get_all_enseignants.return_value = [{"id": "E1"}]
            r = c.post(f"{BASE}/trigger-batch-analysis")
        assert r.status_code == 202
        assert r.json()["nb_queued"] == 1
        app.dependency_overrides.clear()

    def test_get_recommendations(self):
        db = MagicMock()
        c = _client_with(db)
        with patch("app.routers.analytics.RecommendationEngine") as re_:
            re_.return_value.generate.return_value = {"recommendations": []}
            r = c.get(f"{BASE}/recommendations/E1")
        assert r.status_code == 200
        app.dependency_overrides.clear()

    def test_get_recommendations_grouped_ok(self):
        db = MagicMock()
        c = _client_with(db)
        with patch("app.routers.analytics.RecommendationEngine") as re_:
            re_.return_value.generate_grouped.return_value = {"groups": []}
            r = c.get(f"{BASE}/recommendations/E1/grouped?group_by=competence")
        assert r.status_code == 200
        app.dependency_overrides.clear()

    def test_get_training_path(self):
        db = MagicMock()
        path = SimpleNamespace(
            id=1, enseignant_id="E1", competence_id=1, competence_nom="C",
            niveau_depart=1.0, niveau_vise=4.0, nb_formations=1,
            duree_totale_heures=10, probabilite_reussite_globale=0.8,
            statut="ACTIF",
        )
        item = SimpleNamespace(
            rang=1, formation_id=1, formation_titre="F", formation_type="WEBINAIRE",
            duree_heures=10, niveau_avant=1.0, niveau_apres=2.0,
            est_obligatoire=True, prerequis_satisfaits=True, deja_suivie=False,
            score_formation=0.9, justification="j",
        )
        db.query.return_value.filter_by.return_value.order_by.return_value.first.return_value = path
        db.query.return_value.filter_by.return_value.order_by.return_value.all.return_value = [item]
        c = _client_with(db)
        r = c.get(f"{BASE}/training-path/E1/1")
        assert r.status_code == 200
        assert r.json()["training_path_id"] == 1
        app.dependency_overrides.clear()

    def test_forecast_404(self):
        db = MagicMock()
        c = _client_with(db)
        with patch("app.routers.analytics.DataService") as ds:
            ds.return_value.get_teacher_profile.return_value = []
            r = c.get(f"{BASE}/forecast/E1")
        assert r.status_code == 404
        app.dependency_overrides.clear()

    def test_forecast_ok(self):
        db = MagicMock()
        c = _client_with(db)
        with patch("app.routers.analytics.DataService") as ds, \
                patch("app.routers.analytics.SkillForecastEngine") as fe:
            ds.return_value.get_teacher_profile.return_value = [{"id": "E1"}]
            fe.return_value.forecast.return_value = {"competences": []}
            r = c.get(f"{BASE}/forecast/E1?horizon_mois=6")
        assert r.status_code == 200
        app.dependency_overrides.clear()

    def test_benchmark_404(self):
        db = MagicMock()
        c = _client_with(db)
        with patch("app.routers.analytics.DataService") as ds:
            ds.return_value.get_teacher_profile.return_value = []
            r = c.get(f"{BASE}/benchmark/E1")
        assert r.status_code == 404
        app.dependency_overrides.clear()

    def test_benchmark_ok(self):
        db = MagicMock()
        c = _client_with(db)
        with patch("app.routers.analytics.DataService") as ds, \
                patch("app.routers.analytics.PeerBenchmarkEngine") as be:
            ds.return_value.get_teacher_profile.return_value = [{"id": "E1", "departement_id": "D1"}]
            be.return_value.benchmark.return_value = {"rank": 1}
            r = c.get(f"{BASE}/benchmark/E1?par_up=true")
        assert r.status_code == 200
        app.dependency_overrides.clear()

    def test_anomalies_teacher_404(self):
        db = MagicMock()
        c = _client_with(db)
        with patch("app.routers.analytics.DataService") as ds:
            ds.return_value.get_teacher_profile.return_value = []
            r = c.post(f"{BASE}/anomalies/E1")
        assert r.status_code == 404
        app.dependency_overrides.clear()

    def test_anomalies_teacher_ok(self):
        db = MagicMock()
        c = _client_with(db)
        with patch("app.routers.analytics.DataService") as ds, \
                patch("app.routers.analytics.AnomalyEngine") as ae:
            ds.return_value.get_teacher_profile.return_value = [{"id": "E1", "departement_id": "D1"}]
            ae.return_value.detect_for_teacher.return_value = {"anomalies": []}
            r = c.post(f"{BASE}/anomalies/E1")
        assert r.status_code == 200
        app.dependency_overrides.clear()

    def test_anomalies_department(self):
        db = MagicMock()
        c = _client_with(db)
        with patch("app.routers.analytics.AnomalyEngine") as ae:
            ae.return_value.detect_department.return_value = {"scanned": 0}
            r = c.post(f"{BASE}/anomalies/department/D1")
        assert r.status_code == 200
        app.dependency_overrides.clear()

    def test_training_impact_formations(self):
        db = MagicMock()
        c = _client_with(db)
        with patch("app.routers.analytics.TrainingImpactEngine") as tie:
            tie.return_value.top_formations_by_impact.return_value = {
                "formations": [], "total": 0, "page": 0, "size": 20,
            }
            r = c.get(f"{BASE}/dashboard/training-impact/formations")
        assert r.status_code == 200
        app.dependency_overrides.clear()

    def test_what_if(self):
        db = MagicMock()
        c = _client_with(db)
        with patch("app.routers.analytics.WhatIfEngine") as we:
            we.return_value.simulate.return_value = {
                "enseignant_id": "E1",
                "horizon_mois": 6,
                "risk_before": {"score": 0.8},
                "risk_after": {"score": 0.5},
                "risk_reduction": 0.3,
                "nb_gaps_before": 3,
                "nb_gaps_after": 1,
                "nb_gaps_resolus": 2,
            }
            r = c.post(f"{BASE}/simulate/what-if",
                       json={"enseignant_id": "E1",
                             "plan": [{"formation_id": 1, "competence_id": 1, "niveau_vise": 3}],
                             "horizon_mois": 6})
        assert r.status_code == 200
        app.dependency_overrides.clear()

    def test_analyze_404(self):
        db = MagicMock()
        c = _client_with(db)
        with patch("app.routers.analytics.DataService") as ds:
            ds.return_value.get_teacher_profile.return_value = []
            r = c.post(f"{BASE}/analyze/E1")
        assert r.status_code == 404
        app.dependency_overrides.clear()

    def test_analyze_success(self):
        db = MagicMock()
        pred = SimpleNamespace(id=9, statut="TERMINE", nb_gaps_detectes=2,
                               nb_gaps_critiques=1, nb_recommendations=3,
                               nb_alertes_generees=1, duree_analyse_ms=50)
        c = _client_with(db)
        with patch("app.routers.analytics.DataService") as ds, \
                patch("app.routers.analytics.collect_analysis_data") as cad, \
                patch("app.routers.analytics._run_pipeline") as rp, \
                patch("app.routers.analytics.PredictionResult", return_value=pred), \
                patch("app.routers.analytics._finalize_prediction") as fin:
            ds.return_value.get_teacher_profile.return_value = [{"id": "E1"}]
            cad.return_value = {"req_levels": [], "comp_levels": [], "besoins": [],
                                "certificats": [], "dom_demand": {}, "formations": [],
                                "form_comps": [], "evaluations": [], "eval_glob": []}
            rp.return_value = ([], [], [], None)
            r = c.post(f"{BASE}/analyze/E1")
        assert r.status_code == 202
        assert r.json()["prediction_result_id"] == 9
        app.dependency_overrides.clear()

    def test_analyze_error(self):
        db = MagicMock()
        pred = SimpleNamespace(id=9, statut="ERREUR", message_erreur="x",
                               nb_gaps_detectes=None, nb_gaps_critiques=None,
                               nb_recommendations=None, nb_alertes_generees=None,
                               duree_analyse_ms=None)
        c = _client_with(db)
        with patch("app.routers.analytics.DataService") as ds, \
                patch("app.routers.analytics.collect_analysis_data") as cad, \
                patch("app.routers.analytics._run_pipeline") as rp, \
                patch("app.routers.analytics.PredictionResult", return_value=pred):
            ds.return_value.get_teacher_profile.return_value = [{"id": "E1"}]
            cad.return_value = {"req_levels": [], "comp_levels": [], "besoins": [],
                                "certificats": [], "dom_demand": {}, "formations": [],
                                "form_comps": [], "evaluations": [], "eval_glob": []}
            rp.side_effect = RuntimeError("boom")
            r = c.post(f"{BASE}/analyze/E1")
        assert r.status_code == 500
        app.dependency_overrides.clear()

    def test_historique_risque_with_rows(self):
        db = MagicMock()
        from datetime import date
        snap = SimpleNamespace(snapshot_date=date(2024, 1, 1), score_risque=0.5,
                               niveau_risque="ELEVE", tendance="STABLE")
        db.query.return_value.filter.return_value.order_by.return_value.all.return_value = [snap]
        c = _client_with(db)
        r = c.get(f"{BASE}/enseignants/E1/historique-risque?mois=6")
        assert r.status_code == 200
        assert r.json()["points"][0]["score"] == 0.5
        app.dependency_overrides.clear()

    def test_historique_risque_profile_fallback_precedent(self):
        db = MagicMock()
        from datetime import date
        db.query.return_value.filter.return_value.order_by.return_value.all.return_value = []
        prof = SimpleNamespace(score_risque=0.8, niveau_risque="ELEVE",
                               tendance="STABLE", precedent_score_risque=0.6)
        db.query.return_value.filter_by.return_value.first.return_value = prof
        c = _client_with(db)
        r = c.get(f"{BASE}/enseignants/E1/historique-risque")
        assert r.status_code == 200
        assert len(r.json()["points"]) == 2
        app.dependency_overrides.clear()

    def test_historique_risque_profile_fallback_no_precedent(self):
        db = MagicMock()
        db.query.return_value.filter.return_value.order_by.return_value.all.return_value = []
        prof = SimpleNamespace(score_risque=0.8, niveau_risque="ELEVE",
                               tendance="STABLE", precedent_score_risque=None)
        db.query.return_value.filter_by.return_value.first.return_value = prof
        c = _client_with(db)
        r = c.get(f"{BASE}/enseignants/E1/historique-risque")
        assert r.status_code == 200
        assert len(r.json()["points"]) == 1
        app.dependency_overrides.clear()

    def test_get_recommendations_with_rows(self):
        db = MagicMock()
        q = db.query.return_value
        expr = q.outerjoin.return_value.filter.return_value.order_by.return_value
        expr.count.return_value = 1
        expr.offset.return_value.limit.return_value.all.return_value = [
            (SimpleNamespace(id=1, formation_id=2, formation_titre="F", formation_type="WEB",
                             competence_id=3, score_global=0.9, score_pertinence=0.8,
                             score_taux_reussite=0.7, score_disponibilite=0.6,
                             probabilite_reussite=0.9, facteurs_score={"a": 1},
                             rang_dans_parcours=0, justification="j", niveau_apres=3.0,
                             statut="PROPOSEE"), "Comp", 2.0),
        ]
        c = _client_with(db)
        r = c.get(f"{BASE}/recommendations/E1")
        assert r.status_code == 200
        assert r.json()["total"] == 1
        app.dependency_overrides.clear()

    def test_get_recommendations_grouped_with_rows(self):
        db = MagicMock()
        q = db.query.return_value
        expr = q.outerjoin.return_value.filter.return_value.order_by.return_value
        rows = [
            (SimpleNamespace(id=1, formation_id=2, formation_titre="F", formation_type="WEB",
                             competence_id=3, score_global=0.9, score_pertinence=0.8,
                             score_taux_reussite=0.7, score_disponibilite=0.6,
                             probabilite_reussite=0.9, facteurs_score={"a": 1},
                             rang_dans_parcours=0, justification="j", niveau_apres=3.0,
                             statut="ACCEPTEE"), "Comp", 2.0),
        ]
        expr.count.return_value = 1
        expr.all.return_value = rows
        c = _client_with(db)
        r = c.get(f"{BASE}/recommendations/E1/grouped?group_by=competence")
        assert r.status_code == 200
        assert r.json()["groups"][0]["nb"] == 1
        app.dependency_overrides.clear()
