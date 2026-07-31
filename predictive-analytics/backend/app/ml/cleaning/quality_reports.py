"""Rapports qualité — CSV + JSON + Markdown."""

from __future__ import annotations

import json
from pathlib import Path

import pandas as pd

from app.ml.cleaning.validate import ValidationReport


def render_markdown(
    summary: dict,
    validation_report: ValidationReport,
    per_dataset: dict[str, dict],
) -> str:
    lines = [
        "# Rapport de qualité des données D2F",
        "",
        f"Date: {summary.get('run_at', '')}",
        f"Statut global: **{summary.get('status', '')}**",
        f"Erreurs: {summary.get('error_count', 0)} — Warnings: {summary.get('warning_count', 0)}",
        "",
        "## Résumé par dataset",
        "",
        "| Dataset | Lignes entrées | Lignes conservées | Erreurs | Warnings |",
        "|---|---|---|---|---|",
    ]
    for name, info in per_dataset.items():
        lines.append(
            f"| {name} | {info.get('input_rows', 0)} | {info.get('kept_rows', 0)} "
            f"| {info.get('errors', 0)} | {info.get('warnings', 0)} |"
        )
    lines += ["", "## Détail des erreurs", ""]
    if validation_report.issues:
        lines.append("| Dataset | Ligne | Colonne | Sévérité | Message |")
        lines.append("|---|---|---|---|---|")
        for issue in validation_report.issues:
            lines.append(
                f"| {issue.dataset} | {issue.row_index} | {issue.column} "
                f"| {issue.severity} | {issue.message} |"
            )
    else:
        lines.append("Aucune erreur.")
    return "\n".join(lines) + "\n"


def write_reports(
    out_dir: Path,
    *,
    summary: dict,
    validation_report: ValidationReport,
    per_dataset: dict[str, dict],
) -> dict[str, Path]:
    out_dir.mkdir(parents=True, exist_ok=True)

    issues_df = pd.DataFrame([i.to_dict() for i in validation_report.issues])
    csv_path = out_dir / "validation_issues.csv"
    if not issues_df.empty:
        issues_df.to_csv(csv_path, index=False)
    else:
        pd.DataFrame(
            columns=["dataset", "row_index", "column", "severity", "message"]
        ).to_csv(csv_path, index=False)

    json_path = out_dir / "quality_report.json"
    json_path.write_text(
        json.dumps(
            {
                "summary": summary,
                "issues": [i.to_dict() for i in validation_report.issues],
                "per_dataset": per_dataset,
            },
            indent=2,
            ensure_ascii=False,
        ),
        encoding="utf-8",
    )

    md_path = out_dir / "quality_report.md"
    md_path.write_text(
        render_markdown(summary, validation_report, per_dataset), encoding="utf-8"
    )

    return {"csv": csv_path, "json": json_path, "markdown": md_path}
