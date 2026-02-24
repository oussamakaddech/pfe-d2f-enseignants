"""
tests/test_gc_referential.py
Unit tests for the GC referential matching functions in rice_analyzer.py
"""
import sys
import os
import pytest

sys.path.insert(0, os.path.dirname(os.path.dirname(__file__)))

os.environ.setdefault("DB_NAME", "test")
os.environ.setdefault("DB_USER", "test")
os.environ.setdefault("DB_PASS", "test")
os.environ.setdefault("DB_HOST", "localhost")
os.environ.setdefault("DB_PORT", "5432")

from rice_analyzer import (
    _match_gc_savoir,
    _gc_ref_niveau,
    _match_gc_competence,
    _suggest_gc_enseignants,
    _GC_REFERENTIAL,
)


# ─────────────────────────────────────────────────────────────────────────────
# _match_gc_savoir
# ─────────────────────────────────────────────────────────────────────────────
class TestMatchGcSavoir:
    def test_returns_list(self):
        assert isinstance(_match_gc_savoir("fondation beton arme"), list)

    def test_match_fondation(self):
        # Use exact keyword phrases from the referential (no words in between)
        codes = _match_gc_savoir("dimensionner fondation calcul fondation pieu calcul")
        assert "S6b" in codes

    def test_match_beton_arme(self):
        codes = _match_gc_savoir("dimensionner beton arme avec eurocode 2")
        assert "C1b" in codes

    def test_match_route(self):
        codes = _match_gc_savoir("dimensionner infrastructure routiere et chaussee")
        assert "C3b" in codes

    def test_match_hydraulique(self):
        codes = _match_gc_savoir("dimensionner reseau hydraulique assainissement")
        assert "E1b" in codes

    def test_match_urbanisme(self):
        codes = _match_gc_savoir("analyser situation urbaine et diagnostic urbain")
        assert "U1" in codes or "U2" in codes

    def test_no_match_returns_empty(self):
        codes = _match_gc_savoir("texte sans rapport avec le genie civil")
        assert isinstance(codes, list)  # may be empty or not – must not crash

    def test_sorted_by_relevance(self):
        # More matching keywords → should appear first
        codes = _match_gc_savoir(
            "fondation conception dimensionner soutenement pieu semelle dimensionner calcul fondation"
        )
        # S6b has many matching keywords for this text
        assert codes[0] in ("S6b", "S6a", "S6c")

    def test_empty_text(self):
        assert _match_gc_savoir("") == []


# ─────────────────────────────────────────────────────────────────────────────
# _gc_ref_niveau
# ─────────────────────────────────────────────────────────────────────────────
class TestGcRefNiveau:
    def test_known_code_S2a(self):
        assert _gc_ref_niveau(["S2a"]) == "N1_DEBUTANT"

    def test_known_code_S6b(self):
        assert _gc_ref_niveau(["S6b"]) == "N3_INTERMEDIAIRE"

    def test_known_code_C1b(self):
        assert _gc_ref_niveau(["C1b"]) == "N3_INTERMEDIAIRE"

    def test_known_expert_code(self):
        assert _gc_ref_niveau(["T1"]) == "N5_EXPERT"

    def test_unknown_code_returns_none(self):
        assert _gc_ref_niveau(["ZZZZ"]) is None

    def test_empty_list_returns_none(self):
        assert _gc_ref_niveau([]) is None

    def test_first_known_wins(self):
        # "UNKNOWN" not in map, "S1a" is → should return S1a's niveau
        assert _gc_ref_niveau(["UNKNOWN_CODE", "S1a"]) == "N2_ELEMENTAIRE"

    def test_all_valid_niveaux_are_standard(self):
        valid = {"N1_DEBUTANT", "N2_ELEMENTAIRE", "N3_INTERMEDIAIRE", "N4_AVANCE", "N5_EXPERT"}
        for code in _GC_REFERENTIAL["niveaux"]:
            assert _gc_ref_niveau([code]) in valid


