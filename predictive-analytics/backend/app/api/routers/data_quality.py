"""GET /api/v1/teachers/{teacher_id}/data-quality et /api/v1/audit/*"""

from __future__ import annotations

import json
from typing import Any

from fastapi import APIRouter, Depends, Path

from app.api.dependencies import get_use_cases, require_roles, validate_teacher_id
from app.application.use_cases import AnalyticsUseCases
from app.core.config import settings

router = APIRouter(tags=["data-quality"])


@router.get(
    "/teachers/{teacher_id}/data-quality",
    response_model=dict[str, Any],
    dependencies=[Depends(require_roles("TEACHER", "DEPARTMENT_HEAD", "UP_HEAD", "ADMIN"))],
)
def get_data_quality(
    teacher_id: str = Path(...),
    use_cases: AnalyticsUseCases = Depends(get_use_cases),
):
    tid = validate_teacher_id(teacher_id)
    report = use_cases.get_data_quality(tid)
    return {"data": report.model_dump(mode="json"), "meta": {"teacher_id": tid}, "errors": []}


@router.get(
    "/audit/data-quality",
    response_model=dict[str, Any],
    dependencies=[Depends(require_roles("ADMIN", "DEPARTMENT_HEAD", "UP_HEAD"))],
)
def audit_data_quality():
    report_file = settings.curated_path.parent / settings.reports_dir / "quality_report.json"
    if report_file.exists():
        payload = json.loads(report_file.read_text(encoding="utf-8"))
    else:
        payload = {"summary": {"status": "NO_REPORT"}, "issues": [], "per_dataset": {}}
    return {"data": payload, "meta": {}, "errors": []}


@router.get(
    "/audit/contracts",
    response_model=dict[str, Any],
    dependencies=[Depends(require_roles("ADMIN"))],
)
def audit_contracts():
    contracts_dir = settings.curated_path.parent / "contracts"
    if (contracts_dir / "data_dictionary.json").exists():
        payload = json.loads((contracts_dir / "data_dictionary.json").read_text(encoding="utf-8"))
    else:
        from app.ml.cleaning.contracts import data_dictionary

        payload = data_dictionary()
    return {"data": payload, "meta": {}, "errors": []}
