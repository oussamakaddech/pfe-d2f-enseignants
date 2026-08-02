from fastapi import APIRouter, Depends, Query

from app.api.deps import ContainerDependency, resolve_user_teacher
from app.core.envelope import ok_page
from app.core.pagination import paginate
from app.core.scope import enforce_teacher_access, resolve_teacher_or_404
from app.core.security import CurrentUser, require_roles
from app.schemas.analytics import GapOut

router = APIRouter(prefix="/teachers/{teacher_id}/gaps", tags=["gaps"])

DECISION_ROLES = ("ADMIN", "CUP", "CHEF_DEPARTEMENT", "ENSEIGNANT")


@router.get("")
def list_gaps(
    teacher_id: str,
    container: ContainerDependency,
    user: CurrentUser = Depends(require_roles(*DECISION_ROLES)),
    page: int = Query(default=1, ge=1),
    size: int = Query(default=20, ge=1, le=100),
    severity: str | None = Query(default=None),
):
    teacher = resolve_teacher_or_404(teacher_id, container.teacher_source)
    user_teacher = resolve_user_teacher(container, user)
    enforce_teacher_access(user, teacher, user_teacher)

    # Lecture seule : renvoie le dernier snapshot persisté. Le recalcul est déclenché
    # via POST /analysis/{id} ou par le scheduler batch — jamais à chaque lecture.
    gaps = container.analysis_repository.list_gaps_by_teacher(teacher_id)
    model_mode = None
    model_version = None
    try:
        status = container.model_port.status()
        model_mode = status.get("mode")
        model_version = status.get("version")
    except Exception:
        pass
    if severity:
        gaps = [gap for gap in gaps if gap.severity.api_value() == severity.upper()]
    page_result = paginate([GapOut(**gap.to_dict()) for gap in gaps], page, size)
    return ok_page(
        page_result.data,
        page_result.meta,
        {"model_mode": model_mode, "model_version": model_version},
    )
