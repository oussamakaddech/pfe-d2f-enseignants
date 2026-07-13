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

    def test_predict_without_model_falls_back_to_heuristic(self):
        """When no model is trained, predict() must fall back to a heuristic
        rather than raising — keeps the API responsive while the model is
        being trained."""
        predictor = GapPredictor()
        predictor.model = None
        result = predictor.predict([], [], [])
        assert result["gaps"] == []
        assert result["avg_predicted_gap"] == 0.0
        # The explanation must indicate the heuristic fallback was used
        assert result["explanation"].get("method") == "heuristic"

    @staticmethod
    def _synthetic_dataset(n: int = 80):
        teachers = [
            {"enseignant_id": f"T{i:03d}", "nom": "Test", "prenom": "User",
             "email": f"t{i}@test.com", "departement_id": 1, "up_id": 1,
             "nb_formations_completed": i % 10, "nb_formations_in_progress": i % 3,
             "taux_assiduite": 0.5 + (i % 5) / 10, "nb_besoins_exprimes": i % 5,
             "nb_besoins_approuves": i % 3, "avg_eval_score": 2.5 + (i % 4) * 0.5,
             "nb_evaluations": 2, "days_since_last_training": i * 7,
             "avg_days_between_trainings": 30}
            for i in range(n)
        ]
        comp_levels = [
            {"enseignant_id": f"T{i:03d}", "savoir_id": 1, "savoir_nom": "S1",
             "type_savoir": "THEORIQUE", "sous_competence_id": 1,
             "sous_competence_nom": "SC1", "competence_id": 1,
             "competence_nom": "C1", "domaine_id": 1, "domaine_nom": "D1",
             "current_level": (i % 5) + 1, "created_at": "2024-01-01",
             "updated_at": "2024-01-01"}
            for i in range(n)
        ]
        req_levels = [
            {"competence_id": 1, "savoir_id": 1, "required_level": 5,
             "competence_nom": "C1", "sous_competence_nom": "SC1", "savoir_nom": "S1"}
        ]
        return teachers, comp_levels, req_levels

    def test_predict_with_trained_model_uses_ml_path(self):
        """Régression : avec un modèle entraîné, predict() doit RÉELLEMENT
        prédire (le chemin ML retournait None auparavant) et ne pas retomber
        sur l'heuristique."""
        predictor = GapPredictor()
        teachers, comp_levels, req_levels = self._synthetic_dataset(80)
        predictor.train(teachers, comp_levels, req_levels)
        assert predictor.model is not None
        # Les bornes de normalisation sont capturées pour le predict (anti-skew)
        assert predictor.feature_ranges

        result = predictor.predict(teachers[:5], comp_levels[:5], req_levels, top_n=3)

        assert result is not None
        assert result["explanation"]["method"] == "ml_gradient_boosting"
        assert result["explanation"]["model_trained"] is True
        assert isinstance(result["avg_predicted_gap"], float)
        assert isinstance(result["gaps"], list) and len(result["gaps"]) > 0
        for g in result["gaps"]:
            assert 0.0 <= g["predicted_gap"] <= 5.0
            assert 0.3 <= g["confidence"] <= 0.99
            assert g["risk_level"] in {"low", "medium", "high", "critical"}

    def test_predict_ml_path_is_skew_free_after_reload(self):
        """Après reload (simulant un redémarrage), les bornes de normalisation
        et métriques sont rechargées depuis le disque, donc le predict ML reste
        cohérent sans ré-entraînement."""
        predictor = GapPredictor()
        teachers, comp_levels, req_levels = self._synthetic_dataset(80)
        predictor.train(teachers, comp_levels, req_levels)

        predictor.reload()  # recharge modèle + métadonnées depuis le disque
        assert predictor.model is not None
        assert predictor.feature_ranges  # rechargées depuis training_metadata.json

        result = predictor.predict(teachers[:5], comp_levels[:5], req_levels, top_n=3)
        assert result["explanation"]["method"] == "ml_gradient_boosting"
        assert len(result["gaps"]) > 0
