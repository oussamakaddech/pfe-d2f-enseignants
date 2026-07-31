"""Fixtures pytest: repository curated sur données de démo générées."""

from __future__ import annotations

import importlib.util
import sys
from pathlib import Path

import pytest

ROOT = Path(__file__).resolve().parents[2]  # predictive-analytics/
sys.path.insert(0, str(ROOT / "backend"))


def _load_generator():
    path = ROOT / "scripts" / "generate_sample_data.py"
    spec = importlib.util.spec_from_file_location("generate_sample_data", path)
    module = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(module)
    return module


GENERATOR = _load_generator()

from app.infrastructure.repositories.curated_repository import CuratedRepository  # noqa: E402


@pytest.fixture(scope="session")
def sample_curated_dir(tmp_path_factory):
    raw = tmp_path_factory.mktemp("raw")
    GENERATOR.generate(raw)
    from app.ml.cleaning.pipeline import CleaningConfig, CleaningPipeline

    curated = tmp_path_factory.mktemp("curated")
    staging = tmp_path_factory.mktemp("staging")
    reports = tmp_path_factory.mktemp("reports")
    cfg = CleaningConfig(
        raw_dir=raw,
        staging_dir=staging,
        curated_dir=curated,
        reports_dir=reports,
        alias_file=raw / "id_aliases.csv",
    )
    CleaningPipeline(cfg).run()
    return curated


@pytest.fixture(scope="session")
def sample_repo(sample_curated_dir):
    return CuratedRepository(sample_curated_dir)
