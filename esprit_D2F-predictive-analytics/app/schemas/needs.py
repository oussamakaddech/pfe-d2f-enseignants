from datetime import datetime
from typing import Any

from pydantic import BaseModel, ConfigDict, Field

Cfg = ConfigDict(protected_namespaces=())


class TrainingNeedOut(BaseModel):
    model_config = Cfg
    id: int | None
    need_type: str
    competence_id: int
    competence_code: str
    competence_nom: str
    scope_type: str | None = None
    scope_id: str | None = None
    teachers_count: int
    evidence: dict[str, Any] = Field(default_factory=dict)
    status: str
    detected_at: datetime | None = None


class TrainingNeedCloseOut(BaseModel):
    model_config = Cfg
    id: int
    status: str
