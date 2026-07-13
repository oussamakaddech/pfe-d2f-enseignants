"""Coverage boost tests for predictive-analytics: all.py, analytics.py, scheduler/jobs.py, messaging/consumer.py, ml/gap_predictor.py, main.py."""

import os
import json
import pytest
from unittest.mock import MagicMock, patch, PropertyMock
from fastapi.testclient import TestClient

# ── Ensure test env vars before any app import ──────────────────────────────
os.environ.setdefault("JWT_AUTH_ENABLED", "false")
os.environ.setdefault("SCHEDULER_ENABLED", "false")
os.environ.setdefault("MESSAGING_ENABLED", "false")
os.environ.setdefault("APP_ENV", "test")
os.environ.setdefault("JWT_SECRET", "test-jwt-secret-for-pytest-only-" + ("x" * 32))

from app.main import app
from app.core.db import get_db
from tests.conftest import make_mock_db


# ======================================================================
# app/routers/all.py  (40.3%)
# ======================================================================


class TestAllRouterHealth:
    def test_health_check_healthy(self, client: TestClient):
        resp = client.get("/api/health")
        assert resp.status_code == 200
        data = resp.json()
        assert data["status"] in ("healthy", "degraded")
        assert data["service"] == "d2f-predictive-analytics"

    def test_health_check_db_unhealthy(self, client: TestClient):
        mock_db = make_mock_db()
        mock_db.execute.side_effect = Exception("DB down")
        app.dependency_overrides[get_db] = lambda: mock_db
        try:
            resp = client.get("/api/health")
            assert resp.status_code == 200
            assert resp.json()["status"] == "degraded"
        finally:
            app.dependency_overrides.clear()


class TestAllRouterPredict:
    def test_predict_gaps_teacher_not_found(self, client: TestClient):
        mock_db = make_mock_db()
        mock_db.query.return_value.filter.return_value.first.return_value = None
        app.dependency_overrides[get_db] = lambda: mock_db
        try:
            resp = client.post("/api/predict/gaps/UNKNOWN?top_n=5")
            assert resp.status_code in (404, 422)
        finally:
            app.dependency_overrides.clear()

    def test_train_gap_model_no_data(self, client: TestClient):
        mock_db = make_mock_db()
        app.dependency_overrides[get_db] = lambda: mock_db
        with patch("app.routers.all.DataService") as MockDS:
            MockDS.return_value.get_teacher_profile.return_value = []
            MockDS.return_value.get_competency_levels.return_value = []
            MockDS.return_value.get_required_levels.return_value = []
            try:
                resp = client.post("/api/predict/train")
                assert resp.status_code == 200
                data = resp.json()
                assert data["status"] == "no_data"
            finally:
                app.dependency_overrides.clear()

    def test_check_model_drift(self, client: TestClient):
        mock_db = make_mock_db()
        app.dependency_overrides[get_db] = lambda: mock_db
        with patch("app.routers.all.DataService") as MockDS:
            MockDS.return_value.get_teacher_profile.return_value = []
            MockDS.return_value.get_competency_levels.return_value = []
            try:
                resp = client.get("/api/predict/drift")
                assert resp.status_code == 200
            finally:
                app.dependency_overrides.clear()


class TestAllRouterRecommend:
    def test_recommend_path(self, client: TestClient):
        mock_db = make_mock_db()
        app.dependency_overrides[get_db] = lambda: mock_db
        with patch("app.routers.all.DataService") as MockDS:
            MockDS.return_value.get_formation_competencies.return_value = []
            MockDS.return_value.get_prerequisite_graph.return_value = []
            MockDS.return_value.get_competency_levels.return_value = []
            try:
                resp = client.post(
                    "/api/recommend/path",
                    json={"teacher_id": "E001", "target_competency_id": 1, "target_level": 4},
                )
                assert resp.status_code == 200
                data = resp.json()
                assert "path" in data
            finally:
                app.dependency_overrides.clear()

    def test_recommend_path_with_formations(self, client: TestClient):
        mock_db = make_mock_db()
        app.dependency_overrides[get_db] = lambda: mock_db
        with patch("app.routers.all.DataService") as MockDS:
            MockDS.return_value.get_formation_competencies.return_value = [
                {"formation_id": 1, "competence_id": 1, "niveau_vise": 3,
                 "charge_horaire_global": 20, "titre_formation": "Test Formation",
                 "competence_nom": "Comp1", "domaine_nom": "Dom1"},
            ]
            MockDS.return_value.get_prerequisite_graph.return_value = []
            MockDS.return_value.get_competency_levels.return_value = [
                {"competence_id": 1, "current_level": 1},
            ]
            try:
                resp = client.post(
                    "/api/recommend/path",
                    json={"teacher_id": "E001", "target_competency_id": 1, "target_level": 4,
                          "max_duration_hours": 100},
                )
                assert resp.status_code == 200
                data = resp.json()
                assert len(data["path"]) > 0
            finally:
                app.dependency_overrides.clear()


