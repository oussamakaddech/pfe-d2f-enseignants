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
    # Gaps filtres par scope : T001 (D1 Pédagogie) → 1 compétence corrélée
    assert body["meta"]["total"] == 1
    assert body["meta"]["page"] == 1
    # Champs contractuels du serving ML obligatoires sur chaque réponse gaps.
    assert body["meta"]["model_mode"] == "HEURISTIC_FALLBACK"
    assert "model_version" in body["meta"]
    assert "fallback_reason" in body["meta"]
    assert "dataset_version" in body["meta"]
    assert "prediction_horizon" in body["meta"]
    # Provenance du corpus d'entraînement (part de synthétique explicite).
    assert "synthetic_share_pct" in (body["meta"].get("provenance") or {})
    assert all(gap["severity"] in {"FAIBLE", "MOYENNE", "HAUTE", "CRITIQUE"} for gap in body["data"])


def test_gaps_pagination_respected(client):
    response = client.get("/api/v1/analytics/teachers/T001/gaps?size=1&page=1", headers=auth_headers("admin", ["ADMIN"]))
    assert response.status_code == 200
    body = response.json()
    assert len(body["data"]) == 1
    assert body["meta"]["pages"] == 1


def test_gaps_severity_filter(client):
    response = client.get("/api/v1/analytics/teachers/T001/gaps?severity=HAUTE", headers=auth_headers("admin", ["ADMIN"]))
    assert response.status_code == 200
    body = response.json()
    assert all(gap["severity"] == "HAUTE" for gap in body["data"])


def test_gaps_improving_only_rows_never_claim_ml(client, container):
    """Lignes IMPROVING seules + statut global PRODUCTION_ML : IMPROVING est
    ambigu (ML comme heuristique avec historique) — sans marqueur ML
    (DECLARED_ML/WORSENING), le mode exposé reste HEURISTIC_FALLBACK."""
    from datetime import date

    from app.domain.entities.skill_gap import SkillGap
    from app.domain.value_objects.enums import Severity, Trend
    from tests.fakes import FakeModelPort

    container.analysis_repository.save_skill_gaps(
        [
            SkillGap(
                teacher_id="T001", competence_id=1, competence_code="C1",
                competence_nom="Pedagogie active", observed_result=2.0,
                knowledge_difficulty_level=4.0, gap_score=0.5,
                severity=Severity.HIGH, trend=Trend.IMPROVING, as_of=date.today(),
            )
        ],
        teacher_id="T001",
    )
    base = FakeModelPort().status()
    container.model_port.status = lambda: {
        **base, "available": True, "mode": "PRODUCTION_ML",
        "model_mode": "PRODUCTION_ML", "model_version": "v9.9.9",
        "fallback_reason": None,
    }
    response = client.get("/api/v1/analytics/teachers/T001/gaps", headers=auth_headers("admin", ["ADMIN"]))
    assert response.status_code == 200
    assert response.json()["meta"]["model_mode"] == "HEURISTIC_FALLBACK"


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
