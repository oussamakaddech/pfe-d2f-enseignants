"""
Tests de verification pour les corrections du service Predictive Analytics.
"""

import os
os.environ.setdefault("JWT_AUTH_ENABLED", "false")
os.environ.setdefault("SCHEDULER_ENABLED", "false")
os.environ.setdefault("MESSAGING_ENABLED", "false")
os.environ.setdefault("DEBUG", "false")
os.environ.setdefault("APP_ENV", "test")
os.environ.setdefault("JWT_SECRET", "test-jwt-secret-for-pytest-only-" + ("x" * 32))

import pytest
import json
import tempfile
from unittest.mock import MagicMock, patch
from datetime import date, datetime, timezone, timedelta

from fastapi.testclient import TestClient


def make_mock_db():
    db = MagicMock()
    mock_q = db.query.return_value
    mock_q.filter.return_value.all.return_value = []
    mock_q.filter.return_value.first.return_value = None
    mock_q.filter.return_value.count.return_value = 0
    mock_q.filter.return_value.offset.return_value.limit.return_value.all.return_value = []
    mock_q.filter.return_value.order_by.return_value.all.return_value = []
    mock_q.filter.return_value.order_by.return_value.first.return_value = None
    mock_q.filter_by.return_value.first.return_value = None
    mock_q.filter_by.return_value.order_by.return_value.first.return_value = None
    mock_q.filter_by.return_value.order_by.return_value.all.return_value = []
    mock_q.filter_by.return_value.all.return_value = []
    mock_q.order_by.return_value.all.return_value = []
    mock_q.order_by.return_value.first.return_value = None
    mock_q.order_by.return_value.offset.return_value.limit.return_value.all.return_value = []
    db.add.return_value = None
    db.flush.return_value = None
    db.commit.return_value = None
    return db


# ==============================================================================
# 1. KPI 4 - Taux couverture departements
# ==============================================================================

class TestKPI4Departements:

    def test_aggregates_by_dept_not_global(self):
        from app.engines.dashboard_engine import DashboardEngine
        db = MagicMock()
        row1 = MagicMock(enseignant_id="E1", competence_id=1, niveau_actuel=4, niveau_requis=3)
        row2 = MagicMock(enseignant_id="E2", competence_id=1, niveau_actuel=1, niveau_requis=4)
        db.query.return_value.filter.return_value.all.return_value = [row1, row2]
        with patch("app.engines.dashboard_engine.execute_query") as mock_exec,              patch("app.engines.dashboard_engine._db_session") as mock_session:
            mock_session.return_value.__enter__ = MagicMock(return_value=MagicMock())
            mock_session.return_value.__exit__ = MagicMock(return_value=False)
            mock_exec.return_value = [
                {"enseignant_id": "E1", "departement_id": "DEPT_A"},
                {"enseignant_id": "E2", "departement_id": "DEPT_B"},
            ]
            engine = DashboardEngine(db)
            result = engine.taux_couverture_departements()
        depts = {r["departement"] for r in result}
        assert "DEPT_A" in depts
        assert "DEPT_B" in depts
        assert "global" not in depts

    def test_couverture_100_percent(self):
        from app.engines.dashboard_engine import DashboardEngine
        db = MagicMock()
        row = MagicMock(enseignant_id="E1", competence_id=1, niveau_actuel=5, niveau_requis=3)
        db.query.return_value.filter.return_value.all.return_value = [row]
        with patch("app.engines.dashboard_engine.execute_query") as mock_exec,              patch("app.engines.dashboard_engine._db_session") as mock_session:
            mock_session.return_value.__enter__ = MagicMock(return_value=MagicMock())
            mock_session.return_value.__exit__ = MagicMock(return_value=False)
            mock_exec.return_value = [{"enseignant_id": "E1", "departement_id": "DEPT_X"}]
            engine = DashboardEngine(db)
            result = engine.taux_couverture_departements()
        assert result[0]["departement"] == "DEPT_X"
        assert result[0]["taux_couverture"] == 100.0

    def test_results_sorted(self):
        from app.engines.dashboard_engine import DashboardEngine
        db = MagicMock()
        db.query.return_value.filter.return_value.all.return_value = []
        with patch("app.engines.dashboard_engine.execute_query") as mock_exec,              patch("app.engines.dashboard_engine._db_session") as mock_session:
            mock_session.return_value.__enter__ = MagicMock(return_value=MagicMock())
            mock_session.return_value.__exit__ = MagicMock(return_value=False)
            mock_exec.return_value = [
                {"enseignant_id": "E1", "departement_id": "Z_DEPT"},
                {"enseignant_id": "E2", "departement_id": "A_DEPT"},
            ]
            engine = DashboardEngine(db)
            result = engine.taux_couverture_departements()
        names = [r["departement"] for r in result]
        assert names == sorted(names)


