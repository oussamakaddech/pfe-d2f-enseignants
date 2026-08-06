"""Tests to push coverage from ~88% to ≥90%.

Targets fully-uncovered modules: upload_security, error_handlers, ratelimit,
and uncovered cache dunder methods, plus uncovered NLP/route helpers.
"""

import os
import time
from unittest.mock import MagicMock, patch

import pytest
from fastapi import FastAPI, HTTPException
from fastapi.testclient import TestClient


# ═════════════════════════════════════════════════════════════════════════════
# upload_security — 30 uncovered lines
# ═════════════════════════════════════════════════════════════════════════════

from rice.upload_security import (
    _extension,
    _has_path_traversal,
    sanitize_filename,
    validate_upload,
    validate_uploads_batch,
    MAX_FILES_PER_REQUEST,
    MAX_FILE_SIZE_BYTES,
)


class TestExtension:
    def test_pdf(self):
        assert _extension("fiche.pdf") == "pdf"

    def test_docx(self):
        assert _extension("fiche.DOCX") == "docx"

    def test_no_dot(self):
        assert _extension("nodot") is None

    def test_empty(self):
        assert _extension("") is None

    def test_hidden(self):
        assert _extension(".gitignore") == "gitignore"


class TestHasPathTraversal:
    def test_dotdot(self):
        assert _has_path_traversal("../../etc/passwd") is True

    def test_forward_slash(self):
        assert _has_path_traversal("path/to/file") is True

    def test_backslash(self):
        assert _has_path_traversal("path\\to\\file") is True

    def test_null_byte(self):
        assert _has_path_traversal("file\x00.pdf") is True

    def test_clean(self):
        assert _has_path_traversal("fiche.pdf") is False

    def test_empty(self):
        assert _has_path_traversal("") is False


class TestSanitizeFilename:
    def test_none_returns_index(self):
        assert sanitize_filename(None, 3) == "file_3"

    def test_empty_returns_index(self):
        assert sanitize_filename("", 5) == "file_5"

    def test_strips_path(self):
        result = sanitize_filename("/etc/passwd")
        assert "/" not in result

    def test_dotdot_stripped(self):
        result = sanitize_filename("../../secret.pdf")
        assert ".." not in result

    def test_long_name_truncated(self):
        long_name = "a" * 300 + ".pdf"
        result = sanitize_filename(long_name)
        assert len(result) <= 255

    def test_normal(self):
        assert sanitize_filename("fiche.pdf") == "fiche.pdf"


class TestValidateUpload:
    def test_empty_content(self):
        err = validate_upload("f.pdf", b"")
        assert err is not None
        assert "vide" in err

    def test_oversized(self):
        content = b"x" * (MAX_FILE_SIZE_BYTES + 1)
        err = validate_upload("big.pdf", content)
        assert err is not None
        assert "volumineux" in err

    def test_invalid_path_traversal(self):
        err = validate_upload("../../etc/passwd", b"some data")
        assert err is not None

    def test_long_filename(self):
        err = validate_upload("a" * 300 + ".pdf", b"data")
        assert err is not None
        assert "trop long" in err

    def test_bad_extension(self):
        err = validate_upload("file.exe", b"x" * 10)
        assert err is not None
        assert "non autorisee" in err

    def test_pdf_wrong_magic(self):
        content = b"NOT_PDF_DATA_HERE_xxxxx"
        err = validate_upload("f.pdf", content)
        assert err is not None
        assert "non conforme" in err

    def test_pdf_valid_magic(self):
        content = b"%PDF-1.4 hello"
        err = validate_upload("f.pdf", content)
        assert err is None

    def test_docx_valid_magic(self):
        content = b"PK\x03\x04hello"
        err = validate_upload("f.docx", content)
        assert err is None

    def test_doc_valid_magic(self):
        content = b"\xD0\xCF\x11\xE0hello"
        err = validate_upload("f.doc", content)
        assert err is None

    def test_txt_no_magic_check(self):
        content = b"plain text"
        err = validate_upload("f.txt", content)
        assert err is None