class TestAllRouterDetect:
    def test_detect_at_risk_teachers(self, client: TestClient):
        mock_db = make_mock_db()
        app.dependency_overrides[get_db] = lambda: mock_db
        with patch("app.routers.all.DataService") as MockDS:
            MockDS.return_value.get_teacher_profile.return_value = [
                {"enseignant_id": "E001", "nom": "Test", "prenom": "User",
                 "departement_id": "GC", "email": "test@esprit.tn",
                 "days_since_last_training": 200, "taux_assiduite": 0.5,
                 "nb_formations_completed": 0, "nb_besoins_exprimes": 0},
            ]
            try:
                resp = client.get("/api/detect/at-risk-teachers")
                assert resp.status_code == 200
                data = resp.json()
                assert "teachers" in data
                assert "at_risk_count" in data
            finally:
                app.dependency_overrides.clear()

    def test_detect_at_risk_with_dept_filter(self, client: TestClient):
        from unittest.mock import MagicMock
        from app.models.db_models import TeacherRiskProfile
        mock_db = make_mock_db()
        app.dependency_overrides[get_db] = lambda: mock_db
        # db.execute: (1) COUNT(*) enseignants, (2) SELECT id WHERE dept_id=GC
        mock_db.execute.side_effect = [
            MagicMock(scalar=lambda: 2),
            MagicMock(fetchall=lambda: [("E001",)]),
            MagicMock(fetchall=lambda: [("E001", "Nom", "Prenom", "mail@e.tn", "GC")]),
        ]
        # db.query(TeacherRiskProfile).filter(...).order_by(...).all()
        prof = MagicMock()
        prof.enseignant_id = "E001"
        prof.score_risque = 0.7
        prof.nb_gaps_critiques = 1
        prof.facteurs_risque = {"factors": {"no_training": 0.5, "stagnation": 0.2,
                                       "unmet_needs": 0.1}}
        q = MagicMock()
        q.filter.return_value = q
        q.order_by.return_value = q
        q.all.return_value = [prof]
        mock_db.query.return_value = q
        try:
            resp = client.get("/api/detect/at-risk-teachers?deptId=GC")
            assert resp.status_code == 200
            data = resp.json()
            assert data["total_teachers"] == 2
            assert data["at_risk_count"] == 1
        finally:
            app.dependency_overrides.clear()


class TestAllRouterDashboard:
    def test_declining_competencies(self, client: TestClient):
        mock_db = make_mock_db()
        app.dependency_overrides[get_db] = lambda: mock_db
        with patch("app.routers.all.DataService") as MockDS:
            MockDS.return_value.get_besoin_demand.return_value = [
                {"competence_id": 1, "competence_nom": "C1", "domaine_nom": "D1",
                 "demand_3m": 1, "demand_12m": 100},
            ]
            try:
                resp = client.get("/api/dashboard/declining-competencies")
                assert resp.status_code == 200
            finally:
                app.dependency_overrides.clear()

    def test_in_demand_competencies(self, client: TestClient):
        mock_db = make_mock_db()
        app.dependency_overrides[get_db] = lambda: mock_db
        with patch("app.routers.all.DataService") as MockDS:
            MockDS.return_value.get_besoin_demand.return_value = [
                {"competence_id": 1, "competence_nom": "C1", "domaine_nom": "D1",
                 "demand_3m": 50, "demand_12m": 100},
            ]
            try:
                resp = client.get("/api/dashboard/in-demand-competencies")
                assert resp.status_code == 200
            finally:
                app.dependency_overrides.clear()

    def test_teacher_risk_indicators(self, client: TestClient):
        mock_db = make_mock_db()
        app.dependency_overrides[get_db] = lambda: mock_db
        with patch("app.routers.all.DataService") as MockDS:
            MockDS.return_value.get_teacher_profile.return_value = [
                {"enseignant_id": "E001", "nom": "Test", "prenom": "User",
                 "departement_id": "GC", "email": "t@e.tn",
                 "days_since_last_training": 300, "taux_assiduite": 0.3,
                 "nb_formations_completed": 0, "nb_besoins_exprimes": 0},
            ]
            try:
                resp = client.get("/api/dashboard/teacher-risk-indicators?deptId=GC")
                assert resp.status_code == 200
                data = resp.json()
                assert isinstance(data, list)
            finally:
                app.dependency_overrides.clear()

    def test_dashboard_summary(self, client: TestClient):
        mock_db = make_mock_db()
        app.dependency_overrides[get_db] = lambda: mock_db
        with patch("app.routers.all.DataService") as MockDS:
            MockDS.return_value.get_teacher_profile.return_value = []
            MockDS.return_value.get_besoin_demand.return_value = []
            try:
                resp = client.get("/api/dashboard/summary?deptId=GC")
                assert resp.status_code == 200
                data = resp.json()
                assert "declining_competencies" in data
            finally:
                app.dependency_overrides.clear()

    def test_department_dashboard(self, client: TestClient):
        mock_db = make_mock_db()
        app.dependency_overrides[get_db] = lambda: mock_db
        with patch("app.routers.all.DataService") as MockDS:
            MockDS.return_value.get_teacher_profile.return_value = [
                {"enseignant_id": "E001", "nom": "Test", "prenom": "User",
                 "departement_id": "GC", "email": "t@e.tn",
                 "days_since_last_training": 100, "taux_assiduite": 0.7,
                 "nb_formations_completed": 2, "nb_besoins_exprimes": 1},
            ]
            try:
                resp = client.get("/api/dashboard/department/GC")
                assert resp.status_code == 200
                data = resp.json()
                assert "department_id" in data
                assert data["department_id"] == "GC"
            finally:
                app.dependency_overrides.clear()


