"""Nettoyage traçable du dataset synthétique démo.

Chaque décision (conversion, correction, imputation, suppression, quarantaine)
est enregistrée. Rien n'est supprimé silencieusement.

Règles :
- dates invalides (ref_month/date_t)      -> QUARANTAINE
- valeurs non numériques                 -> QUARANTAINE (non corrigeable)
- valeurs hors plage                      -> CORRECTION (clip aux bornes)
- valeurs manquantes                      -> IMPUTATION (médiane documentée)
- doublons exacts                         -> SUPPRESSION (garder la 1re)
- doublons fonctionnels                   -> SUPPRESSION (garder la 1re)

Sorties :
- data/synthetic/demo_dataset_{version}_clean.csv
- reports/demo_cleaning_report.json
- reports/demo_quarantine.csv
"""
from __future__ import annotations

import json
from pathlib import Path

import pandas as pd

from pipelines.demo_common import REQUIRED_COLUMNS, TARGET_COL, canonical_df_hash

BASE_DIR = Path(__file__).parent.parent
SYNTH_DIR = BASE_DIR / "data" / "synthetic"
REPORTS_DIR = BASE_DIR / "reports"

VERSION_DEFAULT = "synthetic-v1.0.0"

NUMERIC_RANGES = {
    "current_observation": (0.0, 5.0),
    "knowledge_difficulty_level": (1.0, 3.0),
    "required_level": (3.0, 5.0),
    TARGET_COL: (0.0, 5.0),
    "attendance_rate": (0.0, 1.0),
    "evaluation_score": (0.0, 5.0),
    "training_count": (0.0, None),
    "stagnation_months": (0.0, None),
    "need_count": (0.0, None),
    "engagement_score": (0.0, 1.0),
}

# Colonnes d'identité / provenance (jamais corrigées comme valeurs numériques)
NUMERIC_FEATURE_COLS = [
    "current_level_t3", "current_level_t2", "current_level_t1", "current_level_t",
    "lag_gap_t3_t2", "lag_gap_t2_t1", "lag_gap_t1_t", "rolling_tendance",
    "days_since_last_training", "training_frequency_per_month", "is_long_absent", "is_stagnant",
    "avg_level", "min_level", "max_level", "nb_level_5", "nb_level_1",
    "nb_savoirs", "nb_competences", "competency_coverage_rate",
    "nb_formations_completed", "nb_formations_in_progress", "taux_assiduite",
    "nb_besoins_exprimes", "nb_besoins_approuves", "avg_eval_score", "nb_evaluations",
    "months_since_last_training", "engagement_score",
]


def _coerce_bool_str(value) -> str:
    if isinstance(value, bool):
        return "true" if value else "false"
    return str(value).strip().lower() in ("1", "true", "yes", "oui", "vrai")


