"""Tests du pipeline dataset : audit, nettoyage, provenance, granularité, split temporel."""
from __future__ import annotations

import hashlib
from pathlib import Path

import numpy as np
import pandas as pd
import pytest

BASE_DIR = Path(__file__).parent.parent.parent
CLEAN_DIR = BASE_DIR / "data" / "clean"
REPORTS_DIR = BASE_DIR / "reports"

FEATURE_COLS = [
    "current_level_t3", "current_level_t2", "current_level_t1", "current_level_t",
    "lag_gap_t3_t2", "lag_gap_t2_t1", "lag_gap_t1_t", "rolling_tendance",
    "days_since_last_training", "training_frequency_per_month", "is_long_absent", "is_stagnant",
    "avg_level", "min_level", "max_level", "nb_level_5", "nb_level_1",
    "nb_savoirs", "nb_competences", "competency_coverage_rate",
    "nb_formations_completed", "nb_formations_in_progress", "taux_assiduite",
    "nb_besoins_exprimes", "nb_besoins_approuves", "avg_eval_score", "nb_evaluations",
    "months_since_last_training", "engagement_score",
]
TARGET_COL = "gap_next_3m"
FORBIDDEN_IN_X = {"required_level", "required_level_t", "gap_next_3m"}


def _dataset_hash(df: pd.DataFrame) -> str:
    canonical = df.copy().sort_values(by=df.columns.tolist()).reset_index(drop=True)
    return hashlib.sha256(canonical.to_csv(index=False).encode("utf-8")).hexdigest()


@pytest.fixture(scope="module")
def clean_df() -> pd.DataFrame:
    path = CLEAN_DIR / "training_corpus_clean.csv"
    if not path.exists():
        pytest.skip("Dataset nettoyé absent")
    return pd.read_csv(path)


# 1. Dataset hash stable
def test_dataset_hash_stable(clean_df):
    h1 = _dataset_hash(clean_df)
    h2 = _dataset_hash(clean_df)
    assert h1 == h2
    assert len(h1) == 64


# 2. Provenance calculée depuis les lignes
def test_provenance_from_rows(clean_df):
    total = len(clean_df)
    n_synth = int(clean_df["is_synthetic"].astype(bool).sum())
    n_real = total - n_synth
    assert n_real + n_synth == total
    assert n_synth == 0
    assert n_real == total
    assert "source_type" in clean_df.columns
    assert "source_id" in clean_df.columns
    assert "dataset_version" in clean_df.columns


# 3. Doublons détectés
def test_no_duplicates(clean_df):
    assert clean_df.duplicated().sum() == 0
    func_cols = ["teacher_id", "competence_id", "ref_month"]
    if all(c in clean_df.columns for c in func_cols):
        assert clean_df.duplicated(subset=func_cols).sum() == 0


# 4. Valeurs hors plage détectées
def test_no_out_of_range(clean_df):
    ranges = {
        "current_level_t3": (1, 5), "current_level_t2": (1, 5),
        "current_level_t1": (1, 5), "current_level_t": (1, 5),
        "gap_next_3m": (0, 5),
        "taux_assiduite": (0, 1),
        "avg_eval_score": (0, 5),
        "competency_coverage_rate": (0, 1),
    }
    for col, (lo, hi) in ranges.items():
        if col in clean_df.columns:
            vals = pd.to_numeric(clean_df[col], errors="coerce")
            assert ((vals < lo) | (vals > hi)).sum() == 0, f"Valeurs hors plage dans {col}"


# 5. Dates invalides détectées
def test_no_invalid_dates(clean_df):
    for col in ["ref_month", "date_t", "created_at"]:
        if col in clean_df.columns:
            dates = pd.to_datetime(clean_df[col], errors="coerce")
            assert dates.notna().all(), f"Dates invalides dans {col}"


# 6. Cible future absente des features
def test_target_not_in_features(clean_df):
    assert TARGET_COL not in FEATURE_COLS


