from typing import Annotated

from fastapi import APIRouter, Depends

from app.api.deps import ContainerDependency, resolve_user_teacher
from app.core.envelope import ok
from app.core.scope import enforce_teacher_access, resolve_teacher_or_404
from app.core.security import CurrentUser, require_roles

router = APIRouter(prefix="/teachers/{teacher_id}/risk", tags=["risk"])

DECISION_ROLES = ("ADMIN", "CUP", "CHEF_DEPARTEMENT", "ENSEIGNANT")


@router.get("")
def get_risk(teacher_id: str, container: ContainerDependency, user: Annotated[CurrentUser, Depends(require_roles(*DECISION_ROLES))]):
    teacher = resolve_teacher_or_404(teacher_id, container.teacher_source)
    user_teacher = resolve_user_teacher(container, user)
    enforce_teacher_access(user, teacher, user_teacher)

    profile, model_mode, model_version, model_name = container.compute_risk.execute(teacher_id)
    return ok(
        profile.to_dict(model_mode, model_version)["data"],
        {"model_mode": model_mode, "model_version": model_version, "model_name": model_name},
    )
