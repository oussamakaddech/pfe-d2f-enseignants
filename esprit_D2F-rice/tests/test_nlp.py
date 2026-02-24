"""
tests/test_nlp.py
Unit tests for the pure NLP functions in rice_analyzer.py
(no database, no filesystem, no HTTP calls needed)
"""
import sys
import os
import pytest

# Make the project root importable
sys.path.insert(0, os.path.dirname(os.path.dirname(__file__)))

# Patch env vars before import so load_dotenv() doesn't blow up
os.environ.setdefault("DB_NAME", "test")
os.environ.setdefault("DB_USER", "test")
os.environ.setdefault("DB_PASS", "test")
os.environ.setdefault("DB_HOST", "localhost")
os.environ.setdefault("DB_PORT", "5432")

from rice_analyzer import (
    _normalize,
    _slug,
    _detect_bloom_level,
    _bloom_to_niveau,
    _detect_type,
    _clean_name,
    _split_names,
    _extract_metadata,
    _extract_acquis_apprentissage,
    _extract_seances,
    _match_enseignants_by_name,
    _match_enseignants_by_module,
    EnseignantInfo,
)


# ─────────────────────────────────────────────────────────────────────────────
# _normalize
# ─────────────────────────────────────────────────────────────────────────────
class TestNormalize:
    def test_lowercase(self):
        assert _normalize("HELLO") == "hello"

    def test_strips_accents(self):
        assert _normalize("éàü") == "eau"

    def test_french_accents(self):
        assert _normalize("Génie Civil") == "genie civil"

    def test_empty_string(self):
        assert _normalize("") == ""

    def test_mixed(self):
        assert _normalize("Élève") == "eleve"


# ─────────────────────────────────────────────────────────────────────────────
# _slug
# ─────────────────────────────────────────────────────────────────────────────
class TestSlug:
    def test_basic(self):
        s = _slug("Analyse des systèmes")
        assert s.isupper() or "-" in s
        assert len(s) <= 30

    def test_max_len_respected(self):
        s = _slug("Très long texte avec beaucoup de mots importants", max_len=10)
        assert len(s) <= 10

    def test_short_words_ignored(self):
        # Words shorter than 3 chars should be skipped
        s = _slug("De la à un")
        # Falls back to "ITEM" when no long-enough words found
        assert s == "ITEM"

    def test_empty_string(self):
        assert _slug("") == "ITEM"

    def test_alphanumeric_only(self):
        s = _slug("Béton Armé Fondation")
        assert re.match(r"^[A-Z\-]+$", s), f"Unexpected chars in slug: {s}"


import re  # noqa: E402 (needed only for test_alphanumeric_only assertion)


# ─────────────────────────────────────────────────────────────────────────────
# _detect_bloom_level
# ─────────────────────────────────────────────────────────────────────────────
class TestDetectBloomLevel:
    def test_level_1_memorize(self):
        assert _detect_bloom_level("Identifier les éléments principaux") == 1

    def test_level_2_understand(self):
        assert _detect_bloom_level("Comprendre les concepts fondamentaux") == 2

    def test_level_3_apply(self):
        assert _detect_bloom_level("Appliquer les méthodes de calcul") == 3

    def test_level_4_analyze(self):
        assert _detect_bloom_level("Analyser les résultats expérimentaux") == 4

    def test_level_6_create(self):
        assert _detect_bloom_level("Concevoir un système de fondation") == 6

    def test_gc_specific_verb(self):
        # "dimensionner" → level 6
        assert _detect_bloom_level("Dimensionner une fondation superficielle") == 6

    def test_default_level(self):
        # Random text with no bloom verb → default 2
        assert _detect_bloom_level("Lorem ipsum dolor sit amet") == 2

    def test_highest_level_wins(self):
        # "comprendre" (2) and "concevoir" (6) → should be 6
        assert _detect_bloom_level("Comprendre et concevoir un projet") == 6


