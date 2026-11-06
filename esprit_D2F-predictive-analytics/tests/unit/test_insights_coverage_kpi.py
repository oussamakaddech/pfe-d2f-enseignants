"""KPI « taux de couverture global » : paramètres liés à execute(), pas à text().

Avant correctif, ``text(sql, params)`` levait une TypeError avalée par
``_safe`` : le KPI s'affichait toujours à 0 %.
"""
from app.legacy_compat_runtime import ensure_legacy_aliases

ensure_legacy_aliases()

from app_legacy.engines.insights_engine import InsightsEngine, OverviewScope  # noqa: E402


class _Row:
    def __init__(self, row):
        self._row = row

    def mappings(self):
        return self

    def first(self):
        return self._row


class _Db:
    def __init__(self):
        self.params = None

    def execute(self, stmt, params=None):
        self.params = params
        return _Row({"nb_enseignants": 4, "avec_competences": 3})


def test_taux_couverture_global_binds_scope_params():
    db = _Db()
    engine = InsightsEngine.__new__(InsightsEngine)
    engine.db = db
    assert engine._taux_couverture_global(OverviewScope("UP", "UP_GC")) == 75.0
    assert db.params == {"up_id": "UP_GC", "dept_id": None}
