"""GET /api/v1/teachers/{teacher_id}/recommendations"""

from __future__ import annotations

from typing import Any

from fastapi import APIRouter, Depends, Path, Query

from app.api.dependencies import get_use_cases, require_roles, validate_teacher_id
from app.application.use_cases import AnalyticsUseCases
from app.engines.recommendation_engine import RecommendationResult

router = APIRouter(
    prefix="/teachers/{teacher_id}/recommendations",
    tags=["recommendations"],
    dependencies=[Depends(require_roles("TEACHER", "DEPARTMENT_HEAD", "UP_HEAD", "ADMIN"))],
)


@router.get("", response_model=dict[str, Any])
def get_recommendations(
    teacher_id: str = Path(...),
    limit: int = Query(default=10, ge=1, le=50),
    use_cases: AnalyticsUseCases = Depends(get_use_cases),
):
    tid = validate_teacher_id(teacher_id)
    result: RecommendationResult = use_cases.get_recommendations(tid)
    recs = result.recommendations[:limit]
    payload = result.model_dump(mode="json")
    payload["recommendations"] = [r for r in payload["recommendations"] if r["training_id"] in {x.training_id for x in recs}]
    return {"data": payload, "meta": {"teacher_id": tid, "count": len(recs)}, "errors": []}
