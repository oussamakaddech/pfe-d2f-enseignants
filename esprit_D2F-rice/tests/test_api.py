"""
tests/test_api.py
Integration tests for the RICE FastAPI endpoints (no real DB needed).
"""
import sys
import os
import io
import json
import pytest

sys.path.insert(0, os.path.dirname(os.path.dirname(__file__)))

os.environ.setdefault("DB_NAME", "test")
os.environ.setdefault("DB_USER", "test")
os.environ.setdefault("DB_PASS", "test")
os.environ.setdefault("DB_HOST", "localhost")
os.environ.setdefault("DB_PORT", "5432")

from fastapi.testclient import TestClient

# ── Patch DB functions before importing the app ──────────────────────────────
import rice_analyzer

rice_analyzer._fetch_enseignant_affectations = lambda: {}
rice_analyzer._fetch_all_enseignants_info = lambda: {}


from main import app  # noqa: E402

client = TestClient(app)


# ─────────────────────────────────────────────────────────────────────────────
# /health
# ─────────────────────────────────────────────────────────────────────────────
class TestHealth:
    def test_health_ok(self):
        r = client.get("/health")
        assert r.status_code == 200
        assert r.json()["status"] == "ok"
        assert r.json()["service"] == "rice"


# ─────────────────────────────────────────────────────────────────────────────
# GET /rice/gc-referential
# ─────────────────────────────────────────────────────────────────────────────
class TestGcReferential:
    def test_returns_200(self):
        r = client.get("/rice/gc-referential")
        assert r.status_code == 200

    def test_contains_savoirs(self):
        r = client.get("/rice/gc-referential")
        data = r.json()
        assert "savoirs" in data
        assert len(data["savoirs"]) > 0

    def test_contains_competences(self):
        r = client.get("/rice/gc-referential")
        data = r.json()
        assert "competences" in data

    def test_contains_niveaux(self):
        r = client.get("/rice/gc-referential")
        data = r.json()
        assert "niveaux" in data

    def test_contains_domaines(self):
        r = client.get("/rice/gc-referential")
        data = r.json()
        assert "domaines" in data


# ─────────────────────────────────────────────────────────────────────────────
# POST /rice/gc-match
# ─────────────────────────────────────────────────────────────────────────────
class TestGcMatch:
    def test_match_fondation(self):
        r = client.post("/rice/gc-match", data={"text": "dimensionner fondation superficielle"})
        assert r.status_code == 200
        data = r.json()
        assert "matched_savoirs" in data
        assert "S6b" in data["matched_savoirs"]

    def test_match_beton(self):
        r = client.post("/rice/gc-match", data={"text": "dimensionner beton arme eurocode 2"})
        assert r.status_code == 200
        assert "C1b" in r.json()["matched_savoirs"]

    def test_match_returns_competence(self):
        r = client.post("/rice/gc-match", data={"text": "fondation geotechnique sol pente"})
        assert r.status_code == 200
        data = r.json()
        assert "matched_competence" in data
        assert data["matched_competence"] == "GC-GC-Tech-TechC1"

    def test_match_returns_suggested_enseignants(self):
        r = client.post("/rice/gc-match", data={"text": "dimensionner fondation"})
        assert r.status_code == 200
        assert "suggested_enseignants" in r.json()

    def test_empty_text_returns_422(self):
        # FastAPI Form(...) rejects empty string as missing value → 422
        r = client.post("/rice/gc-match", data={"text": ""})
        assert r.status_code == 422

    def test_missing_text_returns_422(self):
        r = client.post("/rice/gc-match", data={})
        assert r.status_code == 422


# ─────────────────────────────────────────────────────────────────────────────
# POST /rice/analyze  – plain text fiche
# ─────────────────────────────────────────────────────────────────────────────
SAMPLE_FICHE_TEXT = b"""
Unite pedagogique : Genie Civil
Module : Resistance des Materiaux
Code : RDM-01
Responsable Module : Ahmed Benali
Enseignants : Ahmed Benali, Sarah Martin
Prerequis : Mathematiques

Acquis d'apprentissage :
AA1 Identifier les types de contraintes mecaniques 1
AA2 Appliquer les methodes de calcul RDM 3
AA3 Analyser les resultats d'un essai de traction 4
Contenu detaille

Seance 1 : Introduction
- Definition des contraintes
- Loi de Hooke

Seance 2 : Applications numeriques
- Calcul de deformation
- Validation experimentale
"""