class TestValidateBatch:
    def test_mismatched_lengths(self):
        err = validate_uploads_batch(["a.pdf"], [b"a", b"b"])
        assert err is not None
        assert "Incoherence" in err

    def test_empty_batch(self):
        err = validate_uploads_batch([], [])
        assert err is not None
        assert "fichier est requis" in err

    def test_too_many_files(self):
        names = [f"f{i}.pdf" for i in range(MAX_FILES_PER_REQUEST + 1)]
        contents = [b"%PDF x"] * len(names)
        err = validate_uploads_batch(names, contents)
        assert err is not None
        assert "Trop de fichiers" in err

    def test_total_size_exceeded(self):
        big = b"%PDF-" + b"x" * (101 * 1024 * 1024)
        err = validate_uploads_batch(["big.pdf"], [big])
        assert err is not None
        assert "Volume total" in err

    def test_valid_batch(self):
        err = validate_uploads_batch(
            ["a.pdf", "b.txt"],
            [b"%PDF-1.4", b"plain text"],
        )
        assert err is None


# ═════════════════════════════════════════════════════════════════════════════
# error_handlers — 29 uncovered lines
# ═════════════════════════════════════════════════════════════════════════════

from rice.error_handlers import register_exception_handlers


class TestErrorHandlers:
    def _make_app(self):
        app = FastAPI()
        register_exception_handlers(app, "RICE")

        @app.get("/ok")
        def ok():
            return {"status": "ok"}

        @app.get("/http-error")
        def http_err():
            raise HTTPException(404, "ressource introuvable")

        @app.get("/val-error")
        def val_err():
            raise HTTPException(422, "champ manquant")

        @app.get("/gen-error")
        def gen_err():
            raise RuntimeError("something broke")

        return app

    def test_http_exception_handler(self):
        app = self._make_app()
        client = TestClient(app, raise_server_exceptions=False)
        r = client.get("/http-error")
        assert r.status_code == 404
        body = r.json()
        assert body["errorCode"] == "RICE-404"
        assert "introuvable" in body["message"]
        assert body["path"] == "/http-error"

    def test_validation_error_handler(self):
        app = self._make_app()
        client = TestClient(app, raise_server_exceptions=False)
        r = client.get("/val-error")
        assert r.status_code == 422
        body = r.json()
        assert body["errorCode"] == "RICE-422"

    def test_generic_exception_handler(self):
        app = self._make_app()
        client = TestClient(app, raise_server_exceptions=False)
        r = client.get("/gen-error")
        assert r.status_code == 500
        body = r.json()
        assert body["errorCode"] == "RICE-500"

    def test_trace_id_from_header(self):
        app = self._make_app()
        client = TestClient(app, raise_server_exceptions=False)
        r = client.get("/http-error", headers={"X-Trace-Id": "abc-123"})
        assert r.json()["traceId"] == "abc-123"


# ═════════════════════════════════════════════════════════════════════════════
# ratelimit — 30 uncovered lines
# ═════════════════════════════════════════════════════════════════════════════

from rice.ratelimit import (
    _check_rate,
    _cleanup_stale,
    _get_client_ip,
    RateLimitMiddleware,
    _counters,
    RATE_LIMIT,
    RATE_WINDOW,
)


class TestCheckRate:
    def test_first_request_allowed(self):
        allowed, remaining, reset = _check_rate("test_ip_1")
        assert allowed is True
        assert remaining == RATE_LIMIT - 1

    def test_exceeding_limit(self):
        ip = "test_ip_exceed"
        for _ in range(RATE_LIMIT + 1):
            _check_rate(ip)
        allowed, remaining, reset = _check_rate(ip)
        assert allowed is False
        assert remaining == 0
        _counters.pop(ip, None)

    def test_window_reset(self):
        ip = "test_ip_window"
        _counters[ip] = (RATE_LIMIT + 1, time.monotonic() - RATE_WINDOW - 1)
        allowed, remaining, reset = _check_rate(ip)
        assert allowed is True
        _counters.pop(ip, None)


