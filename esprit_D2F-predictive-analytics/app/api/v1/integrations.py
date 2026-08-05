from typing import Annotated

from fastapi import APIRouter, Depends
from pydantic import BaseModel, ConfigDict, Field

from app.api.deps import ContainerDependency
from app.core.security import CurrentUser, require_roles

router = APIRouter(prefix="/events", tags=["integrations"])

Cfg = ConfigDict(protected_namespaces=())


class EventIn(BaseModel):
    model_config = Cfg
    event_id: str
    event_type: str
    payload: dict = Field(default_factory=dict)


class EventOut(BaseModel):
    model_config = Cfg
    status: str
    event_id: str
    result: dict | None = None


@router.post("/process", response_model=EventOut)
def process_event(
    event: EventIn,
    container: ContainerDependency,
    user: Annotated[CurrentUser, Depends(require_roles("ADMIN", "CUP"))],
):
    result = container.process_event.execute({"event_id": event.event_id, "event_type": event.event_type, "payload": event.payload})
    return EventOut(status=result["status"], event_id=result["event_id"], result=result.get("result"))
