"""Tests d'API — router insights (/api/v1/analytics/*).

Vérifie le câblage et la résilience base-vide (mock DB via conftest.client).
"""

import os
os.environ.setdefault("JWT_AUTH_ENABLED", "false")
os.environ.setdefault("SCHEDULER_ENABLED", "false")
os.environ.setdefault("MESSAGING_ENABLED", "false")

BASE = "/api/v1/analytics"


class TestDashboardInsights:
    def test_overview(self, client):
        r = client.get(f"{BASE}/dashboard/overview")
        assert r.status_code == 200
        body = r.json()
        assert "nb_enseignants_suivis" in body
        assert "deltas" in body

    def test_demand_forecast(self, client):
        r = client.get(f"{BASE}/dashboard/demand-forecast", params={"months": 6})
        assert r.status_code == 200
        body = r.json()
        assert body["method"] == "ewma+linear"
        assert "history" in body and "forecast" in body

    def test_supply_demand(self, client):
        r = client.get(f"{BASE}/dashboard/supply-demand")
        assert r.status_code == 200
        assert isinstance(r.json(), list)

    def test_risk_distribution(self, client):
        r = client.get(f"{BASE}/dashboard/risk-distribution")
        assert r.status_code == 200
        assert "histogram" in r.json()

    def test_heatmap_drilldown(self, client):
        r = client.get(f"{BASE}/dashboard/gap-heatmap/INFO/5")
        assert r.status_code == 200
        body = r.json()
        assert body["competence_id"] == 5
        assert "enseignants" in body


class TestActionCenterRoutes:
    def test_alerts_summary(self, client):
        r = client.get(f"{BASE}/alerts/summary")
        assert r.status_code == 200
        assert "total" in r.json()

    def test_alerts_bulk_valid(self, client):
        r = client.patch(f"{BASE}/alerts/bulk", json={"alert_ids": [1, 2], "statut": "TRAITEE"})
        assert r.status_code == 200
        body = r.json()
        assert body["statut"] == "TRAITEE"
        assert body["nb_demande"] == 2

    def test_alerts_bulk_invalid_statut(self, client):
        r = client.patch(f"{BASE}/alerts/bulk", json={"alert_ids": [1], "statut": "BOGUS"})
        assert r.status_code == 400

    def test_alerts_bulk_requires_ids(self, client):
        r = client.patch(f"{BASE}/alerts/bulk", json={"alert_ids": [], "statut": "TRAITEE"})
        assert r.status_code == 422  # min_length=1

    def test_actions_priority(self, client):
        r = client.get(f"{BASE}/actions/priority", params={"limit": 10})
        assert r.status_code == 200
        assert isinstance(r.json(), list)

    def test_recommendations_batch(self, client):
        r = client.post(f"{BASE}/recommendations/batch", json={"top_n": 5})
        assert r.status_code == 200
        assert "recommendations" in r.json()
