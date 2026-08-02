"""Extended tests for app/engines/recommendation_engine.py (MSAS, paths, proba)."""

from types import SimpleNamespace
from unittest.mock import MagicMock, patch

from app.engines import recommendation_engine as reco


def make_gap(cid=1, prior=0.5, current=1, required=3, vise=4, gid=10):
    return SimpleNamespace(
        competence_id=cid, priorite_score=prior, niveau_actuel=current,
        niveau_requis=required, niveau_vise=vise,
        competence_nom=f"Comp {cid}", id=gid,
    )


class TestScoreHelpers:
    def test_score_pertinence_no_gap(self):
        f = {"niveau_vise": 2}
        assert reco._score_pertinence(f, 3, 3) == 0.0

    def test_score_pertinence_alignment(self):
        f = {"niveau_vise": 4}
        s = reco._score_pertinence(f, 1, 4)
        assert 0.0 < s <= 1.0

    def test_score_reussite_neutral_without_inscriptions(self):
        assert reco._score_reussite(1, [], []) == 0.5

    def test_score_reussite_with_data(self):
        ins = [{"formation_id": 1, "etat": "APPROVED"}, {"formation_id": 1, "etat": "PENDING"}]
        evals = [{"formation_id": 1, "note_globale": 4.0}]
        s = reco._score_reussite(1, ins, evals)
        assert 0.0 <= s <= 1.0

    def test_score_disponibilite(self):
        assert reco._score_disponibilite({"inscriptions_ouvertes": True, "etat_formation": "PLANIFIE"}) == 1.0
        assert 0.0 < reco._score_disponibilite({"etat_formation": "ANNULE"}) <= 1.0


class FakeCollaborative:
    def __init__(self, rate=0.7, adopt=2):
        self._k = 3
        self._n_users = 10
        self.rate = rate
        self.adopt = adopt

    def peer_success_rate(self, tid, fid):
        return self.rate

    def peer_adoption_count(self, tid, fid):
        return self.adopt


class TestScoreCandidates:
    def test_no_collaborative(self):
        cands = [{"formation_id": 1, "niveau_vise": 4}]
        out = reco._score_candidates(cands, "t1", 1, 4, [], [], None)
        assert out[0]["_score_global"] is not None

    def test_collaborative_legacy(self):
        collab = FakeCollaborative(rate=0.6, adopt=1)
        cands = [{"formation_id": 1, "niveau_vise": 4}]
        out = reco._score_candidates(cands, "t1", 1, 4, [], [], collab)
        assert out[0]["_score_global"] is not None
        assert out[0]["_score_peer"] == 0.6

    def test_collaborative_msas(self):
        collab = FakeCollaborative(rate=0.8, adopt=3)
        cands = [{"formation_id": 1, "niveau_vise": 4}]
        with patch("app.engines.msas.compute_adaptive_weights",
                   return_value={"alpha": 0.5, "beta": 0.3, "gamma": 0.2}), \
                patch("app.engines.msas.compute_gap_score", return_value=0.7), \
                patch("app.engines.msas.compute_peer_score", return_value=0.6), \
                patch("app.engines.msas.compute_risk_signal", return_value=0.4):
            out = reco._score_candidates(cands, "t1", 1, 4, [], [], collab)
        f = out[0]
        assert "_msas_weights" in f
        assert f["_msas_signals"]["s_gap"] == 0.7


class TestGenerate:
    def test_generate_full_path_with_collaborative(self):
        db = MagicMock()
        gap = make_gap(cid=101, prior=0.9, current=1, required=4, vise=4, gid=55)
        formations = [{
            "id_formation": 201, "formation_id": 201, "titre_formation": "F1",
            "niveau_vise": 4, "etat_formation": "PLANIFIE",
            "inscriptions_ouvertes": True,
        }]
        formation_competences = [{"competence_id": 101, "formation_id": 201}]
        collab = FakeCollaborative(rate=0.5, adopt=1)
        with patch("app.engines.msas.compute_adaptive_weights",
                   return_value={"alpha": 0.5, "beta": 0.3, "gamma": 0.2}), \
                patch("app.engines.msas.compute_gap_score", return_value=0.7), \
                patch("app.engines.msas.compute_peer_score", return_value=0.6), \
                patch("app.engines.msas.compute_risk_signal", return_value=0.4):
            eng = reco.RecommendationEngine(db)
            recs, paths = eng.generate(
                enseignant_id="t1", gaps=[gap], formations=formations,
                formation_competences=formation_competences, inscriptions=[],
                evaluations=[], prerequisite_graph=[], snapshot_taux_completion=80.0,
                snapshot_taux_presence=90.0, collaborative=collab,
            )
        assert len(recs) >= 1
        assert len(paths) >= 1
        db.add.assert_called()

    def test_generate_no_candidates_skips(self):
        db = MagicMock()
        gap = make_gap(cid=101, prior=0.9, current=1, required=4, vise=4, gid=55)
        formations = [{
            "id_formation": 201, "formation_id": 201, "titre_formation": "F1",
            "niveau_vise": 2, "etat_formation": "ANNULE",
            "inscriptions_ouvertes": False,
        }]
        formation_competences = [{"competence_id": 101, "formation_id": 201}]
        eng = reco.RecommendationEngine(db)
        recs, paths = eng.generate(
            enseignant_id="t1", gaps=[gap], formations=formations,
            formation_competences=formation_competences, inscriptions=[],
            evaluations=[], prerequisite_graph=[],
            snapshot_taux_completion=80.0, snapshot_taux_presence=90.0,
        )
        assert recs == []
        assert paths == []

    def test_generate_with_prerequisites(self):
        db = MagicMock()
        gap = make_gap(cid=101, prior=0.9, current=1, required=4, vise=4, gid=55)
        formations = [{
            "id_formation": 201, "formation_id": 201, "titre_formation": "F1",
            "niveau_vise": 4, "etat_formation": "PLANIFIE",
            "inscriptions_ouvertes": True,
        }]
        formation_competences = [{"competence_id": 101, "formation_id": 201}]
        prereqs = [{"target_id": 101, "prereq_id": 99}]
        prereq_formations = [{
            "id_formation": 301, "formation_id": 301, "titre_formation": "PRE",
            "niveau_vise": 1, "etat_formation": "PLANIFIE",
            "inscriptions_ouvertes": True,
        }]
        formation_competences += [{"competence_id": 99, "formation_id": 301}]
        eng = reco.RecommendationEngine(db)
        recs, paths = eng.generate(
            enseignant_id="t1", gaps=[gap], formations=formations + prereq_formations,
            formation_competences=formation_competences, inscriptions=[],
            evaluations=[], prerequisite_graph=prereqs,
            snapshot_taux_completion=80.0, snapshot_taux_presence=90.0,
        )
        assert len(paths) >= 1
        # prereq item flagged
        item_jsons = [r.justification for r in recs]
        assert any("prérequis" in j.lower() for j in item_jsons)


class TestProbaGlobale:
    def test_empty(self):
        eng = reco.RecommendationEngine(MagicMock())
        assert eng._proba_globale([], 1.0) == 0.0

    def test_product(self):
        eng = reco.RecommendationEngine(MagicMock())
        items = [{"proba_reussite": 0.5}, {"proba_reussite": 0.5}]
        assert eng._proba_globale(items, 0.8) == round(min(0.95, 0.25 * 0.8), 4)