class TestAllRouterHelpers:
    def test_compute_teacher_risk(self):
        from app.routers.all import _compute_teacher_risk
        teacher = {
            "enseignant_id": "E001", "nom": "Test", "prenom": "User",
            "departement_id": "GC", "email": "test@esprit.tn",
            "days_since_last_training": 300, "taux_assiduite": 0.3,
            "nb_formations_completed": 0, "nb_besoins_exprimes": 0,
        }
        result = _compute_teacher_risk(teacher)
        assert "attrition_risk_score" in result
        assert "disengagement_signals" in result
        assert "recommendation" in result
        assert result["teacher_id"] == "E001"

    def test_is_declining(self):
        from app.routers.all import _is_declining
        assert _is_declining({"demand_12m": 100, "demand_3m": 5}) is True
        assert _is_declining({"demand_12m": 100, "demand_3m": 50}) is False
        assert _is_declining({"demand_12m": 0, "demand_3m": 0}) is False

    def test_is_in_demand(self):
        from app.routers.all import _is_in_demand
        assert _is_in_demand({"demand_12m": 100, "demand_3m": 30}) is True
        assert _is_in_demand({"demand_12m": 0, "demand_3m": 10}) is False

    def test_formation_target_level(self):
        from app.routers.all import _formation_target_level
        assert _formation_target_level({"niveau_vise": 3}) == 3
        assert _formation_target_level({"niveau_cible": 4}) == 4
        assert _formation_target_level({}) == 0

    def test_formation_duration(self):
        from app.routers.all import _formation_duration
        assert _formation_duration({"charge_horaire_global": 30}) == 30.0
        assert _formation_duration({"duree_formation": 40}) == 40.0
        assert _formation_duration({}) == 20.0

    def test_compute_relevance_score(self):
        from app.routers.all import _compute_relevance_score
        formation = {"niveau_vise": 3, "charge_horaire_global": 20}
        score = _compute_relevance_score(formation, 1.0, 4.0)
        assert 0.0 <= score <= 1.0

    def test_compute_relevance_score_no_gap(self):
        from app.routers.all import _compute_relevance_score
        formation = {"niveau_vise": 3, "charge_horaire_global": 20}
        score = _compute_relevance_score(formation, 4.0, 4.0)
        assert 0.0 <= score <= 1.0


# ======================================================================
# app/routers/analytics.py  (45.8%)
# ======================================================================


class TestAnalyticsHelpers:
    def test_build_domaine_demand(self):
        from app.routers.analytics import _build_domaine_demand
        data = [
            {"competence_id": 1, "total_demand": 50},
            {"competence_id": 2, "total_demand": 30},
        ]
        result = _build_domaine_demand(data, 100)
        assert result[1] == 0.5
        assert result[2] == 0.3

    def test_build_domaine_demand_skip_empty_cid(self):
        from app.routers.analytics import _build_domaine_demand
        data = [{"competence_id": None, "total_demand": 50}]
        result = _build_domaine_demand(data, 100)
        assert result == {}

    def test_build_domaine_demand_zero_total(self):
        from app.routers.analytics import _build_domaine_demand
        data = [{"competence_id": 1, "total_demand": 50}]
        result = _build_domaine_demand(data, 0)
        assert result[1] == 50.0  # max(0, 1) = 1

    def test_dsi_error_helper(self):
        from app.routers.analytics import _dsi_error
        result = _dsi_error(404, "ENS-404", "Not found", "/api/test")
        assert "status" in result
        assert result["status"] == 404


class TestAnalyticsUpsertRiskProfile:
    def test_upsert_risk_profile_new(self):
        from app.routers.analytics import _upsert_risk_profile
        mock_db = make_mock_db()
        mock_db.query.return_value.filter_by.return_value.first.return_value = None

        gap = MagicMock()
        gap.niveau_urgence = "CRITIQUE"
        gap.mois_stagnation = 12
        gap.en_regression = True

        snapshot = MagicMock()
        snapshot.taux_completion_formations = 50.0

        _upsert_risk_profile(mock_db, "E001", [gap], snapshot)
        mock_db.add.assert_called()
        mock_db.flush.assert_called()

    def test_upsert_risk_profile_existing(self):
        from app.routers.analytics import _upsert_risk_profile
        mock_db = make_mock_db()
        existing = MagicMock()
        existing.score_risque = 0.3
        mock_db.query.return_value.filter_by.return_value.first.return_value = existing

        gap = MagicMock()
        gap.niveau_urgence = "HAUTE"
        gap.mois_stagnation = 6
        gap.en_regression = False

        snapshot = MagicMock()
        snapshot.taux_completion_formations = 80.0

        _upsert_risk_profile(mock_db, "E001", [gap], snapshot)
        assert existing.precedent_score_risque == 0.3
        mock_db.flush.assert_called()


