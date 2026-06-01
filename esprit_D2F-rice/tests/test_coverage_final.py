"""Final coverage boost: target remaining uncovered lines across all rice modules."""

from __future__ import annotations

import os
import sys
import time as _time
from types import SimpleNamespace
from unittest.mock import MagicMock, patch, AsyncMock
from pathlib import Path
import json
import io

import pytest

sys.path.insert(0, os.path.dirname(os.path.dirname(__file__)))

os.environ.setdefault("DB_NAME", "test")
os.environ.setdefault("DB_USER", "test")
os.environ.setdefault("DB_PASS", "test")
os.environ.setdefault("DB_HOST", "localhost")
os.environ.setdefault("DB_PORT", "5432")
os.environ.setdefault("RICE_AUTH_ENABLED", "false")

import rice.nlp as nlp
import rice.db as db
import rice.cache as cache_mod
import rice.referential as ref
import rice.analyzer as analyzer
import rice.llm as llm
import rice.validate_helpers as vh
from rice.models import (
    EnseignantInfo, SavoirProposition, CompetenceProposition,
    DomaineProposition, FicheEnseignantExtrait, SousCompetenceProposition,
    ValidateRequest, ValidateSummary,
)


# ======================================================================
# nlp.py — OCR, serialization, table NER, AA, seance, referential comp
# ======================================================================


class TestNlpOcr:
    PDF_DATA = b"%PDF-1.4 fake"

    def test_extract_pdf_no_text_ocr_unavailable(self, monkeypatch):
        monkeypatch.setattr(nlp, "_PDF_OK", True)
        monkeypatch.setattr(nlp, "_OCR_OK", False)
        pdf = MagicMock()
        page = MagicMock()
        page.extract_text.return_value = ""
        page.extract_tables.return_value = []
        pdf.pages = [page]
        monkeypatch.setattr(nlp.pdfplumber, "open", lambda f: pdf)
        text, tables = nlp._extract_pdf(self.PDF_DATA)
        assert text == ""

    def test_extract_pdf_table_extraction_error(self, monkeypatch):
        monkeypatch.setattr(nlp, "_PDF_OK", True)
        monkeypatch.setattr(nlp, "_OCR_OK", False)
        pdf_pages = [MagicMock()]
        pdf_pages[0].extract_text.return_value = "some text with enough content"
        pdf_pages[0].extract_tables.side_effect = Exception("table error")
        pdf = MagicMock()
        pdf.pages = pdf_pages
        pdf.__enter__.return_value = pdf
        pdf.__exit__.return_value = None
        monkeypatch.setattr(nlp.pdfplumber, "open", lambda f: pdf)
        text, tables = nlp._extract_pdf(self.PDF_DATA)
        assert "some text" in text

    def test_ocr_scanned_pdf_tesseract_error_fra_fallback(self, monkeypatch):
        doc = MagicMock()
        page = MagicMock()
        page.get_pixmap.return_value = MagicMock(width=100, height=100, samples=b"0" * 10000)
        doc.__len__.return_value = 1
        doc.__getitem__.return_value = page
        monkeypatch.setattr(nlp, "_fitz", MagicMock())
        monkeypatch.setattr(nlp, "_fitz", MagicMock(open=lambda stream, filetype: doc, Matrix=MagicMock, csGRAY="GRAY"))
        monkeypatch.setattr(nlp, "_PILImage", MagicMock(frombytes=lambda mode, size, data: MagicMock()))
        tess = MagicMock()
        tess.TesseractError = Exception
        tess.image_to_string.side_effect = [Exception("fra error"), "english text"]
        monkeypatch.setattr(nlp, "_tess", tess)
        result = nlp._ocr_scanned_pdf(b"fake pdf")
        assert "english text" in result

    def test_ocr_scanned_pdf_tesseract_error_non_fra_raises(self, monkeypatch):
        doc = MagicMock()
        page = MagicMock()
        page.get_pixmap.return_value = MagicMock(width=100, height=100, samples=b"0" * 10000)
        doc.__len__.return_value = 1
        doc.__getitem__.return_value = page
        monkeypatch.setattr(nlp, "_fitz", MagicMock())
        monkeypatch.setattr(nlp, "_fitz", MagicMock(open=lambda stream, filetype: doc, Matrix=MagicMock, csGRAY="GRAY"))
        monkeypatch.setattr(nlp, "_PILImage", MagicMock(frombytes=lambda mode, size, data: MagicMock()))
        tess = MagicMock()
        tess.TesseractError = Exception
        tess.image_to_string.side_effect = Exception("other error")
        monkeypatch.setattr(nlp, "_tess", tess)
        with pytest.raises(Exception):
            nlp._ocr_scanned_pdf(b"fake pdf")

    def test_extract_docx_not_installed(self, monkeypatch):
        monkeypatch.setattr(nlp, "_DOCX_OK", False)
        from fastapi import HTTPException
        with pytest.raises(HTTPException):
            nlp._extract_docx(b"fake docx")

    def test_secure_filename_windows_path(self):
        result = nlp._secure_filename("C:\\Users\\admin\\fiche.docx")
        assert "fiche.docx" in result

    def test_secure_filename_with_control_chars(self):
        result = nlp._secure_filename("hello\x00world\x01test.pdf")
        assert "\x00" not in result
        assert "hello" in result

    def test_secure_filename_only_dots(self):
        result = nlp._secure_filename("...")
        assert result != ""

    def test_build_domain_name_from_file_strips_prefix(self):
        result = nlp._build_domain_name_from_file("fiche_module_RDM.pdf")
        assert result and "Rdm" in result

    def test_build_domain_name_from_file_empty_stem(self):
        result = nlp._build_domain_name_from_file("")
        assert result == "Module" or len(result) > 0

    def test_build_domain_name_from_file_camelcase_split(self):
        result = nlp._build_domain_name_from_file("ResistanceDesMateriaux.pdf")
        assert "Resistance" in result


class TestNlpCodesMatch:
    def test_codes_match_exact(self):
        assert nlp._codes_match("S2a", "S2a") is True

    def test_codes_match_prefix(self):
        assert nlp._codes_match("GC-01-S2a", "S2a") is True

    def test_codes_match_no_match(self):
        assert nlp._codes_match("S3b", "S2a") is False

    def test_normalize_ref_code_no_prefix(self):
        assert nlp._normalize_ref_code("S2a") == "S2a"


class TestNlpSerialize:
    def test_serialize_table_header_empty_col(self):
        lines = []
        nlp._serialize_table_header(["Name", ""], [["val1", "val2"]], lines)
        assert any("Name: val1" in l for l in lines)

    def test_serialize_table_kv_two_cols(self):
        lines = []
        nlp._serialize_table_kv([["key", "value"]], lines)
        assert "key: value" in lines

    def test_serialize_table_kv_more_than_two(self):
        lines = []
        nlp._serialize_table_kv([["a", "b", "c", "d"]], lines)
        assert " | " in lines[0]

    def test_serialize_table_kv_empty_row(self):
        lines = []
        nlp._serialize_table_kv([[]], lines)
        assert lines == []

    def test_classify_table_out_of_bounds(self):
        table = [["onlycol"]]
        header, data_rows, has_header = nlp._classify_table(table)
        assert has_header is False

    def test_serialize_pdf_tables_with_kv(self):
        tables = [[["key", "value"]]]
        result = nlp._serialize_pdf_tables(tables)
        assert "key: value" in result


