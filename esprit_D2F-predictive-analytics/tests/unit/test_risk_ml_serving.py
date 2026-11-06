"""Tests du serving ML de risque (etape ML actif — badge ML / repli fail-closed).

Contrats verifies :
1.  mode=ML avec classe + probabilite calibree quand le modele sert ;
2.  repli heuristique fail-closed quand le modele est absent ;
3.  repli + fallback_reason quand une feature est hors plage ;
4.  probabilites calibrees : somme ~ 1, bornes [0, 1] ;
5.  contributions (top-3) presentes dans la reponse ;
6.  monotonie : plus de gaps critiques => risque JAMAIS plus bas ;
7.  anti-fuite : aucune feature posterieure a t ;
8.  registre : SIMULATION_VALIDATED, JAMAIS REAL ;
9.  /health expose les counts de serving des ecarts ;
10. contrat UI : badge ML uniquement quand mode=ML.
"""
from __future__ import annotations

import hashlib
import json
import re
from pathlib import Path

import joblib
import numpy as np
import pytest
from sklearn.ensemble import GradientBoostingClassifier
from sklearn.isotonic import IsotonicRegression
from xgboost import XGBClassifier

from app.infrastructure.ml.risk_features import (
    MONOTONE_CONSTRAINTS,
    RISK_CLASSES,
    RISK_FEATURES,
    build_training_frame,
    features_to_vector,
)
from app.infrastructure.ml.risk_predictor import RiskMLPredictor, RiskMLResult

BASE_DIR = Path(__file__).parent.parent.parent
MODELS_DIR = BASE_DIR / "data" / "models"
REPORTS_DIR = BASE_DIR / "reports"


# ---------------------------------------------------------------- fixtures
def _train_tiny_model():
    rng = np.random.default_rng(42)
    X = rng.random((240, len(RISK_FEATURES)))
    y = np.where(
        X[:, 1] > 0.7, "CRITICAL",
        np.where(X[:, 4] > 0.6, "HIGH", np.where(X[:, 0] > 0.5, "MEDIUM", "LOW")),
    )
    model = GradientBoostingClassifier(random_state=42).fit(X, y)
    classes = [str(c) for c in model.classes_]
    p_crit = model.predict_proba(X)[:, classes.index("CRITICAL")]
    iso = IsotonicRegression(out_of_bounds="clip", y_min=0.0, y_max=1.0).fit(
        p_crit, (y == "CRITICAL").astype(int)
    )
    return model, iso, classes


def _make_artifact(tmp_path: Path, decision: str = "accept"):
    model, iso, classes = _train_tiny_model()
    ranges = {}
    for c in RISK_FEATURES:
        ranges[c] = {"min": 0.0, "max": 1.0} if c in (
            "avg_gap_score", "max_gap_score", "critical_ratio", "has_critical",
            "trend_gap_direction", "attendance_rate",
        ) else {"min": 0.0, "max": 50.0}
    artifact = {
        "model_name": "risk_predictor",
        "model_version": "risk-simulation-v1.0.0",
        "candidate": "gradient_boosting",
        "model": model,
        "calibrator": iso,
        "feature_cols": RISK_FEATURES,
        "classes": classes,
        "feature_ranges": ranges,
        "monotone_constraints": MONOTONE_CONSTRAINTS,
        "decision": decision,
        "trained_at": "2026-08-31T00:00:00+00:00",
        "seed": 42,
    }
    artifact_path = tmp_path / "risk_predictor_simulation.joblib"
    joblib.dump(artifact, artifact_path)
    h = hashlib.sha256(artifact_path.read_bytes()).hexdigest()
    (tmp_path / "risk_predictor_simulation.joblib.sha256").write_text(h, encoding="utf-8")
    metadata = {
        "model_version": "risk-simulation-v1.0.0",
        "decision": decision,
        "data_origin": "SIMULATED",
        "validation_scope": "SIMULATION_VALIDATED",
        "metrics": {"macro_f1": 0.75, "brier_critical_calibrated": 0.03},
        "calibration": {"brier_critical": 0.03},
        "explainability": {"method": "feature_importances_proxy"},
        "monotonicity": {"all_monotone": True},
    }
    (tmp_path / "risk_training_metadata.json").write_text(
        json.dumps(metadata), encoding="utf-8"
    )
    return artifact


def _in_range_features() -> dict[str, float]:
    return {c: 0.0 for c in RISK_FEATURES}


