"""GET /api/v1/teachers/{teacher_id}/gaps"""

from __future__ import annotations

from typing import Any

from fastapi import APIRouter, Depends, Path

from app.api.dependencies import (
    get_use_cases,
    require_roles,
    validate_teacher_id,
)
from app.application.use_cases import AnalyticsUseCases
from app.domain.entities.gap import TeacherGapAnalysis

router = APIRouter(
    prefix="/teachers/{teacher_id}/gaps",
    tags=["gaps"],
    dependencies=[Depends(require_roles("TEACHER", "DEPARTMENT_HEAD", "UP_HEAD", "ADMIN"))],
)


@router.get("", response_model=dict[str, Any])
def get_gaps(
    teacher_id: str = Path(..., description="Identifiant enseignant ENSxxx"),
    use_cases: AnalyticsUseCases = Depends(get_use_cases),
):
    tid = validate_teacher_id(teacher_id)
    analysis: TeacherGapAnalysis = use_cases.get_gaps(tid)
    return {"data": analysis.model_dump(mode="json"), "meta": {"teacher_id": tid}, "errors": []}
