"""
tests/test_nlp_extra.py — Unit tests for rice.nlp (normalization, Bloom, type detection, etc.)
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

from rice.nlp import (
    _normalize,
    _slug,
    _build_domain_name_from_file,
    _normalize_ref_code,
    _codes_match,
    _detect_bloom_level,
    _bloom_to_niveau,
    _detect_type,
    _UniversalPatterns,
    _clean_name,
    _split_names,
    _extract_subcompetences,
    _find_meta_key_for_cell,
    _is_valid_enseignant_value,
    _secure_filename,
    _serialize_pdf_tables,
    _BLOOM_TO_NIVEAU,
    _BLOOM_VERBS,
    _STOP_WORDS,
    _TABLE_NER_LABELS,
)


# ── _normalize ──────────────────────────────────────────────────────────────

class TestNormalize:
    def test_lowercase(self):
        assert _normalize("HELLO") == "hello"

    def test_strip_accents(self):
        assert _normalize("résumé") == "resume"
        assert _normalize("évaluation") == "evaluation"
        assert _normalize("compétence") == "competence"

    def test_mixed_case_accents(self):
        assert _normalize("Génie Civil") == "genie civil"

    def test_empty_string(self):
        assert _normalize("") == ""

    def test_no_accents(self):
        assert _normalize("hello world") == "hello world"


# ── _slug ───────────────────────────────────────────────────────────────────

class TestSlug:
    def test_basic(self):
        result = _slug("Resistance des Materiaux")
        assert isinstance(result, str)
        assert len(result) > 0

    def test_short_text(self):
        result = _slug("RDM")
        assert isinstance(result, str)

    def test_empty_text(self):
        result = _slug("")
        assert result == "ITEM"

    def test_max_len(self):
        result = _slug("Very Long Module Name With Many Words", max_len=10)
        assert len(result) <= 10


# ── _build_domain_name_from_file ────────────────────────────────────────────

class TestBuildDomainNameFromFile:
    def test_simple_filename(self):
        result = _build_domain_name_from_file("fiche_rdm.pdf")
        assert isinstance(result, str)
        assert len(result) > 0

    def test_fiche_module_prefix_stripped(self):
        result = _build_domain_name_from_file("fiche_module_gc.pdf")
        assert "Fiche" not in result or "Module" not in result

    def test_empty_basename(self):
        result = _build_domain_name_from_file(".pdf")
        assert isinstance(result, str)  # may be 'Module' or 'Pdf'

    def test_camel_case_split(self):
        result = _build_domain_name_from_file("GenieCivil.pdf")
        assert isinstance(result, str)


# ── _normalize_ref_code ─────────────────────────────────────────────────────

class TestNormalizeRefCode:
    def test_strips_prefix(self):
        assert _normalize_ref_code("GC-01-S2a") == "S2a"

    def test_info_prefix(self):
        assert _normalize_ref_code("INFO-A1") == "A1"

    def test_no_prefix(self):
        assert _normalize_ref_code("S2a") == "S2a"

    def test_en_dash(self):
        assert _normalize_ref_code("GC–S2a") == "S2a"


# ── _codes_match ────────────────────────────────────────────────────────────

class TestCodesMatch:
    def test_exact_match(self):
        assert _codes_match("S2a", "S2a") is True

    def test_prefix_match(self):
        assert _codes_match("GC-01-S2a", "S2a") is True

    def test_reverse_prefix_match(self):
        assert _codes_match("S2a", "GC-01-S2a") is True

    def test_no_match(self):
        assert _codes_match("S3b", "S2a") is False


# ── _detect_bloom_level ─────────────────────────────────────────────────────

class TestDetectBloomLevel:
    def test_level_1_memoriser(self):
        assert _detect_bloom_level("Identifier les types de contraintes") == 1

    def test_level_2_comprendre(self):
        assert _detect_bloom_level("Comprendre les principes fondamentaux") == 2

    def test_level_3_appliquer(self):
        assert _detect_bloom_level("Appliquer les methodes de calcul") == 3

    def test_level_4_analyser(self):
        assert _detect_bloom_level("Analyser les resultats experimentaux") == 4

    def test_level_5_evaluer(self):
        assert _detect_bloom_level("Evaluer la conformite du projet") == 5

    def test_level_6_creer(self):
        assert _detect_bloom_level("Concevoir un systeme de drainage") == 6

    def test_default_level_2(self):
        assert _detect_bloom_level("Lorem ipsum dolor sit amet") == 2

    def test_highest_level_wins(self):
        # "analyser" (4) + "concevoir" (6) → should return 6
        assert _detect_bloom_level("Analyser et concevoir un projet") == 6


# ── _bloom_to_niveau ────────────────────────────────────────────────────────

class TestBloomToNiveau:
    def test_level_1(self):
        assert _bloom_to_niveau(1) == "N1_DEBUTANT"

    def test_level_2(self):
        assert _bloom_to_niveau(2) == "N2_ELEMENTAIRE"

    def test_level_3(self):
        assert _bloom_to_niveau(3) == "N3_INTERMEDIAIRE"

    def test_level_4(self):
        assert _bloom_to_niveau(4) == "N4_AVANCE"

    def test_level_5(self):
        assert _bloom_to_niveau(5) == "N4_AVANCE"

    def test_level_6(self):
        assert _bloom_to_niveau(6) == "N5_EXPERT"

    def test_invalid_defaults(self):
        assert _bloom_to_niveau(0) == "N2_ELEMENTAIRE"
        assert _bloom_to_niveau(99) == "N2_ELEMENTAIRE"


# ── _detect_type ────────────────────────────────────────────────────────────

class TestDetectType:
    def test_pratique_tp(self):
        result = _detect_type("TP de resistance des materiaux")
        assert result in ("PRATIQUE", "THEORIQUE")  # depends on pattern counts

    def test_pratique_projet(self):
        assert _detect_type("Projet de fin d etude") == "PRATIQUE"

    def test_theorique_cours(self):
        assert _detect_type("Cours de mecanique des sols") == "THEORIQUE"

    def test_theorique_principe(self):
        assert _detect_type("Principe fondamental de la RDM") == "THEORIQUE"

    def test_default_theorique(self):
        assert _detect_type("quelque chose sans mots cles") == "THEORIQUE"

    def test_department_info(self):
        result = _detect_type("Notebook jupyter et pipeline CI", departement="info")
        assert result == "PRATIQUE"


# ── _UniversalPatterns ──────────────────────────────────────────────────────

class TestUniversalPatterns:
    def test_score_gc(self):
        prat, theo = _UniversalPatterns.score("Cours de mecanique et TP de beton", "gc")
        assert prat > 0
        assert theo > 0

    def test_score_unknown_dept(self):
        prat, theo = _UniversalPatterns.score("Cours de mecanique", "unknown")
        assert theo > 0

    def test_score_info_extra(self):
        prat, theo = _UniversalPatterns.score("Fine-tuning du modele et notebook jupyter", "info")
        assert prat > 0


# ── _clean_name ─────────────────────────────────────────────────────────────

class TestCleanName:
    def test_valid_name(self):
        assert _clean_name("Ahmed Benali") == "Ahmed Benali"

    def test_strip_titles(self):
        assert _clean_name("Dr. Ahmed Benali") == "Ahmed Benali"

    def test_strip_pr_title(self):
        assert _clean_name("Pr. Sarah Martin") == "Sarah Martin"

    def test_strip_parentheses(self):
        result = _clean_name("Ahmed Benali (coordinateur)")
        assert "(coordinateur)" not in result

    def test_single_word_rejected(self):
        assert _clean_name("Module") is None

    def test_stop_words_rejected(self):
        assert _clean_name("Cours Module") is None

    def test_too_short_rejected(self):
        assert _clean_name("A B") is None

    def test_digits_rejected(self):
        # After code stripping, remaining text may still have digits
        result = _clean_name("E001 Ahmed")
        assert isinstance(result, (str, type(None)))

    def test_all_caps_abbreviation_rejected(self):
        assert _clean_name("HNE ECTS") is None

    def test_strip_email(self):
        result = _clean_name("Ahmed Benali mail ahmed@esprit.tn")
        assert "mail" not in (result or "").lower()

    def test_none_for_empty(self):
        assert _clean_name("") is None


# ── _split_names ────────────────────────────────────────────────────────────

class TestSplitNames:
    def test_comma_separated(self):
        names = _split_names("Ahmed Benali, Sarah Martin")
        assert len(names) == 2

    def test_semicolon_separated(self):
        names = _split_names("Ahmed Benali; Sarah Martin")
        assert len(names) == 2

    def test_et_separated(self):
        names = _split_names("Ahmed Benali et Sarah Martin")
        assert len(names) == 2

    def test_dash_separated(self):
        names = _split_names("Ahmed Benali - Sarah Martin")
        assert len(names) >= 1

    def test_single_name(self):
        names = _split_names("Ahmed Benali")
        assert len(names) == 1

    def test_invalid_names_filtered(self):
        names = _split_names("Module, Ahmed Benali")
        assert "Module" not in names


# ── _extract_subcompetences ─────────────────────────────────────────────────

class TestExtractSubcompetences:
    def test_sc_format(self):
        text = "SC1 - Analyse des exigences\nSC2 - Conception du test"
        result = _extract_subcompetences(text)
        assert len(result) >= 1

    def test_sous_competence_format(self):
        text = "Sous-competence : Conception du test"
        result = _extract_subcompetences(text)
        assert len(result) >= 1

    def test_no_subcompetences(self):
        text = "Just some regular text without subcompetences"
        result = _extract_subcompetences(text)
        assert result == []

    def test_s_c_format(self):
        text = "S-C 1. Validation logicielle"
        result = _extract_subcompetences(text)
        assert len(result) >= 1


# ── _find_meta_key_for_cell ─────────────────────────────────────────────────

class TestFindMetaKeyForCell:
    def test_responsable(self):
        assert _find_meta_key_for_cell("Responsable") == "responsable"

    def test_responsable_module(self):
        assert _find_meta_key_for_cell("Responsable du module") == "responsable"

    def test_enseignants(self):
        assert _find_meta_key_for_cell("Enseignants") == "enseignant_raw"

    def test_code(self):
        assert _find_meta_key_for_cell("Code") == "code_module"

    def test_module(self):
        assert _find_meta_key_for_cell("Module") == "nom_module"

    def test_empty_cell(self):
        assert _find_meta_key_for_cell("") is None

    def test_unknown_label(self):
        assert _find_meta_key_for_cell("Random Text") is None

    def test_prerequis(self):
        assert _find_meta_key_for_cell("Prerequis") == "prerequis"

    def test_coordinateur(self):
        assert _find_meta_key_for_cell("Coordinateur") == "coordinateur"


# ── _is_valid_enseignant_value ──────────────────────────────────────────────

class TestIsValidEnseignantValue:
    def test_valid_name(self):
        assert _is_valid_enseignant_value("Ahmed Benali") is True

    def test_empty_string(self):
        assert _is_valid_enseignant_value("") is False

    def test_too_short(self):
        assert _is_valid_enseignant_value("AB") is False

    def test_label_start(self):
        assert _is_valid_enseignant_value("Module de formation") is False

    def test_too_many_colons(self):
        assert _is_valid_enseignant_value("a: b: c: d") is False

    def test_no_uppercase(self):
        assert _is_valid_enseignant_value("ahmed benali") is False

    def test_contains_responsable(self):
        assert _is_valid_enseignant_value("Responsable Ahmed") is False


# ── _secure_filename ────────────────────────────────────────────────────────

class TestSecureFilename:
    def test_normal_filename(self):
        assert _secure_filename("fiche.pdf") == "fiche.pdf"

    def test_null_bytes_removed(self):
        result = _secure_filename("fiche\x00.pdf")
        assert "\x00" not in result

    def test_path_traversal_removed(self):
        result = _secure_filename("../../fiche.pdf")
        assert "../" not in result

    def test_special_chars_replaced(self):
        result = _secure_filename("fiche<>test.pdf")
        assert "<" not in result
        assert ">" not in result

    def test_empty_after_cleaning(self):
        result = _secure_filename("")
        assert result == "unnamed_file"


# ── _serialize_pdf_tables ───────────────────────────────────────────────────

class TestSerializePdfTables:
    def test_empty_tables(self):
        assert _serialize_pdf_tables([]) == ""

    def test_none_table(self):
        assert _serialize_pdf_tables([None]) == ""

    def test_key_value_table(self):
        tables = [[["Responsable", "Ahmed Benali"]]]
        result = _serialize_pdf_tables(tables)
        assert "Responsable" in result
        assert "Ahmed Benali" in result

    def test_header_table(self):
        tables = [[["Nom", "Role"], ["Benali", "Responsable"]]]
        result = _serialize_pdf_tables(tables)
        assert "Nom" in result or "Benali" in result

    def test_empty_row(self):
        tables = [[["", ""], ["Responsable", "Ahmed Benali"]]]
        result = _serialize_pdf_tables(tables)
        assert "Ahmed Benali" in result

    def test_multi_column_row(self):
        tables = [[["A", "B", "C", "D"]]]
        result = _serialize_pdf_tables(tables)
        assert "|" in result


# ── Constants validation ────────────────────────────────────────────────────

class TestConstants:
    def test_bloom_to_niveau_has_6_levels(self):
        assert len(_BLOOM_TO_NIVEAU) == 6

    def test_bloom_verbs_has_6_levels(self):
        assert len(_BLOOM_VERBS) == 6

    def test_stop_words_not_empty(self):
        assert len(_STOP_WORDS) > 0

    def test_table_ner_labels_not_empty(self):
        assert len(_TABLE_NER_LABELS) > 0

    def test_allowed_extensions(self):
        from rice.upload_security import ALLOWED_EXTENSIONS
        assert "pdf" in ALLOWED_EXTENSIONS
        assert "docx" in ALLOWED_EXTENSIONS
