"""
tests/test_upload_security_extra.py — Full coverage for rice.upload_security.
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

from rice.upload_security import (
    _extension,
    _has_path_traversal,
    sanitize_filename,
    validate_upload,
    validate_uploads_batch,
    MAX_FILES_PER_REQUEST,
    MAX_FILE_SIZE_BYTES,
    MAX_TOTAL_UPLOAD_BYTES,
    MAX_FILENAME_LENGTH,
    ALLOWED_EXTENSIONS,
    MAGIC_BYTES,
)


# ── _extension ──────────────────────────────────────────────────────────────

class TestExtension:
    def test_pdf(self):
        assert _extension("fiche.pdf") == "pdf"

    def test_docx(self):
        assert _extension("module.docx") == "docx"

    def test_doc(self):
        assert _extension("old.doc") == "doc"

    def test_no_extension(self):
        assert _extension("filename") is None

    def test_empty_string(self):
        assert _extension("") is None

    def test_none_like_empty(self):
        assert _extension("") is None

    def test_uppercase_extension(self):
        assert _extension("fiche.PDF") == "pdf"

    def test_multiple_dots(self):
        assert _extension("my.fiche.module.pdf") == "pdf"


# ── _has_path_traversal ────────────────────────────────────────────────────

class TestHasPathTraversal:
    def test_double_dot(self):
        assert _has_path_traversal("../../etc/passwd") is True

    def test_forward_slash(self):
        assert _has_path_traversal("dir/file.pdf") is True

    def test_backslash(self):
        assert _has_path_traversal("dir\\file.pdf") is True

    def test_null_byte(self):
        assert _has_path_traversal("file\x00.pdf") is True

    def test_safe_filename(self):
        assert _has_path_traversal("fiche.pdf") is False

    def test_empty_string(self):
        assert _has_path_traversal("") is False


# ── sanitize_filename ───────────────────────────────────────────────────────

class TestSanitizeFilename:
    def test_normal_filename(self):
        assert sanitize_filename("fiche.pdf", 0) == "fiche.pdf"

    def test_none_filename(self):
        assert sanitize_filename(None, 0) == "file_0"

    def test_empty_filename(self):
        assert sanitize_filename("", 1) == "file_1"

    def test_path_stripping(self):
        result = sanitize_filename("some/path/fiche.pdf", 0)
        assert result == "fiche.pdf"

    def test_double_dot_removed(self):
        result = sanitize_filename("../../../fiche.pdf", 0)
        # After removing .. and taking basename, should get fiche.pdf or fallback
        assert "fiche.pdf" in result or result.startswith("file_")

    def test_long_filename_truncated(self):
        long_name = "a" * 300 + ".pdf"
        result = sanitize_filename(long_name, 0)
        assert len(result) <= MAX_FILENAME_LENGTH

    def test_index_used_for_fallback(self):
        assert sanitize_filename(None, 5) == "file_5"


# ── validate_upload ─────────────────────────────────────────────────────────

class TestValidateUpload:
    def test_valid_pdf(self):
        content = b"%PDF-1.4 some content"
        assert validate_upload("fiche.pdf", content) is None

    def test_valid_docx(self):
        content = b"PK\x03\x04 some zip content"
        assert validate_upload("module.docx", content) is None

    def test_empty_file(self):
        err = validate_upload("fiche.pdf", b"")
        assert err is not None
        assert "vide" in err.lower()

    def test_oversized_file(self):
        content = b"%PDF" + b"x" * (MAX_FILE_SIZE_BYTES + 1)
        err = validate_upload("fiche.pdf", content)
        assert err is not None
        assert "volumineux" in err.lower()

    def test_path_traversal_filename(self):
        err = validate_upload("../../etc/passwd", b"%PDF content")
        assert err is not None
        assert "invalide" in err.lower()

    def test_empty_filename(self):
        err = validate_upload("", b"%PDF content")
        assert err is not None

    def test_long_filename(self):
        name = "a" * 300 + ".pdf"
        err = validate_upload(name, b"%PDF content")
        assert err is not None
        assert "long" in err.lower()

    def test_disallowed_extension(self):
        err = validate_upload("malware.exe", b"some content")
        assert err is not None
        assert "non autorisee" in err.lower()

    def test_no_extension(self):
        err = validate_upload("filename", b"some content")
        assert err is not None

    def test_magic_bytes_mismatch_pdf(self):
        err = validate_upload("fiche.pdf", b"Not a PDF content here")
        assert err is not None
        assert "invalide" in err.lower()

    def test_magic_bytes_mismatch_docx(self):
        err = validate_upload("module.docx", b"Not a ZIP/DOCX file")
        assert err is not None

    def test_valid_doc_magic(self):
        content = b"\xD0\xCF\x11\xE0" + b"rest of doc"
        assert validate_upload("old.doc", content) is None

    def test_txt_file_now_allowed(self):
        # txt is now an allowed extension
        assert validate_upload("notes.txt", b"some text content") is None


# ── validate_uploads_batch ──────────────────────────────────────────────────

class TestValidateUploadsBatch:
    def test_valid_batch(self):
        filenames = ["fiche.pdf"]
        contents = [b"%PDF-1.4 content"]
        assert validate_uploads_batch(filenames, contents) is None

    def test_mismatched_lengths(self):
        err = validate_uploads_batch(["a.pdf"], [b"%PDF", b"extra"])
        assert err is not None
        assert "Incoherence" in err

    def test_empty_batch(self):
        err = validate_uploads_batch([], [])
        assert err is not None
        assert "Au moins" in err

    def test_too_many_files(self):
        filenames = [f"f{i}.pdf" for i in range(MAX_FILES_PER_REQUEST + 1)]
        contents = [b"%PDF content"] * len(filenames)
        err = validate_uploads_batch(filenames, contents)
        assert err is not None
        assert "Trop" in err

    def test_total_size_exceeded(self):
        filenames = ["big.pdf"]
        contents = [b"%PDF" + b"x" * (MAX_TOTAL_UPLOAD_BYTES + 1)]
        err = validate_uploads_batch(filenames, contents)
        assert err is not None
        assert "Volume" in err

    def test_first_invalid_file_returned(self):
        filenames = ["bad.exe", "good.pdf"]
        contents = [b"exe content", b"%PDF content"]
        err = validate_uploads_batch(filenames, contents)
        assert err is not None
        assert "bad.exe" in err