class TestAnalyticsAnalyzeEndpoint:
    def test_analyze_success(self, client: TestClient):
        mock_db = make_mock_db()
        app.dependency_overrides[get_db] = lambda: mock_db
        with patch("app.routers.analytics.DataService") as MockDS, \
             patch("app.routers.analytics.FeatureEngine") as MockFE, \
             patch("app.routers.analytics.GapEngine") as MockGE, \
             patch("app.routers.analytics.RecommendationEngine") as MockRE, \
             patch("app.routers.analytics.AlertEngine") as MockAE, \
             patch("app.routers.analytics._upsert_risk_profile"):
            MockDS.return_value.get_teacher_profile.return_value = [
                {"departement_id": "GC"}
            ]
            MockDS.return_value.get_competency_levels.return_value = []
            MockDS.return_value.get_required_levels.return_value = []
            MockDS.return_value.get_all_formations.return_value = []
            MockDS.return_value.get_formation_competencies.return_value = []
            MockDS.return_value.get_inscriptions.return_value = []
            MockDS.return_value.get_evaluations.return_value = []
            MockDS.return_value.get_evaluations_globales.return_value = []
            MockDS.return_value.get_besoins.return_value = []
            MockDS.return_value.get_certificats.return_value = []
            MockDS.return_value.get_prerequisite_graph.return_value = []
            MockDS.return_value.get_besoin_demand.return_value = []

            mock_snapshot = MagicMock()
            mock_snapshot.taux_completion_formations = 50.0
            mock_snapshot.taux_presence_moyen = 80.0
            mock_snapshot.niveau_moyen_competences = 3.0
            MockFE.return_value.build_snapshot.return_value = mock_snapshot

            mock_gap = MagicMock()
            mock_gap.niveau_urgence = "HAUTE"
            MockGE.return_value.compute_gaps.return_value = [mock_gap]

            MockRE.return_value.generate.return_value = ([], [])
            MockAE.return_value.detect_and_save.return_value = []

            try:
                resp = client.post("/api/v1/analytics/analyze/E001")
                assert resp.status_code == 202
                data = resp.json()
                assert data["enseignant_id"] == "E001"
                assert data["statut"] == "TERMINE"
            finally:
                app.dependency_overrides.clear()

    def test_analyze_error_path(self, client: TestClient):
        mock_db = make_mock_db()
        app.dependency_overrides[get_db] = lambda: mock_db
        with patch("app.routers.analytics.DataService") as MockDS:
            MockDS.return_value.get_teacher_profile.return_value = [{"departement_id": "GC"}]
            MockDS.return_value.get_competency_levels.side_effect = Exception("DB error")
            try:
                resp = client.post("/api/v1/analytics/analyze/E001")
                assert resp.status_code == 500
            finally:
                app.dependency_overrides.clear()


class TestAnalyticsGetGapsWithFilters:
    def test_gaps_with_urgence_filter(self, client: TestClient):
        resp = client.get("/api/v1/analytics/gaps/E001?urgence=CRITIQUE")
        assert resp.status_code == 200


class TestAnalyticsRecommendationsWithFilter:
    def test_recommendations_with_competence_filter(self, client: TestClient):
        resp = client.get("/api/v1/analytics/recommendations/E001?competence_id=1")
        assert resp.status_code == 200


class TestAnalyticsAlertsUpdate:
    def test_update_alert_success(self, client: TestClient):
        mock_db = make_mock_db()
        mock_alert = MagicMock()
        mock_alert.id = 1
        mock_alert.statut = "NOUVELLE"
        mock_db.query.return_value.filter_by.return_value.first.return_value = mock_alert
        app.dependency_overrides[get_db] = lambda: mock_db
        try:
            resp = client.patch("/api/v1/analytics/alerts/1?statut=TRAITEE")
            assert resp.status_code == 200
            data = resp.json()
            assert data["statut"] == "TRAITEE"
        finally:
            app.dependency_overrides.clear()

    def test_update_alert_invalid_statut(self, client: TestClient):
        mock_db = make_mock_db()
        app.dependency_overrides[get_db] = lambda: mock_db
        try:
            resp = client.patch("/api/v1/analytics/alerts/1?statut=INVALID")
            assert resp.status_code == 400
        finally:
            app.dependency_overrides.clear()


class TestAnalyticsDashboardSeuil:
    def test_teachers_at_risk_custom_seuil(self, client: TestClient):
        resp = client.get("/api/v1/analytics/dashboard/teachers-at-risk?seuil=0.8")
        assert resp.status_code == 200


class TestAnalyticsBatchTrigger:
    def test_batch_trigger_no_teachers(self, client: TestClient):
        mock_db = make_mock_db()
        app.dependency_overrides[get_db] = lambda: mock_db
        with patch("app.routers.analytics.DataService") as MockDS:
            MockDS.return_value.get_all_enseignants.return_value = []
            try:
                resp = client.post("/api/v1/analytics/trigger-batch-analysis")
                assert resp.status_code == 202
                data = resp.json()
                assert data["nb_queued"] == 0
            finally:
                app.dependency_overrides.clear()

    def test_batch_trigger_with_teachers(self, client: TestClient):
        mock_db = make_mock_db()
        app.dependency_overrides[get_db] = lambda: mock_db
        with patch("app.routers.analytics.DataService") as MockDS:
            MockDS.return_value.get_all_enseignants.return_value = [
                {"enseignant_id": "E001"}, {"enseignant_id": "E002"},
            ]
            try:
                resp = client.post("/api/v1/analytics/trigger-batch-analysis")
                assert resp.status_code == 202
                data = resp.json()
                assert data["nb_queued"] == 2
            finally:
                app.dependency_overrides.clear()