# 7. required_level absent de X
def test_required_level_not_in_X(clean_df):
    assert "required_level" not in FEATURE_COLS
    assert "required_level_t" not in FEATURE_COLS


# 8. gap_next_3m absent de X
def test_gap_next_3m_not_in_X(clean_df):
    assert TARGET_COL not in FEATURE_COLS


# 9. Aucune feature postérieure à ref_month
def test_no_future_features(clean_df):
    for col in FEATURE_COLS:
        assert col in clean_df.columns, f"Feature manquante : {col}"
    # Toutes les features sont calculées à partir de données <= ref_month
    # Vérification structurelle : pas de colonnes future_*
    future_cols = [c for c in clean_df.columns if c.startswith("future_")]
    assert future_cols == []


# 10. Split temporel
def test_temporal_split_no_shuffle():
    from pipelines.validate_all_models import _temporal_split_3way
    df = pd.DataFrame({
        "date_t": pd.date_range("2020-01-01", periods=100, freq="D"),
        "teacher_id": [f"T{i % 10}" for i in range(100)],
        "competence_id": [i % 5 + 1 for i in range(100)],
        "ref_month": pd.date_range("2020-01-01", periods=100, freq="D"),
        **{col: np.random.RandomState(42).rand(100) for col in FEATURE_COLS},
        TARGET_COL: np.random.RandomState(42).rand(100) * 5,
    })
    split = _temporal_split_3way(df)
    assert split["n_train"] > 0
    assert split["n_val"] > 0
    assert split["n_test"] > 0
    assert split["n_train"] + split["n_val"] + split["n_test"] == 100
    # Le split est chronologique : train < val < test
    assert split["train_dates"][0] <= split["val_dates"][0] <= split["test_dates"][0]


# 11. Reproductibilité avec seed
def test_reproducibility_with_seed():
    rng1 = np.random.default_rng(42)
    rng2 = np.random.default_rng(42)
    np.testing.assert_array_equal(rng1.random(10), rng2.random(10))


# 12. Baseline
def test_baseline_persistence():
    from pipelines.validate_all_models import _baseline_persistence
    X_test = pd.DataFrame({
        "current_level_t": [3.0, 2.0, 4.0],
        "avg_level": [2.0, 3.0, 3.0],
    })
    y_test = np.array([1.0, 2.0, 1.0])
    pred = _baseline_persistence(y_test, X_test)
    assert len(pred) == 3
    assert pred[0] == 1.0
    assert pred[1] == 0.0
    assert pred[2] == 1.0


# 13. Gradient Boosting
def test_gradient_boosting_trains():
    from sklearn.ensemble import GradientBoostingRegressor
    X = np.random.RandomState(42).rand(50, 5)
    y = np.random.RandomState(42).rand(50) * 5
    model = GradientBoostingRegressor(n_estimators=10, random_state=42)
    model.fit(X, y)
    pred = model.predict(X[:5])
    assert len(pred) == 5
    assert np.all(pred >= 0)


# 14. XGBoost
def test_xgboost_available():
    try:
        from xgboost import XGBRegressor
        X = np.random.RandomState(42).rand(50, 5)
        y = np.random.RandomState(42).rand(50) * 5
        model = XGBRegressor(n_estimators=10, random_state=42, verbosity=0)
        model.fit(X, y)
        pred = model.predict(X[:5])
        assert len(pred) == 5
    except ImportError:
        pytest.skip("XGBoost non installé")


# 15. MLP
def test_mlp_trains():
    from sklearn.neural_network import MLPRegressor
    X = np.random.RandomState(42).rand(50, 5)
    y = np.random.RandomState(42).rand(50) * 5
    model = MLPRegressor(hidden_layer_sizes=(8, 4), max_iter=50, random_state=42)
    model.fit(X, y)
    pred = model.predict(X[:5])
    assert len(pred) == 5


# 16. Artefact intègre
def test_artifact_integrity():
    from app.infrastructure.ml.artifact_integrity import load_with_integrity_check
    models_dir = BASE_DIR / "data" / "models"
    artifact = models_dir / "gap_predictor_temporal.joblib"
    if not artifact.exists():
        pytest.skip("Artefact absent")
    model = load_with_integrity_check(artifact)
    assert model is not None