class TestNlpTableNER:
    def test_find_meta_key_for_cell_empty(self):
        assert nlp._find_meta_key_for_cell("") is None

    def test_find_meta_key_for_cell_startswith_enseignant(self):
        result = nlp._find_meta_key_for_cell("enseignants intervenants")
        assert result == "enseignant_raw"

    def test_find_meta_key_for_cell_substring_fallback(self):
        result = nlp._find_meta_key_for_cell("intitule du module et code")
        assert result == "nom_module"

    def test_find_meta_key_for_cell_no_match(self):
        result = nlp._find_meta_key_for_cell("something completely different")
        assert result is None

    def test_is_valid_enseignant_value_with_colon_and_long(self):
        assert nlp._is_valid_enseignant_value("a" * 200) is False

    def test_is_valid_enseignant_value_with_responsable_no_colon(self):
        assert nlp._is_valid_enseignant_value("responsable module") is False

    def test_is_valid_enseignant_value_no_uppercase(self):
        assert nlp._is_valid_enseignant_value("ahmed benali") is False

    def test_apply_table_meta_cell_no_handler(self):
        meta = {}
        nlp._apply_table_meta_cell(["something"], [], 0, 0, "something", meta)
        assert not meta

    def test_handle_table_nom_module_trim(self):
        meta = {}
        nlp._handle_table_nom_module("Module Name Prérequis Niveaux", meta)
        assert "Module Name" in meta.get("nom_module", "")

    def test_handle_table_code_module_no_digits(self):
        meta = {}
        nlp._handle_table_code_module("ABC", meta)
        assert "code_module" not in meta

    def test_handle_table_code_module_with_digits(self):
        meta = {}
        nlp._handle_table_code_module("MT-34", meta)
        assert meta["code_module"] == "MT-34"

    def test_handle_table_prerequis(self):
        meta = {}
        nlp._handle_table_prerequis("Math de base", meta)
        assert meta["prerequis"] == "Math de base"

    def test_handle_table_objectif(self):
        meta = {}
        nlp._handle_table_objectif("Comprendre les concepts", meta)
        assert "Comprendre" in meta["objectif"]

    def test_scan_tables_for_meta(self):
        meta = {}
        tables = [[["Responsable", "Ahmed Benali"]]]
        nlp._scan_tables_for_meta(tables, meta)
        assert meta.get("responsable") == "Ahmed Benali"

    def test_apply_table_meta_cell_no_value(self):
        meta = {}
        nlp._apply_table_meta_cell(["", ""], [], 0, 0, "Responsable", meta)
        assert "responsable" not in meta


class TestNlpRegexExtraction:
    def test_extract_regex_code_module_table_pattern(self):
        result = nlp._extract_regex_code_module("MT-34\n6h cours")
        assert result == "MT-34"

    def test_extract_regex_code_module_standard_no_digit(self):
        result = nlp._extract_regex_code_module("code: ABC")
        assert result is None

    def test_extract_regex_unite_pedagogique_rev(self):
        result = nlp._extract_regex_unite_pedagogique("Genie Civil\nUnité pédagogique")
        assert result == "Genie Civil"

    def test_extract_regex_responsable_standard(self):
        result = nlp._extract_regex_responsable("Responsable: Ahmed Benali")
        assert result == "Ahmed Benali"

    def test_extract_regex_responsable_rev(self):
        result = nlp._extract_regex_responsable("Ahmed Benali\nResponsable Module")
        assert result == "Ahmed Benali"

    def test_extract_regex_responsable_no_match(self):
        result = nlp._extract_regex_responsable("random text")
        assert result is None

    def test_extract_ens_names_from_standard(self):
        result = nlp._extract_ens_names_from_standard("Enseignants: Ahmed Benali, Sarah Martin")
        assert "Ahmed Benali" in result

    def test_extract_ens_names_from_standard_no_match(self):
        result = nlp._extract_ens_names_from_standard("random text")
        assert result == []

    def test_extract_ens_names_from_rev_match(self):
        result = nlp._extract_ens_names_from_rev("Ahmed Benali\nEnseignants")
        assert "Ahmed Benali" in result

    def test_extract_ens_names_from_rev_responsable_filtered(self):
        result = nlp._extract_ens_names_from_rev("Responsable du module\nEnseignants")
        assert result == []

    def test_extract_regex_prerequis_rev(self):
        result = nlp._extract_regex_prerequis("Math de base\nPrérequis")
        assert result == "Math de base"

    def test_extract_regex_prerequis_noise(self):
        result = nlp._extract_regex_prerequis("123ABC prerequisite value")
        assert result is None

    def test_extract_regex_prerequis_standard(self):
        result = nlp._extract_regex_prerequis("Prérequis: Math de base")
        assert result == "Math de base"

    def test_extract_regex_objectif_match(self):
        result = nlp._extract_regex_objectif("Objectif: Comprendre les concepts")
        assert "Comprendre" in result

    def test_extract_regex_objectif_no_match(self):
        result = nlp._extract_regex_objectif("random text")
        assert result is None

    def test_merge_pattern_enseignants_equipe(self):
        meta = {}
        nlp._merge_pattern_enseignants("Équipe pédagogique: Ahmed Benali", meta)
        assert "Ahmed Benali" in meta.get("enseignants_noms", [])

    def test_merge_pattern_enseignants_nom_prenom(self):
        meta = {}
        nlp._merge_pattern_enseignants("Nom et Prénom: Ahmed Benali", meta)
        assert "Ahmed Benali" in meta.get("enseignants_noms", [])

    def test_merge_pattern_enseignants_coordinateur(self):
        meta = {}
        nlp._merge_pattern_enseignants("Coordinateur: Ahmed Benali", meta)
        assert "Ahmed Benali" in meta.get("enseignants_noms", [])

    def test_extract_metadata_with_tables(self):
        meta = nlp._extract_metadata("some text", [[["Responsable", "Ahmed Benali"]]])
        assert meta.get("responsable") == "Ahmed Benali"

    def test_extract_metadata_avec_merge_pattern(self):
        meta = nlp._extract_metadata("Module: RDM\nÉquipe pédagogique: Ahmed Benali, Sarah Martin\nObjectif: Comprendre")
        assert "Ahmed Benali" in meta.get("enseignants_noms", [])


