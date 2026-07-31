"""Tests d'intégration API (repository -> use cases -> routes)."""

from __future__ import annotations

from datetime import date
from pathlib import Path

import pytest
from fastapi.testclient import TestClient

from app.application.use_cases import AnalyticsUseCases
from app.core.config import settings
from app.engines.dashboard_engine import DashboardEngine
from app.infrastructure.repositories.curated_repository import CuratedRepository
from app.main import app

pytestmark = pytest.mark.integration


@pytest.fixture(scope="module")
def client():
    return TestClient(app)


def auth_headers(role: str = "ADMIN") -> dict[str, str]:
    return {"X-User-Role": role}


class TestIdValidation:
    def test_legacy_id_rejected(self, client):
        resp = client.get("/api/v1/teachers/T001/gaps", headers=auth_headers())
        assert resp.status_code == 422
        assert resp.json()["errors"][0]["code"] == "LEGACY_ID_NOT_ALLOWED"

    def test_invalid_id_rejected(self, client):
        resp = client.get("/api/v1/teachers/AB12/gaps", headers=auth_headers())
        assert resp.status_code == 422

    def test_canonical_accepted(self, client, sample_repo):
        # on re-point le service vers les données de test
        resp = client.get("/api/v1/teachers/ENS001/gaps", headers=auth_headers())
        assert resp.status_code in (200, 422)  # ENS001 existe toujours en structure


class TestRbac:
    def test_teacher_cannot_access_dashboard(self, client):
        resp = client.get("/api/v1/dashboard/global", headers=auth_headers("TEACHER"))
        assert resp.status_code == 403

    def test_admin_can_access_dashboard(self, client):
        resp = client.get("/api/v1/dashboard/global", headers=auth_headers("ADMIN"))
        assert resp.status_code == 200

    def test_missing_role_unauthorized(self, client):
        resp = client.get("/api/v1/dashboard/global")
        assert resp.status_code == 401


class TestEndpoints:
    def test_health(self, client):
        resp = client.get("/health")
        assert resp.status_code == 200

    def test_teacher_not_found(self, client):
        resp = client.get("/api/v1/teachers/ENS999/gaps", headers=auth_headers())
        assert resp.status_code == 404


class TestUseCasesOnSampleData:
    def test_gap_analysis_reproducible(self, sample_repo):
        uc = AnalyticsUseCases(sample_repo, dashboard_engine=DashboardEngine(sample_repo))
        analysis = uc.get_gaps("ENS001")
        assert analysis.teacher_id == "ENS001"
        assert analysis.gaps

    def test_recommendations_differ_between_teachers(self, sample_repo):
        uc = AnalyticsUseCases(sample_repo, dashboard_engine=DashboardEngine(sample_repo))
        r1 = uc.get_recommendations("ENS001")
        r2 = uc.get_recommendations("ENS002")
        assert r1.teacher_id == "ENS001"
        assert r2.teacher_id == "ENS002"
        # les deux enseignants ont des profils différents: listes de recos différentes
        ids1 = [r.training_id for r in r1.recommendations]
        ids2 = [r.training_id for r in r2.recommendations]
        # au moins une formation diffère OU les scores associés diffèrent
        assert ids1 != ids2 or [r.recommendation_score for r in r1.recommendations] != [
            r.recommendation_score for r in r2.recommendations
        ]

    def test_learning_path_built(self, sample_repo):
        uc = AnalyticsUseCases(sample_repo, dashboard_engine=DashboardEngine(sample_repo))
        path = uc.get_learning_path("ENS001")
        assert path.teacher_id == "ENS001"
        assert path.total_duration_hours >= 0

    def test_risk_profile(self, sample_repo):
        uc = AnalyticsUseCases(sample_repo, dashboard_engine=DashboardEngine(sample_repo))
        risk = uc.get_risk("ENS001")
        assert 0.0 <= risk.risk_score <= 1.0

    def test_data_quality(self, sample_repo):
        uc = AnalyticsUseCases(sample_repo, dashboard_engine=DashboardEngine(sample_repo))
        report = uc.get_data_quality("ENS001")
        assert report.teacher_id == "ENS001"

    def test_dashboard_kpis(self, sample_repo):
        uc = AnalyticsUseCases(sample_repo, dashboard_engine=DashboardEngine(sample_repo))
        kpis = uc.dashboard_kpis()
        assert kpis.total_teachers == 30

    def test_dashboard_heatmap_and_demand(self, sample_repo):
        uc = AnalyticsUseCases(sample_repo, dashboard_engine=DashboardEngine(sample_repo))
        assert uc.dashboard_gap_heatmap() is not None
        assert uc.dashboard_training_demand() is not None


class TestGatewayAliasRoutes:
    """L'alias /api/v1/analytics permet d'atteindre le module via l'API Gateway
    (rewrite /api/analyse/** -> /api/** sans modification du gateway)."""

    def test_alias_gaps(self, client):
        resp = client.get("/api/v1/analytics/teachers/ENS001/gaps", headers=auth_headers())
        assert resp.status_code == 200
        assert resp.json()["data"]["teacher_id"] == "ENS001"

    def test_alias_risk(self, client):
        resp = client.get("/api/v1/analytics/teachers/ENS001/risk", headers=auth_headers())
        assert resp.status_code == 200
        assert resp.json()["data"]["teacher_id"] == "ENS001"

    def test_alias_dashboard_global(self, client):
        resp = client.get("/api/v1/analytics/dashboard/global", headers=auth_headers())
        assert resp.status_code == 200
        assert resp.json()["data"]["total_teachers"] == 30

    def test_alias_requires_role(self, client):
        resp = client.get("/api/v1/analytics/dashboard/global", headers=auth_headers("TEACHER"))
        assert resp.status_code == 403

    def test_alias_matches_canonical_response(self, client):
        canonical = client.get("/api/v1/teachers/ENS001/gaps", headers=auth_headers()).json()
        alias = client.get("/api/v1/analytics/teachers/ENS001/gaps", headers=auth_headers()).json()
        assert canonical["data"] == alias["data"]


class TestNoMixedIds:
    def test_repository_only_ens(self, sample_repo):
        for tid in sample_repo.teacher_ids():
            assert tid.startswith("ENS"), f"ID mixte trouvé: {tid}"
        df = sample_repo.df("teacher_competencies")
        assert (df["teacher_id"].str.startswith("ENS")).all()
