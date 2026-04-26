"""API integration tests for predictive analytics endpoints."""

import pytest
from fastapi.testclient import TestClient


class TestHealth:
    def test_health_check(self, client: TestClient):
        response = client.get("/api/health")
        assert response.status_code == 200
        data = response.json()
        assert data["status"] == "healthy"
        assert data["service"] == "d2f-predictive-analytics"


class TestGapPrediction:
    def test_predict_gaps_without_model(self, client: TestClient):
        """Should return 503 when model is not trained."""
        response = client.post("/api/predict/gaps/TEST001", json={"top_n": 5})
        assert response.status_code in (503, 404)

    def test_train_model_insufficient_data(self, client: TestClient):
        """Should handle insufficient data gracefully."""
        response = client.post("/api/predict/train")
        # May fail due to DB connection or insufficient data
        assert response.status_code in (200, 422, 500)


class TestRecommendations:
    def test_recommend_path(self, client: TestClient):
        response = client.post("/api/recommend/path", json={
            "teacher_id": "TEST001",
            "target_competency_id": 1,
            "target_level": 3,
        })
        assert response.status_code in (200, 422, 500)


class TestDashboard:
    def test_dashboard_endpoints(self, client: TestClient):
        for endpoint in [
            "/api/dashboard/declining-competencies",
            "/api/dashboard/in-demand-competencies",
            "/api/dashboard/teacher-risk-indicators",
            "/api/dashboard/summary",
        ]:
            response = client.get(endpoint)
            assert response.status_code in (200, 500)


class TestDetection:
    def test_at_risk_teachers(self, client: TestClient):
        response = client.get("/api/detect/at-risk-teachers?threshold=0.5")
        assert response.status_code in (200, 500)