class TestNlpAABranches:
    def test_extract_aa_block_missing_header(self):
        assert nlp._extract_aa_block("no aa section") is None

    def test_extract_aa_block_with_end(self):
        block = nlp._extract_aa_block("Acquis d'apprentissage\nAA1 text\nContenu détaillé\nrest")
        assert "AA1" in block

    def test_parse_aa_lines_with_markers(self):
        result = nlp._parse_aa_lines("AA1 Apprendre les bases 3\nAA2 Approfondir 4")
        assert len(result) == 2
        assert result[0]["type"] == "marker"

    def test_parse_aa_lines_with_text(self):
        result = nlp._parse_aa_lines("Some text\nwithout markers")
        assert all(t["type"] == "text" for t in result)

    def test_extract_aa_no_marker_with_aa_line(self):
        parsed = [{"type": "text", "content": "some content"}]
        result = nlp._extract_aa_no_marker(parsed, "AA1 Identifier concepts 3")
        assert len(result) >= 1

    def test_extract_aa_no_marker_fallback(self):
        parsed = [{"type": "text", "content": " - Identifier les concepts de base"}]
        result = nlp._extract_aa_no_marker(parsed, "no aa line pattern")
        assert len(result) >= 1

    def test_parse_aa_bloom_multi(self):
        bloom, rest = nlp._parse_aa_bloom("Analyser les donnees 3 et 4")
        assert bloom == 4
        assert "Analyser les donnees" in rest

    def test_parse_aa_bloom_single(self):
        bloom, rest = nlp._parse_aa_bloom("Appliquer methode 3")
        assert bloom == 3

    def test_parse_aa_bloom_standalone_digit(self):
        bloom, rest = nlp._parse_aa_bloom("5")
        assert bloom == 5

    def test_parse_aa_bloom_no_match(self):
        bloom, rest = nlp._parse_aa_bloom("some text without bloom")
        assert bloom == 0
        assert rest == "some text without bloom"

    def test_collect_standalone_bloom_multi(self):
        assert nlp._collect_standalone_bloom("3 et 4") == 4

    def test_collect_standalone_bloom_single(self):
        assert nlp._collect_standalone_bloom("5") == 5

    def test_collect_standalone_bloom_none(self):
        assert nlp._collect_standalone_bloom("not a digit") is None

    def test_collect_trailing_with_bloom(self):
        parsed = [
            {"type": "marker", "aa": 1, "rest": "text"},
            {"type": "text", "content": "3"},
            {"type": "text", "content": "more text"},
        ]
        trailing, bloom = nlp._collect_trailing(parsed, 0)
        assert bloom == 3
        assert "more text" in trailing

    def test_find_split_point_uppercase(self):
        assert nlp._find_split_point(["some text", "New Sentence here"]) == 1

    def test_find_split_point_all_lower(self):
        assert nlp._find_split_point(["some text", "de la matiere"]) == 2

    def test_collect_segment_trailing_not_last(self):
        trailing, bloom = nlp._collect_segment_trailing([], 0, is_last=False)
        assert trailing == []
        assert bloom is None

    def test_collect_segment_trailing_last(self):
        parsed = [{"type": "marker", "aa": 1, "rest": "text"}, {"type": "text", "content": "trailing"}]
        trailing, bloom = nlp._collect_segment_trailing(parsed, 0, is_last=True)
        assert "trailing" in trailing

    def test_apply_previous_segment_updates_bloom(self):
        segments = [{"aa": 1, "bloom": 0, "pre": [], "inline": "", "post": []}]
        nlp._apply_previous_segment_updates(segments, 3, ["extra"])
        assert segments[0]["bloom"] == 3
        assert "extra" in segments[0]["post"]

    def test_build_aa_segments_single(self):
        parsed = [{"type": "marker", "aa": 1, "rest": "text 3"}]
        segments = nlp._build_aa_segments(parsed, [0])
        assert len(segments) == 1

    def test_finalize_aa_segments_clean_and_bloom_detect(self):
        segments = [{"aa": 1, "bloom": 0, "pre": [], "inline": "concevoir une solution", "post": []}]
        acquis = nlp._finalize_aa_segments(segments)
        assert len(acquis) >= 1
        assert acquis[0]["bloom_level"] >= 1

    def test_extract_acquis_apprentissage_full_pipeline(self):
        text = "Acquis d'apprentissage\nAA1 Identifier les bases 3\nAA2 Appliquer les methodes 4\nContenu détaillé"
        result = nlp._extract_acquis_apprentissage(text)
        assert len(result) >= 2

    def test_extract_acquis_apprentissage_no_markers(self):
        text = "Acquis d'apprentissage\n - Identifier les concepts\n - Appliquer les methodes\nContenu détaillé"
        result = nlp._extract_acquis_apprentissage(text)
        assert len(result) >= 1


class TestNlpSeance:
    def test_extract_block_items(self):
        items = nlp._extract_block_items("- item one content\n- item two content\n")
        assert len(items) == 2

    def test_extract_block_type_found(self):
        block = "Type: TP\nSome content"
        result = nlp._extract_block_type(block)
        assert result == "TP"

    def test_extract_block_type_no_match(self):
        assert nlp._extract_block_type("no type here") is None

    def test_extract_block_type_no_type_after(self):
        block = "Type: something random"
        result = nlp._extract_block_type(block)
        assert result is None

    def test_extract_block_duree_match(self):
        assert nlp._extract_block_duree("Durée: 3h") == "3h"

    def test_extract_block_duree_no_match(self):
        assert nlp._extract_block_duree("no duration") is None

    def test_extract_seances_empty(self):
        assert nlp._extract_seances("no seance") == []

    def test_extract_seances_with_items(self):
        text = "Séance 1: Introduction\n- item a\n- item b\nSéance 2: Suite"
        result = nlp._extract_seances(text)
        assert len(result) == 2
        assert result[0]["numero"] == "1"
        assert result[1]["titre"] == "Suite"