# ==============================================================================
# 2. Pagination DB - DataService
# ==============================================================================

class TestDataServicePagination:

    def test_no_pagination_by_default(self):
        from app.services.data_service import DataService
        db = MagicMock()
        with patch("app.services.data_service.execute_query", return_value=[{"id": 1}]) as m:
            DataService(db).get_required_levels()
            assert "LIMIT" not in m.call_args[0][1]

    def test_pagination_adds_limit_offset(self):
        from app.services.data_service import DataService
        db = MagicMock()
        with patch("app.services.data_service.execute_query", return_value=[{"id": 1}]) as m:
            DataService(db).get_required_levels(page=2, size=50)
            assert "LIMIT" in m.call_args[0][1]
            assert "OFFSET" in m.call_args[0][1]
            assert m.call_args[0][2]["limit"] == 50
            assert m.call_args[0][2]["offset"] == 100

    def test_formations_pagination(self):
        from app.services.data_service import DataService
        db = MagicMock()
        with patch("app.services.data_service.execute_query", return_value=[]) as m:
            DataService(db).get_all_formations(page=0, size=20)
            assert m.call_args[0][2]["limit"] == 20
            assert m.call_args[0][2]["offset"] == 0

    def test_formation_competencies_pagination(self):
        from app.services.data_service import DataService
        db = MagicMock()
        with patch("app.services.data_service.execute_query", return_value=[]) as m:
            DataService(db).get_formation_competencies(page=1, size=10)
            assert m.call_args[0][2]["limit"] == 10
            assert m.call_args[0][2]["offset"] == 10

    def test_evaluations_globales_pagination(self):
        from app.services.data_service import DataService
        db = MagicMock()
        with patch("app.services.data_service.execute_query", return_value=[]) as m:
            DataService(db).get_evaluations_globales(page=3, size=25)
            assert m.call_args[0][2]["limit"] == 25
            assert m.call_args[0][2]["offset"] == 75

    def test_default_page_size(self):
        from app.services.data_service import DataService
        assert DataService.DEFAULT_PAGE_SIZE == 500


# ==============================================================================
# 3. Health check DB
# ==============================================================================

class TestHealthCheckDB:

    def test_healthy_when_db_ok(self):
        from app.main import app
        from app.core.db import get_db
        mock_db = make_mock_db()
        mock_db.execute.return_value = MagicMock()
        app.dependency_overrides[get_db] = lambda: mock_db
        with patch("app.main._init_db_tables"):
            with TestClient(app, raise_server_exceptions=False) as c:
                resp = c.get("/api/health")
                assert resp.status_code == 200
                assert resp.json()["status"] == "healthy"
        app.dependency_overrides.clear()

    def test_degraded_when_db_fails(self):
        from app.main import app
        from app.core.db import get_db
        mock_db = make_mock_db()
        mock_db.execute.side_effect = Exception("DB failed")
        app.dependency_overrides[get_db] = lambda: mock_db
        with patch("app.main._init_db_tables"):
            with TestClient(app, raise_server_exceptions=False) as c:
                resp = c.get("/api/health")
                assert resp.status_code == 200
                assert resp.json()["status"] == "degraded"
        app.dependency_overrides.clear()


# ==============================================================================
# 4. Parallelisation batch
# ==============================================================================

class TestBatchParallelization:

    def test_processes_all_teachers(self):
        from app.scheduler import jobs
        with patch("app.scheduler.jobs._analyse_un_enseignant", return_value=True) as m,              patch("app.scheduler.jobs.db_session") as ms,              patch("app.scheduler.jobs.DataService") as msvc:
            msvc.return_value.get_all_enseignants.return_value = [
                {"enseignant_id": "E1"}, {"enseignant_id": "E2"}, {"enseignant_id": "E3"},
            ]
            ms.return_value.__enter__ = MagicMock(return_value=MagicMock())
            ms.return_value.__exit__ = MagicMock(return_value=False)
            jobs.job_batch_analysis_all()
            assert m.call_count == 3

    def test_handles_errors(self):
        from app.scheduler import jobs
        with patch("app.scheduler.jobs._analyse_un_enseignant", return_value=False) as m,              patch("app.scheduler.jobs.db_session") as ms,              patch("app.scheduler.jobs.DataService") as msvc:
            msvc.return_value.get_all_enseignants.return_value = [{"enseignant_id": "E1"}]
            ms.return_value.__enter__ = MagicMock(return_value=MagicMock())
            ms.return_value.__exit__ = MagicMock(return_value=False)
            jobs.job_batch_analysis_all()
            assert m.call_count == 1

    def test_empty_list_no_crash(self):
        from app.scheduler import jobs
        with patch("app.scheduler.jobs._analyse_un_enseignant", return_value=True) as m,              patch("app.scheduler.jobs.db_session") as ms,              patch("app.scheduler.jobs.DataService") as msvc:
            msvc.return_value.get_all_enseignants.return_value = []
            ms.return_value.__enter__ = MagicMock(return_value=MagicMock())
            ms.return_value.__exit__ = MagicMock(return_value=False)
            jobs.job_batch_analysis_all()
            assert m.call_count == 0


