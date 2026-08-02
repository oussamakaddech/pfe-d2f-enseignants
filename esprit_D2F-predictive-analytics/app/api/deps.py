from typing import Annotated

from fastapi import Depends, Request

from app.core.config import Settings, get_settings
from app.core.security import CurrentUser, get_current_user
from app.domain.entities.teacher import Teacher
from app.infrastructure.container import Container


def get_container(request: Request) -> Container:
    container = getattr(request.app.state, "container", None)
    if container is None:
        raise RuntimeError("Container non initialisé — lifespan de l'application défaillante")
    return container


ContainerDependency = Annotated[Container, Depends(get_container)]
SettingsDependency = Annotated[Settings, Depends(get_settings)]
CurrentUserDependency = Annotated[CurrentUser, Depends(get_current_user)]


def resolve_user_teacher(container: Container, user: CurrentUser) -> Teacher | None:
    if not user.user_id or user.user_id in {"", "system"}:
        return None
    return container.teacher_source.resolve_user_teacher(user.user_id)
