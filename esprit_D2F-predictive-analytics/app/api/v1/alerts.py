from fastapi import APIRouter, Depends, Query

from app.api.deps import ContainerDependency, resolve_user_teacher
from app.core.envelope import ok, ok_page
from app.core.pagination import paginate
from app.core.security import CurrentUser, require_roles
from app.schemas.alerts import AlertOut, AlertStatusUpdate, AlertStatusOut

router = APIRouter(prefix="/alerts", tags=["alerts"])

DECISION_ROLES = ("ADMIN", "CUP", "CHEF_DEPARTEMENT", "ENSEIGNANT")


def _scope_alerts(container, user, page, size, severity, status, target_type):
    repo = container.alert_repository
    if user.is_admin or user.is_cup:
        alerts, total = repo.list_alerts(page, size, severity, status, target_type)
        return alerts, total
    if user.is_chef_departement:
        user_teacher = resolve_user_teacher(container, user)
        dept_id = user_teacher.dept_id if user_teacher else None
        if dept_id:
            alerts, total = repo.list_for_department(dept_id, page, size, severity, status)
            return alerts, total
        return [], 0
    if user.is_enseignant:
        user_teacher = resolve_user_teacher(container, user)
        if user_teacher:
            alerts, total = repo.list_for_teacher(user_teacher.id, page, size, severity, status)
            return alerts, total
        return [], 0
    return [], 0


@router.get("")
def list_alerts(
    container: ContainerDependency,
    user: CurrentUser = Depends(require_roles(*DECISION_ROLES)),
    page: int = Query(default=1, ge=1),
    size: int = Query(default=20, ge=1, le=100),
    severity: str | None = Query(default=None),
    status: str | None = Query(default=None),
    target_type: str | None = Query(default=None),
):
    alerts, total = _scope_alerts(container, user, page, size, severity, status, target_type)
    page_result = paginate(alerts, page, size)
    return ok_page(
        [AlertOut(**alert.to_dict()).model_dump() for alert in page_result.data],
        page_result.meta,
        {"total_matching": total},
    )


@router.patch("/{alert_id}/status")
def update_alert_status(
    alert_id: int,
    payload: AlertStatusUpdate,
    container: ContainerDependency,
    user: CurrentUser = Depends(require_roles("ADMIN", "CUP", "CHEF_DEPARTEMENT")),
):
    updated = container.alert_repository.update_status(alert_id, payload.status, actor=user.username, comment=payload.comment)
    if updated is None:
        return ok(None, {"alert_id": alert_id, "status": payload.status})
    return ok(AlertStatusOut(id=updated.id, status=updated.status).model_dump())
