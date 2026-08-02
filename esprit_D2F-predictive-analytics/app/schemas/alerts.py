from datetime import datetime
from typing import Any

from pydantic import BaseModel, ConfigDict, Field

Cfg = ConfigDict(protected_namespaces=())


class AlertOut(BaseModel):
    model_config = Cfg
    id: int | None
    alert_type: str
    target_type: str
    teacher_id: str | None = None
    department_id: str | None = None
    competence_id: int | None = None
    severity: str
    title: str
    message: str
    details: dict[str, Any] = Field(default_factory=dict)
    status: str
    created_at: datetime | None = None


class AlertStatusUpdate(BaseModel):
    model_config = Cfg
    status: str = Field(pattern="^(NOUVELLE|ACK|RESOLUE|IGNOREE|ESCALADEE)$")
    comment: str | None = None


class AlertStatusOut(BaseModel):
    model_config = Cfg
    id: int
    status: str
