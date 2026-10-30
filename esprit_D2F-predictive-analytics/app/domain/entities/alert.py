from dataclasses import dataclass, field
from datetime import datetime

from app.domain.value_objects.time_format import iso_utc

AlertStatusOpen = "NOUVELLE"
AlertStatusAck = "ACK"
AlertStatusResolved = "RESOLUE"


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
            "created_at": iso_utc(self.created_at),
        }