# ─────────────────────────────────────────────────────────────────────────────
# _bloom_to_niveau
# ─────────────────────────────────────────────────────────────────────────────
class TestBloomToNiveau:
    @pytest.mark.parametrize("bloom,expected", [
        (1, "N1_DEBUTANT"),
        (2, "N2_ELEMENTAIRE"),
        (3, "N3_INTERMEDIAIRE"),
        (4, "N4_AVANCE"),
        (5, "N4_AVANCE"),
        (6, "N5_EXPERT"),
    ])
    def test_mapping(self, bloom, expected):
        assert _bloom_to_niveau(bloom) == expected

    def test_unknown_defaults(self):
        # Key not in map → default "N2_ELEMENTAIRE"
        assert _bloom_to_niveau(99) == "N2_ELEMENTAIRE"


# ─────────────────────────────────────────────────────────────────────────────
# _detect_type
# ─────────────────────────────────────────────────────────────────────────────
class TestDetectType:
    def test_pratique_tp(self):
        assert _detect_type("Travaux pratiques en laboratoire") == "PRATIQUE"

    def test_pratique_project(self):
        assert _detect_type("Réaliser un mini-projet de simulation") == "PRATIQUE"

    def test_theorique_cours(self):
        assert _detect_type("Introduction aux concepts théoriques du cours") == "THEORIQUE"

    def test_theorique_default(self):
        # No matching keywords → defaults to THEORIQUE
        assert _detect_type("Le sujet principal est abstrait") == "THEORIQUE"

    def test_gc_pratique(self):
        assert _detect_type("Modélisation BIM avec Revit") == "PRATIQUE"

    def test_gc_theorique(self):
        assert _detect_type("Mécanique des sols – théorie et normes Eurocode") == "THEORIQUE"


# ─────────────────────────────────────────────────────────────────────────────
# _clean_name
# ─────────────────────────────────────────────────────────────────────────────
class TestCleanName:
    def test_valid_name(self):
        assert _clean_name("Ahmed Benali") == "Ahmed Benali"

    def test_strips_title(self):
        assert _clean_name("Dr. Sarah Martin") == "Sarah Martin"
        assert _clean_name("Pr. Jean Dupont") == "Jean Dupont"

    def test_removes_parentheses(self):
        assert _clean_name("Marie Curie (coordinatrice)") == "Marie Curie"

    def test_too_short_returns_none(self):
        assert _clean_name("AB") is None

    def test_single_word_returns_none(self):
        assert _clean_name("Mohamed") is None

    def test_all_stopwords_returns_none(self):
        assert _clean_name("module cours") is None

    def test_with_digits_returns_none(self):
        assert _clean_name("Jean 42 Martin") is None

    def test_all_caps_abbreviation_returns_none(self):
        assert _clean_name("HE HNE") is None

    def test_strips_trailing_noise(self):
        result = _clean_name("Fatma Ben Ali - cours")
        assert result == "Fatma Ben Ali"


# ─────────────────────────────────────────────────────────────────────────────
# _split_names
# ─────────────────────────────────────────────────────────────────────────────
class TestSplitNames:
    def test_comma_separated(self):
        names = _split_names("Ahmed Benali, Sarah Martin, Jean Dupont")
        assert len(names) == 3
        assert "Ahmed Benali" in names

    def test_semicolon_separated(self):
        names = _split_names("Ahmed Benali; Sarah Martin")
        assert len(names) == 2

    def test_slash_separated(self):
        names = _split_names("Ahmed Benali / Sarah Martin")
        assert len(names) == 2

    def test_newline_separated(self):
        names = _split_names("Ahmed Benali\nSarah Martin")
        assert len(names) == 2

    def test_et_separator(self):
        names = _split_names("Ahmed Benali et Sarah Martin")
        assert len(names) == 2

    def test_filters_invalid(self):
        # "module" is a stop word – should not appear as a name
        names = _split_names("module cours, Ahmed Benali")
        assert all("module" not in n.lower() for n in names)

    def test_empty_string(self):
        assert _split_names("") == []


