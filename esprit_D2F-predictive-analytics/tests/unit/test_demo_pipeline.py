"""Tests unitaires du pipeline démo synthétique (DEMO_ML).

Couvre : génération (seed reproductible, anonymisation, contrat de colonnes,
échelles), nettoyage traçable, provenance, contrat de features, anti-fuite,
split temporel strict, entraînement GAP (5 modèles), bootstrap, multi-seed,
modèle risque, modèle ranking, inférence sur données application + domain
shift, serving DEMO_ML et non-régression de la production v1.0.0.

Les tests dépendant des artefacts du pipeline complet (entraînement, risque,
ranking, inférence, serving) lisent les rapports générés par
``python -m pipelines.run_demo_pipeline`` ; ils sont ignorés si absents.
"""
from __future__ import annotations

import json
import tempfile
from pathlib import Path

import numpy as np
import pandas as pd
import pytest

from pipelines.clean_demo_dataset import clean_demo_dataset
from pipelines.demo_common import (
    DATASET_VERSION_DEFAULT,
    FEATURE_NAMES,
    FORBIDDEN_IN_X,
    GAP_MAX,
    GAP_MIN,
    REQUIRED_COLUMNS,
    TARGET_COL,
    TEACHER_PREFIX,
    canonical_df_hash,
    coerce_bool,
    schema_hash,
)
from pipelines.demo_feature_builder import FeatureBuilder
from pipelines.generate_demo_dataset import generate_demo_dataset

BASE_DIR = Path(__file__).resolve().parent.parent.parent
REPORTS_DIR = BASE_DIR / "reports"
MODELS_DIR = BASE_DIR / "data" / "models"

N_TESTS = 29


def _load(path: str):
    p = REPORTS_DIR / path
    if not p.exists():
        pytest.skip(f"Rapport absent (lancer pipelines.run_demo_pipeline) : {p}")
    return json.loads(p.read_text(encoding="utf-8"))


@pytest.fixture(scope="module")
def small_dataset() -> tuple[Path, dict]:
    """Dataset synthétique miniature (rapide, seed déterministe)."""
    with tempfile.TemporaryDirectory() as d:
        out = Path(d) / "demo_small_raw.csv"
        report = generate_demo_dataset(
            rows=40, teachers=4, competencies=5, months=8,
            seed=42, version=DATASET_VERSION_DEFAULT, output_path=out,
        )
        yield out, report


@pytest.fixture(scope="module")
def small_clean(small_dataset) -> pd.DataFrame:
    raw, _ = small_dataset
    with tempfile.TemporaryDirectory() as d:
        clean_path = Path(d) / "demo_small_clean.csv"
        clean_demo_dataset(
            version=DATASET_VERSION_DEFAULT,
            dataset_path=raw,
            clean_path=clean_path,
            quarantine_path=Path(d) / "q.csv",
            report_path=Path(d) / "report.json",
        )
        yield pd.read_csv(clean_path)


# ---------------------------------------------------------------------------
# 1. Génération
# ---------------------------------------------------------------------------

def test_generate_rows_and_synthetic_flags(small_dataset):
    """1) Dataset généré : lignes attendues, tout marqué SYNTHETIC non vérifié."""
    raw, report = small_dataset
    df = pd.read_csv(raw)
    assert len(df) >= 40  # 40 de base + lignes-défauts injectées en surplus
    assert report["rows"] == len(df)
    assert df["is_synthetic"].map(coerce_bool).all()
    assert (df["data_origin"] == "SYNTHETIC").all()
    assert not df["institutional_verified"].map(coerce_bool).any()


def test_generate_seed_reproducible(small_dataset):
    """2) Même seed -> même contenu -> hash canonique identique."""
    with tempfile.TemporaryDirectory() as d:
        a = Path(d) / "a.csv"
        b = Path(d) / "b.csv"
        generate_demo_dataset(rows=40, teachers=4, seed=42, output_path=a)
        generate_demo_dataset(rows=40, teachers=4, seed=42, output_path=b)
        da = pd.read_csv(a)
        db = pd.read_csv(b)
        assert canonical_df_hash(da) == canonical_df_hash(db)


def test_generate_anonymized_identifiers(small_dataset):
    """3) Aucun identifiant réel : préfixe SYN_T uniquement, pas d'emails."""
    raw, _ = small_dataset
    df = pd.read_csv(raw)
    assert df["teacher_id"].str.startswith(TEACHER_PREFIX).all()
    joined = " ".join(df.astype(str).to_numpy().ravel()).lower()
    for token in ("@", "esprit", "email", "nom"):
        assert token not in joined


def test_generate_contract_columns(small_dataset):
    """4) Contrat de colonnes complet : REQUIRED_COLUMNS + features + cible."""
    raw, _ = small_dataset
    df = pd.read_csv(raw)
    assert set(REQUIRED_COLUMNS).issubset(df.columns)
    assert set(FEATURE_NAMES).issubset(df.columns)
    assert TARGET_COL in df.columns