# ==============================================================================
# 5. Graceful shutdown scheduler
# ==============================================================================

class TestGracefulShutdown:

    def test_stop_scheduler_waits(self):
        from app.scheduler import jobs
        mock_s = MagicMock()
        mock_s.running = True
        jobs._scheduler = mock_s
        jobs.stop_scheduler()
        mock_s.shutdown.assert_called_once_with(wait=True)

    def test_stop_scheduler_noop_when_none(self):
        from app.scheduler import jobs
        jobs._scheduler = None
        jobs.stop_scheduler()  # Should not raise

    def test_stop_scheduler_noop_when_not_running(self):
        from app.scheduler import jobs
        mock_s = MagicMock()
        mock_s.running = False
        jobs._scheduler = mock_s
        jobs.stop_scheduler()
        mock_s.shutdown.assert_not_called()


# ==============================================================================
# 6. Data drift / model drift monitoring
# ==============================================================================

class TestDriftMonitoring:

    def test_check_drift_no_model(self):
        from app.ml.gap_predictor import GapPredictor
        predictor = GapPredictor()
        predictor.model = None
        result = predictor.check_drift([], [])
        assert result["drift_detected"] is False

    def test_check_drift_no_metadata(self):
        from app.ml.gap_predictor import GapPredictor
        predictor = GapPredictor()
        predictor.model = MagicMock()
        with patch("app.ml.gap_predictor.build_teacher_features") as mock_feat:
            import pandas as pd
            mock_feat.return_value = pd.DataFrame({"enseignant_id": ["E1"]})
            with patch("os.path.exists", return_value=False):
                result = predictor.check_drift(
                    [{"enseignant_id": "E1"}],
                    [{"enseignant_id": "E1", "current_level": 3}],
                )
        assert result["drift_detected"] is False

    def test_save_training_metadata(self):
        from app.ml.gap_predictor import GapPredictor
        predictor = GapPredictor()
        predictor.feature_importances = {"avg_level": 0.3, "engagement_score": 0.2}
        with patch("app.ml.gap_predictor.settings") as mock_settings:
            mock_settings.models_dir = tempfile.mkdtemp()
            predictor._save_training_metadata()
            meta_path = os.path.join(mock_settings.models_dir, "training_metadata.json")
            assert os.path.exists(meta_path)
            with open(meta_path, "r") as f:
                meta = json.load(f)
            assert "trained_at" in meta
            assert "feature_importances" in meta
            assert meta["feature_importances"]["avg_level"] == 0.3

    def test_check_drift_old_model_triggers_alert(self):
        from app.ml.gap_predictor import GapPredictor
        predictor = GapPredictor()
        predictor.model = MagicMock()
        predictor.feature_importances = {"avg_level": 0.3}
        with patch("app.ml.gap_predictor.build_teacher_features") as mock_feat:
            import pandas as pd
            mock_feat.return_value = pd.DataFrame({"enseignant_id": ["E1"]})
            with patch("os.path.exists", return_value=True):
                old_date = (datetime.now() - timedelta(days=120)).isoformat()
                meta = {"trained_at": old_date, "feature_importances": {"avg_level": 0.3}}
                with patch("builtins.open", MagicMock()):
                    with patch("json.load", return_value=meta):
                        result = predictor.check_drift(
                            [{"enseignant_id": "E1"}],
                            [{"enseignant_id": "E1", "current_level": 3}],
                        )
        assert result["drift_detected"] is True
        assert result["recommendation"] is not None


# ==============================================================================
# 7. Endpoint drift check
# ==============================================================================

