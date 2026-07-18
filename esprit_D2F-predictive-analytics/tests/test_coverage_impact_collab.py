"""Tests for app/engines/impact_engine.py and app/engines/collaborative.py."""

from types import SimpleNamespace
from unittest.mock import MagicMock

import numpy as np

from app.engines import impact_engine as ie
from app.engines import collaborative as collab


# ─────────────────────────────────────────────────────────────────────────────
# impact_engine.TrainingImpactEngine
# ─────────────────────────────────────────────────────────────────────────────

def _make_path_item(formation_id, titre, ftype, avant, apres, suivie=True):
    return SimpleNamespace(
        formation_id=formation_id,
        formation_titre=titre,
        formation_type=ftype,
        niveau_avant=avant,
        niveau_apres=apres,
        deja_suivie=suivie,
    )


class TestUrgenceFromGap:
    def test_critique(self):
        assert ie._urgence_from_gap(3) == "CRITIQUE"
        assert ie._urgence_from_gap(5) == "CRITIQUE"

    def test_haute(self):
        assert ie._urgence_from_gap(2) == "HAUTE"

    def test_moderee(self):
        assert ie._urgence_from_gap(1) == "MODEREE"

    def test_faible(self):
        assert ie._urgence_from_gap(0) == "FAIBLE"
        assert ie._urgence_from_gap(0.5) == "FAIBLE"


class TestTrainingImpactEngine:
    def _rows_query(self, items):
        db = MagicMock()
        q = db.query.return_value
        q.filter.return_value.all.return_value = items
        return db

    def test_compute_formation_impact_sorts_and_paginates(self):
        items = [
            _make_path_item(1, "A", "C", 1, 3),
            _make_path_item(1, "A", "C", 2, 4),
            _make_path_item(2, "B", "C", 0, 1),
            _make_path_item(2, "B", "C", 1, 5),
        ]
        db = self._rows_query(items)
        eng = ie.TrainingImpactEngine(db)
        total, rows = eng._compute_formation_impact(0, 10)
        assert total == 2
        # formation 1 has avg gain (2+2)/2=2.0; formation 2 has (1+4)/2=2.5 -> sorted desc
        assert rows[0]["formation_id"] == 2
        assert rows[0]["gain_niveau_moyen"] == 2.5
        assert rows[1]["formation_id"] == 1

    def test_compute_formation_impact_pagination(self):
        items = [_make_path_item(1, "A", "C", 1, 3), _make_path_item(2, "B", "C", 0, 1)]
        db = self._rows_query(items)
        eng = ie.TrainingImpactEngine(db)
        total, rows = eng._compute_formation_impact(0, 1)
        assert total == 2
        assert len(rows) == 1

    def test_top_formations_by_impact(self):
        items = [_make_path_item(1, "A", "C", 1, 3)]
        db = self._rows_query(items)
        eng = ie.TrainingImpactEngine(db)
        out = eng.top_formations_by_impact(page=2, size=5)
        assert out["page"] == 2
        assert out["size"] == 5
        assert out["total"] == 1

    def test_compute_global_impact_empty(self):
        db = MagicMock()
        q = db.query.return_value
        q.filter.return_value.all.return_value = []
        q.filter.return_value.count.return_value = 0
        eng = ie.TrainingImpactEngine(db)
        res = eng.compute_global_impact()
        assert res["nb_formations_suivies"] == 0
        assert res["gain_niveau_moyen"] == 0.0
        assert res["reduction_risque_moyenne"] == 0.0
        assert res["nb_risque_reduit"] == 0
        assert res["nb_risque_augmente"] == 0

    def test_compute_global_impact_with_data(self):
        items = [_make_path_item(1, "A", "C", 1, 3), _make_path_item(2, "B", "C", 0, 2)]
        profiles = [
            SimpleNamespace(score_risque=0.5, precedent_score_risque=0.7),
            SimpleNamespace(score_risque=0.9, precedent_score_risque=0.6),
        ]
        db = MagicMock()
        q = db.query.return_value
        q.filter.return_value.all.side_effect = [items, profiles]
        q.filter.return_value.count.side_effect = [5, 3]
        eng = ie.TrainingImpactEngine(db)
        res = eng.compute_global_impact()
        assert res["nb_formations_suivies"] == 2
        # reduction: (0.5-0.7)+(0.9-0.6) = -0.2+0.3 = 0.1; /2 = 0.05
        assert res["reduction_risque_moyenne"] == 0.05
        # risque diminué (r<0): 1 (0.5-0.7), risque augmenté (r>0): 1
        assert res["nb_risque_reduit"] == 1
        assert res["nb_risque_augmente"] == 1
        assert res["nb_chemins_termines"] == 5


