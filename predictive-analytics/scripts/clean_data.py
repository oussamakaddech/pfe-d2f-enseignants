"""CLI du pipeline de nettoyage.

Usage:
    python scripts/clean_data.py --raw data/raw --staging data/staging \
        --curated data/curated --reports data/reports [--aliases data/raw/id_aliases.csv]
"""

from __future__ import annotations

import argparse
import logging
from pathlib import Path

from app.ml.cleaning.pipeline import CleaningConfig, CleaningPipeline

logging.basicConfig(level=logging.INFO, format="%(levelname)s %(message)s")


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--raw", default="data/raw", help="dossier raw")
    parser.add_argument("--staging", default="data/staging")
    parser.add_argument("--curated", default="data/curated")
    parser.add_argument("--reports", default="data/reports")
    parser.add_argument("--aliases", default="data/raw/id_aliases.csv")
    parser.add_argument("--no-drop", action="store_true", help="ne pas supprimer les IDs invalides")
    args = parser.parse_args()

    config = CleaningConfig(
        raw_dir=Path(args.raw),
        staging_dir=Path(args.staging),
        curated_dir=Path(args.curated),
        reports_dir=Path(args.reports),
        alias_file=Path(args.aliases),
        drop_missing_ids=not args.no_drop,
    )
    result = CleaningPipeline(config).run()
    summary = result.summary()
    print(f"Statut: {summary['status']}")
    print(f"Erreurs: {summary['error_count']} — Warnings: {summary['warning_count']}")
    for name, info in result.per_dataset.items():
        print(f"  {name}: {info['input_rows']} -> {info['kept_rows']} lignes")


if __name__ == "__main__":
    main()
