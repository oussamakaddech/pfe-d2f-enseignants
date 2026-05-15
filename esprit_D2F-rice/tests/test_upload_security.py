"""Tests for rice/upload_security.py — upload validation."""
from __future__ import annotations

import os
import sys
from pathlib import Path

# Make rice package importable from this test directory.
PROJECT_ROOT = Path(__file__).resolve().parent.parent
if str(PROJECT_ROOT) not in sys.path:
    sys.path.insert(0, str(PROJECT_ROOT))

# Stub mandatory env vars used by rice/jwt_middleware at import time.
os.environ.setdefault("JWT_SECRET", "test-secret-" + ("x" * 60))
os.environ.setdefault("APP_ENV", "test")

from rice.upload_security import (  # noqa: E402
    MAX_FILES_PER_REQUEST,
    MAX_FILE_SIZE_BYTES,
    sanitize_filename,
    validate_upload,
    validate_uploads_batch,
)


# ---- sanitize_filename ------------------------------------------------------

def test_sanitize_keeps_legitimate_filename():
    assert sanitize_filename("rapport_2026.pdf", 0) == "rapport_2026.pdf"


def test_sanitize_strips_path_components():
    assert sanitize_filename("../../etc/passwd", 0) == "file_0"


def test_sanitize_empty_falls_back_to_index():
    assert sanitize_filename("", 5) == "file_5"
    assert sanitize_filename(None, 7) == "file_7"


def test_sanitize_truncates_too_long_names():
    long = "a" * 500 + ".pdf"
    out = sanitize_filename(long, 0)
    assert len(out) <= 255


# ---- validate_upload --------------------------------------------------------

def test_validate_rejects_empty_content():
    err = validate_upload("test.pdf", b"")
    assert err and "vide" in err.lower()


def test_validate_rejects_oversized_content():
    big = b"%PDF" + b"x" * (MAX_FILE_SIZE_BYTES + 1)
    err = validate_upload("big.pdf", big)
    assert err and "volumineux" in err.lower()


def test_validate_rejects_bad_extension():
    err = validate_upload("malicious.exe", b"MZ\x90\x00")
    assert err and "extension" in err.lower()


def test_validate_rejects_path_traversal():
    err = validate_upload("../etc/passwd", b"%PDF")
    assert err and "invalide" in err.lower()


def test_validate_rejects_fake_pdf():
    err = validate_upload("fake.pdf", b"\x00\x01\x02\x03")
    assert err and "signature" in err.lower()


def test_validate_accepts_real_pdf():
    real_pdf = b"%PDF-1.4\n%random binary content"
    assert validate_upload("real.pdf", real_pdf) is None


def test_validate_accepts_docx():
    real_docx = b"PK\x03\x04" + b"x" * 100
    assert validate_upload("doc.docx", real_docx) is None


def test_validate_accepts_doc_ole2():
    real_doc = b"\xD0\xCF\x11\xE0" + b"x" * 100
    assert validate_upload("doc.doc", real_doc) is None


# ---- validate_uploads_batch -------------------------------------------------

def test_batch_rejects_empty_list():
    err = validate_uploads_batch([], [])
    assert err is not None


def test_batch_rejects_too_many_files():
    names = [f"f{i}.pdf" for i in range(MAX_FILES_PER_REQUEST + 1)]
    contents = [b"%PDF"] * (MAX_FILES_PER_REQUEST + 1)
    err = validate_uploads_batch(names, contents)
    assert err and "trop de fichiers" in err.lower()


def test_batch_accepts_valid_batch():
    names = ["a.pdf", "b.docx"]
    contents = [b"%PDF-1.4", b"PK\x03\x04abc"]
    assert validate_uploads_batch(names, contents) is None


def test_batch_stops_at_first_error():
    names = ["good.pdf", "bad.exe"]
    contents = [b"%PDF-1.4", b"MZ"]
    err = validate_uploads_batch(names, contents)
    assert err and "bad.exe" in err