class TestDriftEndpoint:

    def test_drift_endpoint_returns_200(self):
        from app.main import app
        from app.core.db import get_db
        mock_db = make_mock_db()
        app.dependency_overrides[get_db] = lambda: mock_db
        with patch("app.routers.all.DataService") as mock_svc:
            mock_svc.return_value.get_teacher_profile.return_value = []
            mock_svc.return_value.get_competency_levels.return_value = []
            with patch("app.main._init_db_tables"):
                with TestClient(app, raise_server_exceptions=False) as c:
                    resp = c.get("/api/predict/drift")
                    assert resp.status_code == 200
                    assert "drift_detected" in resp.json()
        app.dependency_overrides.clear()

    def test_drift_endpoint_no_model_no_crash(self):
        from app.main import app
        from app.core.db import get_db
        mock_db = make_mock_db()
        app.dependency_overrides[get_db] = lambda: mock_db
        with patch("app.routers.all.DataService") as mock_svc:
            mock_svc.return_value.get_teacher_profile.return_value = []
            mock_svc.return_value.get_competency_levels.return_value = []
            with patch("app.main._init_db_tables"):
                with TestClient(app, raise_server_exceptions=False) as c:
                    resp = c.get("/api/predict/drift")
                    assert resp.json()["drift_detected"] is False
        app.dependency_overrides.clear()


# ==============================================================================
# 8. Resilience consumer ActiveMQ
# ==============================================================================

class TestActiveMQResilience:

    def test_has_stomp_helper(self):
        from app.messaging.consumer import _has_stomp
        assert isinstance(_has_stomp(), bool)

    def test_consumer_reconnect_attributes(self):
        from app.messaging.consumer import AnalyticsEventConsumer
        c = AnalyticsEventConsumer()
        assert c._reconnect_attempts == 0
        assert c._should_reconnect is True

    def test_consumer_reconnect_delays(self):
        from app.messaging.consumer import AnalyticsEventConsumer
        assert len(AnalyticsEventConsumer.RECONNECT_DELAYS) > 0
        assert all(d > 0 for d in AnalyticsEventConsumer.RECONNECT_DELAYS)

    def test_consumer_max_reconnect(self):
        from app.messaging.consumer import AnalyticsEventConsumer
        assert AnalyticsEventConsumer.MAX_RECONNECT_ATTEMPTS > 0

    def test_disconnect_stops_reconnect(self):
        from app.messaging.consumer import AnalyticsEventConsumer
        c = AnalyticsEventConsumer()
        c.disconnect()
        assert c._should_reconnect is False

    def test_on_error_no_crash(self):
        from app.messaging.consumer import AnalyticsEventConsumer
        c = AnalyticsEventConsumer()
        mock_frame = MagicMock()
        mock_frame.body = "test error"
        c.on_error(mock_frame)  # Should not raise

    def test_on_disconnected_triggers_reconnect(self):
        from app.messaging.consumer import AnalyticsEventConsumer
        c = AnalyticsEventConsumer()
        with patch.object(c, "_schedule_reconnect") as m:
            c.on_disconnected()
            m.assert_called_once()

    def test_schedule_reconnect_respects_max(self):
        from app.messaging.consumer import AnalyticsEventConsumer
        c = AnalyticsEventConsumer()
        c._reconnect_attempts = c.MAX_RECONNECT_ATTEMPTS
        with patch("app.messaging.consumer.threading.Thread") as m:
            c._schedule_reconnect()
            m.assert_not_called()

    def test_schedule_reconnect_disabled_after_disconnect(self):
        from app.messaging.consumer import AnalyticsEventConsumer
        c = AnalyticsEventConsumer()
        c._should_reconnect = False
        with patch("app.messaging.consumer.threading.Thread") as m:
            c._schedule_reconnect()
            m.assert_not_called()


# ==============================================================================
# 9. pg_trgm similarity query
# ==============================================================================

class TestPgTrgmQuery:

    def test_pgtrgm_query_exists(self):
        from app.services.data_service import BESOIN_DEMAND_QUERY_PGTRGM
        assert "similarity" in BESOIN_DEMAND_QUERY_PGTRGM

    def test_pgtrgm_query_has_same_fields(self):
        from app.services.data_service import BESOIN_DEMAND_QUERY_PGTRGM
        for f in ["competence_id", "competence_nom", "domaine_nom", "demand_3m", "demand_12m", "total_demand"]:
            assert f in BESOIN_DEMAND_QUERY_PGTRGM

    def test_fallback_to_ilike(self):
        from app.services.data_service import DataService
        db = MagicMock()
        call_count = [0]
        def side_effect(db_arg, query, params=None):
            call_count[0] += 1
            if call_count[0] == 1 and "similarity" in query:
                raise Exception("pg_trgm not available")
            return [{"competence_id": 1, "competence_nom": "C1", "domaine_nom": "D1",
                      "demand_3m": 2, "demand_12m": 5, "total_demand": 10}]
        with patch("app.services.data_service.execute_query", side_effect=side_effect):
            result = DataService(db).get_besoin_demand(use_pgtrgm=True)
            assert len(result) == 1

    def test_skip_pgtrgm(self):
        from app.services.data_service import DataService
        db = MagicMock()
        with patch("app.services.data_service.execute_query", return_value=[]) as m:
            DataService(db).get_besoin_demand(use_pgtrgm=False)
            assert "similarity" not in m.call_args[0][1]
            assert "ILIKE" in m.call_args[0][1]


