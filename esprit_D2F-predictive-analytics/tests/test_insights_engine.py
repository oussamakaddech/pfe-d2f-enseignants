"""Tests unitaires — InsightsEngine (dashboards riches).

Aucune base réelle : helpers purs + mocks de Session (cf. conftest.make_mock_db).
"""

import os
os.environ.setdefault("JWT_AUTH_ENABLED", "false")
os.environ.setdefault("SCHEDULER_ENABLED", "false")
os.environ.setdefault("MESSAGING_ENABLED", "false")

from types import SimpleNamespace

from app.engines.insights_engine import (
    InsightsEngine, _add_months, _ewma, _linear_fit, _quadrant, _residual_std,
)


# ── Helpers numériques purs ──────────────────────────────────

class TestLinearFit:
    def test_positive_slope_for_increasing_series(self):
        slope, intercept = _linear_fit([1, 2, 3, 4, 5])
        assert slope == 1.0
        assert round(intercept, 6) == 1.0

    def test_flat_series_zero_slope(self):
        slope, _ = _linear_fit([3, 3, 3, 3])
        assert slope == 0.0

    def test_single_point_no_crash(self):
        slope, intercept = _linear_fit([7])
        assert slope == 0.0
        assert intercept == 7.0


class TestResidualStd:
    def test_perfect_fit_zero_residual(self):
        assert _residual_std([1, 2, 3], 1.0, 1.0) == 0.0

    def test_short_series_returns_zero(self):
        assert _residual_std([5], 0.0, 5.0) == 0.0


class TestEwma:
    def test_converges_towards_recent_values(self):
        # Série croissante : la dernière EWMA doit dépasser la moyenne brute simple.
        assert _ewma([1, 2, 3, 4, 5], alpha=0.5) > 3.0

    def test_constant_series(self):
        assert _ewma([4, 4, 4]) == 4


class TestAddMonths:
    def test_within_year(self):
        assert _add_months("2025-01", 1) == "2025-02"

    def test_year_rollover(self):
        assert _add_months("2025-12", 1) == "2026-01"

    def test_multi_step(self):
        assert _add_months("2025-10", 5) == "2026-03"

    def test_invalid_label_is_graceful(self):
        assert _add_months("bogus", 2) == "+2"


class TestQuadrant:
    def test_investir(self):
        assert _quadrant(0.8, 0.2) == "INVESTIR"

    def test_maintenir(self):
        assert _quadrant(0.8, 0.9) == "MAINTENIR"

    def test_surplus(self):
        assert _quadrant(0.1, 0.9) == "SURPLUS"

    def test_surveiller(self):
        assert _quadrant(0.1, 0.2) == "SURVEILLER"


# ── Méthodes du moteur (mock DB) ─────────────────────────────

class TestOverview:
    def test_empty_db_returns_neutral_tiles(self, mock_db):
        result = InsightsEngine(mock_db).overview()
        assert result["nb_enseignants_suivis"] == 0
        assert result["score_risque_moyen"] == 0.0
        assert result["nb_gaps_critiques"] == 0
        assert result["taux_couverture_global"] == 0.0
        # Pas de snapshot précédent → deltas tous None.
        assert all(v is None for v in result["deltas"].values())
        assert "generated_at" in result


class TestDemandForecast:
    def test_insufficient_history(self, mock_db):
        eng = InsightsEngine(mock_db)
        eng._demand_history = lambda history_months: [{"month": "2025-01", "value": 3}]
        result = eng.demand_forecast(months=6)
        assert result["forecast"] == []
        assert "note" in result

    def test_projection_extends_series(self, mock_db):
        eng = InsightsEngine(mock_db)
        eng._demand_history = lambda history_months: [
            {"month": f"2025-0{i}", "value": i} for i in range(1, 7)
        ]
        result = eng.demand_forecast(months=3)
        assert result["method"] == "ewma+linear"
        assert len(result["forecast"]) == 3
        assert result["slope_par_mois"] > 0
        for pt in result["forecast"]:
            assert pt["value"] >= 0
            assert pt["upper"] >= pt["lower"]


class TestSupplyDemand:
    def test_labels_quadrants(self, mock_db):
        row = SimpleNamespace(
            competence_id=42, competence_nom="IA", domaine_nom="Data",
            nb=10, couverts=2, gap_moy=0.8, besoins_moy=3.0, nb_critiques=4,
        )
        mock_db.query.return_value.all.return_value = [row]
        result = InsightsEngine(mock_db).supply_demand()
        assert len(result) == 1
        cell = result[0]
        assert cell["competence_id"] == 42
        assert cell["supply_ratio"] == 0.2
        assert cell["quadrant"] == "INVESTIR"  # forte demande, faible couverture


class TestRiskDistribution:
    def test_histogram_buckets(self, mock_db):
        rows = [
            SimpleNamespace(enseignant_id="t1", score_risque=0.1, niveau_risque="FAIBLE"),
            SimpleNamespace(enseignant_id="t2", score_risque=0.9, niveau_risque="CRITIQUE"),
            SimpleNamespace(enseignant_id="t3", score_risque=0.85, niveau_risque="CRITIQUE"),
        ]
        mock_db.query.return_value.all.return_value = rows
        result = InsightsEngine(mock_db).risk_distribution()
        assert result["total"] == 3
        assert result["by_level"]["CRITIQUE"] == 2
        last_bucket = result["histogram"][-1]  # 0.8-1.0
        assert last_bucket["count"] == 2
