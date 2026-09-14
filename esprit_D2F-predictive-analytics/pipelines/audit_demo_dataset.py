"""Audit complet du dataset synthétique démo (avant nettoyage).

Inspecte : lignes, identifiants, doublons, types, dates, valeurs manquantes,
valeurs hors plage, distributions (features + cible), provenance, granularité,
valeurs extrêmes. Ne modifie RIEN : lecture seule.

Sortie : reports/demo_dataset_audit.json
"""
from __future__ import annotations

import json
from pathlib import Path

import numpy as np
import pandas as pd

from pipelines.demo_common import FEATURE_NAMES, REQUIRED_COLUMNS, TARGET_COL

BASE_DIR = Path(__file__).parent.parent
SYNTH_DIR = BASE_DIR / "data" / "synthetic"
REPORTS_DIR = BASE_DIR / "reports"

NUMERIC_RANGES = {
    "current_observation": (0.0, 5.0),
    "knowledge_difficulty_level": (1.0, 3.0),
    TARGET_COL: (0.0, 5.0),
    "attendance_rate": (0.0, 1.0),
    "evaluation_score": (0.0, 5.0),
    "training_count": (0.0, None),
    "stagnation_months": (0.0, None),
    "need_count": (0.0, None),
    "engagement_score": (0.0, 1.0),
}


