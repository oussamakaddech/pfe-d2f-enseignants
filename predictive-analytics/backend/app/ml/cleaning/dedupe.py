"""Déduplication — doublons stricts et métiers, dernière version gagnante."""

from __future__ import annotations

from dataclasses import dataclass

import pandas as pd


@dataclass
class DedupReport:
    dropped_strict: int = 0
    dropped_business: int = 0
    kept: int = 0

    def to_dict(self) -> dict:
        return {
            "dropped_strict": self.dropped_strict,
            "dropped_business": self.dropped_business,
            "kept": self.kept,
        }


def deduplicate(
    df: pd.DataFrame,
    *,
    business_keys: list[str],
    version_columns: list[str] | None = None,
) -> tuple[pd.DataFrame, DedupReport]:
    """Déduplique un dataframe.

    - doublons stricts (toutes colonnes) supprimés
    - doublons métier (business_keys) résolus par dernière version gagnante:
      tri par version_columns (ex: date) desc, puis drop_duplicates keep=first.
    """
    report = DedupReport()
    before = len(df)
    df = df.copy()

    strict_dupes = df.duplicated()
    report.dropped_strict = int(strict_dupes.sum())
    df = df[~strict_dupes]

    if business_keys:
        sort_cols = version_columns or []
        if sort_cols:
            df = df.sort_values(sort_cols, ascending=False)
        df = df.drop_duplicates(subset=business_keys, keep="first")
        df = df.sort_index()

    report.kept = len(df)
    report.dropped_business = before - report.dropped_strict - len(df)
    return df, report