def test_generate_scale_ranges(small_clean):
    """5) Échelles après nettoyage : niveaux 1..5, gap 0..5."""
    df = small_clean
    for col in ("current_level_t3", "current_level_t2", "current_level_t1", "current_level_t"):
        assert df[col].between(1.0, 5.0).all(), col
    assert df[TARGET_COL].between(GAP_MIN, GAP_MAX).all()


# ---------------------------------------------------------------------------
# 6-8. Nettoyage
# ---------------------------------------------------------------------------

def test_clean_removes_duplicates(small_dataset, small_clean):
    """6) Nettoyage : plus aucun doublon strict sur toutes les colonnes."""
    assert small_clean.duplicated().sum() == 0


def test_clean_provenance_flags(small_clean):
    """7) Provenance conservée après nettoyage."""
    assert small_clean["is_synthetic"].map(coerce_bool).all()
    assert (small_clean["data_origin"] == "SYNTHETIC").all()
    assert (small_clean["source_type"] == "synthetic_generator").all()


def test_clean_report_traceable(small_dataset):
    """8) Rapport de nettoyage : avant/après + raisons comptabilisées."""
    raw, _ = small_dataset
    with tempfile.TemporaryDirectory() as d:
        report_path = Path(d) / "report.json"
        clean_demo_dataset(
            version=DATASET_VERSION_DEFAULT,
            dataset_path=raw,
            clean_path=Path(d) / "c.csv",
            quarantine_path=Path(d) / "q.csv",
            report_path=report_path,
        )
        report = json.loads(report_path.read_text(encoding="utf-8"))
        assert report["rows_before"] >= 40  # 40 de base + défauts
        assert report["rows_after"] <= report["rows_before"]
        assert report["rows_after"] > 0
        assert isinstance(report["reasons"], dict)


# ---------------------------------------------------------------------------
# 9-11. Features / anti-fuite / split
# ---------------------------------------------------------------------------

def test_feature_contract_29_features():
    """9) Contrat : 29 features, schéma 1.0, hash stable."""
    assert len(FEATURE_NAMES) == 29
    assert len(set(FEATURE_NAMES)) == 29
    assert FeatureBuilder().schema()["feature_schema_version"] == "1.0"
    assert isinstance(schema_hash(FEATURE_NAMES), str) and len(schema_hash(FEATURE_NAMES)) == 64


def test_no_forbidden_column_in_x(small_clean):
    """10) Anti-fuite : aucune colonne interdite dans X."""
    built = FeatureBuilder().build(small_clean)
    leaks = [c for c in built["X"].columns if c in FORBIDDEN_IN_X]
    assert leaks == []
    assert TARGET_COL not in built["X"].columns


def test_temporal_split_no_future_leak(small_clean):
    """11) Split temporel strict : train <= val <= test (pas de fuite)."""
    split = FeatureBuilder.build_temporal_split(small_clean)
    train_max = pd.to_datetime(split["train"]["ref_month"]).max()
    val_min = pd.to_datetime(split["validation"]["ref_month"]).min()
    test_min = pd.to_datetime(split["test"]["ref_month"]).min()
    assert train_max < val_min < test_min
    assert split["train_rows"] + split["validation_rows"] + split["test_rows"] == len(small_clean)


# ---------------------------------------------------------------------------
# 12-16. Entraînement GAP
# ---------------------------------------------------------------------------

def test_five_models_reported():
    """12) Les 5 modèles exigés sont comparés."""
    c = _load("demo_model_comparison.json")
    models = [r["Modèle"] for r in c]
    for expected in ("baseline_persistence", "baseline_mean", "gradient_boosting", "xgboost", "mlp"):
        assert expected in models
    assert len(c) == 5


def test_best_ml_beats_persistence():
    """13) Le meilleur modèle ML surclasse la baseline persistance."""
    c = _load("demo_model_comparison.json")
    base = next(r for r in c if r["Modèle"] == "baseline_persistence")
    ml_rmse = [r["RMSE"] for r in c if r["Modèle"] != "baseline_persistence"]
    assert min(ml_rmse) < base["RMSE"]


def test_required_metrics_recorded():
    """14) Toutes les métriques exigées sont enregistrées dans le registre démo."""
    serving = _load("demo_serving_validation.json")
    metrics = serving["registry_entry"]["metrics"]
    for key in ("rmse", "mae", "r2", "median_absolute_error", "max_absolute_error",
                "training_time_ms", "inference_time_ms",
                "within_tolerance_accuracy_0.10", "within_tolerance_accuracy_0.20",
                "improvement_vs_persistence_pct"):
        assert key in metrics, key


def test_within_tolerance_in_unit_interval():
    """15) Précision dans la tolérance bornée en [0,1] pour chaque modèle."""
    c = _load("demo_model_comparison.json")
    for r in c:
        assert 0.0 <= r["Tolérance ±0,10"] <= 1.0
        assert 0.0 <= r["Tolérance ±0,20"] <= 1.0


def test_baseline_persistence_not_oracle():
    """16) Baseline persistance = proxy features, PAS l'objectif privilégié."""
    c = _load("demo_model_comparison.json")
    base = next(r for r in c if r["Modèle"] == "baseline_persistence")
    assert base["RMSE"] >= 1.0  # proxy simple, sans colonne requise privilégiée