def clean_demo_dataset(
    version: str = VERSION_DEFAULT,
    dataset_path: Path | None = None,
    clean_path: Path | None = None,
    quarantine_path: Path | None = None,
    report_path: Path | None = None,
) -> dict:
    """Nettoie le dataset brut avec traçabilité complète."""
    path = dataset_path or (SYNTH_DIR / f"demo_dataset_{version}.csv")
    if not path.exists():
        raise FileNotFoundError(f"Dataset brut introuvable : {path}")
    df = pd.read_csv(path)
    rows_before = len(df)

    corrections: list[dict] = []
    reasons: dict[str, int] = {}
    quarantined: list[pd.DataFrame] = []

    def _log(action: str, reason: str, count: int, detail: str = "") -> None:
        corrections.append({"action": action, "reason": reason, "count": int(count), "detail": detail})
        reasons[reason] = reasons.get(reason, 0) + int(count)

    # 1. Dates invalides -> quarantaine
    ref = pd.to_datetime(df["ref_month"], errors="coerce")
    date_t = pd.to_datetime(df["date_t"], errors="coerce")
    bad_dates = df[ref.isna() | date_t.isna()].copy()
    if len(bad_dates):
        bad_dates["quarantine_reason"] = "date_invalide"
        quarantined.append(bad_dates)
        _log("quarantine", "date_invalide", len(bad_dates))
    df = df[ref.notna() & date_t.notna()].copy()

    # 2. Valeurs non numériques -> quarantaine
    non_numeric_mask = pd.Series(False, index=df.index)
    for col in NUMERIC_FEATURE_COLS + [TARGET_COL]:
        numeric = pd.to_numeric(df[col], errors="coerce")
        bad = df[col].notna() & numeric.isna()
        non_numeric_mask |= bad
    bad_nn = df[non_numeric_mask].copy()
    if len(bad_nn):
        bad_nn["quarantine_reason"] = "valeur_non_numerique"
        quarantined.append(bad_nn)
        _log("quarantine", "valeur_non_numerique", len(bad_nn))
    df = df[~non_numeric_mask].copy()

    # 3. Conversion de types
    for col in NUMERIC_FEATURE_COLS + [TARGET_COL, "current_observation",
                                       "knowledge_difficulty_level", "required_level",
                                       "attendance_rate", "evaluation_score",
                                       "training_count", "stagnation_months",
                                       "need_count", "engagement_score"]:
        df[col] = pd.to_numeric(df[col], errors="coerce")
    df["ref_month"] = pd.to_datetime(df["ref_month"])
    df["date_t"] = pd.to_datetime(df["date_t"])
    _log("convert", "conversion_types", 0)

    # 4. Valeurs hors plage -> clip (correction traçable)
    for col, (lo, hi) in NUMERIC_RANGES.items():
        s = df[col]
        mask = s.isna()
        if lo is not None:
            mask |= s < lo
        if hi is not None:
            mask |= s > hi
        n = int(mask.sum())
        if n:
            df[col] = s.clip(lower=lo if lo is not None else None,
                             upper=hi if hi is not None else None)
            _log("correction", f"hors_plage_{col}", n)

    # 5. Valeurs manquantes -> imputation médiane
    missing_cols = [c for c in NUMERIC_FEATURE_COLS + [TARGET_COL,
                    "current_observation", "knowledge_difficulty_level",
                    "attendance_rate", "evaluation_score",
                    "engagement_score"] if int(df[c].isna().sum()) > 0]
    for col in missing_cols:
        n = int(df[col].isna().sum())
        med = float(df[col].median())
        df[col] = df[col].fillna(med)
        _log("imputation", f"manquant_{col}", n, detail=f"median={med}")

    # 6. Doublons exacts -> suppression (1re occurrence conservée)
    n_exact = int(df.duplicated().sum())
    if n_exact:
        _log("removal", "doublon_exact", n_exact)
    df = df.drop_duplicates(keep="first").reset_index(drop=True)

    # 7. Doublons fonctionnels (teacher, competence, ref_month) -> suppression
    keys = ["teacher_id", "competence_id", "ref_month"]
    n_func = int(df.duplicated(subset=keys).sum())
    if n_func:
        _log("removal", "doublon_fonctionnel", n_func)
    df = df.drop_duplicates(subset=keys, keep="first").reset_index(drop=True)

    # 8. Normalisation booléenne + provenance
    for col in ("is_synthetic", "institutional_verified"):
        if col in df.columns:
            df[col] = df[col].map(_coerce_bool_str)
    df["data_origin"] = "SYNTHETIC"
    df["is_synthetic"] = "true"
    df["institutional_verified"] = "false"
    df["dataset_version"] = version

    rows_after = len(df)
    rows_removed = n_exact + n_func
    rows_quarantined = int(sum(len(q) for q in quarantined))

    quarantine_df = pd.concat(quarantined, ignore_index=True) if quarantined else pd.DataFrame()

    clean_out = clean_path or (SYNTH_DIR / f"demo_dataset_{version}_clean.csv")
    clean_out.parent.mkdir(parents=True, exist_ok=True)
    df.to_csv(clean_out, index=False, lineterminator="\n")

    quar_out = quarantine_path or (REPORTS_DIR / "demo_quarantine.csv")
    quar_out.parent.mkdir(parents=True, exist_ok=True)
    if len(quarantine_df):
        quarantine_df.to_csv(quar_out, index=False, lineterminator="\n")
    else:
        quar_out.write_text("teacher_id,competence_id,ref_month,quarantine_reason\n", encoding="utf-8")

    report = {
        "dataset_version": version,
        "source_path": str(path),
        "clean_path": str(clean_out),
        "quarantine_path": str(quar_out),
        "rows_before": rows_before,
        "rows_after": rows_after,
        "rows_corrected": int(sum(c["count"] for c in corrections if c["action"] == "correction")),
        "rows_imputed": int(sum(c["count"] for c in corrections if c["action"] == "imputation")),
        "rows_removed": rows_removed,
        "rows_quarantined": rows_quarantined,
        "reasons": reasons,
        "operations": corrections,
        "dataset_hash": canonical_df_hash(pd.read_csv(clean_out)),
    }
    out = report_path or (REPORTS_DIR / "demo_cleaning_report.json")
    out.parent.mkdir(parents=True, exist_ok=True)
    out.write_text(json.dumps(report, indent=2, ensure_ascii=False), encoding="utf-8")
    return report


def main() -> int:
    import argparse

    parser = argparse.ArgumentParser(description="Nettoie le dataset synthétique démo")
    parser.add_argument("--version", default=VERSION_DEFAULT)
    args = parser.parse_args()
    report = clean_demo_dataset(args.version)
    print(f"[OK] Nettoyage : {report['rows_before']} -> {report['rows_after']} lignes "
          f"(removals={report['rows_removed']}, quarantined={report['rows_quarantined']}, "
          f"corrected={report['rows_corrected']}, imputed={report['rows_imputed']})")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())