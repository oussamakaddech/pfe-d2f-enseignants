"""Defense-in-depth validation for RICE upload endpoints.

Validates uploaded fiches (PDF/DOCX) before they are passed to heavy parsers
(pdfplumber, pymupdf, pytesseract, docx). Catches the most common attack
vectors without requiring an external antivirus:

- Empty / oversized files (DoS via parser memory)
- Too many files in a single request (DoS)
- MIME / extension / magic bytes mismatch (smuggled payloads)
- Path-traversal in filenames (storage write outside expected dir)

For full malware scanning, deploy ClamAV on infra side and pipe uploads
through it before reaching the application.
"""
from __future__ import annotations

import os
from typing import Iterable, Optional, Sequence

# Limits (overridable via environment variables for ops flexibility).
MAX_FILES_PER_REQUEST = int(os.getenv("RICE_MAX_FILES_PER_REQUEST", "20"))
MAX_FILE_SIZE_BYTES = int(os.getenv("RICE_MAX_FILE_SIZE_BYTES", str(20 * 1024 * 1024)))  # 20 MB
MAX_TOTAL_UPLOAD_BYTES = int(os.getenv("RICE_MAX_TOTAL_UPLOAD_BYTES", str(100 * 1024 * 1024)))  # 100 MB
MAX_FILENAME_LENGTH = 255

ALLOWED_EXTENSIONS = frozenset({"pdf", "docx", "doc"})

# Magic bytes for accepted formats.
MAGIC_BYTES = {
    "pdf": (b"%PDF",),
    "doc": (b"\xD0\xCF\x11\xE0",),                    # OLE2 compound
    "docx": (b"PK\x03\x04", b"PK\x05\x06", b"PK\x07\x08"),  # ZIP container
}


def _extension(filename: str) -> Optional[str]:
    if not filename or "." not in filename:
        return None
    return filename.rsplit(".", 1)[-1].lower()


def _has_path_traversal(filename: str) -> bool:
    if not filename:
        return False
    return (
        ".." in filename
        or "/" in filename
        or "\\" in filename
        or "\x00" in filename
    )


def sanitize_filename(filename: Optional[str], index: int = 0) -> str:
    """Strip path components, fall back to deterministic name if invalid."""
    if not filename:
        return f"file_{index}"
    cleaned = os.path.basename(filename.replace("..", ""))
    if not cleaned or _has_path_traversal(cleaned):
        return f"file_{index}"
    return cleaned[:MAX_FILENAME_LENGTH]


def validate_upload(filename: str, content: bytes) -> Optional[str]:
    """Validate a single upload. Returns an error message or None if OK."""
    if not content:
        return f"{filename}: fichier vide"
    if len(content) > MAX_FILE_SIZE_BYTES:
        return (
            f"{filename}: fichier trop volumineux "
            f"({len(content)} > {MAX_FILE_SIZE_BYTES} octets)"
        )
    if not filename or _has_path_traversal(filename):
        return f"Nom de fichier invalide: {filename!r}"
    if len(filename) > MAX_FILENAME_LENGTH:
        return f"Nom de fichier trop long: {len(filename)} caracteres"

    ext = _extension(filename)
    if ext not in ALLOWED_EXTENSIONS:
        return (
            f"{filename}: extension '{ext}' non autorisee. "
            f"Autorisees: {sorted(ALLOWED_EXTENSIONS)}"
        )

    signatures = MAGIC_BYTES.get(ext, ())
    if signatures and not any(content.startswith(sig) for sig in signatures):
        return (
            f"{filename}: contenu non conforme a l'extension {ext} "
            f"(signature de fichier invalide)"
        )

    return None


def validate_uploads_batch(
    filenames: Sequence[str], contents: Sequence[bytes]
) -> Optional[str]:
    """Validate a batch of uploads. Returns the first error or None."""
    if len(filenames) != len(contents):
        return "Incoherence interne : nombre de fichiers vs contenus"
    if len(filenames) == 0:
        return "Au moins un fichier est requis"
    if len(filenames) > MAX_FILES_PER_REQUEST:
        return (
            f"Trop de fichiers ({len(filenames)} > {MAX_FILES_PER_REQUEST}). "
            f"Decoupez la requete."
        )

    total = sum(len(c) for c in contents)
    if total > MAX_TOTAL_UPLOAD_BYTES:
        return (
            f"Volume total trop important ({total} > {MAX_TOTAL_UPLOAD_BYTES} octets)"
        )

    for filename, content in zip(filenames, contents):
        err = validate_upload(filename, content)
        if err:
            return err
    return None
