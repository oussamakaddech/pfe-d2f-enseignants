from fastapi import APIRouter, Depends, Query

from app.api.deps import ContainerDependency, resolve_user_teacher
from app.core.envelope import ok, ok_page
from app.core.pagination import paginate
from app.core.security import CurrentUser, require_roles
from app.schemas.needs import TrainingNeedCloseOut, TrainingNeedOut

router = APIRouter(prefix="/needs", tags=["needs"])

DECISION_ROLES = ("ADMIN", "CUP", "CHEF_DEPARTEMENT", "ENSEIGNANT")


def _scope_needs(container, user, page, size, need_type, scope_type):
    repo = container.training_need_repository
    if user.is_admin or user.is_cup:
        needs, total = repo.list_needs(page, size, need_type, scope_type)
        return needs, total
    if user.is_chef_departement:
        user_teacher = resolve_user_teacher(container, user)
        dept_id = user_teacher.dept_id if user_teacher else None
        if dept_id:
            needs, total = repo.list_for_department(dept_id, page, size)
            return needs, total
        return [], 0
    if user.is_enseignant:
        user_teacher = resolve_user_teacher(container, user)
        if user_teacher:
            needs, total = repo.list_for_teacher(user_teacher.id, page, size)
            return needs, total
        return [], 0
    return [], 0


@router.get("")
def list_needs(
    container: ContainerDependency,
    user: CurrentUser = Depends(require_roles(*DECISION_ROLES)),
    page: int = Query(default=1, ge=1),
    size: int = Query(default=20, ge=1, le=100),
    need_type: str | None = Query(default=None),
    scope_type: str | None = Query(default=None),
):
    needs, total = _scope_needs(container, user, page, size, need_type, scope_type)
    page_result = paginate(needs, page, size)
    return ok_page(
        [TrainingNeedOut(**need.to_dict()).model_dump() for need in page_result.data],
        page_result.meta,
        {"total_matching": total},
    )


@router.post("/{need_id}/close")
def close_need(
    need_id: int,
    container: ContainerDependency,
    user: CurrentUser = Depends(require_roles("ADMIN", "CUP", "CHEF_DEPARTEMENT")),
):
    closed = container.training_need_repository.close(need_id)
    if closed is None:
        return ok(None, {"need_id": need_id, "status": "CLOSED"})
    return ok(TrainingNeedCloseOut(id=closed.id, status=closed.status).model_dump())
