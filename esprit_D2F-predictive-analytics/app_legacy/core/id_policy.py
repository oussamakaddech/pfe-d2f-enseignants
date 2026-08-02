"""Canonical teacher ID policy enforcement.

ENS-only format rule:
  - Canonical: ``ENS`` + 3 digits (e.g. ENS001, ENS042)
  - Legacy:    ``T``   + 3 digits (e.g. T001, T042) — REJECTED on new endpoints

The ``teacher_id_mapping`` table provides the T→ENS bridge for the
compatibility adapter (/api/v1/compat/teacher/{legacyId}).
"""

from __future__ import annotations

import re

from fastapi import HTTPException, Request

from app.core.observability import dsi_error_body

# Regexes — compiled once at import time.
_CANONICAL_ENS_RE = re.compile(r"^ENS\d{3,6}$")
_LEGACY_T_RE = re.compile(r"^T\d{3,6}$")


def is_canonical_ens(teacher_id: str) -> bool:
    """Return True if *teacher_id* matches the canonical ENS format."""
    return bool(_CANONICAL_ENS_RE.match(teacher_id.strip().upper()))


def is_legacy_t(teacher_id: str) -> bool:
    """Return True if *teacher_id* matches the legacy T-format."""
    return bool(_LEGACY_T_RE.match(teacher_id.strip().upper()))


def is_legacy_t_any(teacher_id: str) -> bool:
    """Alias kept for callers that use the ``_any`` suffix convention."""
    return is_legacy_t(teacher_id)


def validate_canonical_id(
    teacher_id: str,
    *,
    path: str | Request | None = None,
) -> str:
    """Validate that *teacher_id* is a canonical ENS ID.

    Rejects legacy T-format IDs with a 400 ``LEGACY_ID_NOT_ALLOWED`` error,
    and invalid formats with ``INVALID_TEACHER_ID``.

    Parameters
    ----------
    teacher_id:
        The raw ID from the URL path.
    path:
        The request path (for error tracing).  Accept either a string or a
        FastAPI ``Request`` object (uses ``request.url.path``).

    Returns
    -------
    str
        The normalised canonical ENS ID (uppercased, stripped).
    """
    if not teacher_id:
        raise HTTPException(
            status_code=400,
            detail=dsi_error_body(
                status=400,
                error_code="INVALID_TEACHER_ID",
                message="Teacher ID is required.",
                path=_resolve_path(path),
            ),
        )

    raw = teacher_id.strip().upper()

    if is_legacy_t(raw):
        raise HTTPException(
            status_code=400,
            detail=dsi_error_body(
                status=400,
                error_code="LEGACY_ID_NOT_ALLOWED",
                message=(
                    f"Legacy teacher ID '{raw}' is not accepted on this endpoint. "
                    "Use the canonical ENS format (e.g. ENS001). "
                    "For backward compatibility, use the /api/v1/compat/ endpoint."
                ),
                path=_resolve_path(path),
            ),
        )

    if not is_canonical_ens(raw):
        raise HTTPException(
            status_code=400,
            detail=dsi_error_body(
                status=400,
                error_code="INVALID_TEACHER_ID",
                message=(
                    f"Invalid teacher ID '{teacher_id}'. "
                    "Expected canonical ENS format (e.g. ENS001)."
                ),
                path=_resolve_path(path),
            ),
        )

    return raw


def _resolve_path(path: str | Request | None) -> str:
    if path is None:
        return "unknown"
    if isinstance(path, Request):
        return str(path.url.path)
    return str(path)
