"""
Tests pour le PilotageDashboardEngine (nouveau dashboard de pilotage PFE).
"""

import os
os.environ.setdefault("JWT_AUTH_ENABLED", "false")
os.environ.setdefault("SCHEDULER_ENABLED", "false")
os.environ.setdefault("MESSAGING_ENABLED", "false")

from unittest.mock import MagicMock

from app.engines.pilotage_dashboard_engine import PilotageDashboardEngine


def _mock_db():
    return MagicMock()


class TestPilotageDashboard:
    def test_compute_all_returns_four_modules(self):
        db = _mock_db()
        # Aucune donnée -> chaque module dégrade vers un défaut neutre.
        db.query.return_value.filter.return_value.distinct.return_value.limit.return_value.all.return_value = []
        db.query.return_value.filter.return_value.scalar.return_value = None
        db.execute.return_value.fetchall.return_value = []
        db.query.return_value.group_by.return_value.all.return_value = []
        eng = PilotageDashboardEngine(db)
        res = eng.compute_all(horizon_mois=6)
        assert set(res.keys()) == {
            "forecast_kpis", "benchmark_departements",
            "anomalies_live", "correlation_besoins_gaps", "generated_at",
        }
        # forecast_kpis sans données.
        assert res["forecast_kpis"]["nb_enseignants"] == 0
        # anomalies_live sans données.
        assert res["anomalies_live"]["nb_anomalies_recentes"] == 0
        assert res["anomalies_live"]["alertes"] == []
        # corrélation sans données.
        assert res["correlation_besoins_gaps"]["coefficient_pearson"] is None

    def test_correlation_pearson_strong_positive(self):
        db = _mock_db()
        # Besoins et gaps parfaitement corrélés (croissants).
        db.execute.return_value.fetchall.return_value = [
            (1, 1), (2, 2), (3, 3), (4, 4),
        ]
        # Le gaps query : db.query(...).group_by(...).all()
        db.query.return_value.group_by.return_value.all.return_value = [
            (1, 1), (2, 2), (3, 3), (4, 4),
        ]
        eng = PilotageDashboardEngine(db)
        corr = eng.correlation_besoins_gaps()
        assert corr["coefficient_pearson"] is not None
        assert corr["coefficient_pearson"] > 0.99
        assert "forte" in corr["interpretation"].lower()

    def test_benchmark_departements_ranks_by_ecart(self):
        db = _mock_db()
        db.query.return_value.filter.return_value.scalar.return_value = 3.0  # ref globale
        db.execute.return_value.fetchall.return_value = [
            ("D1", 4.0, 10),  # au-dessus
            ("D2", 2.0, 8),   # en-deça
        ]
        eng = PilotageDashboardEngine(db)
        res = eng.benchmark_departements()
        assert len(res) == 2
        assert res[0]["departement_id"] == "D1"
        assert res[0]["position"] == "AU_DESSUS"
        assert res[1]["position"] == "EN_DECA"
        assert res[0]["ecart_vs_cohorte"] == 1.0
