"""Routes reporting (formations-par-periode) + branches chef de departement."""
from contextlib import contextmanager

from app.infrastructure.repositories.analyse.alert_repository import (
    ALERT_EVENTS_TABLE,
)
from tests.conftest import auth_headers


class _Mappings:
    def __init__(self, rows):
        self._rows = rows

    def all(self):
        return self._rows

    def first(self):
        return self._rows[0] if self._rows else None


class _Result:
    def __init__(self, rows=None):
        self._rows = rows if rows is not None else []

    def mappings(self):
        return _Mappings(self._rows)


class _ScriptedConn:
    def __init__(self, script):
        self._script = script

    def execute(self, stmt, params=None):
        return self._script.pop(0)


class _ScriptedDb:
    def __init__(self, script):
        self._script = list(script)

    @contextmanager
    def read_connection(self):
        yield _ScriptedConn(self._script)

    @contextmanager
    def session(self):
        yield _ScriptedConn(self._script)


def _row(label: str, total: int):
    return {
        "period_start": label,
        "nb_formations": total,
        "nb_participants": total * 10,
        "total_inscriptions": total * 10,
    }


def test_formations_par_periode_ok(client, container):
    container.database = _ScriptedDb([_Result(rows=[_row("2026-01-01", 3), _row("2026-02-01", 2)])])
    response = client.get(
        "/api/v1/analytics/formations-par-periode?granularite=MOIS",
        headers=auth_headers("cup", ["CUP"]),
    )
    assert response.status_code == 200
    body = response.json()
    assert body["granularite"] == "MOIS"
    assert len(body["periodes"]) == 2
    assert body["totalFormations"] == 5
    assert body["moyenneParPeriode"] == 2.5
    assert body["tendance"] in {"HAUSSE", "BAISSE", "STABLE"}


def test_formations_par_periode_invalid_granularity(client, container):
    container.database = _ScriptedDb([])
    response = client.get(
        "/api/v1/analytics/formations-par-periode?granularite=JOUR",
        headers=auth_headers("cup", ["CUP"]),
    )
    assert response.status_code == 400


def test_formations_par_periode_invalid_date(client, container):
    container.database = _ScriptedDb([])
    response = client.get(
        "/api/v1/analytics/formations-par-periode?debut=2026-13-45",
        headers=auth_headers("cup", ["CUP"]),
    )
    assert response.status_code == 400


def test_formations_par_periode_debut_apres_fin(client, container):
    container.database = _ScriptedDb([])
    response = client.get(
        "/api/v1/analytics/formations-par-periode?debut=2026-03-01&fin=2026-01-01",
        headers=auth_headers("cup", ["CUP"]),
    )
    assert response.status_code == 400


def test_formations_par_periode_without_auth_ok(client, container):
    container.database = _ScriptedDb([_Result(rows=[])])
    response = client.get("/api/v1/analytics/formations-par-periode")
    assert response.status_code == 200
    assert response.json()["periodes"] == []


def test_dashboard_departement_as_chef_sets_scope_id(client):
    response = client.get(
        "/api/v1/analytics/dashboard?scope=DEPARTEMENT",
        headers=auth_headers("chef", ["CHEF_DEPARTEMENT"]),
    )
    assert response.status_code == 200
    assert response.json()["data"]["scope"] == "DEPARTEMENT"


def test_dashboard_latest_as_chef_departement(client):
    response = client.get(
        "/api/v1/analytics/dashboard/latest?scope=DEPARTEMENT",
        headers=auth_headers("chef", ["CHEF_DEPARTEMENT"]),
    )
    assert response.status_code == 200


def test_dashboard_declining_as_chef_departement(client):
    response = client.get(
        "/api/v1/analytics/dashboard/declining?scope=DEPARTEMENT",
        headers=auth_headers("chef", ["CHEF_DEPARTEMENT"]),
    )
    assert response.status_code == 200
    assert isinstance(response.json()["data"], list)


def test_dashboard_rejects_invalid_scope(client):
    response = client.get(
        "/api/v1/analytics/dashboard?scope=INVALIDE",
        headers=auth_headers("admin", ["ADMIN"]),
    )
    assert response.status_code == 422


def test_alert_repository_table_constant_used():
    assert '"analyse".alert_events' in ALERT_EVENTS_TABLE
