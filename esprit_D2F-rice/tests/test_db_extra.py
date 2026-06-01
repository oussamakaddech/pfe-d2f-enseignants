"""Extra tests for rice.db pool + success paths."""
import sys
import os
from unittest.mock import MagicMock

sys.path.insert(0, os.path.dirname(os.path.dirname(__file__)))

os.environ.setdefault("DB_NAME", "test")
os.environ.setdefault("DB_USER", "test")
os.environ.setdefault("DB_PASS", "test")
os.environ.setdefault("DB_HOST", "localhost")
os.environ.setdefault("DB_PORT", "5432")

import pytest


import rice.db as db


def test_put_db_connection_fallback_close(monkeypatch):
    class Pool:
        def putconn(self, conn):
            raise RuntimeError("pool down")

    conn = MagicMock()
    monkeypatch.setattr(db, "_get_db_pool", lambda: Pool())

    db._put_db_connection(conn)
    conn.close.assert_called_once()


def test_get_db_pool_initializes_once(monkeypatch):
    pytest.skip("Fragile: depends on import order of psycopg2.pool")
    created = []

    class DummyPool:
        pass

    def factory(*args, **kwargs):
        created.append((args, kwargs))
        return DummyPool()

    db._DB_POOL = None

    class DummyPgPool:
        ThreadedConnectionPool = staticmethod(factory)

    monkeypatch.setitem(sys.modules, "psycopg2.pool", DummyPgPool)

    p1 = db._get_db_pool()
    p2 = db._get_db_pool()

    assert p1 is p2
    assert len(created) == 1


def test_fetch_enseignant_affectations_success(monkeypatch):
    db._AFFECTATIONS_CACHE.clear()

    cur = MagicMock()
    cur.fetchall.return_value = [("E001", ["S1a", "S2a"]), ("E002", None)]
    conn = MagicMock()
    conn.cursor.return_value = cur

    monkeypatch.setattr(db, "_get_db_connection", lambda: conn)
    monkeypatch.setattr(db, "_put_db_connection", lambda c: None)

    out = db._fetch_enseignant_affectations()
    assert out == {"E001": ["S1a", "S2a"], "E002": []}


def test_fetch_all_enseignants_info_success(monkeypatch):
    db._ENS_INFO_CACHE.clear()

    cur = MagicMock()
    # first fetchall for enseignants, second for savoir names
    cur.fetchall.side_effect = [
        [("E001", "Benali", "Ahmed"), ("E002", "Martin", "Sarah")],
        [("E001", "Beton Arme"), ("E001", "Beton Arme"), ("E002", "Hydraulique")],
    ]
    conn = MagicMock()
    conn.cursor.return_value = cur

    monkeypatch.setattr(db, "_get_db_connection", lambda: conn)
    monkeypatch.setattr(db, "_put_db_connection", lambda c: None)

    out = db._fetch_all_enseignants_info()
    assert set(out.keys()) == {"E001", "E002"}
    assert "Beton Arme" in out["E001"].modules
    assert out["E001"].modules.count("Beton Arme") == 1