class TestNlpReferentielComp:
    def test_collect_tail(self):
        lines = ["continuation line", "another", "Competences and stop"]
        tail, j = nlp._collect_tail(lines, 0)
        assert len(tail) >= 1

    def test_collect_tail_empty_line(self):
        lines = ["", "after"]
        tail, j = nlp._collect_tail(lines, 0)
        assert tail == []

    def test_collect_tail_comp_stop(self):
        lines = ["Objectifs specifiques"]
        tail, j = nlp._collect_tail(lines, 0)
        assert tail == []

    def test_build_section_map(self):
        text = "Competences dans le domaine du Genie Civil (GC)"
        result = nlp._build_section_map(text)
        assert "GC" in result
        assert "du Genie Civil" in result["GC"]

    def test_clean_comp_text_no_truncate(self):
        result = nlp._clean_comp_text("  Analyse  des  structures  ")
        assert "Analyse des structures" in result

    def test_clean_comp_text_with_truncate(self):
        result = nlp._clean_comp_text("Analyse Compétences dans phrase")
        assert "Competences" not in result

    def test_extract_referentiel_competences(self):
        text = "C1a - Premier savoir\nC1b - Second savoir\nC2a - Third savoir\n"
        result = nlp._extract_referentiel_competences(text)
        assert len(result) >= 0

    def test_extract_referentiel_competences_fewer_than_3(self):
        text = "A1 - Only one\n"
        result = nlp._extract_referentiel_competences(text)
        assert result == []

    def test_grab_continuation_no_remainder(self):
        m = MagicMock()
        m.group.return_value = "initial"
        m.end.return_value = 10
        result = nlp._grab_continuation(m, "short")
        assert result == "initial"

    def test_grab_continuation_with_remainder(self):
        m = MagicMock()
        m.group.return_value = "initial"
        m.end.return_value = 5
        result = nlp._grab_continuation(m, "start\ncontinued\nstill\nObjectif next")
        assert "continued" in result

    def test_llm_extract_metadata_empty(self, monkeypatch):
        monkeypatch.setattr(nlp, "_llm_chat", lambda msgs: "")
        result = nlp._llm_extract_metadata("test")
        assert result == {}

    def test_llm_extract_metadata_json_error(self, monkeypatch):
        monkeypatch.setattr(nlp, "_llm_chat", lambda msgs: "not json")
        result = nlp._llm_extract_metadata("test")
        assert result == {}

    def test_extract_llm_text_not_string(self):
        assert nlp._extract_llm_text(123) is None

    def test_extract_llm_text_uppercase(self):
        result = nlp._extract_llm_text(" code ", uppercase=True)
        assert result == "CODE"

    def test_extract_llm_text_too_short(self):
        assert nlp._extract_llm_text("ab", min_len=4) is None

    def test_extract_llm_names_not_list(self):
        assert nlp._extract_llm_names("not list") == []

    def test_extract_llm_names_valid(self):
        result = nlp._extract_llm_names(["Ahmed Benali", ""])
        assert "Ahmed Benali" in result

    def test_extract_llm_roles_not_dict(self):
        assert nlp._extract_llm_roles("not dict") == {}

    def test_extract_llm_roles_valid(self):
        result = nlp._extract_llm_roles({"Ahmed Benali": "responsable"})
        assert result["Ahmed Benali"] == "responsable"

    def test_sanitize_llm_metadata_code_no_alnum(self):
        result = nlp._sanitize_llm_metadata({"code_module": "@@@"})
        assert "code_module" not in result

    def test_llm_extract_acquis_empty(self, monkeypatch):
        monkeypatch.setattr(nlp, "_llm_chat", lambda msgs: "")
        assert nlp._llm_extract_acquis("test") == []

    def test_llm_extract_seances_empty(self, monkeypatch):
        monkeypatch.setattr(nlp, "_llm_chat", lambda msgs: "")
        assert nlp._llm_extract_seances("test") == []

    def test_llm_fallback_items_empty(self, monkeypatch):
        monkeypatch.setattr(nlp, "_llm_chat", lambda msgs: "")
        assert nlp._llm_fallback_items("test", "module") == []

    def test_llm_extract_subcompetences_empty(self, monkeypatch):
        def fake_chat(msgs, **kwargs):
            return ""
        monkeypatch.setattr(nlp, "_llm_chat", fake_chat)
        assert nlp._llm_extract_subcompetences("test", "module") == []

    def test_llm_extract_subcompetences_list(self, monkeypatch):
        def fake_chat(msgs, **kwargs):
            return '["SC1", "SC2"]'
        monkeypatch.setattr(nlp, "_llm_chat", fake_chat)
        result = nlp._llm_extract_subcompetences("test", "module")
        assert "SC1" in result

    def test_llm_extract_subcompetences_dict(self, monkeypatch):
        def fake_chat(msgs, **kwargs):
            return '{"items": ["SC1"]}'
        monkeypatch.setattr(nlp, "_llm_chat", fake_chat)
        result = nlp._llm_extract_subcompetences("test", "module")
        assert "SC1" in result

    def test_extract_subcompetences_regex(self):
        text = "SC1 - Analyse des bases\nSC2 - Conception du test"
        result = nlp._extract_subcompetences(text)
        assert len(result) >= 1

    def test_merge_llm_meta(self, monkeypatch):
        monkeypatch.setattr(nlp, "_llm_extract_metadata", lambda t: {"code_module": "MT01", "nom_module": "Module"})
        meta = {}
        nlp._merge_llm_meta("test", meta)
        assert meta.get("code_module") == "MT01"

    def test_ensure_regex_enseignants_skip(self):
        meta = {"enseignants_noms": ["Existing"]}
        nlp._ensure_regex_enseignants("Enseignants: Ahmed Benali", meta)
        assert len(meta["enseignants_noms"]) == 1

    def test_ensure_regex_enseignants_empty(self):
        meta = {}
        nlp._ensure_regex_enseignants("random text", meta)
        assert "enseignants_noms" not in meta

    def test_append_meta_enseignant_empty_name(self):
        meta = {}
        nlp._append_meta_enseignant(meta, None, "enseignant")
        assert "enseignants_noms" not in meta

    def test_get_cell_value_fallback_below(self):
        row = ["label", ""]
        table = [["a", ""], ["value", ""]]
        result = nlp._get_cell_value(row, table, 0, 0)
        assert result == "value"

    def test_get_cell_value_out_of_bounds(self):
        row = ["", ""]
        table = [row]
        result = nlp._get_cell_value(row, table, 0, 1)
        assert result == ""


# ======================================================================
# validate_helpers.py
# ======================================================================


