from math import ceil

from fastapi import APIRouter, Depends, Query

from app.api.deps import ContainerDependency, resolve_user_teacher
from app.core.envelope import ok, ok_page
from app.core.pagination import PageMeta
from app.core.security import CurrentUser, require_roles
from app.schemas.alerts import AlertOut, AlertStatusUpdate, AlertStatusOut

router = APIRouter(prefix="/alerts", tags=["alerts"])

DECISION_ROLES = ("ADMIN", "CUP", "CHEF_DEPARTEMENT", "ENSEIGNANT")


def _scope_alerts(container, user, page, size, severity, status, target_type, department_id=None):
    repo = container.alert_repository
    severity_open = None
    if user.is_admin or user.is_cup:
        alerts, total = repo.list_alerts(page, size, severity, status, target_type, department_id)
        severity_open = repo.count_open_by_severity(severity, status, target_type, department_id=department_id)
        return alerts, total, severity_open
    if user.is_chef_departement:
        user_teacher = resolve_user_teacher(container, user)
        dept_id = user_teacher.dept_id if user_teacher else None
        if dept_id:
            alerts, total = repo.list_for_department(dept_id, page, size, severity, status)
            severity_open = repo.count_open_by_severity(severity, status, department_id=dept_id)
            return alerts, total, severity_open
        return [], 0, severity_open
    if user.is_enseignant:
        user_teacher = resolve_user_teacher(container, user)
        if user_teacher:
            alerts, total = repo.list_for_teacher(user_teacher.id, page, size, severity, status)
            severity_open = repo.count_open_by_severity(severity, status, teacher_id=user_teacher.id)
            return alerts, total, severity_open
        return [], 0, severity_open
    return [], 0, severity_open


@router.get("")
def list_alerts(
    container: ContainerDependency,
    user: CurrentUser = Depends(require_roles(*DECISION_ROLES)),
    page: int = Query(default=1, ge=1),
    size: int = Query(default=20, ge=1, le=100),
    severity: str | None = Query(default=None),
    status: str | None = Query(default=None),
    target_type: str | None = Query(default=None),
    departement_id: str | None = Query(default=None, alias="department_id"),
):
    alerts, total, severity_open = _scope_alerts(container, user, page, size, severity, status, target_type, departement_id)
    # Le repository applique déjà LIMIT/OFFSET : on ne re-page pas ici,
    # sinon la page 2+ serait vide (double pagination).
    page_result = PageMeta(
        page=page,
        size=size,
        total=total,
        pages=ceil(total / size) if total else 0,
    )
    extras: dict = {"total_matching": total}
    if severity_open is not None:
        extras["severity_open"] = severity_open
    return ok_page(
        [AlertOut(**alert.to_dict()).model_dump() for alert in alerts],
        page_result,
        extras,
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
