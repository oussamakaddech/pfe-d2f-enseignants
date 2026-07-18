"""Tests for app/engines/reporting_engine.py and app/routers/reporting.py."""

from types import SimpleNamespace
from unittest.mock import MagicMock, patch

from app.engines import reporting_engine as re


def _rows(*dicts):
    return dicts


class TestReportingPureFunctions:
    def test_risque_decrochage_none(self):
        # jamais formé => ancienneté saturée à 100% => 75 points (sans déclin)
        assert re.risque_decrochage_score(None, 0) == 75

    def test_risque_decrochage_partial(self):
        s = re.risque_decrochage_score(12, 1)
        assert 0 <= s <= 100

    def test_niveau_risque(self):
        assert re.niveau_risque(None) == "CRITIQUE"
        assert re.niveau_risque(13) == "CRITIQUE"
        assert re.niveau_risque(6) == "ELEVE"
        assert re.niveau_risque(3) == "MODERE"
        assert re.niveau_risque(1) == "FAIBLE"

    def test_tendance(self):
        assert re.tendance([1.0]) == "STABLE"
        assert re.tendance([1.0, 2.0]) == "HAUSSE"
        assert re.tendance([2.0, 1.0]) == "BAISSE"
        assert re.tendance([0.0, 0.0]) == "STABLE"
        assert re.tendance([0.0, 1.0]) == "HAUSSE"

    def test_taux_participation_zero_denom(self):
        assert re.taux_participation(10, 0, 0) == 0.0

    def test_taux_participation_capped(self):
        assert re.taux_participation(100, 1, 1) == 100.0

    def test_score_engagement(self):
        assert re.score_engagement(100.0, 0.0) == 100
        assert re.score_engagement(0.0, 100.0) == 0


class TestReportingEngine:
    def test_enseignants_sans_formation(self):
        db = MagicMock()
        svc = MagicMock()
        svc.get_enseignants_sans_formation.return_value = [{
            "enseignant_id": "E1", "nom": "A", "prenom": "B", "email": "x@y.z",
            "departement_nom": "D", "up_nom": "U",
            "derniere_formation_date": None,
            "nombre_mois_depuis_derniere_formation": 14,
        }]
        svc.count_enseignants_sans_formation.return_value = 1
        with patch.object(re, "DataService", return_value=svc), \
                patch.object(re.ReportingEngine, "_competences_en_declin_par_enseignant", return_value={}):
            eng = re.ReportingEngine(db)
            res = eng.enseignants_sans_formation(12, None, None, 0, 10)
        assert res["total"] == 1
        item = res["items"][0]
        assert 0 <= item["scoreRisqueDecrochage"] <= 100
        assert item["niveauRisque"] == "CRITIQUE"

    def test_formations_par_periode(self):
        db = MagicMock()
        svc = MagicMock()
        svc.get_formations_par_periode.return_value = [{
            "period_start": "2024-01", "nb_formations": 5,
            "nb_participants": 10, "total_inscriptions": 20,
        }]
        with patch.object(re, "DataService", return_value=svc):
            eng = re.ReportingEngine(db)
            res = eng.formations_par_periode("MOIS", "2024-01-01", "2024-12-31", None, None)
        assert res["totalFormations"] == 5
        assert res["moyenneParPeriode"] == 5.0
        assert res["tendance"] == "STABLE"

    def test_formations_par_up(self):
        db = MagicMock()
        svc = MagicMock()
        svc.get_formations_par_up.return_value = [{
            "up_id": "U1", "up_nom": "UP1", "departement_nom": "D",
            "nombre_enseignants": 10, "nombre_formations_organisees": 4,
            "nombre_participations": 8,
        }]
        svc.get_top_competences_par_up.return_value = []
        with patch.object(re, "DataService", return_value=svc), \
                patch.object(re.ReportingEngine, "_inactifs_par_up", return_value={"U1": 2}):
            eng = re.ReportingEngine(db)
            res = eng.formations_par_up(2024, None)
        assert res[0]["upId"] == "U1"
        assert res[0]["enseignantsSansFormation"] == 2

    def test_formations_par_departement(self):
        db = MagicMock()
        svc = MagicMock()
        svc.get_formations_par_departement.return_value = [{
            "departement_id": "D1", "departement_nom": "Dpt1",
            "nombre_enseignants": 10, "nombre_formations_organisees": 4,
            "nombre_participations": 8,
        }]
        with patch.object(re, "DataService", return_value=svc), \
                patch.object(re.ReportingEngine, "_inactifs_par_dept", return_value={"D1": 2}), \
                patch.object(re.ReportingEngine, "_niveau_moyen_dept", return_value=3.5):
            eng = re.ReportingEngine(db)
            res = eng.formations_par_departement(2024)
        assert res["departements"][0]["departementId"] == "D1"
        assert res["comparaisonRadar"]

    def test_competences_declin_empty(self):
        db = MagicMock()
        q = db.query.return_value
        q.filter.return_value.all.return_value = []
        eng = re.ReportingEngine(db)
        assert eng._competences_en_declin_par_enseignant([]) == {}
