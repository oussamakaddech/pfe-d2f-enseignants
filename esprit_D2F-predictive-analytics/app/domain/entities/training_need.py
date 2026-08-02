from dataclasses import dataclass, field
from datetime import datetime

NeedTypeIndividual = "INDIVIDUAL"
NeedTypeCollective = "COLLECTIVE"
NeedStatusOpen = "OPEN"
NeedStatusClosed = "CLOSED"


@dataclass(frozen=True)
class TrainingNeed:
    need_type: str
    competence_id: int
    competence_code: str
    competence_nom: str
    teachers_count: int
    evidence: dict
    scope_type: str | None = None
    scope_id: str | None = None
    status: str = NeedStatusOpen
    id: int | None = None
    detected_at: datetime = field(default_factory=datetime.utcnow)

    def to_dict(self) -> dict:
        return {
            "id": self.id,
            "need_type": self.need_type,
            "competence_id": self.competence_id,
            "competence_code": self.competence_code,
            "competence_nom": self.competence_nom,
            "scope_type": self.scope_type,
            "scope_id": self.scope_id,
            "teachers_count": self.teachers_count,
            "evidence": self.evidence,
            "status": self.status,
            "detected_at": self.detected_at.isoformat() + "Z",
        }
