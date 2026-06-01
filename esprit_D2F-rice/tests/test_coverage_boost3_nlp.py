"""Coverage boost part 3: NLP module tests."""

from __future__ import annotations

import os
import sys
from unittest.mock import MagicMock, patch

import pytest

sys.path.insert(0, os.path.dirname(os.path.dirname(__file__)))

os.environ.setdefault("DB_NAME", "test")
os.environ.setdefault("DB_USER", "test")
os.environ.setdefault("DB_PASS", "test")
os.environ.setdefault("DB_HOST", "localhost")
os.environ.setdefault("DB_PORT", "5432")

import rice.nlp as nlp


# ======================================================================
# NLP text utilities
# ======================================================================


class TestNormalize:
    def test_strips_accents(self):
        assert nlp._normalize("Beton Arme") == "beton arme"

    def test_lowercases(self):
        assert nlp._normalize("HELLO World") == "hello world"

    def test_empty_string(self):
        assert nlp._normalize("") == ""


class TestSlug:
    def test_basic_slug(self):
        result = nlp._slug("Beton Arme Avance")
        assert isinstance(result, str)
        assert len(result) > 0

    def test_no_words(self):
        result = nlp._slug("123 456")
        assert result == "ITEM"


class TestBuildDomainName:
    def test_basic_filename(self):
        result = nlp._build_domain_name_from_file("fiche_module_gc.pdf")
        assert isinstance(result, str)
        assert len(result) > 0

    def test_plain_filename(self):
        result = nlp._build_domain_name_from_file("my_module.pdf")
        assert "My" in result or "Module" in result


class TestNormalizeRefCode:
    def test_with_prefix(self):
        assert nlp._normalize_ref_code("GC-01-S2a") == "S2a"

    def test_without_prefix(self):
        assert nlp._normalize_ref_code("S2a") == "S2a"

    def test_info_prefix(self):
        assert nlp._normalize_ref_code("INFO-A1") == "A1"


class TestCodesMatch:
    def test_exact_match(self):
        assert nlp._codes_match("S2a", "S2a") is True

    def test_prefix_match(self):
        assert nlp._codes_match("GC-01-S2a", "S2a") is True

    def test_reverse_prefix_match(self):
        assert nlp._codes_match("S2a", "GC-01-S2a") is True

    def test_no_match(self):
        assert nlp._codes_match("S3b", "S2a") is False


class TestSecureFilename:
    def test_strips_path(self):
        result = nlp._secure_filename("../../../etc/passwd")
        assert "passwd" in result
        assert ".." not in result

    def test_stips_null_bytes(self):
        result = nlp._secure_filename("file\x00name.pdf")
        assert "\x00" not in result

    def test_empty_returns_default(self):
        result = nlp._secure_filename("")
        assert result == "unnamed_file"

    def test_normal_filename(self):
        result = nlp._secure_filename("module_gc.pdf")
        assert result == "module_gc.pdf"


# ======================================================================
# Bloom taxonomy
# ======================================================================


class TestDetectBloomLevel:
    def test_level_6_creer(self):
        assert nlp._detect_bloom_level("concevoir un systeme") == 6

    def test_level_5_evaluer(self):
        assert nlp._detect_bloom_level("evaluer les resultats") == 5

    def test_level_4_analyser(self):
        assert nlp._detect_bloom_level("analyser les donnees") == 4

    def test_level_3_appliquer(self):
        assert nlp._detect_bloom_level("appliquer la methode") == 3

    def test_level_2_comprendre(self):
        assert nlp._detect_bloom_level("comprendre le concept") == 2

    def test_level_1_identifier(self):
        assert nlp._detect_bloom_level("identifier les elements") == 1

    def test_default_level_2(self):
        assert nlp._detect_bloom_level("some random text") == 2


class TestBloomToNiveau:
    def test_level_1(self):
        assert nlp._bloom_to_niveau(1) == "N1_DEBUTANT"

    def test_level_2(self):
        assert nlp._bloom_to_niveau(2) == "N2_ELEMENTAIRE"

    def test_level_3(self):
        assert nlp._bloom_to_niveau(3) == "N3_INTERMEDIAIRE"

    def test_level_4(self):
        assert nlp._bloom_to_niveau(4) == "N4_AVANCE"

    def test_level_5(self):
        assert nlp._bloom_to_niveau(5) == "N4_AVANCE"

    def test_level_6(self):
        assert nlp._bloom_to_niveau(6) == "N5_EXPERT"

    def test_unknown(self):
        assert nlp._bloom_to_niveau(99) == "N2_ELEMENTAIRE"