# ─────────────────────────────────────────────────────────────────────────────
# impact_engine.WhatIfEngine
# ─────────────────────────────────────────────────────────────────────────────

class TestWhatIfEngine:
    def _gap(self, cid, urgence="MODEREE", stagnation=0, regr=False,
             req=3, act=1, vise=4):
        return SimpleNamespace(
            competence_id=cid, niveau_urgence=urgence, mois_stagnation=stagnation,
            en_regression=regr, niveau_requis=req, niveau_actuel=act, niveau_vise=vise,
        )

    def _snap(self, taux=None):
        return SimpleNamespace(taux_completion_formations=taux)

    def test_simulate_no_gaps(self):
        db = MagicMock()
        q = db.query.return_value
        q.filter.return_value.all.return_value = []
        q.filter.return_value.order_by.return_value.first.return_value = self._snap(None)
        eng = ie.WhatIfEngine(db)
        res = eng.simulate("E1", [], horizon_mois=12)
        assert res["enseignant_id"] == "E1"
        assert res["horizon_mois"] == 12
        assert res["nb_gaps_before"] == 0
        assert res["details"] == []

    def test_simulate_resolves_gap(self):
        gap = self._gap(1, urgence="CRITIQUE")
        db = MagicMock()
        q = db.query.return_value
        q.filter.return_value.all.return_value = [gap]
        q.filter.return_value.order_by.return_value.first.return_value = self._snap(0.5)
        eng = ie.WhatIfEngine(db)
        plan = [{"competence_id": 1, "niveau_vise": 3}]
        res = eng.simulate("E1", plan)
        assert res["nb_gaps_before"] == 1
        assert len(res["details"]) == 1
        d = res["details"][0]
        assert d["gap_avant"] == 2  # 3-1
        # plan raises niveau_vise to 3 => gap_apres = max(0, 3-3) = 0 => resolu
        assert d["gap_apres"] == 0
        assert d["resolu"] is True
        assert res["nb_gaps_resolus"] == 1

    def test_simulate_formation_without_existing_gap(self):
        gap = self._gap(1)
        db = MagicMock()
        q = db.query.return_value
        q.filter.return_value.all.return_value = [gap]
        q.filter.return_value.order_by.return_value.first.return_value = self._snap(0.0)
        eng = ie.WhatIfEngine(db)
        plan = [{"competence_id": 99, "niveau_vise": 3, "formation_id": 5}]
        res = eng.simulate("E1", plan)
        d = res["details"][0]
        # cid 99 not in gaps -> niveau_actuel=0, niveau_requis=niveau_vise=3
        assert d["niveau_actuel"] == 0
        assert d["niveau_requis"] == 3
        assert d["gap_avant"] == 3


# ─────────────────────────────────────────────────────────────────────────────
# collaborative
# ─────────────────────────────────────────────────────────────────────────────

class TestCollaborativeHelpers:
    def test_build_profiles(self):
        cls = [
            {"enseignant_id": "T1", "competence_id": 1, "current_level": 2},
            {"enseignant_id": "T1", "competence_id": 1, "current_level": 4},
            {"enseignant_id": "T1", "competence_id": 2, "current_level": 3},
            {"enseignant_id": None, "competence_id": 1, "current_level": 1},
        ]
        profiles = collab._build_profiles(cls)
        assert profiles["T1"][1] == 4  # max
        assert profiles["T1"][2] == 3
        assert "" not in profiles  # invalid tid skipped

    def test_build_completers(self):
        ins = [
            {"etat": "APPROVED", "formation_id": 10, "enseignant_id": "T1"},
            {"etat": "PENDING", "formation_id": 10, "enseignant_id": "T2"},
            {"etat": "APPROVED", "formation_id": 11, "enseignant_id": "T1"},
        ]
        comp = collab._build_completers(ins)
        assert comp[10] == {"T1"}
        assert 11 in comp

    def test_similarity_matrix_empty(self):
        assert collab._build_similarity_matrix([], {}) is None
        assert collab._build_similarity_matrix(["T1"], {}) is None