# ======================================================================
# app/scheduler/jobs.py  (47.4%)
# ======================================================================


class TestSchedulerJobs:
    def test_analyse_un_enseignant_no_profile(self):
        with patch("app.scheduler.jobs.db_session") as mock_session:
            mock_db = make_mock_db()
            mock_session.return_value.__enter__ = MagicMock(return_value=mock_db)
            mock_session.return_value.__exit__ = MagicMock(return_value=False)
            with patch("app.scheduler.jobs.DataService") as MockDS:
                MockDS.return_value.get_teacher_profile.return_value = []
                from app.scheduler.jobs import _analyse_un_enseignant
                result = _analyse_un_enseignant("UNKNOWN")
                assert result is False

    def test_analyse_un_enseignant_success(self):
        with patch("app.scheduler.jobs.db_session") as mock_session:
            mock_db = make_mock_db()
            mock_session.return_value.__enter__ = MagicMock(return_value=mock_db)
            mock_session.return_value.__exit__ = MagicMock(return_value=False)
            with patch("app.scheduler.jobs.DataService") as MockDS, \
                 patch("app.scheduler.jobs.FeatureEngine") as MockFE, \
                 patch("app.scheduler.jobs.GapEngine") as MockGE, \
                 patch("app.scheduler.jobs.RecommendationEngine") as MockRE, \
                 patch("app.scheduler.jobs.AlertEngine") as MockAE, \
                 patch("app.scheduler.jobs._upsert_risk_profile"):
                MockDS.return_value.get_teacher_profile.return_value = [{"departement_id": "GC"}]
                MockDS.return_value.get_competency_levels.return_value = []
                MockDS.return_value.get_required_levels.return_value = []
                MockDS.return_value.get_all_formations.return_value = []
                MockDS.return_value.get_formation_competencies.return_value = []
                MockDS.return_value.get_inscriptions.return_value = []
                MockDS.return_value.get_evaluations.return_value = []
                MockDS.return_value.get_evaluations_globales.return_value = []
                MockDS.return_value.get_besoins.return_value = []
                MockDS.return_value.get_certificats.return_value = []
                MockDS.return_value.get_prerequisite_graph.return_value = []
                MockDS.return_value.get_besoin_demand.return_value = []

                mock_snapshot = MagicMock()
                mock_snapshot.taux_completion_formations = 50.0
                mock_snapshot.taux_presence_moyen = 80.0
                MockFE.return_value.build_snapshot.return_value = mock_snapshot

                mock_gap = MagicMock()
                mock_gap.niveau_urgence = "HAUTE"
                MockGE.return_value.compute_gaps.return_value = [mock_gap]

                MockRE.return_value.generate.return_value = ([], [])
                MockAE.return_value.detect_and_save.return_value = []

                from app.scheduler.jobs import _analyse_un_enseignant
                result = _analyse_un_enseignant("E001")
                assert result is True

    def test_analyse_un_enseignant_exception(self):
        with patch("app.scheduler.jobs.db_session") as mock_session:
            mock_session.return_value.__enter__ = MagicMock(side_effect=Exception("DB error"))
            mock_session.return_value.__exit__ = MagicMock(return_value=False)
            from app.scheduler.jobs import _analyse_un_enseignant
            result = _analyse_un_enseignant("E001")
            assert result is False

    def test_start_scheduler_already_running(self):
        from app.scheduler.jobs import start_scheduler
        import app.scheduler.jobs as jobs_mod
        original = jobs_mod._scheduler
        mock_sched = MagicMock()
        mock_sched.running = True
        jobs_mod._scheduler = mock_sched
        start_scheduler()  # Should return early
        jobs_mod._scheduler = original

    def test_stop_scheduler(self):
        from app.scheduler.jobs import stop_scheduler
        import app.scheduler.jobs as jobs_mod
        original = jobs_mod._scheduler
        mock_sched = MagicMock()
        mock_sched.running = True
        jobs_mod._scheduler = mock_sched
        stop_scheduler()
        mock_sched.shutdown.assert_called_once()
        jobs_mod._scheduler = original

    def test_job_batch_analysis_all(self):
        with patch("app.scheduler.jobs.db_session") as mock_session:
            mock_db = make_mock_db()
            mock_session.return_value.__enter__ = MagicMock(return_value=mock_db)
            mock_session.return_value.__exit__ = MagicMock(return_value=False)
            with patch("app.scheduler.jobs.DataService") as MockDS, \
                 patch("app.scheduler.jobs._analyse_un_enseignant", return_value=True):
                MockDS.return_value.get_all_enseignants.return_value = [
                    {"enseignant_id": "E001"},
                ]
                from app.scheduler.jobs import job_batch_analysis_all
                job_batch_analysis_all()  # Should not raise

    def test_job_dashboard_refresh(self):
        with patch("app.scheduler.jobs.db_session") as mock_session:
            mock_db = make_mock_db()
            mock_session.return_value.__enter__ = MagicMock(return_value=mock_db)
            mock_session.return_value.__exit__ = MagicMock(return_value=False)
            with patch("app.scheduler.jobs.DashboardEngine") as MockDE:
                MockDE.return_value.compute_all.return_value = {"kpi": 1}
                from app.scheduler.jobs import job_dashboard_refresh
                job_dashboard_refresh()  # Should not raise

    def test_job_alert_cleanup(self):
        with patch("app.scheduler.jobs.db_session") as mock_session:
            mock_db = make_mock_db()
            mock_db.query.return_value.filter.return_value.delete.return_value = 5
            mock_session.return_value.__enter__ = MagicMock(return_value=mock_db)
            mock_session.return_value.__exit__ = MagicMock(return_value=False)
            from app.scheduler.jobs import job_alert_cleanup
            job_alert_cleanup()  # Should not raise


