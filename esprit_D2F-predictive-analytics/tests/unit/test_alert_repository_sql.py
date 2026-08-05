"""Tests du repository SQL des alertes (requêtes scriptées, sans DB réelle)."""
from contextlib import contextmanager
from datetime import datetime

from app.domain.entities.alert import Alert
from app.infrastructure.repositories.analyse.alert_repository import SqlAlertRepository


class _Mappings:
    def __init__(self, rows):
        self._rows = rows

    def all(self):
        return self._rows

    def first(self):
        return self._rows[0] if self._rows else None


class _Result:
    def __init__(self, rows=None, scalar=None):
        self._rows = rows if rows is not None else []
        self._scalar = scalar

    def mappings(self):
        return _Mappings(self._rows)

    def scalar(self):
        return self._scalar


class _ScriptedConn:
    def __init__(self, script, executed):
        self._script = script
        self.executed = executed

    def execute(self, stmt, params=None):
        self.executed.append(str(stmt))
        return self._script.pop(0)


class _ScriptedDb:
    def __init__(self, script):
        self._script = list(script)
        self.executed: list[str] = []

    def _conn(self):
        return _ScriptedConn(self._script, self.executed)

    @contextmanager
    def session(self):
        yield self._conn()

    @contextmanager
    def read_connection(self):
        yield self._conn()


ROW = {
    "id": 7,
    "type_alerte": "GAP_CRITIQUE",
    "cible_type": "INDIVIDUEL",
    "enseignant_id": "T001",
    "departement_id": None,
    "competence_id": None,
    "skill_gap_id": None,
    "severite": "CRITICAL",
    "titre": "Gap critique",
    "message": "Niveau insuffisant",
    "details_json": {"gap": 0.8},
    "statut": "NOUVELLE",
    "created_at": datetime(2026, 1, 1, 10, 0),
}


def _repo(script):
    return SqlAlertRepository(_ScriptedDb(script))


def test_save_persists_and_returns_alert():
    repo = _repo([_Result(rows=[{"id": 7, "created_at": datetime(2026, 1, 1, 10, 0)}])])
    alert = repo.save(
        Alert(
            alert_type="GAP_CRITIQUE",
            target_type="INDIVIDUEL",
            severity="CRITICAL",
            title="Gap critique",
            message="Niveau insuffisant",
            teacher_id="T001",
            details={"gap": 0.8},
            status="NOUVELLE",
        )
    )
    assert alert.id == 7
    assert alert.teacher_id == "T001"
    assert alert.created_at == datetime(2026, 1, 1, 10, 0)


def test_save_keeps_original_id_when_no_returning_row():
    repo = _repo([_Result(rows=[])])
    alert = repo.save(
        Alert(alert_type="GAP", target_type="INDIVIDUEL", severity="HIGH", title="t", message="m", id=42)
    )
    assert alert.id == 42


def test_list_alerts_with_filters():
    db = _ScriptedDb([
        _Result(rows=[{"total": 2}]),
        _Result(rows=[ROW, dict(ROW, id=8, statut="LUE")]),
    ])
    repo = SqlAlertRepository(db)
    alerts, total = repo.list_alerts(page=1, size=10, severity="CRITICAL", status="NOUVELLE", target_type="INDIVIDUEL", department_id="D1")
    assert total == 2
    assert len(alerts) == 2
    assert alerts[0].id == 7
    assert alerts[0].details == {"gap": 0.8}
    assert alerts[1].id == 8
    assert "LIMIT :limit OFFSET :offset" in db.executed[-1]


def test_list_alerts_without_filters_uses_defaults():
    repo = _repo([_Result(rows=[{"total": 0}]), _Result(rows=[])])
    alerts, total = repo.list_alerts(page=1, size=5)
    assert alerts == []
    assert total == 0


def test_list_for_teacher_and_department():
    repo = _repo([
        _Result(rows=[{"total": 1}]),
        _Result(rows=[dict(ROW, enseignant_id="T001")]),
        _Result(rows=[{"total": 1}]),
        _Result(rows=[dict(ROW, departement_id="D1")]),
    ])
    teacher_alerts, t_total = repo.list_for_teacher("T001", 1, 10, severity="HIGH")
    assert t_total == 1
    assert teacher_alerts[0].teacher_id == "T001"

    dept_alerts, d_total = repo.list_for_department("D1", 1, 10)
    assert d_total == 1
    assert dept_alerts[0].department_id == "D1"


def test_count_open_by_severity_buckets():
    repo = _repo([
        _Result(rows=[
            {"bucket": "CRITICAL", "n": 3},
            {"bucket": "WARNING", "n": 2},
            {"bucket": "INFO", "n": 1},
        ])
    ])
    result = repo.count_open_by_severity()
    assert result == {"CRITICAL": 3, "WARNING": 2, "INFO": 1}


def test_count_open_by_severity_defaults_zeros():
    repo = _repo([_Result(rows=[])])
    assert repo.count_open_by_severity() == {"CRITICAL": 0, "WARNING": 0, "INFO": 0}


def test_list_open_since_returns_alerts():
    repo = _repo([_Result(rows=[ROW])])
    alerts = repo.list_open_since(cutoff_days=30)
    assert len(alerts) == 1
    assert alerts[0].status == "NOUVELLE"


def test_update_status_returns_updated_alert():
    repo = _repo([
        _Result(rows=[]),  # session.execute(UPDATE)
        _Result(rows=[dict(ROW, statut="RESOLUE", traite_par="admin")]),
    ])
    alert = repo.update_status(7, "RESOLUE", actor="admin", comment="ok")
    assert alert is not None
    assert alert.status == "RESOLUE"


def test_update_status_returns_none_when_missing():
    repo = _repo([_Result(rows=[]), _Result(rows=[])])
    assert repo.update_status(999, "RESOLUE") is None


def test_map_row_with_null_details():
    repo = _repo([])
    alert = repo._map_row(dict(ROW, details_json=None))
    assert alert.details is None