def audit_demo_dataset(
    dataset_path: Path | None = None,
    output_path: Path | None = None,
) -> dict:
    """Audite le dataset brut. Ne modifie aucune donnée."""
    path = dataset_path or (SYNTH_DIR / "demo_dataset_synthetic-v1.0.0.csv")
    if not path.exists():
        raise FileNotFoundError(f"Dataset brut introuvable : {path}")
    df = pd.read_csv(path)

    report: dict = {
        "audited_at": pd.Timestamp.now().isoformat(),
        "dataset_path": str(path),
        "rows_total": int(len(df)),
        "columns_total": int(len(df.columns)),
        "missing_required_columns": [c for c in REQUIRED_COLUMNS if c not in df.columns],
        "identifiers": {},
        "duplicates": {},
        "types": {},
        "dates": {},
        "missing_values": {},
        "out_of_range": {},
        "feature_distribution": {},
        "target_distribution": {},
        "provenance": {},
        "granularity": {},
        "extremes": {},
    }

    # Identifiants
    ids = df["teacher_id"].astype(str)
    report["identifiers"] = {
        "n_teachers": int(ids.nunique()),
        "sample_teachers": sorted(ids.unique().tolist())[:5],
        "all_synthetic_prefix": bool(ids.str.startswith("SYN_T").all()),
        "real_like_prefix_found": sorted(
            {p for p in ("ENS_T", "USR_", "ADM_") if ids.str.startswith(p).any()}
        ),
        "n_competencies": int(df["competence_id"].nunique()),
    }

    # Doublons
    keys = ["teacher_id", "competence_id", "ref_month"]
    report["duplicates"] = {
        "exact_duplicates": int(df.duplicated().sum()),
        "functional_duplicates": int(df.duplicated(subset=keys).sum()),
        "keys": keys,
    }

    # Types
    for col in ["current_observation", "attendance_rate", "evaluation_score",
                "training_count", "stagnation_months", "need_count", "engagement_score",
                TARGET_COL]:
        series = pd.to_numeric(df[col], errors="coerce")
        report["types"][col] = {
            "stored_dtype": str(df[col].dtype),
            "n_non_numeric": int(series.isna().sum() - df[col].isna().sum()),
        }

    # Dates
    dates = pd.to_datetime(df["ref_month"], errors="coerce")
    date_t = pd.to_datetime(df["date_t"], errors="coerce")
    report["dates"] = {
        "n_invalid_ref_month": int(dates.isna().sum()),
        "n_invalid_date_t": int(date_t.isna().sum()),
        "min_ref_month": dates.min().strftime("%Y-%m-%d") if dates.notna().any() else None,
        "max_ref_month": dates.max().strftime("%Y-%m-%d") if dates.notna().any() else None,
        "n_months": int(dates.dt.to_period("M").nunique()),
        "ordered_monotonic_per_pair": bool(
            df.assign(pm=dates.dt.to_period("M"))
            .sort_values(["teacher_id", "competence_id", "pm"])
            .groupby(["teacher_id", "competence_id"])["pm"]
            .apply(lambda s: s.is_monotonic_increasing)
            .all()
        ),
    }

    # Valeurs manquantes
    report["missing_values"] = {
        col: int(df[col].isna().sum()) for col in df.columns if int(df[col].isna().sum()) > 0
    }

    # Hors plage
    ooo: dict[str, dict] = {}
    for col, (lo, hi) in NUMERIC_RANGES.items():
        s = pd.to_numeric(df[col], errors="coerce")
        mask = s.isna()
        if lo is not None:
            mask |= s < lo
        if hi is not None:
            mask |= s > hi
        n_out = int(mask.sum())
        if n_out:
            ooo[col] = {"range": [lo, hi], "n_out_of_range": n_out, "sample": s[mask].head(5).tolist()}
    report["out_of_range"] = ooo

    # Distributions features
    for col in FEATURE_NAMES:
        s = pd.to_numeric(df[col], errors="coerce")
        report["feature_distribution"][col] = {
            "mean": round(float(s.mean()), 4) if s.notna().any() else None,
            "std": round(float(s.std()), 4) if s.notna().any() else None,
            "min": round(float(s.min()), 4) if s.notna().any() else None,
            "q25": round(float(s.quantile(0.25)), 4) if s.notna().any() else None,
            "median": round(float(s.median()), 4) if s.notna().any() else None,
            "q75": round(float(s.quantile(0.75)), 4) if s.notna().any() else None,
            "max": round(float(s.max()), 4) if s.notna().any() else None,
            "missing": int(s.isna().sum()),
        }

    # Distribution cible
    s = pd.to_numeric(df[TARGET_COL], errors="coerce")
    report["target_distribution"] = {
        "mean": round(float(s.mean()), 4) if s.notna().any() else None,
        "std": round(float(s.std()), 4) if s.notna().any() else None,
        "min": round(float(s.min()), 4) if s.notna().any() else None,
        "q25": round(float(s.quantile(0.25)), 4) if s.notna().any() else None,
        "median": round(float(s.median()), 4) if s.notna().any() else None,
        "q75": round(float(s.quantile(0.75)), 4) if s.notna().any() else None,
        "max": round(float(s.max()), 4) if s.notna().any() else None,
        "histogram": {str(k): int(v) for k, v in s.round(1).value_counts().sort_index().head(12).items()},
    }

    # Provenance
    report["provenance"] = {
        "data_origin_values": df["data_origin"].value_counts().to_dict() if "data_origin" in df.columns else {},
        "is_synthetic_true_share": float((df["is_synthetic"].astype(str).str.lower() == "true").mean()) if "is_synthetic" in df.columns else None,
        "institutional_verified_false_share": float((df["institutional_verified"].astype(str).str.lower() == "false").mean()) if "institutional_verified" in df.columns else None,
        "source_type_values": df["source_type"].value_counts().to_dict() if "source_type" in df.columns else {},
        "generation_seed_values": df["generation_seed"].value_counts().to_dict() if "generation_seed" in df.columns else {},
    }

    # Granularité
    report["granularity"] = {
        "rows_per_teacher_mean": round(float(df.groupby("teacher_id").size().mean()), 2),
        "rows_per_teacher_min": int(df.groupby("teacher_id").size().min()),
        "rows_per_teacher_max": int(df.groupby("teacher_id").size().max()),
        "rows_per_competence_mean": round(float(df.groupby("competence_id").size().mean()), 2),
        "rows_per_competence_min": int(df.groupby("competence_id").size().min()),
        "rows_per_competence_max": int(df.groupby("competence_id").size().max()),
    }

    # Valeurs extrêmes (z-scores |z|>5 sur features numériques)
    extr: dict[str, list] = {}
    for col in FEATURE_NAMES:
        s = pd.to_numeric(df[col], errors="coerce")
        if s.std() and s.std() > 0:
            z = (s - s.mean()) / s.std()
            idx = df.index[z.abs() > 5].tolist()
            if idx:
                extr[col] = [int(i) for i in idx[:10]]
    report["extremes"] = extr

    out = output_path or (REPORTS_DIR / "demo_dataset_audit.json")
    out.parent.mkdir(parents=True, exist_ok=True)
    out.write_text(json.dumps(report, indent=2, ensure_ascii=False), encoding="utf-8")
    return report


def main() -> int:
    report = audit_demo_dataset()
    print(f"[OK] Audit : {report['rows_total']} lignes, "
          f"{report['identifiers']['n_teachers']} enseignants, "
          f"{report['dates']['n_months']} mois, "
          f"{len(report['missing_values'])} colonnes avec manquants, "
          f"{len(report['out_of_range'])} colonnes hors plage")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())