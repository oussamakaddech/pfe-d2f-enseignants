"""Recalcule les plages de features du modele v1.1.0 sur le corpus reel DB.

La feature nb_savoirs est comptee differemment au serving (par competence,
1..7) que dans l'ancien corpus agrege. On aligne les bornes min/max sur les
valeurs reellement observees dans le corpus reel extrait de la base.
"""
import json
import sys
from pathlib import Path

import pandas as pd

BASE = Path(__file__).resolve().parents[1]
CORPUS = BASE / "data" / "clean" / "training_corpus_from_db.csv"
METADATA = BASE / "data" / "models" / "temporal_training_metadata.json"
SCHEMA = BASE / "data" / "models" / "feature_schema_v110.json"

FEATURE_COLS = [
    "current_level_t3", "current_level_t2", "current_level_t1", "current_level_t",
    "lag_gap_t3_t2", "lag_gap_t2_t1", "lag_gap_t1_t", "rolling_tendance",
    "days_since_last_training", "training_frequency_per_month", "is_long_absent", "is_stagnant",
    "avg_level", "min_level", "max_level", "nb_level_5", "nb_level_1",
    "nb_savoirs", "nb_competences", "competency_coverage_rate",
    "nb_formations_completed", "nb_formations_in_progress", "taux_assiduite",
    "nb_besoins_exprimes", "nb_besoins_approuves", "avg_eval_score", "nb_evaluations",
    "months_since_last_training", "engagement_score",
]


def compute_ranges() -> dict:
    df = pd.read_csv(CORPUS)
    ranges: dict[str, dict[str, float]] = {}
    for col in FEATURE_COLS:
        if col not in df.columns:
            continue
        v = pd.to_numeric(df[col], errors="coerce").dropna()
        if v.empty:
            continue
        ranges[col] = {"min": float(v.min()), "max": float(v.max())}
    return ranges


def main() -> None:
    ranges = compute_ranges()
    # sidecar metadata : injection dans le document existant
    meta = json.loads(METADATA.read_text(encoding="utf-8"))
    meta["feature_ranges"] = ranges
    METADATA.write_text(json.dumps(meta, indent=2, ensure_ascii=False), encoding="utf-8")
    # schema versionne : liste de features + plages
    SCHEMA.write_text(
        json.dumps(
            {"feature_schema_version": "1.0", "feature_names": list(FEATURE_COLS), "feature_ranges": ranges},
            indent=2,
            ensure_ascii=False,
        ),
        encoding="utf-8",
    )
    print("[OK] plages recalculees sur corpus reel (metadata + schema v110 alignes)")
    for k in ("nb_savoirs", "nb_competences", "days_since_last_training", "nb_formations_in_progress"):
        print(f"    {k}: {ranges.get(k)}")


if __name__ == "__main__":
    sys.exit(main())
