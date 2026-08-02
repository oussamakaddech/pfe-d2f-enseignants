"""Tests du module reporting descriptif (features 1-4 + export).

Couvre les fonctions de calcul pures (score de risque, tendance, taux,
engagement), la mise en forme du ReportingEngine (DataService mocké) et les
routes via le TestClient (DB mockée → résultats vides mais code traversé).
"""

from unittest.mock import MagicMock

import pytest

from app.engines import reporting_engine as re_mod
from app.engines.reporting_engine import (
    ReportingEngine, niveau_risque, risque_decrochage_score,
    score_engagement, taux_participation, tendance,
)


# ── Fonctions pures : score de risque de décrochage ──────────
class TestCalculRisqueScore:
    def test_jamais_de_formation_donne_score_maximal_ancrage(self):
        # None (jamais formé) → facteur ancienneté saturé (75) + 0 déclin
        assert risque_decrochage_score(None, nb_competences_declin=0) == 75

    def test_jamais_de_formation_avec_declin_atteint_100(self):
        # 75 (ancienneté) + 25 (déclin plafonné à 5 compétences) = 100
        assert risque_decrochage_score(None, nb_competences_declin=5) == 100

    def test_recent_donne_score_faible(self):
        # 1 mois sur fenêtre 24 → (1/24)*75 ≈ 3.1 → 3
        assert risque_decrochage_score(1, nb_competences_declin=0, window_mois=24) == 3

    def test_score_croit_avec_mois(self):
        s6 = risque_decrochage_score(6, window_mois=24)
        s18 = risque_decrochage_score(18, window_mois=24)
        assert 0 < s6 < s18 <= 100

    def test_score_borne_a_100(self):
        assert risque_decrochage_score(999, nb_competences_declin=99) == 100

    def test_declin_plafonne_a_25_points(self):
        base = risque_decrochage_score(0, nb_competences_declin=0)
        plein = risque_decrochage_score(0, nb_competences_declin=100)
        assert plein - base == 25


class TestNiveauRisque:
    @pytest.mark.parametrize("mois,attendu", [
        (None, "CRITIQUE"), (13, "CRITIQUE"), (12, "ELEVE"),
        (6, "ELEVE"), (5, "MODERE"), (3, "MODERE"), (2, "FAIBLE"), (0, "FAIBLE"),
    ])
    def test_seuils(self, mois, attendu):
        assert niveau_risque(mois) == attendu


class TestTendance:
    def test_hausse(self):
        assert tendance([10, 20]) == "HAUSSE"

    def test_baisse(self):
        assert tendance([20, 10]) == "BAISSE"

    def test_stable(self):
        assert tendance([100, 102]) == "STABLE"  # +2 % < seuil 5 %

    def test_serie_trop_courte(self):
        assert tendance([5]) == "STABLE"
        assert tendance([]) == "STABLE"


class TestTauxEtEngagement:
    def test_taux_participation_nominal(self):
        # 10 participations / (5 ens × 2 formations) = 100 %
        assert taux_participation(10, 5, 2) == 100.0

    def test_taux_participation_borne(self):
        assert taux_participation(50, 5, 2) == 100.0  # plafonné

    def test_taux_participation_denominateur_nul(self):
        assert taux_participation(10, 0, 3) == 0.0

    def test_score_engagement(self):
        # 70 % * 0.7 + (100-10) * 0.3 = 49 + 27 = 76
        assert score_engagement(70.0, 10.0) == 76


# ── ReportingEngine : mise en forme (DataService mocké) ──────
def _engine_with_fake_svc(svc_attrs: dict) -> ReportingEngine:
    eng = ReportingEngine(MagicMock())
    eng.svc = MagicMock()
    for name, value in svc_attrs.items():
        getattr(eng.svc, name).return_value = value
    # _competences_en_declin_par_enseignant interroge db.query → renvoie []
    eng.db.query.return_value.filter.return_value.all.return_value = []
    return eng


class TestEnseignantsSansFormation:
    def test_mise_en_forme_et_pagination(self):
        rows = [{
            "enseignant_id": "ENS1", "nom": "Doe", "prenom": "Jane",
            "email": "jane@d2f.tn", "departement_nom": "Génie Info", "up_nom": "Web",
            "up_id": "UP1", "departement_id": "D1",
            "derniere_formation_date": None,
            "nombre_mois_depuis_derniere_formation": None,
        }]
        eng = _engine_with_fake_svc({
            "get_enseignants_sans_formation": rows,
            "count_enseignants_sans_formation": 1,
        })
        out = eng.enseignants_sans_formation(mois=6, departement=None, up=None, page=0, size=20)

        assert out["total"] == 1
        assert out["page"] == 0 and out["size"] == 20
        item = out["items"][0]
        assert item["enseignantId"] == "ENS1"
        assert item["scoreRisqueDecrochage"] == 75      # jamais formé
        assert item["niveauRisque"] == "CRITIQUE"
        assert item["competencesEnDeclin"] == []

    def test_liste_vide(self):
        eng = _engine_with_fake_svc({
            "get_enseignants_sans_formation": [],
            "count_enseignants_sans_formation": 0,
        })
        out = eng.enseignants_sans_formation(mois=6, departement=None, up=None, page=0, size=20)
        assert out["total"] == 0 and out["items"] == []


class TestFormationsParPeriode:
    def test_totaux_et_tendance(self):
        rows = [
            {"period_start": "2026-01-01", "nb_formations": 2, "nb_participants": 8, "total_inscriptions": 10},
            {"period_start": "2026-02-01", "nb_formations": 5, "nb_participants": 20, "total_inscriptions": 25},
        ]
        eng = _engine_with_fake_svc({"get_formations_par_periode": rows})
        out = eng.formations_par_periode("MOIS", "2026-01-01", "2026-02-28", None, None)

        assert out["totalFormations"] == 7
        assert out["totalParticipants"] == 28
        assert out["moyenneParPeriode"] == 3.5
        assert out["tendance"] == "HAUSSE"          # 2 → 5
        assert out["periodes"][0]["tauxCompletion"] == 80.0  # 8/10


# ── Routes (DB mockée, JWT désactivé en test) ────────────────
class TestReportingRoutes:
    def test_enseignants_sans_formation_200(self, client):
        r = client.get("/api/v1/analytics/enseignants-sans-formation?mois=6")
        assert r.status_code == 200
        body = r.json()
        assert set(["total", "page", "size", "items"]).issubset(body.keys())

    def test_formations_par_periode_granularite_invalide_400(self, client):
        r = client.get("/api/v1/analytics/formations-par-periode?granularite=DECADE")
        assert r.status_code == 400

    def test_formations_par_periode_200(self, client):
        r = client.get("/api/v1/analytics/formations-par-periode?granularite=MOIS")
        assert r.status_code == 200
        assert "periodes" in r.json()

    def test_formations_par_up_200(self, client):
        r = client.get("/api/v1/analytics/formations-par-up")
        assert r.status_code == 200
        assert "items" in r.json()

    def test_formations_par_departement_200(self, client):
        r = client.get("/api/v1/analytics/formations-par-departement")
        assert r.status_code == 200
        assert "comparaisonRadar" in r.json()