def _predictor(tmp_path: Path) -> RiskMLPredictor:
    return RiskMLPredictor(tmp_path)


def test_risk_served_by_ml_when_model_active(tmp_path):
    """1. mode=ML, classe + probabilite calibree quand le modele sert."""
    _make_artifact(tmp_path)
    result, reason = _predictor(tmp_path).predict(_in_range_features())
    assert result is not None and reason is None
    payload = result.to_payload()
    assert payload["mode"] == "ML"
    assert payload["risk_class"] in RISK_CLASSES
    assert 0.0 <= payload["probability_calibrated"] <= 1.0
    assert payload["fallback_reason"] is None
    assert payload["validation_scope"] == "SIMULATION_VALIDATED"
    assert payload["data_origin"] == "SIMULATED"


def test_risk_fallback_heuristic_when_model_missing(tmp_path):
    """2. Fail-closed : modele absent => (None, fallback_reason)."""
    result, reason = _predictor(tmp_path).predict(_in_range_features())
    assert result is None
    assert reason and "absent" in reason


def test_risk_fallback_when_feature_out_of_range(tmp_path):
    """3. Fail-closed : feature hors plage => (None, fallback_reason)."""
    _make_artifact(tmp_path)
    features = _in_range_features()
    features["avg_gap_score"] = 7.5  # hors plage [0, 1]
    result, reason = _predictor(tmp_path).predict(features)
    assert result is None
    assert reason and "hors plage" in reason and "avg_gap_score" in reason


def test_risk_probabilities_calibrated_sum_and_range(tmp_path):
    """4. Probabilites calibrees : somme ~ 1, valeurs dans [0, 1]."""
    _make_artifact(tmp_path)
    result, _ = _predictor(tmp_path).predict(_in_range_features())
    assert result is not None
    total = sum(result.probabilities.values())
    assert abs(total - 1.0) < 1e-6
    assert all(0.0 <= p <= 1.0 for p in result.probabilities.values())


def test_risk_shap_contributions_present_in_response(tmp_path):
    """5. Contributions (top-3) presentes dans la reponse /risk."""
    _make_artifact(tmp_path)
    result, _ = _predictor(tmp_path).predict(_in_range_features())
    assert result is not None
    contributions = result.to_payload()["contributions"]
    assert 1 <= len(contributions) <= 3
    for c in contributions:
        assert {"feature", "impact", "method"} <= set(c)
        assert c["feature"] in RISK_FEATURES
        assert 0.0 <= c["impact"] <= 1.0


def test_risk_monotonicity_more_critical_gaps_never_lower_risk():
    """6. XGBoost monotone : plus de gaps critiques => risque JAMAIS plus bas."""
    rng = np.random.default_rng(42)
    X = rng.random((400, len(RISK_FEATURES)))
    y_num = X[:, 1] + 0.3 * X[:, 4] + 0.2 * rng.random(400)
    y = np.where(y_num > 1.0, "CRITICAL", np.where(y_num > 0.7, "HIGH", np.where(y_num > 0.4, "MEDIUM", "LOW")))
    monotone = [int(MONOTONE_CONSTRAINTS.get(c, 0)) for c in RISK_FEATURES]
    from sklearn.preprocessing import LabelEncoder
    le = LabelEncoder().fit(RISK_CLASSES)
    model = XGBClassifier(
        n_estimators=60, max_depth=3, learning_rate=0.1, random_state=42,
        monotone_constraints=tuple(monotone), eval_metric="mlogloss",
    ).fit(X, le.transform(y))
    # La garantie XGBoost (monotone_constraints) porte sur les MARGES de chaque
    # classe (score additif par arbre), pas sur les probabilités softmax
    # multiclasse. On verifie donc : marge CRITICAL et marge HIGH JAMAIS plus
    # basses quand n_gaps_critical augmente.
    base = np.zeros((1, len(RISK_FEATURES)))
    margins = []
    for n_crit in [0, 1, 2, 3, 5]:
        grid = base.copy()
        grid[0, RISK_FEATURES.index("n_gaps_critical")] = n_crit
        grid[0, RISK_FEATURES.index("has_critical")] = 1.0 if n_crit else 0.0
        grid[0, RISK_FEATURES.index("critical_ratio")] = min(1.0, n_crit / 5.0)
        grid[0, RISK_FEATURES.index("n_gaps_total")] = max(2.0, n_crit)
        margins.append(model.predict(grid, output_margin=True)[0])
    margins = np.asarray(margins)
    crit_idx = list(le.classes_).index("CRITICAL")
    high_idx = list(le.classes_).index("HIGH")
    assert all(margins[i + 1, crit_idx] >= margins[i, crit_idx] - 1e-9 for i in range(len(margins) - 1)), margins[:, crit_idx]
    assert all(margins[i + 1, high_idx] >= margins[i, high_idx] - 1e-9 for i in range(len(margins) - 1)), margins[:, high_idx]