class TestRiceAnalyze:
    def _post_analyze(self, file_content=SAMPLE_FICHE_TEXT, enseignants=None):
        if enseignants is None:
            enseignants = []
        files = {"files": ("fiche_rdm.txt", io.BytesIO(file_content), "text/plain")}
        data = {"enseignants": json.dumps(enseignants)}
        return client.post("/rice/analyze", files=files, data=data)

    def test_returns_200(self):
        r = self._post_analyze()
        assert r.status_code == 200

    def test_result_has_propositions(self):
        r = self._post_analyze()
        data = r.json()
        assert "propositions" in data
        assert len(data["propositions"]) > 0

    def test_result_has_stats(self):
        r = self._post_analyze()
        data = r.json()
        assert "stats" in data
        stats = data["stats"]
        assert "totalDomaines" in stats
        assert "totalCompetences" in stats
        assert "totalSavoirs" in stats

    def test_stats_total_domaines(self):
        r = self._post_analyze()
        assert r.json()["stats"]["totalDomaines"] == 1

    def test_domaine_has_competences(self):
        r = self._post_analyze()
        domaine = r.json()["propositions"][0]
        assert "competences" in domaine
        assert len(domaine["competences"]) > 0

    def test_competence_has_sous_competences(self):
        r = self._post_analyze()
        comp = r.json()["propositions"][0]["competences"][0]
        assert "sousCompetences" in comp
        assert len(comp["sousCompetences"]) > 0

    def test_savoir_has_required_fields(self):
        r = self._post_analyze()
        comp = r.json()["propositions"][0]["competences"][0]
        sc = comp["sousCompetences"][0]
        assert len(sc["savoirs"]) > 0
        sav = sc["savoirs"][0]
        assert "nom" in sav
        assert "type" in sav
        assert "niveau" in sav
        assert sav["type"] in ("THEORIQUE", "PRATIQUE")

    def test_niveau_is_valid(self):
        valid = {"N1_DEBUTANT", "N2_ELEMENTAIRE", "N3_INTERMEDIAIRE", "N4_AVANCE", "N5_EXPERT"}
        r = self._post_analyze()
        for dom in r.json()["propositions"]:
            for comp in dom["competences"]:
                for sc in comp["sousCompetences"]:
                    for sav in sc["savoirs"]:
                        assert sav["niveau"] in valid

    def test_with_enseignants_list(self):
        enseignants = [
            {"id": "E001", "nom": "Benali", "prenom": "Ahmed", "modules": []},
            {"id": "E002", "nom": "Martin", "prenom": "Sarah", "modules": []},
        ]
        r = self._post_analyze(enseignants=enseignants)
        assert r.status_code == 200

    def test_no_files_returns_400(self):
        r = client.post("/rice/analyze", data={"enseignants": "[]"})
        assert r.status_code in (400, 422)

    def test_invalid_enseignants_json_returns_400(self):
        files = {"files": ("f.txt", io.BytesIO(b"hello"), "text/plain")}
        r = client.post("/rice/analyze", files=files, data={"enseignants": "NOT_JSON"})
        assert r.status_code == 400

    def test_multiple_files(self):
        fiche2 = b"""
Unite pedagogique : Hydraulique
Module : Hydraulique Urbaine
Code : HYD-01
Seance 1 : Ecoulements en charge
- Equation de Bernoulli
"""
        files = [
            ("files", ("fiche1.txt", io.BytesIO(SAMPLE_FICHE_TEXT), "text/plain")),
            ("files", ("fiche2.txt", io.BytesIO(fiche2), "text/plain")),
        ]
        r = client.post("/rice/analyze", files=files, data={"enseignants": "[]"})
        assert r.status_code == 200
        assert r.json()["stats"]["totalDomaines"] == 2

    def test_extracted_enseignants_field_present(self):
        r = self._post_analyze()
        assert "extractedEnseignants" in r.json()

    def test_found_enseignants_field_present(self):
        r = self._post_analyze()
        assert "foundEnseignants" in r.json()