class TestGetClientIp:
    def test_forwarded_for(self):
        req = MagicMock()
        req.headers = {"x-forwarded-for": "1.2.3.4, 5.6.7.8"}
        assert _get_client_ip(req) == "1.2.3.4"

    def test_no_forwarded(self):
        req = MagicMock()
        req.headers = {}
        req.client.host = "9.8.7.6"
        assert _get_client_ip(req) == "9.8.7.6"

    def test_no_client(self):
        req = MagicMock()
        req.headers = {}
        req.client = None
        assert _get_client_ip(req) == "unknown"


class TestCleanupStale:
    def setup_method(self):
        _counters.clear()
        import rice.ratelimit as _mod
        _mod._last_cleanup = 0.0  # force cleanup to run

    def test_removes_old_entries(self):
        _counters["stale_ip"] = (1, time.monotonic() - RATE_WINDOW * 3)
        _cleanup_stale()
        assert "stale_ip" not in _counters

    def test_keeps_fresh_entries(self):
        _counters["fresh_ip"] = (1, time.monotonic())
        _cleanup_stale()
        assert "fresh_ip" in _counters
        _counters.pop("fresh_ip", None)


class TestRateLimitMiddleware:
    def _make_app(self):
        app = FastAPI()
        app.add_middleware(RateLimitMiddleware)

        @app.get("/rice/analyze")
        def analyze():
            return {"status": "ok"}

        @app.get("/other")
        def other():
            return {"status": "ok"}

        return app

    def test_unprotected_path_passes(self):
        app = self._make_app()
        client = TestClient(app)
        r = client.get("/other")
        assert r.status_code == 200

    def test_protected_path_within_limit(self):
        app = self._make_app()
        client = TestClient(app)
        r = client.get("/rice/analyze")
        assert r.status_code == 200
        assert "X-RateLimit-Limit" in r.headers

    def test_protected_path_exceeds_limit(self):
        app = self._make_app()
        client = TestClient(app)
        for _ in range(RATE_LIMIT + 2):
            r = client.get("/rice/analyze")
        assert r.status_code == 429
        assert "Retry-After" in r.headers


# ═════════════════════════════════════════════════════════════════════════════
# cache — uncovered dunder methods
# ═════════════════════════════════════════════════════════════════════════════

from rice.cache import _ThreadSafeCache


class TestCacheDunderMethods:
    def test_getitem(self):
        c = _ThreadSafeCache()
        c.set("k", 42)
        assert c["k"] == 42

    def test_getitem_missing_raises(self):
        c = _ThreadSafeCache()
        with pytest.raises(KeyError):
            _ = c["missing"]

    def test_setitem(self):
        c = _ThreadSafeCache()
        c["k"] = 99
        assert c.get("k") == 99

    def test_delitem(self):
        c = _ThreadSafeCache()
        c["k"] = "v"
        del c["k"]
        assert c.get("k") is None

    def test_contains(self):
        c = _ThreadSafeCache()
        c.set("k", "v")
        assert "k" in c
        assert "missing" not in c

    def test_len(self):
        c = _ThreadSafeCache()
        assert len(c) == 0
        c.set("a", 1)
        c.set("b", 2)
        assert len(c) == 2


# ═════════════════════════════════════════════════════════════════════════════
# observability — logging_config + pii_filter
# ═════════════════════════════════════════════════════════════════════════════

from rice.observability.logging_config import configure_logging, LOGGING_CONFIG
from rice.observability.pii_filter import PIIRedactingFilter


class TestLoggingConfig:
    def test_configure_logging_runs(self):
        configure_logging()

    def test_config_dict_structure(self):
        assert LOGGING_CONFIG["version"] == 1
        assert "console" in LOGGING_CONFIG["handlers"]