# ==============================================================================
# 10. Coherence seuils de risque
# ==============================================================================

class TestSeuilsRisque:

    def _make_teacher(self, days=400, assiduite=0.5, completed=2, besoins=1):
        return {
            "enseignant_id": "E1", "nom": "Test", "prenom": "User",
            "email": "t@t.com", "departement_id": "D1",
            "days_since_last_training": days, "taux_assiduite": assiduite,
            "nb_formations_completed": completed, "nb_besoins_exprimes": besoins,
        }

    def test_uses_settings(self):
        from app.routers.all import _compute_teacher_risk
        result = _compute_teacher_risk(self._make_teacher())
        assert "attrition_risk_score" in result
        assert "recommendation" in result

    def test_high_risk(self):
        from app.routers.all import _compute_teacher_risk
        result = _compute_teacher_risk(self._make_teacher(days=730, assiduite=0.1, completed=0, besoins=0))
        assert result["attrition_risk_score"] > 0.5

    def test_low_risk(self):
        from app.routers.all import _compute_teacher_risk
        result = _compute_teacher_risk(self._make_teacher(days=10, assiduite=0.95, completed=10, besoins=3))
        assert result["attrition_risk_score"] < 0.5
        assert result["recommendation"] == "OK"

    def test_signals_detected(self):
        from app.routers.all import _compute_teacher_risk
        result = _compute_teacher_risk(self._make_teacher(days=400, assiduite=0.2, completed=0, besoins=0))
        assert len(result["disengagement_signals"]) > 0


# ==============================================================================
# 11. Normalisation features ML
# ==============================================================================

class TestFeatureNormalization:

    def test_normalize_0_1_range(self):
        import pandas as pd
        from app.ml.feature_engineering import normalize_features
        df = pd.DataFrame({"avg_level": [1, 2, 3, 4, 5], "min_level": [0, 1, 2, 3, 4]})
        result = normalize_features(df, ["avg_level", "min_level"])
        assert result["avg_level"].min() == 0.0
        assert result["avg_level"].max() == 1.0

    def test_normalize_constant_column(self):
        import pandas as pd
        from app.ml.feature_engineering import normalize_features
        df = pd.DataFrame({"col_a": [5, 5, 5], "col_b": [1, 2, 3]})
        result = normalize_features(df, ["col_a", "col_b"])
        assert (result["col_a"] == 0.0).all()
        assert result["col_b"].max() == 1.0

    def test_normalize_preserves_non_numeric(self):
        import pandas as pd
        from app.ml.feature_engineering import normalize_features
        df = pd.DataFrame({"value": [10, 20, 30], "name": ["a", "b", "c"]})
        result = normalize_features(df, ["value"])
        assert result["value"].max() == 1.0
        assert list(result["name"]) == ["a", "b", "c"]


# ==============================================================================
# 12. Cache dashboard
# ==============================================================================

class TestDashboardCache:

    def test_get_cached_returns_none_when_empty(self):
        from app.engines.dashboard_engine import DashboardEngine
        db = MagicMock()
        db.query.return_value.filter.return_value.order_by.return_value.first.return_value = None
        engine = DashboardEngine(db)
        result = engine.get_cached()
        assert result is None

    def test_get_cached_returns_data_when_fresh(self):
        from app.engines.dashboard_engine import DashboardEngine
        db = MagicMock()
        mock_snap = MagicMock()
        mock_snap.kpis_json = {"competences_en_declin": [], "generated_at": "2025-01-01"}
        db.query.return_value.filter.return_value.order_by.return_value.first.return_value = mock_snap
        engine = DashboardEngine(db)
        result = engine.get_cached()
        assert result is not None
        assert result["_cached"] is True
        assert "competences_en_declin" in result

    def test_get_cached_max_age_parameter(self):
        from app.engines.dashboard_engine import DashboardEngine
        db = MagicMock()
        db.query.return_value.filter.return_value.order_by.return_value.first.return_value = None
        engine = DashboardEngine(db)
        result = engine.get_cached(max_age_hours=12)
        assert result is None

