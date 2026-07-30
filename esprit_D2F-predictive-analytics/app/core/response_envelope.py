"""Response envelope helpers for the analytics service.

Provides typed constants and helper functions for annotating API responses
with their data source / analysis status, so the frontend can display
appropriate warnings when data is incomplete or stale.

Status values (analysis_status):
  - READY          : Full DB pipeline data, up-to-date.
  - DATA_INCOMPLETE: DB record exists but some fields are missing/zeroed
                     (e.g. CSV fallback for risk score).
  - NOT_FOUND      : No data at all for this teacher.
  - STALE_DATA     : DB record exists but exceeds the staleness threshold.
  - COMPUTATION_FAILED: Pipeline ran but errored on this teacher.
  - MODEL_FALLBACK : ML model unavailable; heuristic used instead.

Data source values (data_source):
  - db           : TeacherRiskProfile / SkillGap / Recommendation table.
  - csv_fallback : Master CSV dataset (risk_scores.csv, teachers.csv).
  - cache        : Cached dashboard snapshot.
  - heuristic    : Rule-based fallback (no model).
  - ml_model     : Predictive model output.
"""

from __future__ import annotations

from typing import Any

# ── Status constants ─────────────────────────────────────────
READY = "READY"
DATA_INCOMPLETE = "DATA_INCOMPLETE"
NOT_FOUND = "NOT_FOUND"
STALE_DATA = "STALE_DATA"
COMPUTATION_FAILED = "COMPUTATION_FAILED"
MODEL_FALLBACK = "MODEL_FALLBACK"

# ── Data source constants ────────────────────────────────────
SRC_DB = "db"
SRC_CSV = "csv_fallback"
SRC_CACHE = "cache"
SRC_HEURISTIC = "heuristic"
SRC_ML = "ml_model"

# ── Staleness threshold (hours) ──────────────────────────────
STALENESS_THRESHOLD_HOURS = 24


def ready(data: dict[str, Any], *, data_source: str = SRC_DB) -> dict[str, Any]:
    """Wrap a response dict with READY status."""
    data["analysis_status"] = READY
    data["data_source"] = data_source
    return data


def data_incomplete(
    data: dict[str, Any],
    *,
    data_source: str = SRC_CSV,
    warnings: list[str] | None = None,
) -> dict[str, Any]:
    """Wrap a response dict with DATA_INCOMPLETE status and optional warnings."""
    data["analysis_status"] = DATA_INCOMPLETE
    data["data_source"] = data_source
    if warnings:
        data["warnings"] = warnings
    return data


def not_found(
    data: dict[str, Any],
    *,
    message: str = "Resource not found",
) -> dict[str, Any]:
    """Wrap a response dict with NOT_FOUND status."""
    data["analysis_status"] = NOT_FOUND
    data["data_source"] = None
    data["warnings"] = [message]
    return data


def model_fallback(
    data: dict[str, Any],
    *,
    warnings: list[str] | None = None,
) -> dict[str, Any]:
    """Wrap a response dict with MODEL_FALLBACK status."""
    data["analysis_status"] = MODEL_FALLBACK
    data["data_source"] = SRC_HEURISTIC
    if warnings:
        data["warnings"] = warnings
    return data


def stale_data(
    data: dict[str, Any],
    *,
    hours_old: float,
    warnings: list[str] | None = None,
) -> dict[str, Any]:
    """Wrap a response dict with STALE_DATA status."""
    data["analysis_status"] = STALE_DATA
    data["data_source"] = data.get("data_source", SRC_DB)
    msg = f"Data is {hours_old:.1f}h old (threshold: {STALENESS_THRESHOLD_HOURS}h)"
    data.setdefault("warnings", []).append(msg)
    if warnings:
        data["warnings"].extend(warnings)
    return data


def computation_failed(
    data: dict[str, Any],
    *,
    error: str,
) -> dict[str, Any]:
    """Wrap a response dict with COMPUTATION_FAILED status."""
    data["analysis_status"] = COMPUTATION_FAILED
    data["data_source"] = None
    data["warnings"] = [f"Computation failed: {error}"]
    return data
