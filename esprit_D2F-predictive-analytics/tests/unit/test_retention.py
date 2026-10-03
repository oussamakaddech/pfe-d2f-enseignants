"""Rétention des tables d'historique (audit 2026-09-24)."""
from contextlib import contextmanager
from pathlib import Path
from types import SimpleNamespace

from app.infrastructure.repositories.analyse.analysis_repository import INSERT_RISK
from app.infrastructure.scheduler import jobs

MIGRATIONS = Path(__file__).resolve().parents[2] / "db" / "migration"


class _Session:
    def __init__(self):
        self.calls = []

    def execute(self, stmt, params=None):
        self.calls.append((str(stmt), params))
        return SimpleNamespace(rowcount=7)


def _container(days):
    session = _Session()

    @contextmanager
    def ctx():
        yield session

    return SimpleNamespace(settings=SimpleNamespace(ml_observability_retention_days=days),
                           database=SimpleNamespace(session=ctx)), session


def test_observability_purge_uses_the_configured_retention():
    container, session = _container(90)
    assert jobs.purger_observabilite(container) == {"status": "ok", "deleted": 7}
    sql, params = session.calls[0]
    assert 'DELETE FROM "analyse".ml_observability' in sql
    assert params == {"days": 90}


def test_observability_purge_can_be_disabled():
    container, session = _container(0)
    assert jobs.purger_observabilite(container) == {"status": "disabled"}
    assert session.calls == []


def test_one_risk_snapshot_per_teacher_and_day():
    # l'écriture remplace le calcul du jour au lieu d'ajouter une ligne…
    assert "ON CONFLICT (enseignant_id, snapshot_date) DO UPDATE" in INSERT_RISK
    # …et la contrainte qui le permet est livrée par Flyway
    v12 = (MIGRATIONS / "V12__one_risk_snapshot_per_teacher_per_day.sql").read_text(encoding="utf-8")
    assert "UNIQUE (enseignant_id, snapshot_date)" in v12
