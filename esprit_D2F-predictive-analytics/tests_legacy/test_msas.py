"""Tests for engines/msas.py — Multi-Signal Adaptive Scoring."""

import pytest


class TestMSASWeights:
    def test_equal_weights_when_no_data(self):
        from app.engines.msas import compute_adaptive_weights
        w = compute_adaptive_weights({}, {}, {})
        assert abs(w["alpha"] + w["beta"] + w["gamma"] - 1.0) < 1e-6

    def test_gap_dominant_when_rich_data(self):
        from app.engines.msas import compute_adaptive_weights
        w = compute_adaptive_weights(
            {"nb_competences_evaluees": 10},
            {"nb_similar_neighbors": 0},
            {"nb_risk_indicators": 0},
        )
        assert w["alpha"] > w["beta"]
        assert w["alpha"] > w["gamma"]

    def test_peer_dominant(self):
        from app.engines.msas import compute_adaptive_weights
        w = compute_adaptive_weights(
            {"nb_competences_evaluees": 0},
            {"nb_similar_neighbors": 10},
            {"nb_risk_indicators": 0},
        )
        assert w["beta"] > w["alpha"]

    def test_weights_sum_to_one(self):
        from app.engines.msas import compute_adaptive_weights
        w = compute_adaptive_weights(
            {"nb_competences_evaluees": 5},
            {"nb_similar_neighbors": 3},
            {"nb_risk_indicators": 4},
        )
        assert abs(w["alpha"] + w["beta"] + w["gamma"] - 1.0) < 1e-4


class TestMSASSignals:
    def test_compute_gap_score(self):
        from app.engines.msas import compute_gap_score
        score = compute_gap_score(gap_score=2.5, nb_competences=10, nb_critiques=3)
        assert 0.0 <= score <= 1.0

    def test_compute_peer_score(self):
        from app.engines.msas import compute_peer_score
        score = compute_peer_score(0.8, 5, 20)
        assert 0.0 <= score <= 1.0

    def test_compute_risk_signal(self):
        from app.engines.msas import compute_risk_signal
        assert compute_risk_signal(0.9, "CRITIQUE") > compute_risk_signal(0.9, "FAIBLE")

    def test_risk_signal_clamped(self):
        from app.engines.msas import compute_risk_signal
        assert compute_risk_signal(1.5, "CRITIQUE") <= 1.0
        assert compute_risk_signal(-0.5, "FAIBLE") >= 0.0


class TestMSASScore:
    def test_msas_score_basic(self):
        from app.engines.msas import msas_score
        result = msas_score(
            gap_data={"avg_gap": 2.0, "nb_competences": 5, "nb_critiques": 2, "nb_competences_evaluees": 5},
            peer_data={"peer_success_rate": 0.7, "peer_adoption_count": 3, "total_peers": 10, "nb_similar_neighbors": 3},
            risk_data={"risk_score": 0.6, "niveau_risque": "ELEVE", "nb_risk_indicators": 3},
        )
        assert "msas_score" in result
        assert 0.0 <= result["msas_score"] <= 1.0
        assert "alpha" in result
        assert "explanation" in result

    def test_msas_score_dominant_signal(self):
        from app.engines.msas import msas_score
        result = msas_score(
            gap_data={"avg_gap": 3.0, "nb_competences": 10, "nb_critiques": 8, "nb_competences_evaluees": 10},
            peer_data={"peer_success_rate": 0.5, "peer_adoption_count": 0, "total_peers": 10, "nb_similar_neighbors": 0},
            risk_data={"risk_score": 0.3, "niveau_risque": "MODERE", "nb_risk_indicators": 0},
        )
        assert result["dominant_signal"] == "gap"

    def test_msas_batch(self):
        from app.engines.msas import msas_batch
        formations = [
            {"formation_id": 1, "titre_formation": "F1"},
            {"formation_id": 2, "titre_formation": "F2"},
        ]
        result = msas_batch(
            _teacher_id="T1",
            formations=formations,
            gap_data={"avg_gap": 2.0, "nb_competences": 5, "nb_critiques": 2, "nb_competences_evaluees": 5},
            peer_data={"peer_success_rate": 0.6, "peer_adoption_count": 2, "total_peers": 10, "nb_similar_neighbors": 3},
            risk_data={"risk_score": 0.5, "niveau_risque": "MODERE", "nb_risk_indicators": 3},
            top_n=2,
        )
        assert len(result) == 2
        assert all("formation_id" in r for r in result)
        assert result[0]["msas_score"] >= result[1]["msas_score"]
