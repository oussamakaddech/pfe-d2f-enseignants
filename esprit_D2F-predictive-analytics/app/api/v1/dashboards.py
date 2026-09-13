from typing import Annotated

from fastapi import APIRouter, Depends, Query

from app.api.deps import ContainerDependency, resolve_user_teacher
from app.core.envelope import ok
from app.core.security import CurrentUser, require_roles
from app.infrastructure.container import Container

router = APIRouter(prefix="/dashboard", tags=["dashboard"])

DECISION_ROLES = ("ADMIN", "CUP", "CHEF_DEPARTEMENT")
SCOPE_PATTERN = "^(GLOBAL|DEPARTEMENT|UP)$"
ScopeParam = Annotated[str, Query(pattern=SCOPE_PATTERN)]


def _enforce_role_scope(
    container: Container, user: CurrentUser, scope: str, scope_id: str | None
) -> tuple[str, str | None]:
    """Résout le périmètre effectif selon le rôle (source d'autorité serveur).

    - CUP (non admin) : toujours UP — son UP, déduit de sa fiche enseignant ;
    - CHEF_DEPARTEMENT (non admin, non CUP) : toujours DEPARTEMENT — le sien ;
    - ADMIN : périmètre demandé (GLOBAL / DEPARTEMENT / UP).

    Un CUP/chef sans fiche ou sans UP/département résolu conserve le type de
    périmètre forcé mais un scope_id indéterminé → aucun enseignant matché
    (deny-by-default, jamais de fuite vers le périmètre global).
    """
    if user.is_cup and not user.is_admin:
        scope = "UP"
        user_teacher = resolve_user_teacher(container, user)
        if user_teacher and user_teacher.up_id:
            scope_id = user_teacher.up_id
        return scope, scope_id
    if user.is_chef_departement and not user.is_admin and not user.is_cup:
        scope = "DEPARTEMENT"
        user_teacher = resolve_user_teacher(container, user)
        if user_teacher and user_teacher.dept_id:
            scope_id = user_teacher.dept_id
    return scope, scope_id


@router.get("")
def get_dashboard(
    container: ContainerDependency,
    user: Annotated[CurrentUser, Depends(require_roles(*DECISION_ROLES))],
    scope: ScopeParam = "GLOBAL",
    scope_id: Annotated[str | None, Query()] = None,
):
    # Le périmètre du CUP (UP) et du chef (département) est résolu côté serveur.
    scope, scope_id = _enforce_role_scope(container, user, scope, scope_id)
    kpis = container.build_dashboards.execute(scope=scope, scope_id=scope_id)
    return ok(kpis)


@router.get("/latest")
def get_latest_dashboard(
    container: ContainerDependency,
    user: Annotated[CurrentUser, Depends(require_roles(*DECISION_ROLES))],
    scope: ScopeParam = "GLOBAL",
    scope_id: Annotated[str | None, Query()] = None,
):
    scope, scope_id = _enforce_role_scope(container, user, scope, scope_id)
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
    scope, scope_id = _enforce_role_scope(container, user, scope, scope_id)
    trends = container.dashboard_repository.declining_trends(scope, scope_id)
    return ok(trends, {"scope": scope, "scope_id": scope_id})
