from types import SimpleNamespace
from unittest.mock import MagicMock

from app.engines import recommendation_engine as reco


def make_gap(cid=1, prior=0.5, current=1, required=3, vise=4, gid=10):
    return SimpleNamespace(
        competence_id=cid,
        priorite_score=prior,
        niveau_actuel=current,
        niveau_requis=required,
        niveau_vise=vise,
        competence_nom=f"Comp {cid}",
        id=gid,
    )


def test_scores_and_filters():
    # _score_pertinence
    f = {"niveau_vise": 4}
    assert 0.0 <= reco._score_pertinence(f, 1, 3) <= 1.0

    # _score_reussite: no inscriptions -> neutral
    assert reco._score_reussite(1, [], []) == 0.5

    # _score_disponibilite
    assert 0.0 <= reco._score_disponibilite({"inscriptions_ouvertes": True, "etat_formation": "PLANIFIE"}) <= 1.0


def test_engine_generate_smoke(mock_db=None):
    db = MagicMock()
    engine = reco.RecommendationEngine(db)

    # Prepare a simple gap and formations mapping
    gap = make_gap(cid=101, prior=0.9, current=1, required=4, vise=4, gid=55)

    formations = [
        {"id_formation": 201, "formation_id": 201, "titre_formation": "F1", "niveau_vise": 4, "etat_formation": "PLANIFIE", "inscriptions_ouvertes": True},
        {"id_formation": 202, "formation_id": 202, "titre_formation": "F2", "niveau_vise": 5, "etat_formation": "ANNULE", "inscriptions_ouvertes": False},
    ]

    formation_competences = [
        {"competence_id": 101, "formation_id": 201},
    ]

    inscriptions = []
    evaluations = []
    prerequisite_graph = []

    # Call generate; since DB is mocked, it should run without DB persistence
    recs, paths = engine.generate(
        enseignant_id="t1",
        gaps=[gap],
        formations=formations,
        formation_competences=formation_competences,
        inscriptions=inscriptions,
        evaluations=evaluations,
        prerequisite_graph=prerequisite_graph,
        snapshot_taux_completion=80.0,
        snapshot_taux_presence=90.0,
    )

    # Should return lists (possibly empty) and not raise
    assert isinstance(recs, list)
    assert isinstance(paths, list)
