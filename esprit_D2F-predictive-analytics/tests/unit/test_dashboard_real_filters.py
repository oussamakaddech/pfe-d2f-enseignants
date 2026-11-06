"""Filtres du tableau de bord réel (/dashboard/real/impact).

Non-régression du bug « changer de filtre ne change rien aux statistiques » :
les filtres département/UP/niveau/période sont appliqués CÔTÉ BACKEND aux
8 KPI (pas seulement aux tableaux). Garde-fous :
- sans filtre actif, le chemin historique est conservé à l'identique ;
- un niveau de risque inconnu est rejeté en 400 (jamais de filtre vide silencieux).
"""
from contextlib import contextmanager
from types import SimpleNamespace

import pytest
from fastapi import HTTPException

from app.api.v1 import dashboard_real
from app.api.v1.dashboard_real import normalize_niveau_filter


def test_normalize_niveau_filter_none_and_valid():
    assert normalize_niveau_filter(None) is None
    assert normalize_niveau_filter("critique") == "CRITIQUE"
    assert normalize_niveau_filter("ELEVE") == "ELEVE"
    assert normalize_niveau_filter("modere") == "MODERE"
    assert normalize_niveau_filter("Faible") == "FAIBLE"


def test_normalize_niveau_filter_rejects_unknown():
    # La route traduit cette erreur en HTTP 400 (test_invalid_niveau_rejected_before_query).
    with pytest.raises(ValueError, match="niveau_risque invalide"):
        normalize_niveau_filter("URGENT")


def test_filtered_sql_uses_scope_cte_and_legacy_does_not():
    for name in (
        "KPIS_FILTERED_SQL",
        "HEATMAP_FILTERED_SQL",
        "AT_RISK_FILTERED_SQL",
        "TOP_FORMATIONS_FILTERED_SQL",
        "COVERAGE_FILTERED_SQL",
    ):
        sql = getattr(dashboard_real, name)
        assert "scope_teachers" in sql, name
    for name in (
        "KPIS_SCOPED_SQL",
        "HEATMAP_SCOPED_SQL",
        "AT_RISK_SCOPED_SQL",
        "TOP_FORMATIONS_SCOPED_SQL",
        "COVERAGE_SQL",
    ):
        assert "scope_teachers" not in getattr(dashboard_real, name), name


def test_filtered_kpis_sql_covers_all_filter_params():
    assert ":dept_id" in dashboard_real.KPIS_FILTERED_SQL
    assert ":up_id" in dashboard_real.KPIS_FILTERED_SQL
    assert ":niveau" in dashboard_real.KPIS_FILTERED_SQL
    assert ":days" in dashboard_real.KPIS_FILTERED_SQL


class _Mappings:
    def __init__(self, rows):
        self._rows = rows

    def all(self):
        return self._rows

    def first(self):
        return self._rows[0] if self._rows else None


class _Result:
    def __init__(self, rows):
        self._rows = rows

    def mappings(self):
        return _Mappings(self._rows)


class _FakeDb:
    """Doublure qui rejoue des lignes scriptées et capture SQL + paramètres."""

    def __init__(self):
        self.statements: list[str] = []
        self.params: list[dict] = []

    @contextmanager
    def read_connection(self):
        db = self

        class _Conn:
            def execute(self, stmt, params=None):
                db.statements.append(str(stmt))
                db.params.append(dict(params or {}))
                is_kpis = "AS nb_enseignants" in str(stmt)
                return _Result(rows=[_kpis_row()] if is_kpis else [])

        yield _Conn()


def _kpis_row():
    return {
        "nb_enseignants": 42,
        "nb_enseignants_avec_gaps": 42,
        "nb_enseignants_avec_competences": 42,
        "nb_gaps_critiques": 10,
        "nb_gaps_haute": 5,
        "nb_gaps_total": 20,
        "avg_gap_score": 0.5,
        "nb_alertes_non_traitees": 100,
        "nb_alertes_critiques": 40,
        "avg_risk_score": 0.42,
    }


def _container(db):
    scope = SimpleNamespace(
        count_levels_on_scope=lambda *args: 1,
    )
    port = SimpleNamespace(
        status=lambda: {"model_mode": "PRODUCTION_ML"},
        risk_ml_status=lambda: {},
    )
    return SimpleNamespace(database=db, analyze_teacher_scope=scope, model_port=port)


def _admin_user():
    return SimpleNamespace(is_admin=True, is_cup=False, is_chef_departement=False)


def test_no_filter_uses_legacy_sql():
    db = _FakeDb()
    out = dashboard_real.get_real_dashboard_impact(_container(db), _admin_user())
    assert not any("scope_teachers" in s for s in db.statements)
    assert out["data"]["scope"] == {
        "dept_id": None,
        "up_id": None,
        "niveau_risque": None,
        "days": None,
        "filtered": False,
    }
    assert out["data"]["kpis"]["nb_enseignants"] == 42


def test_dept_filter_uses_scoped_sql_with_params():
    db = _FakeDb()
    out = dashboard_real.get_real_dashboard_impact(
        _container(db), _admin_user(), dept_id="DEPT_IA"
    )
    assert any("scope_teachers" in s for s in db.statements)
    assert db.params and all(p.get("dept_id") == "DEPT_IA" for p in db.params)
    assert out["data"]["scope"]["dept_id"] == "DEPT_IA"
    assert out["data"]["scope"]["filtered"] is True


def test_up_niveau_days_filters_forwarded():
    db = _FakeDb()
    out = dashboard_real.get_real_dashboard_impact(
        _container(db), _admin_user(), up_id="UP_X", niveau_risque="critique", days=7
    )
    assert any("scope_teachers" in s for s in db.statements)
    assert db.params and all(
        p.get("up_id") == "UP_X" and p.get("niveau") == "CRITIQUE" and p.get("days") == 7
        for p in db.params
    )
    scope = out["data"]["scope"]
    assert (scope["up_id"], scope["niveau_risque"], scope["days"]) == ("UP_X", "CRITIQUE", 7)


def test_invalid_niveau_rejected_before_query():
    db = _FakeDb()
    with pytest.raises(HTTPException) as exc_info:
        dashboard_real.get_real_dashboard_impact(
            _container(db), _admin_user(), niveau_risque="URGENT"
        )
    assert exc_info.value.status_code == 400
    assert db.statements == []


def test_chef_dept_forces_own_department():
    db = _FakeDb()
    teacher = SimpleNamespace(dept_id="DEPT_GC")
    container = _container(db)
    container.analyze_teacher_scope = SimpleNamespace(
        count_levels_on_scope=lambda *args: 1,
    )
    import app.api.v1.dashboard_real as mod

    real_resolve = mod.resolve_user_teacher
    mod.resolve_user_teacher = lambda container, user: teacher
    try:
        user = SimpleNamespace(is_admin=False, is_cup=False, is_chef_departement=True)
        out = mod.get_real_dashboard_impact(container, user, dept_id="DEPT_IA")
    finally:
        mod.resolve_user_teacher = real_resolve
    assert out["data"]["scope"]["dept_id"] == "DEPT_GC"
    assert db.params and all(p.get("dept_id") == "DEPT_GC" for p in db.params)
