"""
Tests pour le PilotageDashboardEngine (nouveau dashboard de pilotage PFE).
"""

import os
os.environ.setdefault("JWT_AUTH_ENABLED", "false")
os.environ.setdefault("SCHEDULER_ENABLED", "false")
os.environ.setdefault("MESSAGING_ENABLED", "false")

from unittest.mock import MagicMock, patch

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

    def test_forecast_kpis_with_enseignants(self):
        db = _mock_db()
        # enseignants suivis
        db.query.return_value.filter.return_value.distinct.return_value.limit.return_value.all.return_value = [
            ("E1",), ("E2",),
        ]
        fc = {
            "competences": [
                {"niveau_prevu_final": 3.0, "comblera_objectif": True, "en_regression": False},
                {"niveau_prevu_final": 1.0, "comblera_objectif": False, "en_regression": True},
            ],
        }
        with patch("app.engines.pilotage_dashboard_engine.SkillForecastEngine") as fcm:
            fcm.return_value.forecast.return_value = fc
            eng = PilotageDashboardEngine(db)
            res = eng.forecast_kpis(horizon_mois=6)
        assert res["nb_enseignants"] == 2
        assert res["nb_competences_suivies"] == 4
        assert res["nb_competences_regression"] == 2
        assert res["pct_objectifs_atteignables"] == 50.0
        assert res["niveau_projet_moyen"] == 2.0

    def test_forecast_kpis_single_enseignant_failure(self):
        db = _mock_db()
        db.query.return_value.filter.return_value.distinct.return_value.limit.return_value.all.return_value = [
            ("E1",),
        ]
        with patch("app.engines.pilotage_dashboard_engine.SkillForecastEngine") as fcm:
            fcm.return_value.forecast.side_effect = RuntimeError("boom")
            eng = PilotageDashboardEngine(db)
            res = eng.forecast_kpis(horizon_mois=6)
        assert res["nb_enseignants"] == 1
        assert res["nb_competences_suivies"] == 0

    def test_correlation_pearson_moderate(self):
        db = _mock_db()
        # xs croissants, ys croissants mais avec bruit -> modéré
        db.execute.return_value.fetchall.return_value = [
            (1, 1), (2, 2), (3, 3), (4, 4), (5, 5), (6, 6),
        ]
        db.query.return_value.group_by.return_value.all.return_value = [
            (1, 5), (2, 6), (3, 7), (4, 2), (5, 8), (6, 9),
        ]
        eng = PilotageDashboardEngine(db)
        corr = eng.correlation_besoins_gaps()
        assert "modérée" in corr["interpretation"]

    def test_correlation_pearson_negative(self):
        db = _mock_db()
        # xs croissants, ys décroissants -> corrélation négative
        db.execute.return_value.fetchall.return_value = [
            (1, 1), (2, 2), (3, 3), (4, 4), (5, 5),
        ]
        db.query.return_value.group_by.return_value.all.return_value = [
            (1, 10), (2, 8), (3, 6), (4, 4), (5, 2),
        ]
        eng = PilotageDashboardEngine(db)
        corr = eng.correlation_besoins_gaps()
        assert corr["coefficient_pearson"] < 0
        assert "négative" in corr["interpretation"]

    def test_anomalies_live_with_rows(self):
        from types import SimpleNamespace
        db = _mock_db()
        db.query.return_value.filter.return_value.scalar.return_value = 3
        db.query.return_value.filter.return_value.order_by.return_value.limit.return_value.all.return_value = [
            SimpleNamespace(id=1, type_alerte="ANOMALIE", cible_type="competence",
                            competence_id=5, severite="WARNING", statut="NOUVELLE",
                            titre="t", message="m", enseignant_id="E1", created_at=None),
        ]
        eng = PilotageDashboardEngine(db)
        res = eng.anomalies_live()
        assert res["nb_anomalies_recentes"] == 3
        assert res["nb_nouvelles"] == 1
        assert res["alertes"][0]["id"] == 1