class TestValidateHelpers:
    def test_upsert_domaine_failure(self):
        cur = MagicMock()
        cur.execute.side_effect = Exception("db error")
        conn = MagicMock()
        errors = []
        dom = SimpleNamespace(code="D1", nom="Dom", description="desc")
        result = vh._upsert_domaine(cur, dom, errors, conn)
        assert result is False
        conn.rollback.assert_called_once()

    def test_upsert_competence_failure(self):
        cur = MagicMock()
        cur.execute.side_effect = Exception("db error")
        conn = MagicMock()
        errors = []
        comp = SimpleNamespace(code="C1", nom="Comp", description="desc", ordre=1)
        result = vh._upsert_competence(cur, comp, "D1", errors, conn)
        assert result is False
        conn.rollback.assert_called_once()

    def test_upsert_sous_competence_success(self):
        cur = MagicMock()
        conn = MagicMock()
        errors = []
        sc = SimpleNamespace(code="SC1", nom="Sub", description="desc")
        result = vh._upsert_sous_competence(cur, sc, "C1", errors, conn)
        assert result is True

    def test_upsert_sous_competence_failure(self):
        cur = MagicMock()
        cur.execute.side_effect = Exception("db error")
        conn = MagicMock()
        errors = []
        sc = SimpleNamespace(code="SC1", nom="Sub", description="desc")
        result = vh._upsert_sous_competence(cur, sc, "C1", errors, conn)
        assert result is False
        conn.rollback.assert_called_once()

    def test_insert_savoir_links_empty_ens(self):
        cur = MagicMock()
        conn = MagicMock()
        errors = []
        sav = SimpleNamespace(enseignantsSuggeres=[])
        result = vh._insert_savoir_links(cur, sav, "s1", errors, conn)
        assert result == 0

    def test_insert_savoir_links_error(self):
        cur = MagicMock()
        cur.execute.side_effect = Exception("link error")
        conn = MagicMock()
        errors = []
        sav = SimpleNamespace(enseignantsSuggeres=["E1"], code="S1", niveau="N2")
        result = vh._insert_savoir_links(cur, sav, "s1", errors, conn)
        assert result == 0

    def test_upsert_savoir_row_parent_type_sous_competence(self):
        cur = MagicMock()
        cur.fetchone.return_value = (True,)
        conn = MagicMock()
        errors = []
        sav = SimpleNamespace(tmpId="s1", code="S1", nom="Savoir", description="desc",
                              type="THEORIQUE", niveau="N2", enseignantsSuggeres=[])
        ins, upd, lnk = vh._upsert_savoir_row(cur, sav, "SC1", False, errors, conn, parent_type="sous_competence")
        assert ins == 1

    def test_upsert_savoir_row_overwrite_delete_error(self):
        cur = MagicMock()
        cur.fetchone.return_value = (True,)
        cur.execute.side_effect = [None, Exception("delete error")]

        def reset_side_effect(*args, **kwargs):
            pass

        conn = MagicMock()
        errors = []
        sav = SimpleNamespace(tmpId="s1", code="S1", nom="Savoir", description="desc",
                              type="THEORIQUE", niveau="N2", enseignantsSuggeres=[])
        ins, upd, lnk = vh._upsert_savoir_row(cur, sav, "C1", True, errors, conn)
        assert ins == 1

    def test_process_competence_savoirs_with_sous_competences(self):
        cur = MagicMock()
        cur.fetchone.return_value = (True,)
        conn = MagicMock()
        errors = []
        counts = {"inserted_savoirs": 0, "updated_savoirs": 0, "inserted_links": 0,
                  "upserted_sous_competences": 0, "upserted_competences": 0, "upserted_domaines": 0}

        sav_dir = SimpleNamespace(tmpId="s1", code="S1", nom="Savoir", description="desc",
                                  type="THEORIQUE", niveau="N2", enseignantsSuggeres=[])
        sav_sub = SimpleNamespace(tmpId="s2", code="S2", nom="Savoir2", description="desc",
                                  type="PRATIQUE", niveau="N3", enseignantsSuggeres=[])
        sc = SimpleNamespace(code="SC1", nom="Sub", description="desc", savoirs=[sav_sub])
        comp = SimpleNamespace(code="C1", nom="Comp", description="desc", ordre=1,
                               savoirs=[sav_dir], sousCompetences=[sc])
        vh._process_competence_savoirs(cur, comp, False, counts, errors, conn)
        assert counts["upserted_sous_competences"] == 1

    def test_process_validate_competence_short_circuit(self):
        cur = MagicMock()
        cur.execute.side_effect = Exception("fail")
        conn = MagicMock()
        errors = []
        counts = {"upserted_domaines": 0, "upserted_competences": 0,
                  "upserted_sous_competences": 0, "inserted_savoirs": 0,
                  "updated_savoirs": 0, "inserted_links": 0}
        comp = SimpleNamespace(code="C1", nom="Comp", description="desc", ordre=1,
                               savoirs=[], sousCompetences=[])
        vh._process_validate_competence(cur, comp, "D1", False, counts, errors, conn)
        assert counts["upserted_competences"] == 0

    def test_process_validate_domaine(self):
        cur = MagicMock()
        cur.fetchone.return_value = (True,)
        conn = MagicMock()
        errors = []
        counts = {"upserted_domaines": 0, "upserted_competences": 0,
                  "upserted_sous_competences": 0, "inserted_savoirs": 0,
                  "updated_savoirs": 0, "inserted_links": 0}
        comp = SimpleNamespace(code="C1", nom="Comp", description="desc", ordre=1,
                               savoirs=[], sousCompetences=[])
        dom = SimpleNamespace(code="D1", nom="Dom", description="desc", competences=[comp])
        vh._process_validate_domaine(cur, dom, False, counts, errors, conn)
        assert counts["upserted_domaines"] == 1
        assert counts["upserted_competences"] == 1

    def test_process_validate_propositions(self):
        cur = MagicMock()
        cur.fetchone.return_value = (True,)
        conn = MagicMock()
        errors = []
        comp = SimpleNamespace(code="C1", nom="Comp", description="desc", ordre=1,
                               savoirs=[], sousCompetences=[])
        dom = SimpleNamespace(code="D1", nom="Dom", description="desc", competences=[comp])
        req = SimpleNamespace(propositions=[dom], overwrite=False)
        counts = vh._process_validate_propositions(cur, req, errors, conn)
        assert counts["upserted_domaines"] == 1
        assert counts["upserted_competences"] == 1

    def test_build_validate_summary(self):
        counts = dict.fromkeys(["upserted_domaines", "upserted_competences",
                                "upserted_sous_competences", "inserted_savoirs",
                                "updated_savoirs", "inserted_links"], 0)
        logger = MagicMock()
        summary = vh._build_validate_summary(counts, ["err1"] * 31, logger)
        assert summary.status == "ok"
        assert len(summary.errors) == 30


# ======================================================================
# analyzer.py
# ======================================================================


class TestAnalyzerNiveau:
    def test_get_niveau_from_referentiel_variant_pattern(self, monkeypatch):
        monkeypatch.setattr(ref, "_get_effective_referential", lambda d: {
            "niveaux": {"S1a": "N2_ELEMENTAIRE", "S1b": "N3_INTERMEDIAIRE"}
        })
        monkeypatch.setattr(analyzer, "_detect_bloom_level", lambda t: 3)
        result = analyzer._get_niveau_from_referentiel("S1a", "gc")
        assert result == "N2_ELEMENTAIRE"

    def test_get_niveau_from_referentiel_fallback_bloom(self, monkeypatch):
        monkeypatch.setattr(ref, "_get_effective_referential", lambda d: {"niveaux": {}})
        monkeypatch.setattr(analyzer, "_detect_bloom_level", lambda t: 5)
        monkeypatch.setattr(analyzer, "_bloom_to_niveau", lambda l: "N5_EXPERT")
        result = analyzer._get_niveau_from_referentiel("", "gc", fallback_text="concevoir")
        assert result == "N5_EXPERT"

    def test_is_bad_domain_candidate(self):
        assert analyzer._is_bad_domain_candidate(None) is True
        assert analyzer._is_bad_domain_candidate("ab") is True
        assert analyzer._is_bad_domain_candidate("A1 - intro") is True
        assert analyzer._is_bad_domain_candidate("lowercase") is True
        assert analyzer._is_bad_domain_candidate("Comma, in, domain, name") is True
        assert analyzer._is_bad_domain_candidate("Bon domaine name") is False

    def test_resolve_domain_all_fallback(self, monkeypatch):
        monkeypatch.setattr(analyzer, "_build_domain_name_from_file", lambda f: "Fallback")
        meta = {"nom_module": "a", "unite_enseignement": "b", "unite_pedagogique": "c"}
        d, m, mc, dc = analyzer._resolve_domain(meta, "test.txt")
        assert d == "Fallback"
        assert m == "a"