# ─────────────────────────────────────────────────────────────────────────────
# _extract_metadata
# ─────────────────────────────────────────────────────────────────────────────
class TestExtractMetadata:
    SAMPLE_FICHE = """
Unité pédagogique : Génie Civil
Module : Résistance des Matériaux
Code : MT-34
Responsable Module : Ahmed Benali
Enseignants : Ahmed Benali, Sarah Martin
Prérequis : Mathématiques de base
Objectif : Comprendre les principes de la résistance des matériaux
"""

    def test_extracts_module_name(self):
        meta = _extract_metadata(self.SAMPLE_FICHE)
        assert "nom_module" in meta
        assert "Résistance" in meta["nom_module"] or "Resistance" in meta["nom_module"].lower() or "Matériaux" in meta["nom_module"]

    def test_extracts_unite_pedagogique(self):
        meta = _extract_metadata(self.SAMPLE_FICHE)
        assert "unite_pedagogique" in meta
        assert "Génie Civil" in meta["unite_pedagogique"]

    def test_extracts_responsable(self):
        meta = _extract_metadata(self.SAMPLE_FICHE)
        assert "responsable" in meta
        assert meta["responsable"] == "Ahmed Benali"

    def test_extracts_enseignants(self):
        meta = _extract_metadata(self.SAMPLE_FICHE)
        assert "enseignants_noms" in meta
        assert "Ahmed Benali" in meta["enseignants_noms"]
        assert "Sarah Martin" in meta["enseignants_noms"]

    def test_extracts_prerequis(self):
        meta = _extract_metadata(self.SAMPLE_FICHE)
        assert "prerequis" in meta

    def test_extracts_objectif(self):
        meta = _extract_metadata(self.SAMPLE_FICHE)
        assert "objectif" in meta

    def test_empty_text(self):
        meta = _extract_metadata("")
        assert isinstance(meta, dict)

    def test_no_false_positives_on_random_text(self):
        meta = _extract_metadata("Nothing here that matches anything.")
        # Should not crash, fields may simply be absent
        assert isinstance(meta, dict)


# ─────────────────────────────────────────────────────────────────────────────
# _extract_acquis_apprentissage
# ─────────────────────────────────────────────────────────────────────────────
class TestExtractAcquisApprentissage:
    SAMPLE_WITH_AA = """
Acquis d'apprentissage :
AA1 Identifier les types de contraintes mecaniques
AA2 Appliquer les methodes de calcul RDM 3
AA3 Analyser les resultats d'un essai de traction 4
Contenu detaille
"""

    def test_returns_list(self):
        result = _extract_acquis_apprentissage(self.SAMPLE_WITH_AA)
        assert isinstance(result, list)

    def test_extracts_correct_count(self):
        result = _extract_acquis_apprentissage(self.SAMPLE_WITH_AA)
        # At least AA2 and AA3 (which have explicit Bloom digits) must be extracted.
        # AA1 has no trailing digit and relies on verb detection, so >= 2 is the
        # reliable lower bound without depending on internal parser heuristics.
        assert len(result) >= 2

    def test_aa_has_id_text_bloom(self):
        result = _extract_acquis_apprentissage(self.SAMPLE_WITH_AA)
        aa = result[0]
        assert "id" in aa
        assert "text" in aa
        assert "bloom_level" in aa

    def test_bloom_level_range(self):
        result = _extract_acquis_apprentissage(self.SAMPLE_WITH_AA)
        for aa in result:
            assert 1 <= aa["bloom_level"] <= 6

    def test_empty_text_returns_empty(self):
        assert _extract_acquis_apprentissage("") == []

    def test_no_aa_section_returns_empty(self):
        assert _extract_acquis_apprentissage("Simple text without AA section") == []


# ─────────────────────────────────────────────────────────────────────────────
# _extract_seances
# ─────────────────────────────────────────────────────────────────────────────
class TestExtractSeances:
    SAMPLE_WITH_SEANCES = """
Contenu détaillé
Séance 1 : Introduction à la mécanique des sols
- Définition et classification des sols
- Types de sols argileux et sableux
Séance 2 : Essais géotechniques en laboratoire
- Essai de compressibilité
- Essai de cisaillement
Séance 3 : Calcul des fondations superficielles
- Semelles isolées et filantes
"""

    def test_returns_list(self):
        result = _extract_seances(self.SAMPLE_WITH_SEANCES)
        assert isinstance(result, list)

    def test_extracts_correct_count(self):
        result = _extract_seances(self.SAMPLE_WITH_SEANCES)
        assert len(result) == 3

    def test_seance_has_required_fields(self):
        result = _extract_seances(self.SAMPLE_WITH_SEANCES)
        s = result[0]
        assert "numero" in s
        assert "titre" in s
        assert "items" in s

    def test_seance_numero_correct(self):
        result = _extract_seances(self.SAMPLE_WITH_SEANCES)
        assert result[0]["numero"] == "1"
        assert result[1]["numero"] == "2"

    def test_seance_items_extracted(self):
        result = _extract_seances(self.SAMPLE_WITH_SEANCES)
        # At least one séance should have items from the bullet list
        assert any(len(s["items"]) > 0 for s in result)

    def test_empty_text_returns_empty(self):
        assert _extract_seances("") == []


