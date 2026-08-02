from datetime import datetime

from app.domain.entities.alert import Alert
from tests.conftest import auth_headers


def _make_alerts(container, n: int) -> None:
    repo = container.alert_repository
    for i in range(n):
        repo.save(
            Alert(
                alert_type="GAP_CRITIQUE",
                target_type="INDIVIDUEL",
                severity="CRITICAL",
                title=f"Alerte {i}",
                message=f"Message {i}",
                teacher_id=f"T{i % 10}",
                department_id=None,
                competence_id=None,
                skill_gap_id=None,
                details={},
                status="NOUVELLE",
                created_at=datetime.utcnow(),
            )
        )


def test_list_alerts_empty_for_fresh_container(client):
    response = client.get("/api/v1/analytics/alerts", headers=auth_headers("admin", ["ADMIN"]))
    assert response.status_code == 200
    body = response.json()
    assert body["errors"] == []
    assert body["data"] == []
    assert body["meta"]["page"] == 1


def test_list_alerts_pagination_returns_distinct_pages(client, container):
    _make_alerts(container, 25)
    first = client.get("/api/v1/analytics/alerts?page=1&size=10", headers=auth_headers("admin", ["ADMIN"])).json()
    second = client.get("/api/v1/analytics/alerts?page=2&size=10", headers=auth_headers("admin", ["ADMIN"])).json()
    third = client.get("/api/v1/analytics/alerts?page=3&size=10", headers=auth_headers("admin", ["ADMIN"])).json()
    assert first["meta"]["total_matching"] == 25
    assert first["meta"]["pages"] == 3
    assert len(first["data"]) == 10
    assert len(second["data"]) == 10
    assert len(third["data"]) == 5
    ids1 = {item["id"] for item in first["data"]}
    ids2 = {item["id"] for item in second["data"]}
    ids3 = {item["id"] for item in third["data"]}
    assert not (ids1 & ids2) and not (ids2 & ids3) and not (ids1 & ids3)


def test_list_alerts_requires_auth(client):
    response = client.get("/api/v1/analytics/alerts")
    assert response.status_code == 401


def test_list_needs_empty_for_fresh_container(client):
    response = client.get("/api/v1/analytics/needs", headers=auth_headers("cup", ["CUP"]))
    assert response.status_code == 200
    assert response.json()["data"] == []


def test_dashboard_global_admin_ok(client):
    response = client.get("/api/v1/analytics/dashboard?scope=GLOBAL", headers=auth_headers("admin", ["ADMIN"]))
    assert response.status_code == 200
    body = response.json()
    assert body["errors"] == []
    assert body["data"]["scope"] == "GLOBAL"
    assert body["data"]["teachers_analysed"] >= 0


def test_dashboard_requires_admin_or_cup(client):
    response = client.get("/api/v1/analytics/dashboard", headers=auth_headers("ens", ["ENSEIGNANT"]))
    assert response.status_code == 401


def test_dashboard_declining_returns_list(client):
    response = client.get("/api/v1/analytics/dashboard/declining", headers=auth_headers("admin", ["ADMIN"]))
    assert response.status_code == 200
    assert isinstance(response.json()["data"], list)


def test_process_event_roundtrip(client):
    response = client.post(
        "/api/v1/analytics/events/process",
        headers=auth_headers("admin", ["ADMIN"]),
        json={"event_id": "evt-int-1", "event_type": "analyse.requested", "payload": {"teacher_id": "T001"}},
    )
    assert response.status_code == 200
    body = response.json()
    assert body["status"] == "processed"
    assert body["event_id"] == "evt-int-1"


def test_process_event_duplicate(client):
    headers = auth_headers("cup", ["CUP"])
    payload = {"event_id": "evt-int-2", "event_type": "analyse.requested", "payload": {"teacher_id": "T001"}}
    first = client.post("/api/v1/analytics/events/process", headers=headers, json=payload)
    assert first.json()["status"] == "processed"
    second = client.post("/api/v1/analytics/events/process", headers=headers, json=payload)
    assert second.json()["status"] == "duplicate"


def test_process_event_forbidden_for_enseignant(client):
    response = client.post(
        "/api/v1/analytics/events/process",
        headers=auth_headers("ens", ["ENSEIGNANT"]),
        json={"event_id": "evt-int-3", "event_type": "analyse.requested", "payload": {}},
    )
    assert response.status_code == 401
