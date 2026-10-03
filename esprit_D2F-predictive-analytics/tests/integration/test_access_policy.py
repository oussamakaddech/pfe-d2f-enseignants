"""Politique d'accès du service, indépendante de la gateway (audit C3, 2026-09-24).

Avant : en appel direct, un ENSEIGNANT lisait les écarts, risques et
recommandations d'un collègue sur 44 routes (surtout legacy).
"""
import pytest

from app.api.access_policy import ADMIN, AUTHENTIFIE, EXECUTIF, PILOTAGE, required_roles
from tests.conftest import auth_headers

ROUTES_LEGACY_NOMINATIVES = [
    "/api/v1/analytics/gaps/ENS015",
    "/api/v1/analytics/recommendations/ENS015",
    "/api/v1/analytics/risk/ENS015",
    "/api/v1/analytics/forecast/ENS015",
    "/api/v1/d2f/teachers/ENS015",
    "/api/v1/d2f/at-risk",
    "/api/dashboard/summary",
    "/api/detect/at-risk-teachers",
]


@pytest.mark.parametrize("path", ROUTES_LEGACY_NOMINATIVES)
def test_teacher_cannot_read_another_teacher_on_legacy_routes(client, path):
    response = client.get(path, headers=auth_headers("o.kaddech@esprit.tn", ["ENSEIGNANT"]))
    assert response.status_code == 403
    assert response.json()["errors"][0]["code"] == "FORBIDDEN"


@pytest.mark.parametrize("path", ROUTES_LEGACY_NOMINATIVES)
def test_anonymous_call_is_rejected(client, path):
    assert client.get(path).status_code == 401


def test_authenticated_but_unauthorized_gets_403_not_401(client):
    # un 401 déconnecterait la webapp (intercepteur axios)
    response = client.get("/api/v1/d2f/kpis", headers=auth_headers("anim", ["ANIMATEUR"]))
    assert response.status_code == 403


def test_trigger_batch_is_not_open_to_teachers(client):
    response = client.post("/api/v1/analytics/trigger-batch-analysis",
                           headers=auth_headers("o.kaddech@esprit.tn", ["ENSEIGNANT"]))
    assert response.status_code == 403


def test_health_stays_public_for_the_docker_healthcheck(client):
    assert client.get("/api/v1/analytics/health").status_code == 200


def test_rules_mirror_the_gateway():
    assert required_roles("/api/v1/analytics/health") is None
    assert required_roles("/api/predict/train") == ADMIN
    assert required_roles("/api/v1/analytics/formations-par-up") == EXECUTIF
    assert required_roles("/api/v1/analytics/teachers/ENS015/gaps") == AUTHENTIFIE
    assert required_roles("/api/v1/analytics/dashboard/real/impact") == PILOTAGE
    assert required_roles("/api/v1/d2f/teachers") == PILOTAGE
    assert "RESPONSABLE_DOSSIER" not in PILOTAGE