# ======================================================================
# app/messaging/consumer.py  (RabbitMQ AMQP)
# ======================================================================


class TestMessagingConsumer:
    def test_consumer_on_message_valid_event(self):
        from app.messaging.consumer import AnalyticsEventConsumer
        consumer = AnalyticsEventConsumer()
        channel = MagicMock()
        method = MagicMock()
        properties = MagicMock()
        body = json.dumps({"event": "EVALUATION_SUBMITTED", "enseignantId": "E001"}).encode()
        with patch.object(consumer, "_trigger_individual_analysis") as mock_trigger:
            consumer._on_message(channel, method, properties, body)
            mock_trigger.assert_called_once_with("E001")
            channel.basic_ack.assert_called_once()

    def test_consumer_on_message_no_eid(self):
        from app.messaging.consumer import AnalyticsEventConsumer
        consumer = AnalyticsEventConsumer()
        channel = MagicMock()
        method = MagicMock()
        properties = MagicMock()
        body = json.dumps({"event": "EVALUATION_SUBMITTED"}).encode()
        with patch.object(consumer, "_trigger_individual_analysis") as mock_trigger:
            consumer._on_message(channel, method, properties, body)
            mock_trigger.assert_not_called()
            channel.basic_ack.assert_called_once()

    def test_consumer_on_message_invalid_json(self):
        from app.messaging.consumer import AnalyticsEventConsumer
        consumer = AnalyticsEventConsumer()
        channel = MagicMock()
        method = MagicMock()
        properties = MagicMock()
        body = b"not json"
        consumer._on_message(channel, method, properties, body)  # Should not raise
        channel.basic_nack.assert_called_once()

    def test_consumer_connect_no_credentials(self):
        from app.messaging.consumer import AnalyticsEventConsumer
        consumer = AnalyticsEventConsumer()
        with patch("app.messaging.consumer.RABBITMQ_USER", ""), \
             patch("app.messaging.consumer.RABBITMQ_PASSWORD", ""):
            with pytest.raises(RuntimeError, match="credentials"):
                consumer.connect()

    def test_consumer_disconnect(self):
        from app.messaging.consumer import AnalyticsEventConsumer
        consumer = AnalyticsEventConsumer()
        consumer._connection = MagicMock()
        consumer._connection.is_open = True
        consumer._channel = MagicMock()
        consumer._channel.is_open = True
        consumer.disconnect()
        consumer._channel.stop_consuming.assert_called_once()
        consumer._connection.close.assert_called_once()

    def test_consumer_disconnect_no_conn(self):
        from app.messaging.consumer import AnalyticsEventConsumer
        consumer = AnalyticsEventConsumer()
        consumer._connection = None
        consumer.disconnect()  # Should not raise

    def test_consumer_schedule_reconnect_max_attempts(self):
        from app.messaging.consumer import AnalyticsEventConsumer
        consumer = AnalyticsEventConsumer()
        consumer._reconnect_attempts = 100  # Exceeds MAX_RECONNECT_ATTEMPTS
        consumer._schedule_reconnect()  # Should return without scheduling

    def test_consumer_schedule_reconnect_disabled(self):
        from app.messaging.consumer import AnalyticsEventConsumer
        consumer = AnalyticsEventConsumer()
        consumer._should_reconnect = False
        consumer._schedule_reconnect()  # Should return without scheduling

    def test_start_consumer_disabled(self):
        from app.messaging.consumer import start_consumer
        with patch("app.messaging.consumer.MESSAGING_ENABLED", False):
            start_consumer()  # Should return early

    def test_stop_consumer(self):
        from app.messaging.consumer import stop_consumer
        import app.messaging.consumer as consumer_mod
        original = consumer_mod._consumer_instance
        mock_consumer = MagicMock()
        consumer_mod._consumer_instance = mock_consumer
        stop_consumer()
        mock_consumer.disconnect.assert_called_once()
        consumer_mod._consumer_instance = original

    def test_consumer_connect_with_pika(self):
        from app.messaging.consumer import AnalyticsEventConsumer
        consumer = AnalyticsEventConsumer()
        mock_pika = MagicMock()
        mock_conn = MagicMock()
        mock_pika.BlockingConnection.return_value = mock_conn
        mock_pika.PlainCredentials.return_value = MagicMock()
        mock_pika.ConnectionParameters.return_value = MagicMock()
        with patch("app.messaging.consumer.RABBITMQ_USER", "d2f"), \
             patch("app.messaging.consumer.RABBITMQ_PASSWORD", "pass"), \
             patch("app.messaging.consumer.pika", mock_pika):
            # connect() calls start_consuming() which blocks, so mock it
            mock_conn.channel.return_value.start_consuming.return_value = None
            consumer.connect()
            mock_pika.BlockingConnection.assert_called_once()
            assert consumer._reconnect_attempts == 0

    def test_consumer_connect_exception_triggers_reconnect(self):
        from app.messaging.consumer import AnalyticsEventConsumer
        import pika.exceptions
        consumer = AnalyticsEventConsumer()
        mock_pika = MagicMock()
        mock_pika.exceptions = pika.exceptions
        mock_pika.BlockingConnection.side_effect = pika.exceptions.AMQPConnectionError("Connection refused")
        mock_pika.PlainCredentials.return_value = MagicMock()
        mock_pika.ConnectionParameters.return_value = MagicMock()
        with patch("app.messaging.consumer.RABBITMQ_USER", "d2f"), \
             patch("app.messaging.consumer.RABBITMQ_PASSWORD", "pass"), \
             patch("app.messaging.consumer.pika", mock_pika), \
             patch.object(consumer, "_schedule_reconnect") as mock_reconnect:
            consumer.connect()
            mock_reconnect.assert_called_once()

    def test_consumer_trigger_individual_analysis(self):
        from app.messaging.consumer import AnalyticsEventConsumer
        consumer = AnalyticsEventConsumer()
        with patch("app.messaging.consumer.threading.Thread") as MockThread:
            mock_thread = MagicMock()
            MockThread.return_value = mock_thread
            consumer._trigger_individual_analysis("E001")
            MockThread.assert_called_once()
            mock_thread.start.assert_called_once()

    def test_consumer_schedule_reconnect_first_attempt(self):
        from app.messaging.consumer import AnalyticsEventConsumer
        consumer = AnalyticsEventConsumer()
        consumer._reconnect_attempts = 0
        with patch("app.messaging.consumer.threading.Thread") as MockThread:
            mock_thread = MagicMock()
            MockThread.return_value = mock_thread
            consumer._schedule_reconnect()
            MockThread.assert_called_once()
            assert consumer._reconnect_attempts == 1

    def test_consumer_schedule_reconnect_high_attempt(self):
        from app.messaging.consumer import AnalyticsEventConsumer
        consumer = AnalyticsEventConsumer()
        consumer._reconnect_attempts = 3
        with patch("app.messaging.consumer.threading.Thread") as MockThread:
            mock_thread = MagicMock()
            MockThread.return_value = mock_thread
            consumer._schedule_reconnect()
            assert consumer._reconnect_attempts == 4

    def test_consumer_disconnect_with_exception(self):
        from app.messaging.consumer import AnalyticsEventConsumer
        consumer = AnalyticsEventConsumer()
        mock_conn = MagicMock()
        mock_conn.is_open = True
        mock_conn.close.side_effect = Exception("disconnect error")
        consumer._connection = mock_conn
        consumer._channel = MagicMock()
        consumer._channel.is_open = False
        consumer.disconnect()  # Should not raise
        assert consumer._should_reconnect is False

    def test_consumer_on_message_inscription_approved(self):
        from app.messaging.consumer import AnalyticsEventConsumer
        consumer = AnalyticsEventConsumer()
        channel = MagicMock()
        method = MagicMock()
        properties = MagicMock()
        body = json.dumps({"event": "INSCRIPTION_APPROVED", "enseignantId": "E002"}).encode()
        with patch.object(consumer, "_trigger_individual_analysis") as mock_trigger:
            consumer._on_message(channel, method, properties, body)
            mock_trigger.assert_called_once_with("E002")

    def test_consumer_on_message_besoin_approved(self):
        from app.messaging.consumer import AnalyticsEventConsumer
        consumer = AnalyticsEventConsumer()
        channel = MagicMock()
        method = MagicMock()
        properties = MagicMock()
        body = json.dumps({"event": "BESOIN_APPROVED", "enseignantId": "E003"}).encode()
        with patch.object(consumer, "_trigger_individual_analysis") as mock_trigger:
            consumer._on_message(channel, method, properties, body)
            mock_trigger.assert_called_once_with("E003")

    def test_consumer_on_message_unknown_event(self):
        from app.messaging.consumer import AnalyticsEventConsumer
        consumer = AnalyticsEventConsumer()
        channel = MagicMock()
        method = MagicMock()
        properties = MagicMock()
        body = json.dumps({"event": "UNKNOWN_EVENT", "enseignantId": "E004"}).encode()
        with patch.object(consumer, "_trigger_individual_analysis") as mock_trigger:
            consumer._on_message(channel, method, properties, body)
            mock_trigger.assert_not_called()
            channel.basic_ack.assert_called_once()

    def test_consumer_on_message_exception_triggers_nack(self):
        from app.messaging.consumer import AnalyticsEventConsumer
        consumer = AnalyticsEventConsumer()
        channel = MagicMock()
        method = MagicMock()
        properties = MagicMock()
        body = b"\x80\x80\x80"  # invalid msgpack/pika decoding triggers exception path
        consumer._on_message(channel, method, properties, body)
        channel.basic_nack.assert_called_once()

    def test_start_consumer_enabled(self):
        from app.messaging.consumer import start_consumer
        import app.messaging.consumer as consumer_mod
        original_instance = consumer_mod._consumer_instance
        original_thread = consumer_mod._consumer_thread
        mock_consumer = MagicMock()
        with patch("app.messaging.consumer.MESSAGING_ENABLED", True), \
             patch("app.messaging.consumer.AnalyticsEventConsumer", return_value=mock_consumer), \
             patch("app.messaging.consumer.threading.Thread") as MockThread:
            mock_thread = MagicMock()
            MockThread.return_value = mock_thread
            start_consumer()
            MockThread.assert_called_once()
            mock_thread.start.assert_called_once()
        consumer_mod._consumer_instance = original_instance
        consumer_mod._consumer_thread = original_thread

    def test_stop_consumer_no_instance(self):
        from app.messaging.consumer import stop_consumer
        import app.messaging.consumer as consumer_mod
        original = consumer_mod._consumer_instance
        consumer_mod._consumer_instance = None
        stop_consumer()  # Should not raise
        consumer_mod._consumer_instance = original