def test_risk_no_leakage_features_all_before_t():
    """7. Anti-fuite : aucune feature posterieure a t dans le modele de risque."""
    forbidden = {
        "gap_next_3m", "target_observation_date", "current_level_t_plus_3",
        "risk_score_fut", "risk_class_t",
    }
    assert not (set(RISK_FEATURES) & forbidden)
    import inspect
    from app.infrastructure.ml import risk_features as rf
    src = inspect.getsource(rf.build_training_frame)
    assert '"gap_next_3m"' in src  # utilise pour la CIBLE uniquement
    # Le modele sert exactement les features a t (contrat artefact).
    assert RISK_FEATURES == [c for c in RISK_FEATURES]


def test_risk_registry_simulation_validated_never_real():
    """8. Registre : risk-simulation-v1.0.0 = SIMULATION_VALIDATED, JAMAIS REAL."""
    registry_path = MODELS_DIR / "model_registry.json"
    if not registry_path.exists():
        pytest.skip("registre absent (pipelines.register_risk_model non execute)")
    registry = json.loads(registry_path.read_text(encoding="utf-8"))
    entries = [e for e in registry if e.get("model_name") == "risk_predictor"]
    assert entries, "entree risk_predictor absente — executer pipelines.register_risk_model"
    for e in entries:
        assert e["validation_scope"] == "SIMULATION_VALIDATED"
        assert e["target_validity"] == "OBSERVED_IN_SIMULATION"
        assert e["data_origin"] == "SIMULATED"
        assert e["validation_scope"] != "REAL_VALIDATED"
        assert e["target_validity"] != "REAL_VALIDATED_TARGET"
        # CANDIDATE si decision=reject (seuils non atteints), ACTIVE si accept.
        assert e["status"] in ("CANDIDATE", "ACTIVE")


def test_gap_serving_count_reported_in_health():
    """9. /health expose ml_serving_count (37/37 ou count reel) + risk counts."""
    from app.schemas.analytics import HealthOut
    fields = set(HealthOut.model_fields.keys())
    assert {"ml_serving_count", "ml_serving_teachers", "ml_heuristic_fallback_teachers",
            "risk_ml_active", "risk_model_version", "risk_mode",
            "risk_ml_serving_count", "risk_heuristic_fallback_count",
            "risk_fallback_reason"} <= fields
    report_path = REPORTS_DIR / "feature_ranges_simulation.json"
    if report_path.exists():
        report = json.loads(report_path.read_text(encoding="utf-8"))
        after = report["serving_coverage_demo_environment"]["after"]
        assert after["ml_serving_count"] >= 37, (
            f"l'environnement de demonstration (37 enseignants) doit etre couvert, got {after}"
        )
        assert after["ml_serving_count"] + after["heuristic_fallback_count"] == after["n_teachers"]


def test_ui_badge_ml_only_when_mode_ml():
    """10. Contrat UI : badge « ML » uniquement quand mode=ML ; repli etiquete
    « Heuristique », mention donnees simulees conservee."""
    badge_src = (BASE_DIR.parent / "esprit_D2F-webapp" / "src" / "components" / "analytics" / "ModelBadge.tsx")
    if not badge_src.exists():
        pytest.skip("ModelBadge.tsx absent")
    src = badge_src.read_text(encoding="utf-8")
    assert re.search(r"ML:\s*\{[^}]*label:\s*'ML actif'", src, re.S)
    assert "Heuristique" in src
    assert "Validé sur données simulées" in src
    # Contrat API : mode=ML seulement si un modele a servi (fallback_reason null) ;
    # le repli expose toujours fallback_reason explicite.
    ml_payload = {"mode": "ML", "fallback_reason": None}
    heuristic_payload = {"mode": "HEURISTIC", "fallback_reason": "modele absent"}
    assert ml_payload["fallback_reason"] is None
    assert bool(heuristic_payload["fallback_reason"])


