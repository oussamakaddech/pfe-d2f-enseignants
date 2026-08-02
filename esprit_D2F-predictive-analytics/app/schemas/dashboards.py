from typing import Any

from pydantic import BaseModel, ConfigDict

Cfg = ConfigDict(protected_namespaces=())


class DashboardOut(BaseModel):
    model_config = Cfg
    data: dict[str, Any]