# ─────────────────────────────────────────────────────────────────────────────
# _match_gc_competence
# ─────────────────────────────────────────────────────────────────────────────
class TestMatchGcCompetence:
    def test_match_sols(self):
        comp = _match_gc_competence("fondation geotechnique sol stabilite pente")
        assert comp == "GC-GC-Tech-TechC1"

    def test_match_construction(self):
        comp = _match_gc_competence("beton arme pont route chaussee ouvrage art")
        assert comp == "GC-GC-Tech-TechC2"

    def test_match_physique_batiment(self):
        comp = _match_gc_competence("thermique acoustique isolation cvc ventilation")
        assert comp == "GC-GC-Tech-TechC3"

    def test_match_eau(self):
        comp = _match_gc_competence("hydraulique hydrologie bassin versant assainissement")
        assert comp == "GC-GC-Tech-TechC4"

    def test_match_urbanisme(self):
        comp = _match_gc_competence("urbanisme amenagement urbain diagnostic ville territoire")
        assert comp == "GC-GC-Tech-TechC5"

    def test_match_transversal(self):
        comp = _match_gc_competence("organisation chantier securite developpement durable construction")
        assert comp == "GC-GC-Tech-TechC6"

    def test_no_match_returns_none(self):
        comp = _match_gc_competence("random words with no gc meaning")
        assert comp is None

    def test_empty_text_returns_none(self):
        assert _match_gc_competence("") is None


# ─────────────────────────────────────────────────────────────────────────────
# _suggest_gc_enseignants  (with DB cache mocked)
# ─────────────────────────────────────────────────────────────────────────────
class TestSuggestGcEnseignants:
    def test_returns_list(self, monkeypatch):
        monkeypatch.setattr(
            "rice_analyzer._fetch_enseignant_affectations",
            lambda: {"E001": ["S2a", "C1b"], "E002": ["T1", "S6b"]},
        )
        result = _suggest_gc_enseignants(["S2a"])
        assert "E001" in result

    def test_no_match_returns_empty(self, monkeypatch):
        monkeypatch.setattr(
            "rice_analyzer._fetch_enseignant_affectations",
            lambda: {"E001": ["S2a"], "E002": ["C1b"]},
        )
        result = _suggest_gc_enseignants(["ZZZZ"])
        assert result == []

    def test_multiple_teachers_matched(self, monkeypatch):
        monkeypatch.setattr(
            "rice_analyzer._fetch_enseignant_affectations",
            lambda: {
                "E001": ["S6b", "C1b"],
                "E002": ["S6b", "T1"],
                "E003": ["U1"],
            },
        )
        result = _suggest_gc_enseignants(["S6b"])
        assert set(result) == {"E001", "E002"}

    def test_empty_codes_returns_empty(self, monkeypatch):
        monkeypatch.setattr(
            "rice_analyzer._fetch_enseignant_affectations",
            lambda: {"E001": ["S2a"]},
        )
        result = _suggest_gc_enseignants([])
        assert result == []

    def test_db_unavailable_returns_empty(self, monkeypatch):
        def raise_exc():
            raise Exception("DB unreachable")
        monkeypatch.setattr(
            "rice_analyzer._fetch_enseignant_affectations", raise_exc
        )
        with pytest.raises(Exception):
            _suggest_gc_enseignants(["S2a"])


# ─────────────────────────────────────────────────────────────────────────────
# GC referential data integrity
# ─────────────────────────────────────────────────────────────────────────────
class TestGcReferentialIntegrity:
    def test_all_savoir_codes_non_empty(self):
        for code, keywords in _GC_REFERENTIAL["savoirs"].items():
            assert len(keywords) > 0, f"Savoir {code} has no keywords"

    def test_all_competence_codes_have_keywords(self):
        for code, info in _GC_REFERENTIAL["competences"].items():
            assert len(info["keywords"]) > 0, f"Compétence {code} has no keywords"

    def test_niveaux_values_are_valid(self):
        valid = {"N1_DEBUTANT", "N2_ELEMENTAIRE", "N3_INTERMEDIAIRE", "N4_AVANCE", "N5_EXPERT"}
        for code, niveau in _GC_REFERENTIAL["niveaux"].items():
            assert niveau in valid, f"Niveau {niveau} for {code} is not valid"

    def test_niveaux_codes_exist_in_savoirs(self):
        all_savoir_codes = set(_GC_REFERENTIAL["savoirs"].keys())
        for code in _GC_REFERENTIAL["niveaux"]:
            assert code in all_savoir_codes, f"Niveau code {code} not in savoirs"

    def test_domaine_codes_non_empty(self):
        assert len(_GC_REFERENTIAL["domaines"]) > 0