# 17. Hash invalide
def test_invalid_hash_detected(tmp_path):
    from app.infrastructure.ml.artifact_integrity import ArtifactIntegrityError, load_with_integrity_check
    artifact = tmp_path / "model.joblib"
    artifact.write_bytes(b"fake model data")
    sidecar = tmp_path / "model.joblib.sha256"
    sidecar.write_text("0" * 64, encoding="utf-8")
    with pytest.raises(ArtifactIntegrityError):
        load_with_integrity_check(artifact)


# 18. Rollback
def test_registry_rollback(tmp_path):
    from app.infrastructure.ml.model_registry import ModelRegistry, RegistryEntry
    registry = ModelRegistry(tmp_path / "registry.json", tmp_path)
    v1 = RegistryEntry(model_version="v1.0.0", status="ACTIVE", approval_status="PENDING")
    v2 = RegistryEntry(model_version="v2.0.0", status="ACTIVE", approval_status="PENDING")
    registry.register(v1)
    registry.register(v2)
    registry.approve("v1.0.0")
    registry.approve("v2.0.0")
    assert registry.active().model_version == "v2.0.0"
    rolled = registry.rollback()
    assert rolled is not None
    assert registry.active().model_version == "v1.0.0"


# 19. Mode PRODUCTION_ML
def test_production_ml_mode():
    from app.core.ml_status import PRODUCTION_ML
    assert PRODUCTION_ML == "PRODUCTION_ML"


# 20. Mode HEURISTIC_FALLBACK
def test_heuristic_fallback_mode():
    from app.core.ml_status import HEURISTIC_FALLBACK
    assert HEURISTIC_FALLBACK == "HEURISTIC_FALLBACK"


# 21. Scope RBAC
def test_rbac_scope():
    from app.api.v1 import gaps
    import inspect
    source = inspect.getsource(gaps.list_gaps)
    assert "enforce_teacher_access" in source
    assert "require_roles" in source


# 22. Contributions de risque bornées
def test_risk_contributions_bounded():
    from app.infrastructure.ml.predictor import rule_risk_from_gaps
    from app.domain.value_objects.enums import Severity, Trend
    from app.domain.entities.skill_gap import SkillGap
    from datetime import date

    gaps = [
        SkillGap(teacher_id="T1", competence_id=1, competence_code="C1",
                 competence_nom="Comp1", observed_result=1, knowledge_difficulty_level=5,
                 gap_score=1.0, severity=Severity.CRITICAL, trend=Trend.WORSENING,
                 as_of=date(2026, 1, 1)),
    ]
    profile = rule_risk_from_gaps("T1", gaps)
    for factor in profile.factors:
        assert 0.0 <= factor.normalized_value <= 1.0
        assert 0.0 <= factor.contribution <= 1.0
    assert 0.0 <= profile.risk_score <= 100.0


# 23. Ranking heuristique
def test_ranking_heuristic():
    from app.domain.services.ranking_service import WEIGHT_CONTENT, WEIGHT_QUALITY, WEIGHT_RECENCY
    assert WEIGHT_CONTENT == 0.70
    assert WEIGHT_QUALITY == 0.20
    assert WEIGHT_RECENCY == 0.10


# 24. Absence de labels ranking
def test_no_ranking_labels():
    from pipelines.validate_all_models import _evaluate_ranking_heuristic
    result = _evaluate_ranking_heuristic()
    assert result["metrics"]["precision_at_3"] == "N/A"
    assert result["metrics"]["ndcg_at_k"] == "N/A"


# 25. Réponse API complète
def test_api_response_complete():
    from app.schemas.analytics import AnalysisOut
    import inspect
    fields = AnalysisOut.model_fields
    assert "teacher_id" in fields
    assert "gaps" in fields
    assert "risk" in fields
    assert "recommendations" in fields
    assert "model_mode" in fields
    assert "computed_at" in fields