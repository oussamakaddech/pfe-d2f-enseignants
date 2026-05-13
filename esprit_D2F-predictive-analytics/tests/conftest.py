"""
Fixtures pytest pour le service D2F Predictive Analytics.
Les variables d'environnement DOIVENT être définies AVANT tout import d'app.
"""

import os

# ── Désactivation des services externes pour les tests ─────────────────────
os.environ.setdefault("JWT_AUTH_ENABLED", "false")
os.environ.setdefault("SCHEDULER_ENABLED", "false")
os.environ.setdefault("MESSAGING_ENABLED", "false")
os.environ.setdefault("DEBUG", "false")
os.environ.setdefault("APP_ENV", "test")
# DATABASE_URL laissé au défaut — SQLAlchemy ne se connecte pas tant qu'on ne l'appelle pas

import pytest
from unittest.mock import MagicMock, patch
from fastapi.testclient import TestClient

from app.main import app
from app.core.db import get_db


# ── Helpers ─────────────────────────────────────────────────────────────────

def make_mock_db() -> MagicMock:
    """Retourne un MagicMock qui simule une Session SQLAlchemy."""
    db = MagicMock()

    # Chaîne query(...).filter(...).all() → []
    mock_q = db.query.return_value
    mock_q.filter.return_value.all.return_value = []
    mock_q.filter.return_value.first.return_value = None
    mock_q.filter.return_value.count.return_value = 0
    mock_q.filter.return_value.offset.return_value.limit.return_value.all.return_value = []
    mock_q.filter.return_value.order_by.return_value.all.return_value = []
    mock_q.filter.return_value.order_by.return_value.first.return_value = None

    # Chaîne filter_by(...)
    mock_q.filter_by.return_value.first.return_value = None
    mock_q.filter_by.return_value.order_by.return_value.first.return_value = None
    mock_q.filter_by.return_value.order_by.return_value.all.return_value = []
    mock_q.filter_by.return_value.all.return_value = []

    # order_by direct
    mock_q.order_by.return_value.all.return_value = []
    mock_q.order_by.return_value.first.return_value = None
    mock_q.order_by.return_value.offset.return_value.limit.return_value.all.return_value = []

    # add / flush / commit — pas d'effet
    db.add.return_value = None
    db.flush.return_value = None
    db.commit.return_value = None

    return db


# ── Fixtures ─────────────────────────────────────────────────────────────────

@pytest.fixture(scope="session")
def client() -> TestClient:
    """TestClient avec DB mockée et _init_db_tables désactivé."""
    app.dependency_overrides[get_db] = make_mock_db
    with patch("app.main._init_db_tables"):
        with TestClient(app, raise_server_exceptions=False) as c:
            yield c
    app.dependency_overrides.clear()


@pytest.fixture(scope="function")
def mock_db() -> MagicMock:
    """Session DB mockée pour les tests unitaires d'engines."""
    return make_mock_db()
