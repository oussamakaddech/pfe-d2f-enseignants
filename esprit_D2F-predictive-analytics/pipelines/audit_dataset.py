"""Audit complet du dataset avant nettoyage.

Produit :
  reports/dataset_audit_before.json
  reports/dataset_audit_before.md
"""
from __future__ import annotations

import hashlib
import json
from pathlib import Path

import numpy as np
import pandas as pd

BASE_DIR = Path(__file__).parent.parent
CLEAN_DIR = BASE_DIR / "data" / "clean"
REPORTS_DIR = BASE_DIR / "reports"
REPORTS_DIR.mkdir(parents=True, exist_ok=True)

# Dataset principal à auditer
DATASET_PATH = CLEAN_DIR / "training_corpus_provenanced_v110.csv"


def _dataset_hash(df: pd.DataFrame) -> str:
    canonical = df.copy().sort_values(by=df.columns.tolist()).reset_index(drop=True)
    return hashlib.sha256(canonical.to_csv(index=False).encode("utf-8")).hexdigest()


def _audit(df: pd.DataFrame) -> dict:
    """Audit complet du dataset."""
    # Identifiants
    total_rows = len(df)
    distinct_teachers = int(df["teacher_id"].nunique()) if "teacher_id" in df.columns else 0
    distinct_competencies = int(df["competence_id"].nunique()) if "competence_id" in df.columns else 0

    # Départements / UP — pas dans ce dataset, à chercher ailleurs
    distinct_departments = 0
    distinct_units = 0

    # Période
    if "date_t" in df.columns:
        dates = pd.to_datetime(df["date_t"], errors="coerce")
        min_ref_date = str(dates.min().date()) if dates.notna().any() else None
        max_ref_date = str(dates.max().date()) if dates.notna().any() else None
    else:
        min_ref_date = max_ref_date = None

    # Provenance
    synthetic_rows = int(df["is_synthetic"].astype(bool).sum()) if "is_synthetic" in df.columns else 0
    real_rows = total_rows - synthetic_rows

    # Valeurs manquantes
    missing_values = {}
    for col in df.columns:
        n_missing = int(df[col].isna().sum())
        if n_missing > 0:
            missing_values[col] = n_missing

    # Doublons
    duplicate_rows = int(df.duplicated().sum())
    dup_functional = int(df.duplicated(subset=["teacher_id", "competence_id", "ref_month"]).sum()) \
        if all(c in df.columns for c in ["teacher_id", "competence_id", "ref_month"]) else 0

    # Dates invalides
    invalid_dates = 0
    if "date_t" in df.columns:
        invalid_dates = int(pd.to_datetime(df["date_t"], errors="coerce").isna().sum())

    # Valeurs hors plage
    out_of_range = {}
    range_checks = {
        "current_level_t3": (1, 5), "current_level_t2": (1, 5),
        "current_level_t1": (1, 5), "current_level_t": (1, 5),
        "gap_next_3m": (0, 5),
        "taux_assiduite": (0, 1),
        "avg_eval_score": (0, 5),
        "competency_coverage_rate": (0, 1),
        "training_frequency_per_month": (0, 10),
    }
    for col, (lo, hi) in range_checks.items():
        if col in df.columns:
            vals = pd.to_numeric(df[col], errors="coerce")
            n_oob = int(((vals < lo) | (vals > hi)).sum())
            if n_oob > 0:
                out_of_range[col] = n_oob

    # Fuites temporelles candidates
    leakage_candidates = []
    forbidden = ["required_level", "gap_next_3m", "future_gap", "future_level",
                 "future_evaluation", "future_attendance"]
    for col in forbidden:
        if col in df.columns:
            leakage_candidates.append(col)

    # Déséquilibre de la cible
    target_dist = {}
    if "gap_next_3m" in df.columns:
        target = pd.to_numeric(df["gap_next_3m"], errors="coerce")
        target_dist = {
            "min": float(target.min()) if target.notna().any() else None,
            "max": float(target.max()) if target.notna().any() else None,
            "mean": float(target.mean()) if target.notna().any() else None,
            "std": float(target.std()) if target.notna().any() else None,
            "zeros": int((target == 0).sum()),
            "non_zeros": int((target > 0).sum()),
        }

    return {
        "dataset_path": str(DATASET_PATH),
        "dataset_version": str(df["dataset_version"].iloc[0]) if "dataset_version" in df.columns else "unknown",
        "dataset_hash": _dataset_hash(df),
        "total_rows": total_rows,
        "distinct_teachers": distinct_teachers,
        "distinct_competencies": distinct_competencies,
        "distinct_departments": distinct_departments,
        "distinct_units": distinct_units,
        "min_ref_date": min_ref_date,
        "max_ref_date": max_ref_date,
        "target": "gap_next_3m",
        "feature_count": int(len([c for c in df.columns if c not in [
            "teacher_id", "competence_id", "competence_code", "ref_month", "date_t",
            "source_type", "source_id", "is_synthetic", "created_at", "dataset_version",
            "gap_next_3m"
        ]])),
        "synthetic_rows": synthetic_rows,
        "real_rows": real_rows,
        "missing_values": missing_values,
        "duplicate_rows": duplicate_rows,
        "duplicate_functional": dup_functional,
        "invalid_dates": invalid_dates,
        "out_of_range_values": out_of_range,
        "leakage_candidates": leakage_candidates,
        "target_distribution": target_dist,
        "columns": list(df.columns),
    }


