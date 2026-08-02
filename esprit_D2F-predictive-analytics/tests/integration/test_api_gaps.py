from tests.conftest import auth_headers


def test_health_is_public(client):
    response = client.get("/api/v1/analytics/health")
    assert response.status_code == 200
    body = response.json()
    assert body["status"] in {"ok", "degraded"}
    assert body["service"] == "d2f-predictive-analytics"


def test_ready_returns_503_when_db_unreachable(client):
    response = client.get("/api/v1/analytics/ready")
    assert response.status_code == 503
    assert response.json()["status"] == "degraded"


def test_gaps_requires_token(client):
    response = client.get("/api/v1/analytics/teachers/T001/gaps")
    assert response.status_code == 401
    body = response.json()
    assert body["data"] is None
    assert body["errors"][0]["code"] == "UNAUTHORIZED"


def test_gaps_admin_ok_and_paginated(client):
    response = client.get("/api/v1/analytics/teachers/T001/gaps", headers=auth_headers("admin", ["ADMIN"]))
    assert response.status_code == 200
    body = response.json()
    assert body["errors"] == []
    assert body["meta"]["total"] == 2
    assert body["meta"]["page"] == 1
    assert body["meta"]["model_mode"] == "HEURISTIC_FALLBACK"
    assert all(gap["severity"] in {"FAIBLE", "MOYENNE", "HAUTE", "CRITIQUE"} for gap in body["data"])


def test_gaps_pagination_respected(client):
    response = client.get("/api/v1/analytics/teachers/T001/gaps?size=1&page=2", headers=auth_headers("admin", ["ADMIN"]))
    assert response.status_code == 200
    body = response.json()
    assert len(body["data"]) == 1
    assert body["meta"]["pages"] == 2


def test_gaps_severity_filter(client):
    response = client.get("/api/v1/analytics/teachers/T001/gaps?severity=HAUTE", headers=auth_headers("admin", ["ADMIN"]))
    assert response.status_code == 200
    body = response.json()
    assert all(gap["severity"] == "HAUTE" for gap in body["data"])


def test_gaps_enseignant_self_access_allowed(client):
    response = client.get("/api/v1/analytics/teachers/T001/gaps", headers=auth_headers("alice", ["ENSEIGNANT"], user_id="U-ENS-1"))
    assert response.status_code == 200


def test_gaps_enseignant_other_teacher_forbidden(client):
    response = client.get("/api/v1/analytics/teachers/T002/gaps", headers=auth_headers("alice", ["ENSEIGNANT"], user_id="U-ENS-1"))
    assert response.status_code == 403
    assert response.json()["errors"][0]["code"] == "FORBIDDEN_SCOPE"


def test_gaps_unknown_teacher_not_found(client):
    response = client.get("/api/v1/analytics/teachers/UNKNOWN/gaps", headers=auth_headers("admin", ["ADMIN"]))
    assert response.status_code == 404
    assert response.json()["errors"][0]["code"] == "NOT_FOUND"
