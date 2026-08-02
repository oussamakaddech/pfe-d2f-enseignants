from dataclasses import dataclass, field
from datetime import datetime

from app.domain.value_objects.enums import RiskLevel


@dataclass(frozen=True)
class RiskFactor:
    feature: str
    value: float
    contribution: float


@dataclass(frozen=True)
class RiskProfile:
    teacher_id: str
    risk_score: float
    risk_level: RiskLevel
    factors: tuple[RiskFactor, ...] = field(default_factory=tuple)
    computed_at: datetime = field(default_factory=datetime.utcnow)

    def to_dict(self, model_mode: str, model_version: str | None = None) -> dict:
        payload: dict = {
            "teacher_id": self.teacher_id,
            "risk_score": round(self.risk_score, 2),
            "risk_level": self.risk_level.value,
            "factors": [f.__dict__ for f in self.factors],
            "computed_at": self.computed_at.isoformat() + "Z",
        }
        meta: dict = {"model_mode": model_mode}
        if model_version:
            meta["model_version"] = model_version
        return {"data": payload, "meta": meta, "errors": []}