def main() -> int:
    print("=" * 70)
    print("AUDIT COMPLET DU DATASET (AVANT NETTOYAGE)")
    print("=" * 70)

    if not DATASET_PATH.exists():
        print(f"[ERROR] Dataset introuvable : {DATASET_PATH}")
        return 1

    df = pd.read_csv(DATASET_PATH)
    print(f"[1] Dataset chargé : {len(df)} lignes, {len(df.columns)} colonnes")

    audit = _audit(df)

    # Écriture JSON
    json_path = REPORTS_DIR / "dataset_audit_before.json"
    json_path.write_text(json.dumps(audit, indent=2, ensure_ascii=False), encoding="utf-8")
    print(f"[2] Audit JSON : {json_path}")

    # Écriture Markdown
    md_lines = [
        "# Audit du dataset (avant nettoyage)",
        "",
        f"- **Dataset** : `{audit['dataset_path']}`",
        f"- **Version** : `{audit['dataset_version']}`",
        f"- **Hash SHA-256** : `{audit['dataset_hash']}`",
        f"- **Lignes totales** : {audit['total_rows']}",
        f"- **Enseignants distincts** : {audit['distinct_teachers']}",
        f"- **Compétences distinctes** : {audit['distinct_competencies']}",
        f"- **Départements** : {audit['distinct_departments']}",
        f"- **UP** : {audit['distinct_units']}",
        f"- **Période** : {audit['min_ref_date']} → {audit['max_ref_date']}",
        f"- **Cible** : `{audit['target']}`",
        f"- **Nombre de features** : {audit['feature_count']}",
        f"- **Lignes réelles** : {audit['real_rows']}",
        f"- **Lignes synthétiques** : {audit['synthetic_rows']}",
        "",
        "## Valeurs manquantes",
        "",
    ]
    if audit["missing_values"]:
        for col, n in audit["missing_values"].items():
            md_lines.append(f"- `{col}` : {n}")
    else:
        md_lines.append("- Aucune valeur manquante.")

    md_lines += [
        "",
        "## Doublons",
        "",
        f"- Doublons exacts : {audit['duplicate_rows']}",
        f"- Doublons fonctionnels (teacher_id, competence_id, ref_month) : {audit['duplicate_functional']}",
        "",
        "## Dates invalides",
        "",
        f"- {audit['invalid_dates']}",
        "",
        "## Valeurs hors plage",
        "",
    ]
    if audit["out_of_range_values"]:
        for col, n in audit["out_of_range_values"].items():
            md_lines.append(f"- `{col}` : {n}")
    else:
        md_lines.append("- Aucune valeur hors plage.")

    md_lines += [
        "",
        "## Fuites temporelles candidates",
        "",
    ]
    if audit["leakage_candidates"]:
        for col in audit["leakage_candidates"]:
            md_lines.append(f"- `{col}`")
    else:
        md_lines.append("- Aucune.")

    md_lines += [
        "",
        "## Distribution de la cible",
        "",
    ]
    for k, v in audit["target_distribution"].items():
        md_lines.append(f"- **{k}** : {v}")

    md_path = REPORTS_DIR / "dataset_audit_before.md"
    md_path.write_text("\n".join(md_lines), encoding="utf-8")
    print(f"[3] Audit Markdown : {md_path}")

    # Affichage résumé
    print(f"\nRésumé :")
    print(f"  lignes={audit['total_rows']}, enseignants={audit['distinct_teachers']}, "
          f"compétences={audit['distinct_competencies']}")
    print(f"  réelles={audit['real_rows']}, synthétiques={audit['synthetic_rows']}")
    print(f"  période={audit['min_ref_date']} → {audit['max_ref_date']}")
    print(f"  doublons={audit['duplicate_rows']}, dates_invalides={audit['invalid_dates']}")
    print(f"  fuites_candidates={audit['leakage_candidates']}")

    return 0


if __name__ == "__main__":
    raise SystemExit(main())