class TestSVDCollaborativeFilter:
    def _svd(self, teachers_data, inscriptions=None):
        comp_levels = []
        for tid, levels in teachers_data.items():
            for cid, lvl in levels.items():
                comp_levels.append({"enseignant_id": tid, "competence_id": cid, "current_level": lvl})
        inscriptions = inscriptions or [{"etat": "APPROVED", "formation_id": 1, "enseignant_id": "T2"}]
        return collab.SVDCollaborativeFilter(comp_levels, inscriptions, n_components=2, k_neighbors=2)

    def test_no_teachers(self):
        f = collab.SVDCollaborativeFilter([], [])
        assert f.similar_teachers("T1") == []
        assert f.peer_success_rate("T1", 1) == collab.NEUTRAL_PEER_SCORE
        assert f.peer_adoption_count("T1", 1) == 0

    def test_similarity_and_peer_score(self):
        f = self._svd({"T1": {1: 3, 2: 3}, "T2": {1: 3, 2: 3}})
        peers = f.similar_teachers("T1")
        assert isinstance(peers, list)
        rate = f.peer_success_rate("T1", 1)
        assert 0.0 <= rate <= 1.0

    def test_peer_success_rate_no_adopters(self):
        f = self._svd({"T1": {1: 3, 2: 3}, "T2": {1: 1, 2: 5}})
        f._sim = __import__("numpy").array([[1.0, 0.8], [0.8, 1.0]])
        f._row = {"T1": 0, "T2": 1}
        f.teachers = ["T1", "T2"]
        f.completers = {}
        assert f.peer_success_rate("T1", 999) == 0.0

    def test_peer_adoption_count(self):
        f = self._svd({"T1": {1: 3, 2: 3}, "T2": {1: 1, 2: 5}})
        f._sim = __import__("numpy").array([[1.0, 0.8], [0.8, 1.0]])
        f._row = {"T1": 0, "T2": 1}
        f.teachers = ["T1", "T2"]
        f.completers = {1: {"T2"}}
        assert f.peer_adoption_count("T1", 1) == 1


class TestCollaborativeFilter:
    def _cf(self, teachers_data, inscriptions=None):
        comp_levels = []
        for tid, levels in teachers_data.items():
            for cid, lvl in levels.items():
                comp_levels.append({"enseignant_id": tid, "competence_id": cid, "current_level": lvl})
        inscriptions = inscriptions or [{"etat": "APPROVED", "formation_id": 1, "enseignant_id": "T1"}]
        return collab.CollaborativeFilter(comp_levels, inscriptions, k_neighbors=2, svd_weight=0.5)

    def test_empty(self):
        f = collab.CollaborativeFilter([], [])
        assert f.similar_teachers("T1") == []
        assert f.peer_success_rate("T1", 1) == collab.NEUTRAL_PEER_SCORE
        assert f.peer_adoption_count("T1", 1) == 0

    def test_svd_weight_clamping(self):
        f = collab.CollaborativeFilter([], [], svd_weight=5.0)
        assert f.svd_weight == 1.0
        f2 = collab.CollaborativeFilter([], [], svd_weight=-1.0)
        assert f2.svd_weight == 0.0

    def test_hybrid_peer_success_rate(self):
        f = self._cf({"T1": {1: 3, 2: 3}, "T2": {1: 3, 2: 3}})
        rate = f.peer_success_rate("T1", 1)
        assert 0.0 <= rate <= 1.0

    def test_knn_peer_success_rate_internal(self):
        f = self._cf({"T1": {1: 3}, "T2": {1: 3}})
        assert 0.0 <= f._knn_peer_success_rate("T1", 1) <= 1.0
        assert f._knn_peer_success_rate("T1", 999) == 0.0
        # no peers -> neutral
        f_empty = collab.CollaborativeFilter([], [])
        assert f_empty._knn_peer_success_rate("T1", 1) == collab.NEUTRAL_PEER_SCORE
