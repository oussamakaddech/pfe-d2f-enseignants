from tests.conftest import auth_headers


def test_list_alerts_empty_for_fresh_container(client):
    response = client.get("/api/v1/analytics/alerts", headers=auth_headers("admin", ["ADMIN"]))
    assert response.status_code == 200
    body = response.json()
    assert body["errors"] == []
    assert body["data"] == []
    assert body["meta"]["page"] == 1


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
