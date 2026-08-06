"""Shim legacy : monte le dossier app_legacy comme package `app`.

Les tests de tests_legacy/ ont été écrits pour l'ancien monolithe où le
package s'appelait `app` (config.py, ml/, core/, services/, routers/...).
Depuis la migration, ces modules vivent dans app_legacy/. Ce conftest rend
`import app.*` résolvable vers app_legacy/* UNIQUEMENT pour la session de
tests legacy — les tests du nouveau layout (tests/) continuent d'importer
le vrai package `app` (layout hexagonal).
"""
import os
import socket
import sys
import types
from pathlib import Path

import pytest
from fastapi.testclient import TestClient

# Mêmes valeurs par défaut que les fichiers legacy (ex: test_corrections.py).
os.environ.setdefault("JWT_AUTH_ENABLED", "false")
os.environ.setdefault("SCHEDULER_ENABLED", "false")
os.environ.setdefault("MESSAGING_ENABLED", "false")
os.environ.setdefault("DEBUG", "false")
os.environ.setdefault("APP_ENV", "test")
os.environ.setdefault("JWT_SECRET", "test-jwt-secret-for-pytest-only-" + ("x" * 32))

_LEGACY_DIR = Path(__file__).resolve().parent.parent / "app_legacy"

_mod = types.ModuleType("app")
_mod.__path__ = [str(_LEGACY_DIR)]
_mod.__file__ = str(_LEGACY_DIR)
sys.modules.setdefault("app", _mod)


def _db_reachable(host: str = "localhost", port: int = 7432, timeout: float = 0.5) -> bool:
    """Détection rapide d'une base PostgreSQL accessible (skipif pour les
    tests d'intégration legacy)."""
    try:
        with socket.create_connection((host, port), timeout=timeout):
            return True
    except OSError:
        return False


DB_REACHABLE = _db_reachable()


def make_mock_db():
    """Mock de session SQLAlchemy chaînable (remplace l'ancien helper de
    tests/conftest.py, supprimé lors de la migration layout hexagonal)."""
    from unittest.mock import MagicMock

    return MagicMock()


@pytest.fixture
def client():
    """TestClient de l'API legacy (app_legacy/main.py), sans DB requise."""
    from app.main import app

    with TestClient(app) as c:
        yield c