# ======================================================================
# Type detection
# ======================================================================


class TestDetectType:
    def test_detect_type_pratique(self):
        result = nlp._detect_type("TP travaux pratiques manipulation")
        assert result == "PRATIQUE"

    def test_detect_type_theorique(self):
        result = nlp._detect_type("cours theorie concept principe")
        assert result == "THEORIQUE"

    def test_detect_type_default_theorique(self):
        result = nlp._detect_type("some neutral text")
        assert result == "THEORIQUE"


class TestUniversalPatterns:
    def test_score_info_dept(self):
        prat, theo = nlp._UniversalPatterns.score("deployer image build docker", "info")
        assert prat > 0

    def test_score_gc_dept(self):
        prat, theo = nlp._UniversalPatterns.score("chantier beton fondation", "gc")
        assert prat > 0

    def test_score_unknown_dept(self):
        prat, theo = nlp._UniversalPatterns.score("some text", "unknown")
        assert isinstance(prat, int)
        assert isinstance(theo, int)


# ======================================================================
# Table serialization
# ======================================================================


class TestSerializeTableHeader:
    def test_basic_header(self):
        header = ["Name", "Value"]
        data_rows = [["key1", "val1"]]
        lines = []
        nlp._serialize_table_header(header, data_rows, lines)
        assert len(lines) == 1
        assert "Name: key1" in lines[0]

    def test_empty_data(self):
        lines = []
        nlp._serialize_table_header(["Col1"], [], lines)
        assert lines == []


class TestSerializeTableKV:
    def test_two_columns(self):
        table = [["key1", "val1"]]
        lines = []
        nlp._serialize_table_kv(table, lines)
        assert "key1: val1" in lines

    def test_more_than_two_columns(self):
        table = [["a", "b", "c", "d"]]
        lines = []
        nlp._serialize_table_kv(table, lines)
        assert " | " in lines[0]

    def test_empty_row(self):
        table = [[]]
        lines = []
        nlp._serialize_table_kv(table, lines)
        assert lines == []


class TestClassifyTable:
    def test_header_and_data(self):
        table = [["Name", "Value"], ["key1", "val1"]]
        header, data_rows, has_header = nlp._classify_table(table)
        assert has_header is True
        assert header == ["Name", "Value"]

    def test_no_header(self):
        table = [["key1", "val1"], ["key2", "val2"]]
        # With only 2 rows, first row with >1 non-empty cell is treated as header
        header, data_rows, has_header = nlp._classify_table(table)
        assert isinstance(has_header, bool)

    def test_empty_table(self):
        table = []
        header, data_rows, has_header = nlp._classify_table(table)
        assert has_header is False


class TestSerializePdfTables:
    def test_with_header_table(self):
        tables = [[["Name", "Value"], ["key1", "val1"]]]
        result = nlp._serialize_pdf_tables(tables)
        assert "Name" in result

    def test_with_kv_table(self):
        tables = [[["key1", "val1"]]]
        result = nlp._serialize_pdf_tables(tables)
        assert "key1" in result

    def test_empty_tables(self):
        result = nlp._serialize_pdf_tables([])
        assert result == ""

    def test_none_table(self):
        result = nlp._serialize_pdf_tables([None])
        assert result == ""


# ======================================================================
# Text extraction
# ======================================================================


class TestExtractText:
    def test_plain_text_file(self):
        text, tables = nlp._extract_text("test.txt", b"hello world")
        assert "hello world" in text
        assert tables == []

    def test_pdf_not_installed(self, monkeypatch):
        monkeypatch.setattr(nlp, "_PDF_OK", False)
        from fastapi import HTTPException
        with pytest.raises(HTTPException):
            nlp._extract_text("test.pdf", b"fake pdf data")

    def test_docx_not_installed(self, monkeypatch):
        monkeypatch.setattr(nlp, "_DOCX_OK", False)
        from fastapi import HTTPException
        with pytest.raises(HTTPException):
            nlp._extract_text("test.docx", b"fake docx data")


