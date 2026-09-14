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


# ── Scoping CUP (UP) / chef (département) — périmètre résolu serveur ──────


class _RecordingConn:
    def __init__(self, captured: dict):
        self._captured = captured

    def execute(self, stmt, params=None):
        self._captured.update(params or {})
        return _Result(rows=[])


class _RecordingDb:
    def __init__(self, captured: dict):
        self._captured = captured

    @contextmanager
    def read_connection(self):
        yield _RecordingConn(self._captured)

    @contextmanager
    def session(self):
        yield _RecordingConn(self._captured)


def test_dashboard_cup_forced_to_own_up_scope(client):
    # L'utilisateur U-ENS-1 est rattaché à la fiche T001 (UP1) dans les fakes :
    # le CUP est forcé au périmètre UP, même s'il demande GLOBAL.
    response = client.get(
        "/api/v1/analytics/dashboard?scope=GLOBAL",
        headers=auth_headers("cup", ["CUP"]),
    )
    assert response.status_code == 200
    body = response.json()
    assert body["data"]["scope"] == "UP"
    assert body["data"]["scope_id"] == "UP1"


def test_dashboard_cup_up_scope_filters_teachers(client, container):
    # teachers_analysed = uniquement les enseignants de l'UP du CUP (UP1 → T001).
    response = client.get(
        "/api/v1/analytics/dashboard",
        headers=auth_headers("cup", ["CUP"]),
    )
    assert response.status_code == 200
    assert response.json()["data"]["teachers_analysed"] == 1


def test_dashboard_cup_without_up_is_denied_by_default(client):
    # Un user_id sans fiche enseignant → scope UP sans scope_id → vide (jamais global).
    response = client.get(
        "/api/v1/analytics/dashboard",
        headers=auth_headers("cup", ["CUP"], user_id="U-SANS-FICHE"),
    )
    assert response.status_code == 200
    body = response.json()
    assert body["data"]["scope"] == "UP"
    assert body["data"]["teachers_analysed"] == 0


def test_dashboard_admin_can_query_up_scope(client):
    response = client.get(
        "/api/v1/analytics/dashboard?scope=UP&scope_id=UP2",
        headers=auth_headers("admin", ["ADMIN"]),
    )
    assert response.status_code == 200
    body = response.json()
    assert body["data"]["scope"] == "UP"
    assert body["data"]["scope_id"] == "UP2"
    assert body["data"]["teachers_analysed"] == 1


def test_dashboard_latest_cup_forced_to_own_up_scope(client):
    response = client.get(
        "/api/v1/analytics/dashboard/latest?scope=GLOBAL",
        headers=auth_headers("cup", ["CUP"]),
    )
    assert response.status_code == 200
    assert response.json()["meta"]["scope"] == "UP"


def test_formations_par_periode_cup_scoped_to_own_up(client, container):
    # Le CUP voit uniquement sa propre UP : le filtre `up` est écrasé côté
    # serveur (même s'il tente une autre UP ou un département).
    captured: dict = {}
    container.database = _RecordingDb(captured)
    response = client.get(
        "/api/v1/analytics/formations-par-periode?granularite=MOIS&up=UP2&departement=D9",
        headers=auth_headers("cup", ["CUP"]),
    )
    assert response.status_code == 200
    assert captured["up"] == "UP1"
    assert captured["departement"] is None


def test_formations_par_periode_chef_scoped_to_own_departement(client, container):
    captured: dict = {}
    container.database = _RecordingDb(captured)
    response = client.get(
        "/api/v1/analytics/formations-par-periode?granularite=MOIS&departement=D9",
        headers=auth_headers("chef", ["CHEF_DEPARTEMENT"]),
    )
    assert response.status_code == 200
    assert captured["departement"] == "D1"
    assert captured["up"] is None


def test_formations_par_periode_cup_without_up_forbidden(client):
    response = client.get(
        "/api/v1/analytics/formations-par-periode?granularite=MOIS",
        headers=auth_headers("cup", ["CUP"], user_id="U-SANS-FICHE"),
    )
    assert response.status_code == 403


def test_formations_par_periode_admin_keeps_client_filters(client, container):
    captured: dict = {}
    container.database = _RecordingDb(captured)
    response = client.get(
        "/api/v1/analytics/formations-par-periode?granularite=MOIS&up=UP2&departement=D2",
        headers=auth_headers("admin", ["ADMIN"]),
    )
    assert response.status_code == 200
    assert captured["up"] == "UP2"
    assert captured["departement"] == "D2"


def test_formations_par_periode_anonymous_unscoped(client, container):
    captured: dict = {}
    container.database = _RecordingDb(captured)
    response = client.get("/api/v1/analytics/formations-par-periode?granularite=MOIS")
    assert response.status_code == 200
    assert captured["up"] is None
    assert captured["departement"] is None


def test_alert_repository_table_constant_used():
    assert '"analyse".alert_events' in ALERT_EVENTS_TABLE
