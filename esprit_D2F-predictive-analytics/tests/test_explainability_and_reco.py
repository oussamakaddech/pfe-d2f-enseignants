import numpy as np

from app.ml import explainability
from app.engines import recommendation_engine as reco


class DummyModel:
    def __init__(self, importances):
        self.feature_importances_ = np.array(importances)


def test_explain_prediction_with_feature_importances():
    model = DummyModel([0.1, 0.7, 0.2])
    features = np.array([[1, 2, 3]])
    names = ["f1", "f2", "f3"]
    out = explainability.explain_prediction(model, features, names)
    assert out["method"] == "feature_importance"
    assert len(out["top_features"]) == 3 or len(out["top_features"]) <= 5


def test_get_gap_explanation_known_features():
    fi = {"avg_level": 3.4, "taux_assiduite": 0.85}
    teacher = {"avg_level": 3.4, "taux_assiduite": 0.85}
    s = explainability.get_gap_explanation(fi, teacher)
    assert "key predictor" in s or "Attendance" in s or "coverage" in s or "Feature" in s


def test_score_functions_recommendation_engine():
    formation = {"niveau_vise": 4}
    assert 0.0 <= reco._score_pertinence(formation, 2, 4) <= 1.0

    inscriptions = [{"formation_id": 1, "etat": "APPROVED"}, {"formation_id": 1, "etat": "APPROVED"}]
    evaluations = [{"formation_id": 1, "note_globale": 4.0}]
    assert 0.0 <= reco._score_reussite(1, inscriptions, evaluations) <= 1.0

    f2 = {"inscriptions_ouvertes": True, "etat_formation": "PLANIFIE"}
    assert 0.0 <= reco._score_disponibilite(f2) <= 1.0
