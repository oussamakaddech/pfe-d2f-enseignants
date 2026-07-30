"""Tests pour les corrections P0/P1 du gap_predictor.

Couvre :
- P0.1 : feature-skew guard (model chargé avec n_features != FEATURE_COLS)
- P0.2 : predict() fallback heuristic quand skew détecté (zéro crash)
- P0.3 : model_health() expose l'état ML complet
- P1.1 : leakage warning (R2=0.99 + petit dataset)
- P1.2 : baseline_rmse + lift_rmse persistés
- P1.3 : validation d'outliers dans feature_engineering
"""

import json
from pathlib import Path
from unittest.mock import MagicMock

import numpy as np
import pandas as pd
import pytest


class TestFeatureSkewGuard:
    """P0.1 — feature skew entre modèle persisté et FEATURE_COLS."""

    def test_features_match_model_when_no_model(self):
        from app.ml.gap_predictor import GapPredictor
        p = GapPredictor()
        p.model = None
        ok, reason = p._features_match_model()
        assert ok is True
        assert reason is None

    def test_features_match_model_when_aligned(self):
        from app.ml.gap_predictor import GapPredictor, FEATURE_COLS
        p = GapPredictor()
        # Mock un modèle avec le bon nombre de features
        mock_model = MagicMock()
        mock_model.n_features_in_ = len(FEATURE_COLS)
        p.model = mock_model
        ok, reason = p._features_match_model()
        assert ok is True, reason
        assert reason is None

    def test_features_match_model_when_skewed(self):
        from app.ml.gap_predictor import GapPredictor, FEATURE_COLS
        p = GapPredictor()
        mock_model = MagicMock()
        mock_model.n_features_in_ = len(FEATURE_COLS) - 4  # skew de 4
        p.model = mock_model
        ok, reason = p._features_match_model()
        assert ok is False
        assert reason is not None
        assert "mismatch" in reason.lower()
        assert str(len(FEATURE_COLS) - 4) in reason
        assert str(len(FEATURE_COLS)) in reason


class TestPredictFallbackOnSkew:
    """P0.2 — predict() ne doit jamais crasher si skew détecté."""

    def test_predict_falls_back_when_skew(self):
        from app.ml.gap_predictor import GapPredictor, FEATURE_COLS
        p = GapPredictor()
        # Force le skew
        mock_model = MagicMock()
        mock_model.n_features_in_ = len(FEATURE_COLS) - 4
        p.model = mock_model
        p.feature_skew_ok = False
        p.feature_ranges = None

        teachers = [
            {"enseignant_id": "ENS001", "nom": "Test", "prenom": "1",
             "email": "t1@x.com", "departement_id": 1, "up_id": 1,
             "nb_formations_completed": 0, "nb_formations_in_progress": 0,
             "taux_assiduite": 0.8, "nb_besoins_exprimes": 0,
             "nb_besoins_approuves": 0, "avg_eval_score": 3.0,
             "nb_evaluations": 1, "days_since_last_training": 30,
             "avg_days_between_trainings": 30}
        ]
        comp_levels = [
            {"enseignant_id": "ENS001", "savoir_id": 1, "savoir_nom": "S1",
             "type_savoir": "THEORIQUE", "sous_competence_id": 1,
             "sous_competence_nom": "SC1", "competence_id": 1,
             "competence_nom": "C1", "domaine_id": 1, "domaine_nom": "D1",
             "current_level": 3, "created_at": "2024-01-01",
             "updated_at": "2024-01-01"}
        ]
        req_levels = [
            {"competence_id": 1, "savoir_id": 1, "required_level": 5,
             "competence_nom": "C1", "sous_competence_nom": "SC1",
             "savoir_nom": "S1"}
        ]

        # Ne doit PAS crasher, doit retourner un fallback heuristic
        result = p.predict(teachers, comp_levels, req_levels)
        assert "gaps" in result
        assert "explanation" in result
        # Le mode dégradé doit être marqué
        assert result["explanation"].get("method") == "heuristic_fallback_due_to_skew"
        assert "skew_reason" in result["explanation"]