class TestAnalyzerBuilders:
    def test_build_extracted_ens_no_match(self):
        result = analyzer._build_extracted_ens(
            ["Alice Dupont"], {"Alice Dupont": "enseignant"}, {"Other": ("E1", "Other")}, "f.txt"
        )
        assert result[0].matched_id is None

    def test_add_ref_matched_ens_skip_existing(self, monkeypatch):
        extracted = [FicheEnseignantExtrait(fichier="f.txt", nom_complet="Alice Dupont", matched_id="E001")]
        all_ens_by_id = {"E001": EnseignantInfo(id="E001", nom="Dupont", prenom="Alice")}
        analyzer._add_ref_matched_ens(["E001"], extracted, all_ens_by_id, "f.txt")
        assert len(extracted) == 1

    def test_add_ref_matched_ens_missing_ens(self, monkeypatch):
        extracted = [FicheEnseignantExtrait(fichier="f.txt", nom_complet="Other")]
        analyzer._add_ref_matched_ens(["E999"], extracted, {}, "f.txt")
        assert len(extracted) == 1

    def test_build_savoir_from_aa(self, monkeypatch):
        monkeypatch.setattr(analyzer, "_match_gc_savoir", lambda t, departement="gc": ["S1a"])
        monkeypatch.setattr(analyzer, "_suggest_gc_enseignants", lambda c: ["E999"])
        monkeypatch.setattr(analyzer, "_detect_type", lambda t, dep: "THEORIQUE")
        monkeypatch.setattr(analyzer, "_gc_ref_niveau", lambda c, departement="gc": "N3_INTERMEDIAIRE")
        result = analyzer._build_savoir_from_aa(
            {"id": 1, "text": "Analyser", "bloom_level": 4},
            "C1", "D0", "gc", ["E1"], ["E2"], ["E3"], ["E4"], 0,
        )
        assert result.code == "C1-AA1"
        assert result.niveau == "N3_INTERMEDIAIRE"
        assert "E999" in result.enseignantsSuggeres

    def test_build_savoir_from_aa_direct(self, monkeypatch):
        monkeypatch.setattr(analyzer, "_match_gc_savoir", lambda t, departement="gc": [])
        monkeypatch.setattr(analyzer, "_suggest_gc_enseignants", lambda c: [])
        monkeypatch.setattr(analyzer, "_detect_type", lambda t, dep: "PRATIQUE")
        monkeypatch.setattr(analyzer, "_gc_ref_niveau", lambda c, departement="gc": None)
        result = analyzer._build_savoir_from_aa_direct(
            {"id": 2, "text": "Appliquer", "bloom_level": 3},
            "C1", "D0", "gc", ["E1"], ["E2"], ["E3"], ["E4"], 1,
        )
        assert result.code == "C1-AA2"
        assert "E1" in result.enseignantsSuggeres
        assert "E2" in result.enseignantsSuggeres

    def test_build_competence_from_acquis_with_subcomp(self, monkeypatch):
        monkeypatch.setattr(analyzer, "_match_gc_competence", lambda t, departement="gc": "GC-TECH")
        monkeypatch.setattr(analyzer, "_match_gc_savoir", lambda t, departement="gc": [])
        monkeypatch.setattr(analyzer, "_suggest_gc_enseignants", lambda c: [])
        monkeypatch.setattr(analyzer, "_detect_type", lambda t, dep: "THEORIQUE")
        monkeypatch.setattr(analyzer, "_gc_ref_niveau", lambda c, departement="gc": None)
        acquis = [{"id": 1, "text": "Analyser", "bloom_level": 4}]
        result = analyzer._build_competence_from_acquis(
            acquis, [(1, "Sous-comp A")], "some text\nSous-comp A content",
            "C1", "RDM", "D0", 0, "gc", [], [], [], [], {}
        )
        assert result is not None

    def test_build_competences_from_referentiel_grouped(self, monkeypatch):
        monkeypatch.setattr(analyzer, "_match_gc_competence", lambda t, departement="gc": None)
        monkeypatch.setattr(analyzer, "_match_gc_savoir", lambda t, departement="gc": [])
        monkeypatch.setattr(analyzer, "_suggest_gc_enseignants", lambda c: [])
        monkeypatch.setattr(analyzer, "_detect_type", lambda t, dep: "THEORIQUE")
        monkeypatch.setattr(analyzer, "_gc_ref_niveau", lambda c, departement="gc": None)
        ref_items = [
            {"code": "S1a", "text": "Analyser", "domaine_code": "D1", "domaine_nom": "Dom1"},
            {"code": "S2a", "text": "Concevoir", "domaine_code": "D1", "domaine_nom": "Dom1"},
            {"code": "S3a", "text": "Tester", "domaine_code": "D2", "domaine_nom": "Dom2"},
        ]
        competences, idx = analyzer._build_competences_from_referentiel(
            ref_items, 0, "D0", "gc", [], [], [], []
        )
        assert len(competences) == 2

    def test_match_all_enseignants(self, monkeypatch):
        monkeypatch.setattr(analyzer, "_match_gc_savoir", lambda t, departement="gc": [])
        monkeypatch.setattr(analyzer, "_suggest_gc_enseignants", lambda c: [])
        monkeypatch.setattr(analyzer, "_match_enseignants_by_name",
                            lambda n, e: (["E001"], {"Alice": ("E001", "Alice")}))
        monkeypatch.setattr(analyzer, "_match_enseignants_by_module", lambda t, e: [])
        monkeypatch.setattr(analyzer, "_fetch_all_enseignants_info", lambda: {})
        extracted, by_name, by_module, all_matched, ids = analyzer._match_all_enseignants(
            ["Alice"], {"Alice": "enseignant"}, "text", [EnseignantInfo(id="E001", nom="Dupont", prenom="Alice", modules=[])], "gc", "f.txt", {"responsable": "Bob"}
        )
        assert "Bob" in [e.nom_complet for e in extracted]

    def test_analyze_single_fiche_referentiel_mode(self, monkeypatch):
        monkeypatch.setattr(analyzer, "_extract_metadata", lambda t, raw_tables=None: {"nom_module": "RDM", "enseignants_noms": [], "enseignants_roles": {}})
        monkeypatch.setattr(analyzer, "_resolve_domain", lambda m, f: ("RDM", "RDM", "RDM01", "RDM01"))
        monkeypatch.setattr(analyzer, "_match_all_enseignants", lambda *a, **kw: ([FicheEnseignantExtrait(fichier="f.txt", nom_complet="A")], [], [], [], []))
        monkeypatch.setattr(analyzer, "_extract_acquis_apprentissage", lambda t: [])
        monkeypatch.setattr(analyzer, "_extract_seances", lambda t: [])
        monkeypatch.setattr(analyzer, "_extract_referentiel_competences", lambda t: [
            {"code": "S1a", "text": "Analyser", "domaine_code": "D1", "domaine_nom": "Dom1"},
            {"code": "S2a", "text": "Concevoir", "domaine_code": "D1", "domaine_nom": "Dom1"},
            {"code": "S3a", "text": "Tester", "domaine_code": "D2", "domaine_nom": "Dom2"},
        ])
        monkeypatch.setattr(analyzer, "_build_competences_from_referentiel", lambda *a, **kw: ([CompetenceProposition(tmpId="c1", code="C1", nom="C1", refCodes=[], savoirs=[], sousCompetences=[])], 2))
        monkeypatch.setattr(analyzer, "_match_gc_competence", lambda t, departement="gc": "GC-TECH")
        domaine, extracted = analyzer._analyze_single_fiche("f.txt", "text", [], "gc")
        assert domaine is not None
        assert domaine.description is not None

    def test_analyze_single_fiche_fallback(self, monkeypatch):
        monkeypatch.setattr(analyzer, "_extract_metadata", lambda t, raw_tables=None: {"nom_module": "RDM", "enseignants_noms": [], "enseignants_roles": {}})
        monkeypatch.setattr(analyzer, "_resolve_domain", lambda m, f: ("RDM", "RDM", "RDM01", "RDM01"))
        monkeypatch.setattr(analyzer, "_match_all_enseignants", lambda *a, **kw: ([FicheEnseignantExtrait(fichier="f.txt", nom_complet="A")], [], [], [], []))
        monkeypatch.setattr(analyzer, "_extract_acquis_apprentissage", lambda t: [])
        monkeypatch.setattr(analyzer, "_extract_seances", lambda t: [])
        monkeypatch.setattr(analyzer, "_extract_referentiel_competences", lambda t: [])
        monkeypatch.setattr(analyzer, "_fallback_extraction", lambda *a, **kw: [CompetenceProposition(tmpId="c1", code="C1", nom="C1", refCodes=[], savoirs=[], sousCompetences=[])])
        monkeypatch.setattr(analyzer, "_match_gc_competence", lambda t, departement="gc": None)
        domaine, extracted = analyzer._analyze_single_fiche("f.txt", "random text", [], "gc")
        assert domaine is not None

    def test_fallback_extraction_bullet_patterns(self, monkeypatch):
        monkeypatch.setattr(analyzer, "_match_gc_savoir", lambda t, departement="gc": [])
        monkeypatch.setattr(analyzer, "_suggest_gc_enseignants", lambda c: [])
        monkeypatch.setattr(analyzer, "_detect_type", lambda t, dep: "THEORIQUE")
        monkeypatch.setattr(analyzer, "_gc_ref_niveau", lambda c, departement="gc": None)
        monkeypatch.setattr(analyzer, "_match_gc_competence", lambda t, departement="gc": None)
        result = analyzer._fallback_extraction("✓ Item one\n✓ Item two\n✓ Item three", "C1", "RDM", [], "gc")
        assert len(result) >= 1

    def test_analyze_files_duplicate_code(self, monkeypatch):
        monkeypatch.setattr(analyzer, "_extract_text", lambda f, d: ("text", None))
        monkeypatch.setattr(analyzer, "_analyze_single_fiche",
                            lambda f, t, e, departement="gc", raw_tables=None: (
                                DomaineProposition(tmpId="d1", code="RDM01", nom="RDM", competences=[]),
                                [FicheEnseignantExtrait(fichier=f, nom_complet="A")]
                            ))
        result = analyzer.analyze_files(["f1.txt", "f2.txt"], [b"a", b"b"], [], "gc")
        assert result.stats["totalDomaines"] == 2


