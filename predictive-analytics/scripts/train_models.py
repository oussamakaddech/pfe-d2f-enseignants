"""CLI d'entraînement ML complet.

Usage:
    python scripts/train_models.py --curated data/curated \
        --models data/models --features data/features --reports data/reports
"""

from __future__ import annotations

import argparse
import logging
from pathlib import Path

from app.infrastructure.repositories.curated_repository import CuratedRepository
from app.ml.pipeline import MlPipeline

logging.basicConfig(level=logging.INFO, format="%(levelname)s %(message)s")


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--curated", default="data/curated")
    parser.add_argument("--models", default="data/models")
    parser.add_argument("--features", default="data/features")
    parser.add_argument("--reports", default="data/reports")
    parser.add_argument("--targets", nargs="*", default=None)
    args = parser.parse_args()

    repo = CuratedRepository(args.curated)
    pipeline = MlPipeline(repo, model_dir=args.models, features_dir=args.features, reports_dir=args.reports)
    run = pipeline.run(targets=args.targets)

    for target, result in run.results.items():
        print(f"[{target}] rows={run.datasets[target]} status={result.status}")
        if result.status == "ok":
            print(f"   model={result.model_name} metrics={result.metrics}")


if __name__ == "__main__":
    main()