class TestPIIFilter:
    def test_filter_exists(self):
        f = PIIRedactingFilter()
        assert f is not None

    def test_filter_no_pii(self):
        f = PIIRedactingFilter()
        record = MagicMock()
        record.msg = "Hello world"
        record.args = None
        result = f.filter(record)
        assert result is True

    def test_filter_masks_email(self):
        f = PIIRedactingFilter()
        record = MagicMock()
        record.msg = "Contact: test@example.com"
        record.args = None
        f.filter(record)
        assert "test@example.com" not in record.msg

    def test_filter_masks_cin(self):
        f = PIIRedactingFilter()
        record = MagicMock()
        record.msg = "CIN: 12345678"
        record.args = None
        f.filter(record)
        assert "12345678" not in record.msg


# ═════════════════════════════════════════════════════════════════════════════
# validate_helpers — _build_validate_summary (lines 229-245)
# ═════════════════════════════════════════════════════════════════════════════

from rice.validate_helpers import _build_validate_summary
import logging


class TestBuildValidateSummary:
    def test_summary_with_errors(self):
        counts = {
            "upserted_domaines": 2,
            "upserted_competences": 5,
            "upserted_sous_competences": 3,
            "inserted_savoirs": 10,
            "updated_savoirs": 4,
            "inserted_links": 8,
        }
        errors = ["err1", "err2", "err3"]
        logger = logging.getLogger("test")
        summary = _build_validate_summary(counts, errors, logger)
        assert summary.status == "ok"
        assert summary.upserted_domaines == 2
        assert len(summary.errors) == 3

    def test_summary_no_errors(self):
        counts = {
            "upserted_domaines": 1,
            "upserted_competences": 0,
            "upserted_sous_competences": 0,
            "inserted_savoirs": 0,
            "updated_savoirs": 0,
            "inserted_links": 0,
        }
        summary = _build_validate_summary(counts, [], logging.getLogger("test"))
        assert summary.status == "ok"
        assert len(summary.errors) == 0

    def test_summary_truncates_many_errors(self):
        counts = {k: 0 for k in [
            "upserted_domaines", "upserted_competences",
            "upserted_sous_competences", "inserted_savoirs",
            "updated_savoirs", "inserted_links",
        ]}
        errors = [f"err{i}" for i in range(50)]
        summary = _build_validate_summary(counts, errors, logging.getLogger("test"))
        assert len(summary.errors) == 30


# ═════════════════════════════════════════════════════════════════════════════
# llm — _llm_sync_chat alias and _LLM_TIMEOUT
# ═════════════════════════════════════════════════════════════════════════════

from rice.llm import _llm_sync_chat, _LLM_TIMEOUT


class TestLLMStub:
    def test_sync_chat_raises(self):
        with pytest.raises(RuntimeError, match="disabled"):
            _llm_sync_chat([{"role": "user", "content": "test"}])

    def test_timeout_is_int(self):
        assert isinstance(_LLM_TIMEOUT, int)


# ═════════════════════════════════════════════════════════════════════════════
# nlp — _extract_llm_text, _extract_llm_names, _extract_llm_roles,
#        _sanitize_llm_metadata, _handle_table_enseignant,
#        _handle_table_unite_pedagogique
# ═════════════════════════════════════════════════════════════════════════════

from rice.nlp import (
    _extract_llm_text,
    _extract_llm_names,
    _extract_llm_roles,
    _sanitize_llm_metadata,
    _handle_table_enseignant,
    _handle_table_unite_pedagogique,
    _handle_table_nom_module,
    _handle_table_code_module,
    _handle_table_prerequis,
    _handle_table_objectif,
)


class TestExtractLlmText:
    def test_string_value(self):
        assert _extract_llm_text("hello") == "hello"

    def test_non_string_returns_none(self):
        assert _extract_llm_text(123) is None
        assert _extract_llm_text(None) is None
        assert _extract_llm_text([1]) is None

    def test_empty_string_below_min(self):
        assert _extract_llm_text("") is None

    def test_short_string_below_min(self):
        assert _extract_llm_text("ab", min_len=3) is None

    def test_uppercase(self):
        assert _extract_llm_text("hello", uppercase=True) == "HELLO"

    def test_stripped(self):
        assert _extract_llm_text("  hello  ") == "hello"


