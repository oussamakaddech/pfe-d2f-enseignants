from dataclasses import dataclass, field
from datetime import datetime, timezone

AlertStatusOpen = "NOUVELLE"
AlertStatusAck = "ACK"
AlertStatusResolved = "RESOLUE"


def _iso_utc(value: datetime) -> str:
    """ISO 8601 UTC sans doublon de fuseau (évite `...+00:00Z`)."""
    if value.tzinfo is None:
        return value.replace(tzinfo=timezone.utc).isoformat()
    return value.astimezone(timezone.utc).isoformat()


@dataclass(frozen=True)
class Alert:
    alert_type: str
    target_type: str
    severity: str
    title: str
    message: str
    teacher_id: str | None = None
    department_id: str | None = None
    competence_id: int | None = None
    skill_gap_id: int | None = None
    details: dict | None = None
    status: str = AlertStatusOpen
    id: int | None = None
    created_at: datetime = field(default_factory=datetime.utcnow)

    def to_dict(self) -> dict:
        return {
            "id": self.id,
            "alert_type": self.alert_type,
            "target_type": self.target_type,
            "teacher_id": self.teacher_id,
            "department_id": self.department_id,
            "competence_id": self.competence_id,
            "severity": self.severity,
            "title": self.title,
            "message": self.message,
            "details": self.details or {},
            "status": self.status,
            "created_at": _iso_utc(self.created_at),
        }
