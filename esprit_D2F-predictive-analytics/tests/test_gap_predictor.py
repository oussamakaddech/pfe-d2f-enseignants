"""Unit tests for the GapPredictor model."""

import numpy as np
import pytest

from app.core.exceptions import InsufficientDataError
from app.ml.gap_predictor import GapPredictor


class TestGapPredictor:
    def test_train_with_sufficient_data(self):
        predictor = GapPredictor()
        # Generate synthetic data
        n = 100
        teachers = [
            {"enseignant_id": f"T{i:03d}", "nom": "Test", "prenom": "User",
             "email": f"t{i}@test.com", "departement_id": 1, "up_id": 1,
             "nb_formations_completed": i % 10, "nb_formations_in_progress": 0,
             "taux_assiduite": 0.8, "nb_besoins_exprimes": i % 5,
             "nb_besoins_approuves": i % 3, "avg_eval_score": 3.5,
             "nb_evaluations": 2, "days_since_last_training": i * 10,
             "avg_days_between_trainings": 30}
            for i in range(n)
        ]
        comp_levels = [
            {"enseignant_id": f"T{i:03d}", "savoir_id": 1, "savoir_nom": "S1",
             "type_savoir": "THEORIQUE", "sous_competence_id": 1,
             "sous_competence_nom": "SC1", "competence_id": 1,
             "competence_nom": "C1", "domaine_id": 1, "domaine_nom": "D1",
             "current_level": (i % 5) + 1, "created_at": "2024-01-01", "updated_at": "2024-01-01"}
            for i in range(n)
        ]
        req_levels = [
            {"competence_id": 1, "savoir_id": 1, "required_level": 5,
             "competence_nom": "C1", "sous_competence_nom": "SC1", "savoir_nom": "S1"}
        ]

        metrics = predictor.train(teachers, comp_levels, req_levels)
        assert "cv_rmse" in metrics
        assert "test_r2" in metrics
        assert metrics["n_samples"] == n

    def test_train_with_insufficient_data(self):
        predictor = GapPredictor()
        with pytest.raises(InsufficientDataError):
            predictor.train([], [], [])

    def test_predict_without_model(self):
        predictor = GapPredictor()
        predictor.model = None
        with pytest.raises(Exception):
            predictor.predict([], [], [])
