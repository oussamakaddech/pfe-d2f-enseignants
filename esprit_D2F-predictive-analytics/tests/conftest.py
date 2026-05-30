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
# JWT_SECRET requis par jwt_middleware au moment de l'import — secret de test
os.environ.setdefault("JWT_SECRET", "test-jwt-secret-for-pytest-only-" + ("x" * 32))
# DATABASE_URL laissé au défaut — SQLAlchemy ne se connecte pas tant qu'on ne l'appelle pas

import pytest
from unittest.mock import MagicMock, patch
from fastapi.testclient import TestClient

from app.main import app
from app.core.db import get_db


# ── Helpers ─────────────────────────────────────────────────────────────────

def make_mock_db() -> MagicMock:
    """Retourne un MagicMock qui simule une Session SQLAlchemy.

    L'objet *query* est **auto-référent** : toutes les méthodes de chaînage
    (filter, filter_by, order_by, offset, limit, group_by, join…) renvoient le
    même mock. N'importe quelle combinaison de chaînage aboutit donc aux mêmes
    terminaux par défaut :
        .all()   → []        .first() → None
        .count() → 0         .scalar() → 0
    Cela remplace l'ancienne configuration fragile chaîne-par-chaîne, qui ne
    couvrait pas des combinaisons réelles comme `filter().order_by().filter()`
    (gaps avec filtre d'urgence) ni `filter().order_by().count()` : un terminal
    non configuré renvoyait alors un MagicMock non sérialisable → 500 / total
    incohérent. Les tests peuvent toujours surcharger un terminal précis
    (ex. `db.query.return_value.filter_by.return_value.first.return_value = x`).
    """
    db = MagicMock()

    query = MagicMock(name="Query")
    for chaining in (
        "filter", "filter_by", "order_by", "offset", "limit",
        "group_by", "having", "join", "outerjoin", "options",
        "distinct", "with_entities", "select_from", "params",
    ):
        getattr(query, chaining).return_value = query

    query.all.return_value = []
    query.first.return_value = None
    query.one_or_none.return_value = None
    query.count.return_value = 0
    query.scalar.return_value = 0
    query.delete.return_value = 0

    db.query.return_value = query

    # Requêtes SQL brutes (execute_query) → aucun résultat par défaut.
    exec_result = MagicMock()
    exec_result.mappings.return_value.all.return_value = []
    exec_result.scalar.return_value = 0
    db.execute.return_value = exec_result

    # add / flush / commit / rollback / refresh — pas d'effet.
    db.add.return_value = None
    db.flush.return_value = None
    db.commit.return_value = None
    db.rollback.return_value = None
    db.refresh.return_value = None
    db.close.return_value = None

    return db


# ── Fixtures ─────────────────────────────────────────────────────────────────

@pytest.fixture(autouse=True)
def _ensure_get_db_override():
    """Garantit qu'au démarrage de CHAQUE test, `get_db` est mocké.

    De nombreux tests (test_coverage_boost, test_corrections…) appellent
    `app.dependency_overrides.clear()` dans leur `finally`, ce qui efface aussi
    l'override posé par le fixture `client` (scope session). Sans ce filet, le
    test suivant qui réutilise `client` tomberait sur le vrai `get_db` →
    connexion PostgreSQL réelle (souvent absente en CI) → timeout puis 500/503.
    On réapplique donc systématiquement le mock par défaut ; un test qui pose
    son propre `mock_db` l'écrase ensuite pour la durée de son corps.
    """
    app.dependency_overrides[get_db] = make_mock_db
    yield


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