class TestModelHealth:
    """P0.3 — model_health() expose l'état complet."""

    def test_model_health_no_model(self):
        from app.ml.gap_predictor import GapPredictor
        p = GapPredictor()
        p.model = None
        health = p.model_health()
        assert health["model_loaded"] is False
        assert health["fallback_mode"] is True
        assert health["fallback_reason"] == "model_not_loaded"
        assert health["feature_skew_ok"] is True  # pas de skew sans modèle
        assert "feature_cols" in health
        assert "warnings" in health
        assert "metrics" in health

    def test_model_health_with_skew(self):
        from app.ml.gap_predictor import GapPredictor, FEATURE_COLS
        p = GapPredictor()
        mock_model = MagicMock()
        mock_model.n_features_in_ = len(FEATURE_COLS) - 4
        p.model = mock_model
        health = p.model_health()
        assert health["model_loaded"] is True
        assert health["feature_skew_ok"] is False
        assert health["fallback_mode"] is True
        assert health["fallback_reason"] == "feature_skew"
        assert health["feature_skew_reason"] is not None
        assert health["n_features_model"] == len(FEATURE_COLS) - 4
        assert health["n_features_code"] == len(FEATURE_COLS)

    def test_model_health_with_metrics(self):
        from app.ml.gap_predictor import GapPredictor, FEATURE_COLS
        p = GapPredictor()
        mock_model = MagicMock()
        mock_model.n_features_in_ = len(FEATURE_COLS)
        p.model = mock_model
        p.last_metrics = {
            "test_r2": 1.0,
            "test_rmse": 0.008,
            "cv_rmse": 0.008,
            "n_samples": 80,
        }
        p._warnings = p._compute_metrics_warnings()
        health = p.model_health()
        assert len(health["warnings"]) > 0
        # Vérifier le warning R2=1.0 + petit dataset
        joined = " ".join(health["warnings"])
        assert "R2" in joined or "r2" in joined.lower()
        assert "80" in joined or "200" in joined


class TestMetricsWarnings:
    """P1.1 — warning R²=0.99 + petit dataset."""

    def test_leakage_warning_triggered(self):
        from app.ml.gap_predictor import GapPredictor
        p = GapPredictor()
        p.last_metrics = {"test_r2": 1.0, "n_samples": 80}
        warnings = p._compute_metrics_warnings()
        assert len(warnings) >= 1
        joined = " ".join(warnings).lower()
        assert "r2" in joined or "r²" in joined
        assert "leakage" in joined or "suspicious" in joined

    def test_leakage_warning_not_triggered_large_dataset(self):
        from app.ml.gap_predictor import GapPredictor
        p = GapPredictor()
        p.last_metrics = {"test_r2": 0.99, "n_samples": 500}
        warnings = p._compute_metrics_warnings()
        # Pas de warning leakage car n_samples >= 200
        joined = " ".join(warnings).lower()
        assert "leakage" not in joined and "suspicious" not in joined

    def test_small_dataset_warning(self):
        from app.ml.gap_predictor import GapPredictor
        p = GapPredictor()
        p.last_metrics = {"test_r2": 0.5, "n_samples": 30}
        warnings = p._compute_metrics_warnings()
        joined = " ".join(warnings).lower()
        assert "50" in joined or "n_samples" in joined or "threshold" in joined


class TestBaselineLift:
    """P1.2 — baseline_rmse + lift_rmse persistés dans last_metrics."""

    def test_baseline_metrics_in_train_result(self):
        from app.ml.gap_predictor import GapPredictor
        from app.core.exceptions import InsufficientDataError

        p = GapPredictor()
        n = 80
        teachers = [
            {"enseignant_id": f"ENS{i:03d}", "nom": "Test", "prenom": str(i),
             "email": f"t{i}@x.com", "departement_id": 1, "up_id": 1,
             "nb_formations_completed": i % 5, "nb_formations_in_progress": 0,
             "taux_assiduite": 0.8, "nb_besoins_exprimes": 0,
             "nb_besoins_approuves": 0, "avg_eval_score": 3.0,
             "nb_evaluations": 1, "days_since_last_training": 30,
             "avg_days_between_trainings": 30}
            for i in range(n)
        ]
        comp_levels = [
            {"enseignant_id": f"ENS{i:03d}", "savoir_id": 1, "savoir_nom": "S1",
             "type_savoir": "THEORIQUE", "sous_competence_id": 1,
             "sous_competence_nom": "SC1", "competence_id": 1,
             "competence_nom": "C1", "domaine_id": 1, "domaine_nom": "D1",
             "current_level": (i % 5) + 1, "created_at": "2024-01-01",
             "updated_at": "2024-01-01"}
            for i in range(n)
        ]
        req_levels = [
            {"competence_id": 1, "savoir_id": 1, "required_level": 5,
             "competence_nom": "C1", "sous_competence_nom": "SC1",
             "savoir_nom": "S1"}
        ]
        try:
            metrics = p.train(teachers, comp_levels, req_levels)
        except InsufficientDataError:
            pytest.skip("InsufficientDataError — sklearn indisponible dans env CI")
            return
        assert "test_r2" in metrics
        assert "test_rmse" in metrics
        # P1.2 — baseline + lift
        assert "baseline_rmse" in metrics
        assert "baseline_mae" in metrics
        assert "lift_rmse" in metrics
        assert "lift_mae" in metrics


