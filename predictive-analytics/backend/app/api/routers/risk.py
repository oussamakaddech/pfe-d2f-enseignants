"""GET /api/v1/teachers/{teacher_id}/risk"""

from __future__ import annotations

from typing import Any

from fastapi import APIRouter, Depends, Path

from app.api.dependencies import get_use_cases, require_roles, validate_teacher_id
from app.application.use_cases import AnalyticsUseCases

router = APIRouter(
    prefix="/teachers/{teacher_id}/risk",
    tags=["risk"],
    dependencies=[Depends(require_roles("TEACHER", "DEPARTMENT_HEAD", "UP_HEAD", "ADMIN"))],
)


@router.get("", response_model=dict[str, Any])
def get_risk(
    teacher_id: str = Path(...),
    use_cases: AnalyticsUseCases = Depends(get_use_cases),
):
    tid = validate_teacher_id(teacher_id)
    risk = use_cases.get_risk(tid)
    return {"data": risk.model_dump(mode="json"), "meta": {"teacher_id": tid}, "errors": []}