# ======================================================================
# NLP metadata extraction helpers
# ======================================================================


class TestExtractMetadata:
    def test_empty_text(self):
        meta = nlp._extract_metadata("")
        assert isinstance(meta, dict)

    def test_with_responsable(self):
        meta = nlp._extract_metadata("Responsable: Ahmed Benali")
        assert meta.get("responsable") == "Ahmed Benali"

    def test_with_module_name(self):
        meta = nlp._extract_metadata("Module: Genie Civil")
        assert isinstance(meta, dict)


class TestExtractRegexNomModule:
    def test_match(self):
        result = nlp._extract_regex_nom_module("Nom du module: Beton Arme")
        assert result is not None

    def test_no_match(self):
        result = nlp._extract_regex_nom_module("random text")
        assert result is None


class TestExtractRegexUnitePedagogique:
    def test_match(self):
        result = nlp._extract_regex_unite_pedagogique("Unite pedagogique: UP-GL")
        assert result == "UP-GL"

    def test_no_match(self):
        result = nlp._extract_regex_unite_pedagogique("random text")
        assert result is None


class TestIsAaSkip:
    def test_empty(self):
        assert nlp._is_aa_skip("") is True

    def test_acquis(self):
        assert nlp._is_aa_skip("AA Acquis") is True

    def test_niveau(self):
        assert nlp._is_aa_skip("Niveau 1") is True

    def test_valid_line(self):
        assert nlp._is_aa_skip("AA1 Understand calculus 3") is False


class TestIsValidEnseignantValue:
    def test_empty(self):
        assert nlp._is_valid_enseignant_value("") is False

    def test_whitespace(self):
        assert nlp._is_valid_enseignant_value("   ") is False

    def test_no_uppercase(self):
        assert nlp._is_valid_enseignant_value("abc") is False

    def test_valid_name(self):
        assert nlp._is_valid_enseignant_value("Ahmed Benali") is True

    def test_module_prefix(self):
        assert nlp._is_valid_enseignant_value("module: test") is False


class TestDeduplicateNames:
    def test_dedup(self):
        m = {"enseignants_noms": ["Ahmed Benali", "ahmed benali", ""]}
        nlp._deduplicate_names(m)
        assert len(m["enseignants_noms"]) == 1

    def test_no_key(self):
        m = {}
        nlp._deduplicate_names(m)
        assert "enseignants_noms" not in m


class TestMergePatternEnseignants:
    def test_no_match(self):
        m = {}
        nlp._merge_pattern_enseignants("random text", m)
        assert "enseignants_noms" not in m

    def test_with_match(self):
        m = {}
        nlp._merge_pattern_enseignants("Intervenant: Ahmed Benali", m)
        assert "Ahmed Benali" in m.get("enseignants_noms", [])


class TestHandleTableResponsable:
    def test_sets_responsable(self):
        m = {}
        nlp._handle_table_responsable("Ahmed Benali", m)
        assert m["responsable"] == "Ahmed Benali"


class TestHandleTableCoordinateur:
    def test_sets_coordinateur(self):
        m = {}
        nlp._handle_table_coordinateur("Sarah Martin", m)
        assert m["coordinateur"] == "Sarah Martin"
        assert "Sarah Martin" in m["enseignants_noms"]


class TestEnsureResponsablePresence:
    def test_noop_when_no_responsable(self):
        m = {}
        nlp._ensure_responsable_presence(m)
        assert "enseignants_noms" not in m

    def test_adds_responsable_to_names(self):
        m = {"responsable": "Ahmed Benali"}
        nlp._ensure_responsable_presence(m)
        assert "Ahmed Benali" in m.get("enseignants_noms", [])


class TestGetCellValue:
    def test_right_cell(self):
        row = ["label", "value"]
        table = [["a", "b"], row]
        result = nlp._get_cell_value(row, table, 0, 0)
        assert result == "value"

    def test_fallback_next_row(self):
        row = ["only"]
        table = [["fallback"], row]
        result = nlp._get_cell_value(row, table, 0, 0)
        assert result == "fallback"