# ---------------------------------------------------------------------------
# 17-19. Bootstrap / multi-seed
# ---------------------------------------------------------------------------

def test_bootstrap_1000_replications():
    """17) Bootstrap : 1 000 réplications, seed fixe."""
    b = _load("demo_bootstrap_report.json")
    assert b["n_bootstrap"] == 1000
    assert b["bootstrap_seed"] == 2026


def test_bootstrap_ic95_ordered():
    """18) Bootstrap : intervalle IC95 ordonné (borne basse <= haute)."""
    b = _load("demo_bootstrap_report.json")
    assert b["ic95_rmse"][0] <= b["ic95_rmse"][1]
    assert b["ic95_mae"][0] <= b["ic95_mae"][1]


def test_multi_seed_retention_decision():
    """19) Décision multi-seed : modèle ML retenu en démo uniquement."""
    c = _load("demo_model_comparison.json")
    decisions = {r["Modèle"]: r["Décision"] for r in c}
    assert decisions["mlp"] == "retenu_demo"
    assert decisions["baseline_persistence"] == "baseline"


# ---------------------------------------------------------------------------
# 20-22. Risque
# ---------------------------------------------------------------------------

def test_risk_labels_synthetic():
    """20) Labels de risque issus de données synthétiques."""
    r = _load("demo_risk_report.json")
    assert r["risk_labels_origin"] == "SYNTHETIC"


def test_risk_random_forest_not_trivial():
    """21) RandomForest entraîné : accuracy < 1 (évaluation non triviale)."""
    r = _load("demo_risk_report.json")
    rf = r["random_forest"]
    assert 0.0 < rf["accuracy"] < 1.0
    assert 0.0 <= rf["f1_macro"] <= 1.0


def test_risk_heuristic_coherence_caveat():
    """22) Heuristique 6 facteurs : cohérence interne (labels dérivés du score)."""
    r = _load("demo_risk_report.json")
    assert r["heuristic_six_factors"]["accuracy"] == 1.0
    assert r["caveat_heuristic_accuracy"]


# ---------------------------------------------------------------------------
# 23-24. Ranking
# ---------------------------------------------------------------------------

def test_ranking_labels_synthetic():
    """23) Labels de pertinence issus de données synthétiques."""
    r = _load("demo_ranking_report.json")
    assert r["relevance_labels_origin"] == "SYNTHETIC"


def test_ranking_metrics_in_range():
    """24) Métriques de ranking bornées en [0,1]."""
    r = _load("demo_ranking_report.json")
    m = r["metrics"]
    for key in ("precision_at_3", "recall_at_3", "ndcg_at_3", "map_at_3"):
        assert 0.0 <= m[key] <= 1.0, key


# ---------------------------------------------------------------------------
# 25-27. Inférence application + domain shift
# ---------------------------------------------------------------------------

def test_app_inference_demo_ml():
    """25) Inférence application : mode DEMO_ML, non vérifié, avec avertissement."""
    inf = _load("application_inference_demo.json")
    assert inf["model_mode"] == "DEMO_ML"
    assert inf["input_origin"] == "APPLICATION_DATA"
    assert inf["training_origin"] == "SYNTHETIC"
    assert inf["institutional_verified"] is False
    assert inf["warnings"]


def test_app_inference_schema_ok():
    """26) Schéma application conforme au contrat de features (29 colonnes)."""
    inf = _load("application_inference_demo.json")
    assert inf["validation"]["schema_ok"] is True
    assert inf["validation"]["missing_features_in_app"] == []
    assert inf["n_rows_tested"] == 107


def test_domain_shift_report_metrics():
    """27) Domain shift : métriques Wasserstein par feature + indicateur global."""
    s = _load("domain_shift_report.json")
    assert s["n_rows_synthetic"] >= 1000
    assert s["n_rows_application"] == 107
    assert isinstance(s["drift_indicator"]["mean_wasserstein"], (int, float))
    assert len(s["features"]) == 29


# ---------------------------------------------------------------------------
# 28-29. Serving / non-régression
# ---------------------------------------------------------------------------

def test_serving_demo_never_production():
    """28) Serving : toujours DEMO_ML, promotion en PRODUCTION_ML refusée."""
    v = _load("demo_serving_validation.json")
    assert v["serving_status"]["model_mode"] == "DEMO_ML"
    assert v["promotion_guard"]["production_promotion_refused"] is True
    assert v["artifact_integrity"]["ok"] is True


def test_production_v1_unchanged():
    """29) Non-régression : registre et artefact production v1.0.0 intacts."""
    v = _load("demo_serving_validation.json")
    assert v["production_unchanged"]["model_registry_hash_same"] is True
    assert v["production_unchanged"]["artifact_v1.0.0_hash_same"] is True


def test_declared_test_count():
    """Garde-fou : le fichier doit bien déclarer 29 tests de pipeline."""
    funcs = [k for k in globals() if k.startswith("test_")]
    assert len(funcs) == N_TESTS + 1  # +1 = test_declared_test_count