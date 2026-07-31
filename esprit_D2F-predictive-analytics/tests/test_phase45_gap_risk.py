"""Phase 4 & 5 — Deterministic gap diagnostic + risk scoring tests."""
import os
import pytest

os.environ.setdefault("JWT_AUTH_ENABLED", "false")
os.environ.setdefault("SCHEDULER_ENABLED", "false")
os.environ.setdefault("MESSAGING_ENABLED", "false")
os.environ.setdefault("APP_ENV", "test")
os.environ.setdefault("JWT_SECRET", "test-jwt-secret-" + "x" * 40)


class TestDeprecatedMlNotServing:
    def test_gap_predictor_predict_uses_deterministic_fallback(self):
        """GapPredictor.predict() must NOT use the ML model (target leakage).

        With empty profiles, the engine short-circuits to an empty deterministic
        response — never an ML prediction."""
        from app.ml.gap_predictor import gap_predictor
        result = gap_predictor.predict(
            teacher_profiles=[],
            competency_levels=[],
            required_levels=[],
        )
        # Whether data is present or not, the deprecated ML path never serves a prediction.
        assert result["gaps"] == []
        assert result["avg_predicted_gap"] == 0.0

    def test_gap_predictor_model_artifact_never_trusted(self):
        """Even with a loaded model artifact, predict() must not use it (leaky)."""
        from app.ml import gap_predictor as gp_mod
        # Force a fake loaded model; predict() must still refuse ML inference.
        class _FakeModel:
            pass
        original = gp_mod.gap_predictor.model
        try:
            gp_mod.gap_predictor.model = _FakeModel()
            result = gp_mod.gap_predictor.predict([], [], [])
            assert result["gaps"] == []
        finally:
            gp_mod.gap_predictor.model = original

    def test_model_health_declares_deprecated(self):
        from app.ml.gap_predictor import gap_predictor
        health = gap_predictor.model_health()
        assert any("deprecated" in w.lower() for w in health.get("warnings", []))
        assert health["fallback_mode"] is True
        assert health["source"] == "RULE_BASED_DIAGNOSTIC"


class TestGapDiagnosticDeterministic:
    def test_gap_types_are_detected_correctly(self):
        from app.engines.predictive_gap_diagnostic import diagnose_gap
        for gt in [
            "GAP_NOT_ASSIGNED", "GAP_PREREQUISITE_MISSING", "GAP_TRAINING_NOT_COMPLETED",
            "GAP_EXPLICIT_NEED", "GAP_COLLECTIVE_NEED", "GAP_STALE_ASSIGNMENT",
            "GAP_STRATEGIC_COVERAGE", "GAP_DEMAND_TREND",
        ]:
            d = diagnose_gap(
                teacher_id="ENS001", knowledge_id="K1", knowledge_name="X", gap_type=gt,
            )
            assert d.gap_type == gt

    def test_gap_priority_is_bounded(self):
        from app.engines.predictive_gap_diagnostic import diagnose_gap
        d = diagnose_gap(
            teacher_id="ENS001", knowledge_id="K1", knowledge_name="X",
            knowledge_difficulty_level=5, has_explicit_need=True,
            has_collective_need=True, missing_prerequisites=2, total_prerequisites=2,
            has_incomplete_training=True, assignment_stale_days=200, is_validated=False,
            is_strategic=True,
        )
        assert 0.0 <= d.priority_score <= 1.0

    def test_gap_factor_contributions_sum_to_priority(self):
        from app.engines.predictive_gap_diagnostic import diagnose_gap
        d = diagnose_gap(
            teacher_id="ENS001", knowledge_id="K1", knowledge_name="X",
            knowledge_difficulty_level=3, has_explicit_need=True,
            missing_prerequisites=1, total_prerequisites=2, is_strategic=True,
        )
        s = round(sum(f["contribution"] for f in d.factors), 3)
        assert abs(s - round(d.priority_score, 3)) <= 0.011, (
            f"factors sum {s} != priority_score {d.priority_score}"
        )

    def test_response_has_minimal_contract(self):
        from app.engines.predictive_gap_diagnostic import diagnose_gap, GAP_PREREQUISITE_MISSING
        out = diagnose_gap(
            teacher_id="ENS002", knowledge_id="K001", knowledge_name="BD",
            knowledge_difficulty_level=3, gap_type=GAP_PREREQUISITE_MISSING,
            missing_prerequisites=1, total_prerequisites=3,
        ).to_dict()
        for key in ("teacher_id", "gap_id", "gap_type", "knowledge_id",
                    "knowledge_difficulty_level", "priority_score", "priority_level",
                    "factors", "source", "analysis_status", "warnings"):
            assert key in out, f"missing key {key}"
        assert out["source"] == "RULE_BASED_PREDICTIVE_DIAGNOSTIC"
        assert out["analysis_status"] == "READY"


class TestRiskScoring:
    def test_weights_normalize_to_one(self):
        from app.engines.risk_scoring import get_weights
        w = get_weights()
        assert abs(sum(w.values()) - 1.0) < 1e-6

    def test_risk_factors_sum_to_final_score(self):
        from app.engines.risk_scoring import compute_risk_score
        r = compute_risk_score({
            "no_training": 0.5, "stagnation": 0.4, "gap_count": 0.3,
            "feedback_decline": 1.0, "unmet_needs": 0.2,
        })
        s = round(sum(r["contributions"].values()), 3)
        assert abs(s - round(r["score_risque"], 3)) <= 0.011

    def test_risk_is_bounded_and_categorized(self):
        from app.engines.risk_scoring import compute_risk_score
        r1 = compute_risk_score({k: 0.0 for k in ("no_training","stagnation","gap_count","feedback_decline","unmet_needs")})
        assert r1["score_risque"] == 0.0 and r1["niveau_risque"] == "FAIBLE"
        r2 = compute_risk_score({k: 1.0 for k in ("no_training","stagnation","gap_count","feedback_decline","unmet_needs")})
        assert r2["score_risque"] == 1.0 and r2["niveau_risque"] == "CRITIQUE"

    def test_risk_is_teacher_specific(self):
        from app.engines.risk_scoring import compute_risk_score
        a = compute_risk_score({"no_training": 0.9})
        b = compute_risk_score({"no_training": 0.1})
        assert a["score_risque"] != b["score_risque"]

    def test_no_default_risk_when_data_missing(self):
        """Empty factors → score 0, NOT a default MODERE 30%."""
        from app.engines.risk_scoring import compute_risk_score
        r = compute_risk_score({})
        assert r["score_risque"] == 0.0
        assert r["niveau_risque"] == "FAIBLE"

    def test_contributions_have_raw_weight_contribution(self):
        from app.engines.risk_scoring import compute_risk_score, FACTOR_KEYS
        r = compute_risk_score({"no_training": 0.6, "unmet_needs": 0.3})
        for k in FACTOR_KEYS:
            assert k in r["contributions"]
            assert k in r["weights"]
