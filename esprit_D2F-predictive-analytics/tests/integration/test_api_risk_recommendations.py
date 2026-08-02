from tests.conftest import auth_headers


def test_risk_admin_ok(client):
    response = client.get("/api/v1/analytics/teachers/T001/risk", headers=auth_headers("cup", ["CUP"]))
    assert response.status_code == 200
    body = response.json()
    assert body["errors"] == []
    assert 0 <= body["data"]["risk_score"] <= 100
    assert body["data"]["risk_level"] in {"LOW", "MEDIUM", "HIGH", "CRITICAL"}
    assert body["meta"]["model_mode"] == "HEURISTIC_FALLBACK"


def test_risk_factors_are_explainable(client):
    response = client.get("/api/v1/analytics/teachers/T001/risk", headers=auth_headers("admin", ["ADMIN"]))
    factors = response.json()["data"]["factors"]
    assert all("feature" in f and "contribution" in f for f in factors)


def test_risk_chef_departement_scoped(client):
    response = client.get("/api/v1/analytics/teachers/T002/risk", headers=auth_headers("chef", ["CHEF_DEPARTEMENT"], user_id="U-ENS-2"))
    assert response.status_code == 200


def test_risk_chef_departement_other_department_forbidden(client):
    response = client.get("/api/v1/analytics/teachers/T002/risk", headers=auth_headers("chef", ["CHEF_DEPARTEMENT"], user_id="U-ENS-1"))
    assert response.status_code == 403


def test_recommendations_admin_ok(client):
    response = client.get(
        "/api/v1/analytics/teachers/T001/recommendations?competence_id=1",
        headers=auth_headers("admin", ["ADMIN"]),
    )
    assert response.status_code == 200
    body = response.json()
    assert body["errors"] == []
    assert len(body["data"]) >= 1
    first = body["data"][0]
    assert 0 <= first["rank_score"] <= 1
    assert first["reason"]


def test_recommendations_completed_formation_excluded(client):
    response = client.get(
        "/api/v1/analytics/teachers/T001/recommendations?competence_id=1",
        headers=auth_headers("admin", ["ADMIN"]),
    )
    formation_ids = [r["formation_id"] for r in response.json()["data"]]
    assert 100 not in formation_ids


def test_recommendations_unknown_competence_empty(client):
    response = client.get(
        "/api/v1/analytics/teachers/T001/recommendations?competence_id=999",
        headers=auth_headers("admin", ["ADMIN"]),
    )
    assert response.status_code == 200
    assert response.json()["data"] == []


def test_recommendations_without_competence_aggregates_top_gaps(client):
    response = client.get(
        "/api/v1/analytics/teachers/T001/recommendations",
        headers=auth_headers("admin", ["ADMIN"]),
    )
    assert response.status_code == 200
    body = response.json()
    assert body["errors"] == []
    assert body["meta"]["competence_id"] is None
    data = body["data"]
    assert len(data) >= 1
    assert all(0 <= r["rank_score"] <= 1 for r in data)
    formation_ids = [r["formation_id"] for r in data]
    assert 100 not in formation_ids  # formation deja suivie exclue
    assert len(formation_ids) == len(set(formation_ids))  # pas de doublon


def test_post_analysis_returns_accepted(client):
    response = client.post(
        "/api/v1/analytics/analysis/T001",
        headers=auth_headers("admin", ["ADMIN"]),
    )
    assert response.status_code == 202
    body = response.json()
    assert body["status"] == "ACCEPTED"
    assert body["analysis_id"]


def test_get_analysis_full_payload(client):
    response = client.get("/api/v1/analytics/teachers/T001/analysis", headers=auth_headers("admin", ["ADMIN"]))
    assert response.status_code == 200
    body = response.json()
    assert body["data"]["teacher_id"] == "T001"
    # Gaps scoped au périmètre de T001 (D1 Pédagogie) = 1 compétence
    assert len(body["data"]["gaps"]) == 1
    assert body["data"]["risk"]["risk_level"]
    assert body["meta"]["model_mode"] == "HEURISTIC_FALLBACK"