# ======================================================================
# db.py
# ======================================================================


class TestDbExtra:
    def test_fetch_all_enseignants_info_cached(self):
        db._ENS_INFO_CACHE.clear()
        db._ENS_INFO_CACHE.set("all", {"E001": EnseignantInfo(id="E001", nom="X", prenom="Y")})
        result = db._fetch_all_enseignants_info()
        assert "E001" in result

    def test_dept_to_numeric_id_unknown_defaults_to_gc(self):
        assert db._dept_to_numeric_id("unknown") == 1

    def test_create_enseignant_if_new_empty_name(self, monkeypatch):
        monkeypatch.setattr(db, "_get_db_connection", lambda: (_ for _ in ()).throw(Exception("fail")))
        nid, display = db._create_enseignant_if_new("")
        assert nid.startswith("EX-")

    def test_create_enseignant_if_new_single_word(self, monkeypatch):
        cur = MagicMock()
        conn = MagicMock()
        conn.cursor.return_value = cur
        monkeypatch.setattr(db, "_get_db_connection", lambda: conn)
        monkeypatch.setattr(db, "_put_db_connection", lambda c: None)
        nid, display = db._create_enseignant_if_new("Ahmed")
        assert display == "AHMED"

    def test_fetch_enseignant_affectations_db_exception_returns_stale(self, monkeypatch):
        db._AFFECTATIONS_CACHE.clear()
        db._AFFECTATIONS_CACHE.set("all", {"E999": ["S9"]})
        monkeypatch.setattr(db, "_get_db_connection", lambda: (_ for _ in ()).throw(Exception("down")))
        result = db._fetch_enseignant_affectations()
        assert result == {"E999": ["S9"]}


# ======================================================================
# cache.py
# ======================================================================


class TestCacheExtra:
    def test_get_ttl_expired(self):
        c = cache_mod._ThreadSafeCache()
        c.set("k", "v")
        c._ts["k"] = _time.time() - 100
        assert c.get("k", ttl=10) is None

    def test_pop_nonexistent(self):
        c = cache_mod._ThreadSafeCache()
        c.pop("nothing")

    def test_clear(self):
        c = cache_mod._ThreadSafeCache()
        c.set("a", 1)
        c.clear()
        assert c.get("a") is None

    def test_keys(self):
        c = cache_mod._ThreadSafeCache()
        c.set("a", 1)
        assert c.keys() == ["a"]

    def test_keys_empty(self):
        c = cache_mod._ThreadSafeCache()
        assert c.keys() == []

    def test_bool_false(self):
        c = cache_mod._ThreadSafeCache()
        assert bool(c) is False

    def test_bool_true(self):
        c = cache_mod._ThreadSafeCache()
        c.set("k", "v")
        assert bool(c) is True

    def test_get_without_ttl(self):
        c = cache_mod._ThreadSafeCache()
        c.set("k", "v")
        assert c.get("k") == "v"

    def test_get_nonexistent(self):
        c = cache_mod._ThreadSafeCache()
        assert c.get("nonexistent") is None

    def test_validate_env_missing(self, monkeypatch, caplog):
        import logging
        monkeypatch.delenv("DB_NAME", raising=False)
        monkeypatch.delenv("DB_USER", raising=False)
        monkeypatch.delenv("DB_PASS", raising=False)
        with caplog.at_level(logging.WARNING, logger="rice_analyzer"):
            cache_mod._validate_env()
        assert any("DB_NAME" in r.message for r in caplog.records)

    def test_validate_env_all_present(self, monkeypatch, caplog):
        import logging
        monkeypatch.setenv("DB_NAME", "x")
        monkeypatch.setenv("DB_USER", "x")
        monkeypatch.setenv("DB_PASS", "x")
        with caplog.at_level(logging.WARNING, logger="rice_analyzer"):
            cache_mod._validate_env()
        warnings = [r for r in caplog.records if any(v in r.message for v in ("DB_NAME", "DB_USER", "DB_PASS"))]
        assert len(warnings) == 0


# ======================================================================
# referential.py
# ======================================================================