class TestExtractLlmNames:
    def test_non_list(self):
        assert _extract_llm_names("not a list") == []

    def test_list_with_nones(self):
        result = _extract_llm_names(["Ahmed Ali", None, "", "Sara Bouazizi"])
        assert "Ahmed Ali" in result
        assert "Sara Bouazizi" in result
        assert "" not in result

    def test_empty_list(self):
        assert _extract_llm_names([]) == []


class TestExtractLlmRoles:
    def test_non_dict(self):
        assert _extract_llm_roles("not a dict") == {}

    def test_valid_roles(self):
        result = _extract_llm_roles({"Ahmed Ali": "responsable", "Sara Bouazizi": "enseignant"})
        assert len(result) == 2
        assert "responsable" in result.values()
        assert "enseignant" in result.values()

    def test_invalid_role_filtered(self):
        result = _extract_llm_roles({"Alice": "invalid_role"})
        assert "Alice" not in result


class TestSanitizeLlmMetadata:
    def test_full_metadata(self):
        result = _sanitize_llm_metadata({
            "code_module": "GL4SI",
            "nom_module": "Systemes d'Information",
            "unite_pedagogique": "Genie Logiciel",
            "responsable": "Dr. Ahmed Ben Ali",
            "enseignants_noms": ["Ahmed Ben Ali", "Sara Bouazizi"],
            "enseignants_roles": {"Ahmed Ben Ali": "responsable"},
            "prerequis": "Bases de donnees",
            "objectif": "Comprendre les systemes",
        })
        assert result["code_module"] == "GL4SI"
        assert result["nom_module"] == "Systemes d'Information"
        assert "responsable" in result

    def test_empty_metadata(self):
        assert _sanitize_llm_metadata({}) == {}

    def test_partial_metadata(self):
        result = _sanitize_llm_metadata({"code_module": "GL4SI"})
        assert "code_module" in result
        assert "nom_module" not in result


class TestHandleTableEnseignant:
    def test_single_name(self):
        meta = {}
        _handle_table_enseignant("Ahmed Ben Ali", meta)
        assert "Ahmed Ben Ali" in meta["enseignants_noms"]
        assert meta["enseignants_roles"]["Ahmed Ben Ali"] == "enseignant"

    def test_multiple_names(self):
        meta = {}
        _handle_table_enseignant("Ahmed Ben Ali, Sara Bouazizi", meta)
        assert len(meta["enseignants_noms"]) == 2


class TestHandleTableUnitePedagogique:
    def test_sets_value(self):
        meta = {}
        _handle_table_unite_pedagogique("Genie Civil", meta)
        assert meta["unite_pedagogique"] == "Genie Civil"

    def test_short_value_ignored(self):
        meta = {}
        _handle_table_unite_pedagogique("AB", meta)
        assert "unite_pedagogique" not in meta

    def test_already_set_not_overwritten(self):
        meta = {"unite_pedagogique": "Original"}
        _handle_table_unite_pedagogique("New", meta)
        assert meta["unite_pedagogique"] == "Original"


class TestHandleTableOthers:
    def test_nom_module(self):
        meta = {}
        _handle_table_nom_module("Systemes d'Information.", meta)
        assert "nom_module" in meta

    def test_code_module_with_digit(self):
        meta = {}
        _handle_table_code_module("GL4SI", meta)
        assert meta["code_module"] == "GL4SI"

    def test_code_module_no_digit(self):
        meta = {}
        _handle_table_code_module("GLSI", meta)
        assert "code_module" not in meta

    def test_prerequis(self):
        meta = {}
        _handle_table_prerequis("Bases de donnees", meta)
        assert meta["prerequis"] == "Bases de donnees"

    def test_objectif(self):
        meta = {}
        _handle_table_objectif("Comprendre les concepts", meta)
        assert "objectif" in meta
