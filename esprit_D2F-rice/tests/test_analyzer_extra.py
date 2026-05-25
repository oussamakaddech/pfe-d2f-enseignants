"""
tests/test_analyzer_extra.py — Unit tests for rice.analyzer (_get_niveau_from_referentiel, _fallback_extraction, analyze_files).
"""
import sys
import os
import pytest
from unittest.mock import patch, MagicMock

sys.path.insert(0, os.path.dirname(os.path.dirname(__file__)))

os.environ.setdefault("DB_NAME", "test")
os.environ.setdefault("DB_USER", "test")
os.environ.setdefault("DB_PASS", "test")
os.environ.setdefault("DB_HOST", "localhost")
os.environ.setdefault("DB_PORT", "5432")

import rice.db as _rice_db
import rice.referential as _rice_ref

_rice_db._fetch_enseignant_affectations = lambda: {}
_rice_db._fetch_all_enseignants_info = lambda: {}
_rice_ref._load_ref_from_db = lambda dept="gc": None
_rice_ref._fetch_enseignant_affectations = lambda: {}

from rice.analyzer import (
    _get_niveau_from_referentiel,
    _NIVEAU_ORDER,
    _analyze_single_fiche,
    analyze_files,
    _fallback_extraction,
)
from rice.models import EnseignantInfo


# ── _get_niveau_from_referentiel ────────────────────────────────────────────

class TestGetNiveauFromReferentiel:
    def test_exact_code_match(self):
        # GC referential has niveaux for codes like S1a, S2b, etc.
        result = _get_niveau_from_referentiel("S1a", "gc")
        assert result in set(_NIVEAU_ORDER.keys())

    def test_variant_match(self):
        # S6 should match S6a, S6b, etc. and return minimum
        result = _get_niveau_from_referentiel("S6", "gc")
        assert result in set(_NIVEAU_ORDER.keys())

    def test_bloom_fallback_on_empty_code(self):
        result = _get_niveau_from_referentiel("", "gc", fallback_text="analyser les donnees")
        assert result in set(_NIVEAU_ORDER.keys())

    def test_bloom_fallback_on_unknown_code(self):
        result = _get_niveau_from_referentiel("ZZZ99", "gc", fallback_text="identifier les types")
        assert result in set(_NIVEAU_ORDER.keys())

    def test_none_code_uses_bloom(self):
        result = _get_niveau_from_referentiel(None, "gc", fallback_text="concevoir un projet")
        assert result == "N5_EXPERT"

    def test_empty_niveaux_uses_bloom(self):
        with patch("rice.referential._get_effective_referential", return_value={"niveaux": {}}):
            result = _get_niveau_from_referentiel("S1a", "gc", fallback_text="appliquer les methodes")
            assert result == "N3_INTERMEDIAIRE"


# ── _fallback_extraction ────────────────────────────────────────────────────

class TestFallbackExtraction:
    def test_returns_result(self):
        text = "Seance 1 : Introduction a la RDM\n- Definition des contraintes\n- Loi de Hooke"
        with patch("rice.analyzer._fetch_all_enseignants_info", return_value={}):
            result = _fallback_extraction("fiche_rdm.txt", text, "gc", matched_ens=[])
        assert result is not None

    def test_with_empty_text(self):
        with patch("rice.analyzer._fetch_all_enseignants_info", return_value={}):
            result = _fallback_extraction("empty.txt", "", "gc", matched_ens=[])
        assert result is not None


# ── _analyze_single_fiche ───────────────────────────────────────────────────

class TestAnalyzeSingleFiche:
    def test_basic_fiche(self):
        text = (
            "Module : Resistance des Materiaux\n"
            "Code : RDM-01\n"
            "Responsable : Ahmed Benali\n"
            "Enseignants : Ahmed Benali, Sarah Martin\n"
            "Prerequis : Mathematiques\n"
            "\n"
            "Acquis d'apprentissage :\n"
            "AA1 Identifier les types de contraintes mecaniques 1\n"
            "AA2 Appliquer les methodes de calcul RDM 3\n"
            "\n"
            "Contenu detaille\n"
            "Seance 1 : Introduction\n"
            "- Definition des contraintes\n"
            "Seance 2 : Applications numeriques\n"
            "- Calcul de deformation\n"
        )
        with patch("rice.analyzer._fetch_all_enseignants_info", return_value={}):
            domaine, extracted_ens = _analyze_single_fiche("fiche_rdm.txt", text, [], "gc")
        assert domaine is not None
        assert domaine.nom is not None
        assert len(domaine.competences) > 0

    def test_with_enseignants(self):
        text = (
            "Module : Beton Arme\n"
            "Responsable : Ahmed Benali\n"
            "Enseignants : Sarah Martin\n"
            "\n"
            "Acquis d'apprentissage :\n"
            "AA1 Dimensionner une poutre en beton arme 4\n"
        )
        ens = [EnseignantInfo(id="E001", nom="Benali", prenom="Ahmed", modules=[])]
        with patch("rice.analyzer._fetch_all_enseignants_info", return_value={}):
            domaine, extracted_ens = _analyze_single_fiche("fiche_ba.txt", text, ens, "gc")
        assert domaine is not None

    def test_empty_text(self):
        with patch("rice.analyzer._fetch_all_enseignants_info", return_value={}):
            domaine, extracted_ens = _analyze_single_fiche("empty.txt", "", [], "gc")
        assert domaine is not None


# ── analyze_files ───────────────────────────────────────────────────────────

class TestAnalyzeFiles:
    def test_single_text_file(self):
        content = b"Module : Hydraulique\nResponsable : Jean Dupont\nAA1 Appliquer les lois de l hydraulique 3"
        with patch("rice.analyzer._fetch_all_enseignants_info", return_value={}):
            result = analyze_files(["fiche.txt"], [content], [], "gc")
        assert result is not None
        assert hasattr(result, "propositions")
        assert hasattr(result, "stats")

    def test_multiple_files(self):
        c1 = b"Module : RDM\nAA1 Identifier les contraintes 1"
        c2 = b"Module : Hydraulique\nAA1 Appliquer les lois 3"
        with patch("rice.analyzer._fetch_all_enseignants_info", return_value={}):
            result = analyze_files(["f1.txt", "f2.txt"], [c1, c2], [], "gc")
        assert result is not None
        assert result.stats["totalDomaines"] >= 1

    def test_with_enseignants_list(self):
        ens = [EnseignantInfo(id="E001", nom="Dupont", prenom="Jean", modules=["Hydraulique"])]
        content = b"Module : Hydraulique\nResponsable : Jean Dupont\nAA1 Appliquer les lois 3"
        with patch("rice.analyzer._fetch_all_enseignants_info", return_value={}):
            result = analyze_files(["fiche.txt"], [content], ens, "gc")
        assert result is not None

    def test_empty_files_list(self):
        with patch("rice.analyzer._fetch_all_enseignants_info", return_value={}):
            result = analyze_files([], [], [], "gc")
        assert result is not None
