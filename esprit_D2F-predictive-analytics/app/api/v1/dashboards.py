from typing import Annotated

from fastapi import APIRouter, Depends, Query

from app.api.deps import ContainerDependency, resolve_user_teacher
from app.core.envelope import ok
from app.core.security import CurrentUser, require_roles

router = APIRouter(prefix="/dashboard", tags=["dashboard"])

DECISION_ROLES = ("ADMIN", "CUP", "CHEF_DEPARTEMENT")
SCOPE_PATTERN = "^(GLOBAL|DEPARTEMENT)$"
ScopeParam = Annotated[str, Query(pattern=SCOPE_PATTERN)]


@router.get("")
def get_dashboard(
    container: ContainerDependency,
    user: Annotated[CurrentUser, Depends(require_roles(*DECISION_ROLES))],
    scope: ScopeParam = "GLOBAL",
    scope_id: Annotated[str | None, Query()] = None,
):
    if scope == "DEPARTEMENT" and user.is_chef_departement:
        user_teacher = resolve_user_teacher(container, user)
        if user_teacher and user_teacher.dept_id:
            scope_id = user_teacher.dept_id
    kpis = container.build_dashboards.execute(scope=scope, scope_id=scope_id)
    return ok(kpis)


@router.get("/latest")
def get_latest_dashboard(
    container: ContainerDependency,
    user: Annotated[CurrentUser, Depends(require_roles(*DECISION_ROLES))],
    scope: ScopeParam = "GLOBAL",
    scope_id: Annotated[str | None, Query()] = None,
):
    if scope == "DEPARTEMENT" and user.is_chef_departement:
        user_teacher = resolve_user_teacher(container, user)
        if user_teacher and user_teacher.dept_id:
            scope_id = user_teacher.dept_id
    snapshot = container.dashboard_repository.latest_snapshot(scope, scope_id)
    if snapshot is None:
        return ok(None, {"scope": scope, "scope_id": scope_id, "snapshot": None})
    return ok(snapshot, {"scope": scope, "scope_id": scope_id})


@router.get("/declining")
def get_declining_trends(
    container: ContainerDependency,
    user: Annotated[CurrentUser, Depends(require_roles(*DECISION_ROLES))],
    scope: ScopeParam = "GLOBAL",
    scope_id: Annotated[str | None, Query()] = None,
):
    if scope == "DEPARTEMENT" and user.is_chef_departement:
        user_teacher = resolve_user_teacher(container, user)
        if user_teacher and user_teacher.dept_id:
            scope_id = user_teacher.dept_id
    trends = container.dashboard_repository.declining_trends(scope, scope_id)
    return ok(trends, {"scope": scope, "scope_id": scope_id})
