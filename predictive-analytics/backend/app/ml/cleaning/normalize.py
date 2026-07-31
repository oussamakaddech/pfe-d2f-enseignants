"""Normalisation des IDs — ENSxxx uniquement.

- accepte ens001 / ENS 001 (spaces) -> ENS001
- mappe les IDs legacy Txxx -> ENSxxx via une table d'alias (optionnelle)
- rejette tout ID non-ENS (rapport d'erreur)
"""

from __future__ import annotations

import re
from dataclasses import dataclass, field
from pathlib import Path

import pandas as pd

TEACHER_ID_RE = re.compile(r"^ENS\d{3,6}$")
LEGACY_ID_RE = re.compile(r"^T\d{3,6}$")


class TeacherIdError(ValueError):
    pass


@dataclass
class IdNormalizationReport:
    normalized: int = 0
    mapped_legacy: int = 0
    rejected: int = 0
    rejected_rows: list[dict] = field(default_factory=list)


def normalize_teacher_id(value: object) -> str:
    if value is None:
        raise TeacherIdError("teacher_id est nul")
    text = str(value).strip().upper()
    text = text.replace(" ", "")
    if TEACHER_ID_RE.match(text):
        return text
    raise TeacherIdError(f"ID non canonique: {value!r} (ENSxxx requis)")


def load_id_aliases(path: str | Path) -> dict[str, str]:
    """Charge la table d'alias legacy->canonical (legacy_id, canonical_id)."""
    if not Path(path).exists():
        return {}
    df = pd.read_csv(path, dtype=str)
    mapping: dict[str, str] = {}
    for _, row in df.iterrows():
        legacy = str(row["legacy_id"]).strip().upper()
        canonical = normalize_teacher_id(row["canonical_id"])
        if LEGACY_ID_RE.match(legacy):
            mapping[legacy] = canonical
    return mapping


def normalize_id_column(
    series: pd.Series,
    *,
    alias_map: dict[str, str] | None = None,
    report: IdNormalizationReport | None = None,
) -> pd.Series:
    """Normalise une colonne d'IDs enseignant. Émet des erreurs collectées."""
    alias_map = alias_map or {}
    report = report or IdNormalizationReport()
    out: list[str | None] = []
    for idx, value in series.items():
        try:
            canonical = normalize_teacher_id(value)
            report.normalized += 1
            out.append(canonical)
        except TeacherIdError:
            text = str(value).strip().upper() if value is not None else ""
            if LEGACY_ID_RE.match(text) and text in alias_map:
                out.append(alias_map[text])
                report.mapped_legacy += 1
                continue
            report.rejected += 1
            report.rejected_rows.append({"row_index": idx, "raw_value": value})
            out.append(None)
    return pd.Series(out, index=series.index)
