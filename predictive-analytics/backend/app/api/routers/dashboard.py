"""Routes dashboard global."""

from __future__ import annotations

from typing import Any

from fastapi import APIRouter, Depends

from app.api.dependencies import get_use_cases, require_roles
from app.application.use_cases import AnalyticsUseCases

router = APIRouter(
    prefix="/dashboard",
    tags=["dashboard"],
    dependencies=[Depends(require_roles("ADMIN", "DEPARTMENT_HEAD", "UP_HEAD"))],
)


@router.get("/global", response_model=dict[str, Any])
def global_dashboard(use_cases: AnalyticsUseCases = Depends(get_use_cases)):
    kpis = use_cases.dashboard_kpis()
    return {"data": kpis.model_dump(mode="json"), "meta": {}, "errors": []}


@router.get("/teachers-at-risk", response_model=dict[str, Any])
def teachers_at_risk(use_cases: AnalyticsUseCases = Depends(get_use_cases)):
    rows = use_cases.dashboard_teachers_at_risk()
    return {"data": {"rows": [r.model_dump(mode="json") for r in rows], "count": len(rows)}, "meta": {}, "errors": []}


@router.get("/gap-heatmap", response_model=dict[str, Any])
def gap_heatmap(use_cases: AnalyticsUseCases = Depends(get_use_cases)):
    cells = use_cases.dashboard_gap_heatmap()
    return {"data": {"cells": [c.model_dump(mode="json") for c in cells], "count": len(cells)}, "meta": {}, "errors": []}


@router.get("/training-demand", response_model=dict[str, Any])
def training_demand(use_cases: AnalyticsUseCases = Depends(get_use_cases)):
    rows = use_cases.dashboard_training_demand()
    return {"data": {"rows": [r.model_dump(mode="json") for r in rows], "count": len(rows)}, "meta": {}, "errors": []}