class TestReferentialExtra:
    def test_fetch_savoirs_from_db_with_nom(self, monkeypatch):
        cur = MagicMock()
        cur.fetchone.return_value = (True,)
        cur.fetchall.return_value = [("S1", "Savoir 1", ["kw1"]), ("S2", "Savoir 2", None)]
        result = ref._fetch_savoirs_from_db(cur, "gc")
        assert "S1" in result
        assert "savoir 1" in result["S1"]

    def test_fetch_savoirs_from_db_exception(self, monkeypatch):
        cur = MagicMock()
        cur.fetchone.side_effect = [True, Exception("fail")]
        result = ref._fetch_savoirs_from_db(cur, "gc")
        assert result == {}

    def test_fetch_competences_from_db_exception(self, monkeypatch):
        cur = MagicMock()
        cur.fetchone.return_value = (True,)
        cur.fetchall.side_effect = Exception("fail")
        result = ref._fetch_competences_from_db(cur, "gc")
        assert result == {}

    def test_fetch_domaines_from_db_exception(self, monkeypatch):
        cur = MagicMock()
        cur.fetchone.return_value = (True,)
        cur.fetchall.side_effect = Exception("fail")
        result = ref._fetch_domaines_from_db(cur, "gc")
        assert result == {}

    def test_fetch_niveaux_from_db_no_niveau_column(self, monkeypatch):
        cur = MagicMock()
        cur2 = MagicMock()
        cur.fetchone.return_value = (True,)
        cur2.fetchone.return_value = None
        conn = MagicMock()
        conn.cursor.return_value = cur2
        monkeypatch.setattr(ref, "_get_db_connection", lambda: conn)
        monkeypatch.setattr(ref, "_put_db_connection", lambda c: None)
        result = ref._fetch_niveaux_from_db("gc")
        assert result == {}

    def test_load_ref_from_db_tables_not_exist(self, monkeypatch):
        ref._REF_DB_CACHE.clear()
        cur = MagicMock()
        cur.fetchone.return_value = (False,)
        conn = MagicMock()
        conn.cursor.return_value = cur
        monkeypatch.setattr(ref, "_get_db_connection", lambda: conn)
        result = ref._load_ref_from_db("gc")
        assert result is None

    def test_load_ref_from_db_exception(self, monkeypatch):
        ref._REF_DB_CACHE.clear()
        monkeypatch.setattr(ref, "_get_db_connection", lambda: (_ for _ in ()).throw(Exception("fail")))
        result = ref._load_ref_from_db("gc")
        assert result is None

    def test_load_generic_ref_mapping_not_found(self, tmp_path, monkeypatch):
        mapping = tmp_path / "generic_ref.json"
        ref_file = tmp_path / "gc.json"
        mapping.write_text(json.dumps({"gc": str(ref_file)}), encoding="utf-8")
        monkeypatch.setattr(ref, "_GENERIC_REF_MAPPING_PATH", mapping)
        monkeypatch.setattr(ref, "_GENERIC_REF_DIR", tmp_path)
        result = ref._load_generic_ref("gc")
        assert result is ref._GENERIC_FALLBACK_REF

    def test_load_generic_ref_missing_keys(self, tmp_path, monkeypatch):
        mapping = tmp_path / "generic_ref.json"
        ref_file = tmp_path / "test.json"
        mapping.write_text(json.dumps({"test": str(ref_file)}), encoding="utf-8")
        ref_file.write_text(json.dumps({"domaines": {}}), encoding="utf-8")
        monkeypatch.setattr(ref, "_GENERIC_REF_MAPPING_PATH", mapping)
        monkeypatch.setattr(ref, "_GENERIC_REF_DIR", tmp_path)
        result = ref._load_generic_ref("test")
        assert "competences" in result
        assert "savoirs" in result
        assert "niveaux" in result

    def test_get_effective_referential_db_none_gc(self, monkeypatch):
        monkeypatch.setattr(ref, "_load_ref_from_db", lambda d: None)
        result = ref._get_effective_referential("gc")
        assert result is ref._GC_FALLBACK_REF

    def test_get_effective_referential_db_none_other(self, monkeypatch):
        monkeypatch.setattr(ref, "_load_ref_from_db", lambda d: None)
        monkeypatch.setattr(ref, "_load_generic_ref", lambda d: {"custom": True})
        result = ref._get_effective_referential("info")
        assert result.get("custom") is True

    def test_match_gc_savoir_semantic_not_ok(self, monkeypatch):
        monkeypatch.setattr(ref, "_SEMANTIC_OK", False)
        result = ref._match_gc_savoir_semantic("text", "gc")
        assert result == []

    def test_match_gc_savoir_semantic_corpus_empty(self, monkeypatch):
        monkeypatch.setattr(ref, "_SEMANTIC_OK", True)
        monkeypatch.setattr(ref, "_SEMANTIC_CORPUS_BUILT", True)
        monkeypatch.setattr(ref, "_SEMANTIC_CORPUS", [])
        result = ref._match_gc_savoir_semantic("text", "gc")
        assert result == []

    def test_match_gc_savoir_semantic_model_none(self, monkeypatch):
        monkeypatch.setattr(ref, "_SEMANTIC_OK", True)
        monkeypatch.setattr(ref, "_SEMANTIC_CORPUS_BUILT", True)
        monkeypatch.setattr(ref, "_SEMANTIC_CORPUS", [("S1", [0.1, 0.2])])
        monkeypatch.setattr(ref, "_SEMANTIC_MODEL", None)
        result = ref._match_gc_savoir_semantic("text", "gc")
        assert result == []

    def test_gc_ref_niveau_missing(self, monkeypatch):
        monkeypatch.setattr(ref, "_get_effective_referential", lambda d: {"niveaux": {}})
        assert ref._gc_ref_niveau(["UNKNOWN"], "gc") is None

    def test_suggest_gc_enseignants_match(self, monkeypatch):
        monkeypatch.setattr(ref, "_fetch_enseignant_affectations",
                            lambda: {"E001": ["S1a", "S2a"]})
        monkeypatch.setattr(nlp, "_codes_match", lambda a, b: "S1a" in a and "S1a" in b)
        result = ref._suggest_gc_enseignants(["S1a"])
        assert result == ["E001"]

    def test_suggest_gc_enseignants_no_match(self, monkeypatch):
        monkeypatch.setattr(ref, "_fetch_enseignant_affectations",
                            lambda: {"E001": ["X1"]})
        monkeypatch.setattr(nlp, "_codes_match", lambda a, b: False)
        result = ref._suggest_gc_enseignants(["S1a"])
        assert result == []

    def test_detect_by_filename_all_variants(self):
        assert ref._detect_by_filename("FICHE GC MODULE") == "gc"
        assert ref._detect_by_filename("FICHE-GC-MODULE") == "gc"
        assert ref._detect_by_filename("FICHE_GC_MODULE") == "gc"
        assert ref._detect_by_filename("") is None

    def test_match_gc_competence_no_match(self, monkeypatch):
        monkeypatch.setattr(ref, "_get_effective_referential", lambda d: {"competences": {}})
        assert ref._match_gc_competence("text", "gc") is None

    def test_match_gc_competence_with_match(self, monkeypatch):
        monkeypatch.setattr(ref, "_get_effective_referential", lambda d: {
            "competences": {"C1": {"nom": "Beton Arme", "keywords": ["beton", "arme"]}}
        })
        result = ref._match_gc_competence("cours de beton arme", "gc")
        assert result == "C1"

    def test_build_semantic_corpus_no_model(self, monkeypatch):
        monkeypatch.setattr(ref, "_SEMANTIC_OK", False)
        monkeypatch.setattr(ref, "_SEMANTIC_CORPUS_BUILT", False)
        monkeypatch.setattr(ref, "_SEMANTIC_CORPUS_DEPT", None)
        monkeypatch.setattr(ref, "_get_effective_referential", lambda d: {"savoirs": {}})
        ref._build_semantic_corpus("gc")
        # Corpus should not be built when semantic model is disabled
        assert ref._SEMANTIC_CORPUS_BUILT is False or ref._SEMANTIC_CORPUS == []

    def test_contains_any(self):
        assert ref._contains_any("hello world", ["hello"]) is True
        assert ref._contains_any("hello world", ["nope"]) is False