class TestOutlierValidation:
    """P1.3 — validate_features() détecte les outliers métier."""

    def test_clean_data_passes(self):
        from app.ml.feature_engineering import validate_features
        df = pd.DataFrame({
            "taux_assiduite": [0.7, 0.8, 0.9, 0.6],
            "current_level": [3, 4, 5, 2],
            "required_level": [5, 5, 5, 5],
            "avg_level": [3.5, 4.0, 4.5, 2.5],
            "min_level": [2, 3, 4, 1],
            "max_level": [4, 5, 5, 3],
            "engagement_score": [10.0, 15.0, 20.0, 8.0],
            "days_since_last_training": [30, 60, 90, 10],
            "nb_formations_completed": [1, 2, 3, 0],
        })
        report = validate_features(df)
        assert report["is_clean"] is True
        assert report["outlier_columns"] == []

    def test_assiduite_outlier_detected(self):
        from app.ml.feature_engineering import validate_features
        df = pd.DataFrame({
            "taux_assiduite": [0.7, 1.5, 0.9, 0.6],  # 1.5 hors borne
            "current_level": [3, 4, 5, 2],
            "required_level": [5, 5, 5, 5],
            "avg_level": [3.5, 4.0, 4.5, 2.5],
            "min_level": [2, 3, 4, 1],
            "max_level": [4, 5, 5, 3],
            "engagement_score": [10.0, 15.0, 20.0, 8.0],
            "days_since_last_training": [30, 60, 90, 10],
            "nb_formations_completed": [1, 2, 3, 0],
        })
        report = validate_features(df)
        assert report["is_clean"] is False
        assert "taux_assiduite" in report["outlier_columns"]
        assert report["outliers"]["taux_assiduite"]["count"] >= 1

    def test_level_outlier_detected(self):
        from app.ml.feature_engineering import validate_features
        df = pd.DataFrame({
            "taux_assiduite": [0.7, 0.8, 0.9, 0.6],
            "current_level": [3, 7, 5, 2],  # 7 hors borne [1,5]
            "required_level": [5, 5, 5, 5],
            "avg_level": [3.5, 4.0, 4.5, 2.5],
            "min_level": [2, 3, 4, 1],
            "max_level": [4, 5, 5, 3],
            "engagement_score": [10.0, 15.0, 20.0, 8.0],
            "days_since_last_training": [30, 60, 90, 10],
            "nb_formations_completed": [1, 2, 3, 0],
        })
        report = validate_features(df)
        assert "current_level" in report["outlier_columns"]

    def test_negative_days_detected(self):
        from app.ml.feature_engineering import validate_features
        df = pd.DataFrame({
            "taux_assiduite": [0.7, 0.8, 0.9, 0.6],
            "current_level": [3, 4, 5, 2],
            "required_level": [5, 5, 5, 5],
            "avg_level": [3.5, 4.0, 4.5, 2.5],
            "min_level": [2, 3, 4, 1],
            "max_level": [4, 5, 5, 3],
            "engagement_score": [10.0, 15.0, 20.0, 8.0],
            "days_since_last_training": [30, -5, 90, 10],  # -5 invalide
            "nb_formations_completed": [1, 2, 3, 0],
        })
        report = validate_features(df)
        assert "days_since_last_training" in report["outlier_columns"]
