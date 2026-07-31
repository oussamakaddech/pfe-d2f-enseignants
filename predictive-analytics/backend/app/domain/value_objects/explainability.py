from __future__ import annotations

from datetime import date
from typing import Any, Optional

from pydantic import BaseModel, ConfigDict


class Evidence(BaseModel):
    """Preuve factuelle d'un gap. L'explicabilité d'un moteur déterministe."""

    model_config = ConfigDict(frozen=True, extra="ignore")

    source: str
    detail: str = ""
    observed_value: Optional[Any] = None
    reference_value: Optional[Any] = None
    as_of: Optional[date] = None

    def to_dict(self) -> dict[str, Any]:
        return self.model_dump()


class Explainability(BaseModel):
    """Explication lisible machine + humaine d'un gap."""

    model_config = ConfigDict(frozen=True, extra="ignore")

    rule_id: str
    rule_label: str
    formula: str
    human_readable: str
    evidence: list[Evidence] = []

    def to_dict(self) -> dict[str, Any]:
        return self.model_dump()