# ======================================================================
# app/ml/gap_predictor.py  (66.7%)
# ======================================================================


class TestGapPredictorCheckDrift:
    def test_check_drift_no_model(self):
        from app.ml.gap_predictor import GapPredictor
        predictor = GapPredictor()
        predictor.model = None
        result = predictor.check_drift([], [])
        assert result["drift_detected"] is False

    def test_check_drift_no_data(self):
        from app.ml.gap_predictor import GapPredictor
        predictor = GapPredictor()
        predictor.model = MagicMock()
        with patch("app.ml.gap_predictor.build_teacher_features", return_value=__import__("pandas").DataFrame()):
            result = predictor.check_drift([], [])
            assert result["drift_detected"] is False

    def test_check_drift_no_metadata(self):
        from app.ml.gap_predictor import GapPredictor
        import pandas as pd
        predictor = GapPredictor()
        predictor.model = MagicMock()
        predictor.feature_importances = {"avg_level": 0.1}
        df = pd.DataFrame({"avg_level": [1.0]})
        with patch("app.ml.gap_predictor.build_teacher_features", return_value=df), \
             patch("os.path.exists", return_value=False):
            result = predictor.check_drift([], [])
            assert result["drift_detected"] is False
            assert "No training metadata" in result["message"]


class TestGapPredictorPredict:
    def test_predict_no_model_heuristic(self):
        from app.ml.gap_predictor import GapPredictor
        predictor = GapPredictor()
        predictor.model = None
        with patch("app.ml.gap_predictor.build_teacher_features", return_value=__import__("pandas").DataFrame()), \
             patch("app.ml.gap_predictor.build_gap_labels", return_value=__import__("pandas").DataFrame()):
            result = predictor.predict([], [], [])
            assert "gaps" in result
            assert "avg_predicted_gap" in result