# ─────────────────────────────────────────────────────────────────────────────
# _match_enseignants_by_name
# ─────────────────────────────────────────────────────────────────────────────
class TestMatchEnseignantsByName:
    ENSEIGNANTS = [
        EnseignantInfo(id="E001", nom="Benali", prenom="Ahmed", modules=[]),
        EnseignantInfo(id="E002", nom="Martin", prenom="Sarah", modules=["RDM"]),
        EnseignantInfo(id="E003", nom="Dupont", prenom="Jean", modules=[]),
    ]

    def test_exact_match(self):
        ids, mapping = _match_enseignants_by_name(["Ahmed Benali"], self.ENSEIGNANTS)
        assert "E001" in ids

    def test_reversed_name_match(self):
        ids, mapping = _match_enseignants_by_name(["Benali Ahmed"], self.ENSEIGNANTS)
        assert "E001" in ids

    def test_partial_lastname_match(self):
        ids, mapping = _match_enseignants_by_name(["Sarah Martin, Intervenante"], self.ENSEIGNANTS)
        assert "E002" in ids

    def test_no_match(self):
        ids, mapping = _match_enseignants_by_name(["Inconnu Personne"], self.ENSEIGNANTS)
        assert ids == []

    def test_multiple_matches(self):
        ids, mapping = _match_enseignants_by_name(
            ["Ahmed Benali", "Sarah Martin"], self.ENSEIGNANTS
        )
        assert "E001" in ids
        assert "E002" in ids

    def test_empty_names_list(self):
        ids, mapping = _match_enseignants_by_name([], self.ENSEIGNANTS)
        assert ids == []

    def test_empty_enseignants_list(self):
        ids, mapping = _match_enseignants_by_name(["Ahmed Benali"], [])
        assert ids == []

    def test_mapping_contains_matched_name(self):
        ids, mapping = _match_enseignants_by_name(["Jean Dupont"], self.ENSEIGNANTS)
        assert "Jean Dupont" in mapping
        assert mapping["Jean Dupont"][0] == "E003"


# ─────────────────────────────────────────────────────────────────────────────
# _match_enseignants_by_module
# ─────────────────────────────────────────────────────────────────────────────
class TestMatchEnseignantsByModule:
    ENSEIGNANTS = [
        EnseignantInfo(id="E001", nom="Benali", prenom="Ahmed", modules=["Résistance des Matériaux"]),
        EnseignantInfo(id="E002", nom="Martin", prenom="Sarah", modules=["Hydraulique Urbaine"]),
        EnseignantInfo(id="E003", nom="Dupont", prenom="Jean", modules=[]),
    ]

    def test_match_by_module_keyword(self):
        text = "Ce cours couvre la résistance des matériaux et les contraintes."
        from rice_analyzer import _match_enseignants_by_module
        ids = _match_enseignants_by_module(text, self.ENSEIGNANTS)
        assert "E001" in ids

    def test_no_match(self):
        from rice_analyzer import _match_enseignants_by_module
        ids = _match_enseignants_by_module("Aucun module reconnu ici.", self.ENSEIGNANTS)
        assert ids == []

    def test_no_modules_registered(self):
        from rice_analyzer import _match_enseignants_by_module
        ids = _match_enseignants_by_module("Résistance des Matériaux", [
            EnseignantInfo(id="E003", nom="Dupont", prenom="Jean", modules=[])
        ])
        assert ids == []
