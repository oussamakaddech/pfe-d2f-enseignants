"""GET /api/v1/teachers/{teacher_id}/learning-path"""

from __future__ import annotations

from typing import Any

from fastapi import APIRouter, Depends, Path

from app.api.dependencies import get_use_cases, require_roles, validate_teacher_id
from app.application.use_cases import AnalyticsUseCases

router = APIRouter(
    prefix="/teachers/{teacher_id}/learning-path",
    tags=["learning-path"],
    dependencies=[Depends(require_roles("TEACHER", "DEPARTMENT_HEAD", "UP_HEAD", "ADMIN"))],
)


@router.get("", response_model=dict[str, Any])
def get_learning_path(
    teacher_id: str = Path(...),
    use_cases: AnalyticsUseCases = Depends(get_use_cases),
):
    tid = validate_teacher_id(teacher_id)
    path = use_cases.get_learning_path(tid)
    return {"data": path.model_dump(mode="json"), "meta": {"teacher_id": tid}, "errors": []}