class TestGapPredictorSaveMetadata:
    def test_save_training_metadata(self, tmp_path):
        from app.ml.gap_predictor import GapPredictor
        predictor = GapPredictor()
        predictor.feature_importances = {"avg_level": 0.5}
        with patch("app.ml.gap_predictor.settings") as mock_settings:
            mock_settings.models_dir = str(tmp_path)
            predictor._save_training_metadata()
            meta_file = tmp_path / "training_metadata.json"
            assert meta_file.exists()
            data = json.loads(meta_file.read_text())
            assert "feature_importances" in data


# ======================================================================
# app/main.py  (70.5%)
# ======================================================================


class TestMainLifespan:
    def test_init_db_tables_success(self):
        from app.main import _init_db_tables
        # _init_db_tables uses local imports, just verify it does not raise
        with patch("app.core.db.engine"):
            with patch("app.models.db_models.Base.metadata.create_all"):
                _init_db_tables()

    def test_init_db_tables_failure(self):
        from app.main import _init_db_tables
        with patch("app.core.db.engine", side_effect=Exception("DB error")):
            _init_db_tables()  # Should not raise, just log error

    def test_metrics_endpoint(self, client: TestClient):
        from app.core.auth import require_metrics_auth
        app.dependency_overrides[require_metrics_auth] = lambda: None
        try:
            resp = client.get("/metrics")
            assert resp.status_code == 200
            data = resp.json()
            assert "service" in data
            assert "uptime_seconds" in data
        finally:
            app.dependency_overrides.pop(require_metrics_auth, None)


class TestMainApp:
    def test_app_title(self):
        assert app.title == "D2F Predictive Analytics API"

    def test_app_has_routers(self):
        routes = [r.path for r in app.routes]
        assert any("/api" in str(r) for r in routes)
