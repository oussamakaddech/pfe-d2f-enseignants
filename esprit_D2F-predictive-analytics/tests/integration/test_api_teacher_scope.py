from tests.conftest import auth_headers


def test_scope_analysis_requires_token(client):
    response = client.get("/api/v1/analytics/teachers/T001/scope-analysis")
    assert response.status_code == 401
    body = response.json()
    assert body["data"] is None
    assert body["errors"][0]["code"] == "UNAUTHORIZED"


def test_scope_analysis_admin_ok(client):
    response = client.get(
        "/api/v1/analytics/teachers/T001/scope-analysis",
        headers=auth_headers("admin", ["ADMIN"]),
    )
    assert response.status_code == 200
    body = response.json()
    assert body["errors"] == []

    data = body["data"]
    context = data["context"]
    assert context["teacher_id"] == "T001"
    assert context["nom_complet"] == "Alice Dupont"
    assert context["mail"] == "alice.dupont@esprit.tn"
    assert context["dept_id"] == "D1"
    assert context["up_id"] == "UP1"

    # T001 (dept D1) n'a qu'une compétence dans son périmètre (C1) selon le fake
    assert data["scoped_competencies_count"] == 1
    assert data["total_competencies_count"] == 2
    assert len(data["gaps"]) == 1
    assert data["gaps"][0]["competence_id"] == 1
    # T001 a un niveau faible sur les savoirs de C1 -> gap positif
    assert data["gaps"][0]["gap_score"] > 0

    # Les recommandations ciblent les gaps identifiés
    assert isinstance(data["recommendations"], list)
    assert body["meta"]["gaps_count"] == 1


def test_scope_analysis_no_fallback_when_scope_declared_without_match(client):
    # T002 (dept D2) n'a aucun domaine rattaché : le périmètre reste explicite
    # (DEPARTMENT) et la liste de compétences est vide — jamais de fallback
    # silencieux sur le référentiel global.
    response = client.get(
        "/api/v1/analytics/teachers/T002/scope-analysis",
        headers=auth_headers("admin", ["ADMIN"]),
    )
    assert response.status_code == 200
    body = response.json()
    data = body["data"]
    assert data["scoped_competencies_count"] == 0
    assert data["total_competencies_count"] == 2
    assert data["gaps"] == []
    assert data["scope"]["type"] == "DEPARTMENT"
    assert data["scope"]["is_global"] is False
    assert data["scope"]["label"].startswith("Département")


def test_scope_analysis_global_only_when_no_affiliation(client):
    # T001 a un rattachement (D1) -> DEPARTMENT, jamais GLOBAL.
    response = client.get(
        "/api/v1/analytics/teachers/T001/scope-analysis",
        headers=auth_headers("admin", ["ADMIN"]),
    )
    data = response.json()["data"]
    assert data["scope"]["type"] == "DEPARTMENT"
    assert data["scope"]["is_global"] is False


def test_scope_analysis_min_gap_score_filter(client):
    response = client.get(
        "/api/v1/analytics/teachers/T001/scope-analysis?min_gap_score=0.99",
        headers=auth_headers("admin", ["ADMIN"]),
    )
    assert response.status_code == 200
    body = response.json()
    assert all(g["gap_score"] >= 0.99 for g in body["data"]["gaps"])


def test_scope_analysis_enseignant_self_access_allowed(client):
    response = client.get(
        "/api/v1/analytics/teachers/T001/scope-analysis",
        headers=auth_headers("alice", ["ENSEIGNANT"], user_id="U-ENS-1"),
    )
    assert response.status_code == 200


def test_scope_analysis_enseignant_other_teacher_forbidden(client):
    response = client.get(
        "/api/v1/analytics/teachers/T002/scope-analysis",
        headers=auth_headers("alice", ["ENSEIGNANT"], user_id="U-ENS-1"),
    )
    assert response.status_code == 403
    assert response.json()["errors"][0]["code"] == "FORBIDDEN_SCOPE"


def test_scope_analysis_unknown_teacher_not_found(client):
    response = client.get(
        "/api/v1/analytics/teachers/UNKNOWN/scope-analysis",
        headers=auth_headers("admin", ["ADMIN"]),
    )
    assert response.status_code == 404
    assert response.json()["errors"][0]["code"] == "NOT_FOUND"
