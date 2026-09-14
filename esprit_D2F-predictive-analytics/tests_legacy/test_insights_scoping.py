"""Tests — Scoping serveur de l'overview (CUP -> UP, chef -> departement).

Le perimetre est resolu cote API depuis le JWT (jamais depuis le client) :
cf. app_legacy/routers/insights.py::_resolve_overview_scope et
InsightsEngine.overview(scope). Fixture mock_db locale (MagicMock) : le
moteur degrade chaque KPI vers son defaut via safe_kpi en cas d'erreur.
"""

import os

os.environ.setdefault("JWT_AUTH_ENABLED", "false")
os.environ.setdefault("SCHEDULER_ENABLED", "false")
os.environ.setdefault("MESSAGING_ENABLED", "false")

from unittest.mock import MagicMock

import pytest

from app.engines.insights_engine import InsightsEngine, OverviewScope, _SCOPE_TAGS
from app.routers.insights import _NO_SCOPE_ID, _resolve_overview_scope


@pytest.fixture
def mock_db():
    return MagicMock()


# ── Resolution du perimetre (router) ─────────────────────────


class TestResolveOverviewScope:
    def test_no_role_is_global(self):
        assert _resolve_overview_scope(None, {"role": "", "user_id": "u", "email": "e"}) is None

    def test_admin_alone_is_global(self):
        auth = {"role": "ROLE_ADMIN", "user_id": "u", "email": "e"}
        assert _resolve_overview_scope(None, auth) is None

    def test_cup_scoped_to_his_up(self, mock_db):
        mock_db.execute.return_value.mappings.return_value.first.return_value = {"sid": "UP1"}
        scope = _resolve_overview_scope(
            mock_db, {"role": "ROLE_CUP", "user_id": "u1", "email": "a@esprit.tn"}
        )
        assert scope == OverviewScope("UP", "UP1")

    def test_chef_scoped_to_his_departement(self, mock_db):
        mock_db.execute.return_value.mappings.return_value.first.return_value = {"sid": "D1"}
        scope = _resolve_overview_scope(
            mock_db, {"role": "CHEF_DEPARTEMENT", "user_id": "", "email": "a@esprit.tn"}
        )
        assert scope == OverviewScope("DEPARTEMENT", "D1")

    def test_cup_without_fiche_is_denied_by_default(self, mock_db):
        mock_db.execute.return_value.mappings.return_value.first.return_value = None
        scope = _resolve_overview_scope(
            mock_db, {"role": "ROLE_CUP", "user_id": "u1", "email": ""}
        )
        assert scope == OverviewScope("UP", _NO_SCOPE_ID)

    def test_db_error_is_denied_by_default(self, mock_db):
        from sqlalchemy.exc import SQLAlchemyError

        mock_db.execute.side_effect = SQLAlchemyError("boom")
        scope = _resolve_overview_scope(
            mock_db, {"role": "ROLE_CUP", "user_id": "u1", "email": "a@b.c"}
        )
        assert scope == OverviewScope("UP", _NO_SCOPE_ID)

    def test_no_identity_at_all_is_denied_by_default(self):
        scope = _resolve_overview_scope(None, {"role": "ROLE_CUP", "user_id": "", "email": ""})
        assert scope == OverviewScope("UP", _NO_SCOPE_ID)


# ── Application du perimetre (moteur) ────────────────────────


class TestScopedEnseignantIds:
    def test_none_scope_is_global(self, mock_db):
        assert InsightsEngine(mock_db)._scoped_enseignant_ids(None) is None

    def test_global_type_is_global(self, mock_db):
        eng = InsightsEngine(mock_db)
        assert eng._scoped_enseignant_ids(OverviewScope("GLOBAL", None)) is None

    def test_up_scope_queries_up_column(self, mock_db):
        mock_db.execute.return_value.scalars.return_value.all.return_value = ["T1", "T2"]
        eng = InsightsEngine(mock_db)
        rows = eng._scoped_enseignant_ids(OverviewScope("UP", "UP1"))
        assert rows == ["T1", "T2"]
        sql = str(mock_db.execute.call_args[0][0])
        assert "up_id = :sid" in sql

    def test_indetermined_scope_denied_by_default(self, mock_db):
        # MagicMock : scalars().all() -> itérable vide -> liste vide, jamais global.
        eng = InsightsEngine(mock_db)
        rows = eng._scoped_enseignant_ids(OverviewScope("UP", _NO_SCOPE_ID))
        assert rows == []


class TestOverviewAppliesScope:
    def _stub_engine(self, mock_db, captured: dict) -> InsightsEngine:
        eng = InsightsEngine(mock_db)
        eng._scoped_enseignant_ids = lambda s: captured.setdefault("ids", ["T1", "T2"])
        eng._nb_enseignants_suivis = lambda ids=None: captured.update(n=ids) or 3
        eng._score_risque_moyen = lambda ids=None: 0.5
        eng._score_risque_moyen_precedent = lambda ids=None: None
        eng._nb_gaps_critiques = lambda ids=None: 0
        eng._nb_alertes_nouvelles = lambda scope=None, ids=None: 0
        eng._taux_couverture_global = lambda scope=None: 12.5
        eng._precision_modele = lambda: None
        eng._previous_overview_snapshot = lambda scope=None: None
        eng._persist_overview_snapshot = lambda current, scope=None: captured.update(persisted=current)
        return eng

    def test_up_scope_passes_ids_to_kpis(self, mock_db):
        captured: dict = {}
        eng = self._stub_engine(mock_db, captured)
        result = eng.overview(OverviewScope("UP", "UP1"))
        assert captured["ids"] == ["T1", "T2"]
        assert result["nb_enseignants_suivis"] == 3
        assert result["taux_couverture_global"] == 12.5

    def test_default_overview_stays_global(self, mock_db):
        captured: dict = {}
        eng = self._stub_engine(mock_db, captured)
        result = eng.overview()
        # Le snapshot persite contient les tuiles courantes (base des deltas).
        assert captured["persisted"]["nb_enseignants_suivis"] == result["nb_enseignants_suivis"]
        assert captured["persisted"]["taux_couverture_global"] == result["taux_couverture_global"]


class TestScopeTags:
    def test_snapshot_tags_per_scope(self):
        assert _SCOPE_TAGS["GLOBAL"] == "OVERVIEW"
        assert _SCOPE_TAGS["UP"] == "OVERVIEW-UP"
        assert _SCOPE_TAGS["DEPARTEMENT"] == "OVERVIEW-DEPT"