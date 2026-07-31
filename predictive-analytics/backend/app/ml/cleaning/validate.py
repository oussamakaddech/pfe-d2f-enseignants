"""Validation de schéma et règles métier sur les datasets."""

from __future__ import annotations

from dataclasses import dataclass, field
from datetime import date

import pandas as pd


@dataclass
class ValidationIssue:
    dataset: str
    row_index: int
    column: str
    severity: str  # ERROR | WARNING
    message: str

    def to_dict(self) -> dict:
        return {
            "dataset": self.dataset,
            "row_index": self.row_index,
            "column": self.column,
            "severity": self.severity,
            "message": self.message,
        }


@dataclass
class ValidationReport:
    issues: list[ValidationIssue] = field(default_factory=list)

    def add(
        self,
        dataset: str,
        row_index: int,
        column: str,
        severity: str,
        message: str,
    ) -> None:
        self.issues.append(ValidationIssue(dataset, row_index, column, severity, message))

    @property
    def errors(self) -> list[ValidationIssue]:
        return [i for i in self.issues if i.severity == "ERROR"]

    @property
    def warnings(self) -> list[ValidationIssue]:
        return [i for i in self.issues if i.severity == "WARNING"]

    def has_errors(self) -> bool:
        return bool(self.errors)


LEVELS = {"1", "2", "3", "4", "5", "N1", "N2", "N3", "N4", "N5"}


def validate_schema(
    df: pd.DataFrame,
    dataset: str,
    required_columns: list[str],
    numeric_columns: list[str] | None = None,
    date_columns: list[str] | None = None,
    enum_columns: dict[str, set[str]] | None = None,
    report: ValidationReport | None = None,
) -> ValidationReport:
    report = report or ValidationReport()
    numeric_columns = numeric_columns or []
    date_columns = date_columns or []
    enum_columns = enum_columns or {}

    for colname in required_columns:
        if colname not in df.columns:
            report.add(dataset, 0, colname, "ERROR", f"colonne obligatoire absente: {colname}")

    for colname in numeric_columns:
        if colname not in df.columns:
            continue
        for idx, val in df[colname].items():
            if pd.isna(val):
                continue
            try:
                float(val)
            except (TypeError, ValueError):
                report.add(dataset, idx, colname, "ERROR", f"valeur non numérique: {val!r}")

    for colname in date_columns:
        if colname not in df.columns:
            continue
        for idx, val in df[colname].items():
            if pd.isna(val) or val == "":
                continue
            try:
                pd.to_datetime(val)
            except (TypeError, ValueError):
                report.add(dataset, idx, colname, "ERROR", f"date invalide: {val!r}")

    for colname, allowed in enum_columns.items():
        if colname not in df.columns:
            continue
        for idx, val in df[colname].items():
            if pd.isna(val):
                continue
            if str(val).strip().upper() not in allowed:
                report.add(dataset, idx, colname, "ERROR", f"enum invalide: {val!r}")

    return report


def validate_level_range(
    df: pd.DataFrame,
    column: str,
    dataset: str,
    report: ValidationReport | None = None,
    *,
    critical: bool = True,
) -> ValidationReport:
    report = report or ValidationReport()
    if column not in df.columns:
        return report
    for idx, val in df[column].items():
        if pd.isna(val):
            continue
        text = str(val).strip().upper()
        if text not in LEVELS:
            report.add(
                dataset, idx, column, "ERROR" if critical else "WARNING",
                f"niveau hors plage N1..N5: {val!r}",
            )
            continue
        n = int(text[1:]) if text.startswith("N") else int(text)
        if n < 1 or n > 5:
            report.add(
                dataset, idx, column, "ERROR" if critical else "WARNING",
                f"niveau hors plage 1..5: {val!r}",
            )
    return report


def validate_date_order(
    df: pd.DataFrame,
    start_col: str,
    end_col: str,
    dataset: str,
    report: ValidationReport | None = None,
) -> ValidationReport:
    report = report or ValidationReport()
    if start_col not in df.columns or end_col not in df.columns:
        return report
    for idx, row in df.iterrows():
        start = row.get(start_col)
        end = row.get(end_col)
        if pd.isna(start) or pd.isna(end):
            continue
        try:
            if pd.to_datetime(end) < pd.to_datetime(start):
                report.add(
                    dataset, idx, end_col, "ERROR",
                    f"{end_col} < {start_col}",
                )
        except (TypeError, ValueError):
            continue
    return report
