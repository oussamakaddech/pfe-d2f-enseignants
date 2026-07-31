"""Routes ML: entraînement et scoring."""

from __future__ import annotations

import logging
from dataclasses import asdict
from typing import Any

from fastapi import APIRouter, Body, Depends

from app.api.dependencies import (
    get_repository,
    get_use_cases,
    require_roles,
    validate_teacher_id,
)
from app.application.use_cases import AnalyticsUseCases
from app.infrastructure.repositories.curated_repository import CuratedRepository
from app.ml.datasets.dataset_builder import (
    DatasetBuilder,
    build_completion_dataset,
    build_effectiveness_dataset,
)
from app.ml.datasets.targets import TARGET_DEFINITIONS
from app.ml.features.feature_schema import FEATURE_COLUMNS
from app.ml.pipeline import MlPipeline
from app.ml.training.train import export_artifacts, train
from app.core.config import settings

logger = logging.getLogger(__name__)

router = APIRouter(
    prefix="/ml",
    tags=["ml"],
    dependencies=[Depends(require_roles("ADMIN", "DEPARTMENT_HEAD", "UP_HEAD"))],
)

BUILDERS = {
    "completion_probability": build_completion_dataset,
    "training_effectiveness_score": build_effectiveness_dataset,
}


@router.post("/train/completion", response_model=dict[str, Any])
def train_completion(
    repository: CuratedRepository = Depends(get_repository),
):
    return _train_target(repository, "completion_probability")


@router.post("/train/effectiveness", response_model=dict[str, Any])
def train_effectiveness(
    repository: CuratedRepository = Depends(get_repository),
):
    return _train_target(repository, "training_effectiveness_score")


@router.post("/train/stagnation", response_model=dict[str, Any])
def train_stagnation(
    repository: CuratedRepository = Depends(get_repository),
):
    return _train_target(repository, "stagnation_risk_future")


@router.post("/score/completion", response_model=dict[str, Any])
def score_completion(
    body: dict[str, Any] = Body(..., examples=[{"teacher_id": "ENS001"}]),
    use_cases: AnalyticsUseCases = Depends(get_use_cases),
):
    teacher_id = validate_teacher_id(body["teacher_id"])
    response = use_cases.score("completion_probability", teacher_id)
    return {"data": asdict(response), "meta": {"teacher_id": teacher_id}, "errors": []}


@router.post("/score/effectiveness", response_model=dict[str, Any])
def score_effectiveness(
    body: dict[str, Any] = Body(..., examples=[{"teacher_id": "ENS001"}]),
    use_cases: AnalyticsUseCases = Depends(get_use_cases),
):
    teacher_id = validate_teacher_id(body["teacher_id"])
    response = use_cases.score("training_effectiveness_score", teacher_id)
    return {"data": asdict(response), "meta": {"teacher_id": teacher_id}, "errors": []}


def _train_target(repository: CuratedRepository, target: str) -> dict[str, Any]:
    dataset = DatasetBuilder(repository).build_effectiveness() if target == "training_effectiveness_score" \
        else DatasetBuilder(repository).build_completion() if target == "completion_probability" \
        else DatasetBuilder(repository).build_stagnation()

    from app.ml.datasets.leakage import LeakageGuard

    LeakageGuard().assert_no_leak(
        dataset.meta, event_column="event_date", feature_cutoff_column="feature_cutoff_date"
    )
    result = train(dataset, target)
    if result.status == "ok":
        export_artifacts(
            result,
            out_dir=settings.model_path / target,
            feature_columns=FEATURE_COLUMNS,
        )
    return {"data": result.summary(), "meta": {"target": target}, "errors": []}
