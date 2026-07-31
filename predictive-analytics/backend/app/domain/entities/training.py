from __future__ import annotations

from datetime import date
from typing import Optional

from pydantic import BaseModel, ConfigDict, Field, field_validator

from app.domain.enums.training import (
    EnrollmentStatus,
    NeedStatus,
    TrainingState,
    TrainingType,
)


class TrainingCompetencyLink(BaseModel):
    model_config = ConfigDict(frozen=True, extra="ignore")

    knowledge_id: str
    niveau_prerequis: Optional[int] = Field(default=None, ge=1, le=5)
    niveau_vise: Optional[int] = Field(default=None, ge=1, le=5)


class Training(BaseModel):
    model_config = ConfigDict(frozen=True, extra="ignore")

    training_id: str
    title: str
    state: TrainingState = TrainingState.PLANIFIE
    active: bool = True
    cancelled: bool = False
    registration_open: bool = False
    start_date: Optional[date] = None
    end_date: Optional[date] = None
    duration_hours: float = 0.0
    department_code: Optional[str] = None
    up_code: Optional[str] = None
    role: Optional[str] = None
    capacity: Optional[int] = None
    registration_count: int = 0
    competency_links: list[TrainingCompetencyLink] = Field(default_factory=list)
    prereq_training_ids: list[str] = Field(default_factory=list)
    effectiveness_score: Optional[float] = Field(default=None, ge=0.0, le=1.0)
    available_from: Optional[date] = None
    catalog_domain: Optional[str] = None
    catalog_competency: Optional[str] = None

    @property
    def seats_available(self) -> bool:
        if self.capacity is None:
            return True
        return self.registration_count < self.capacity

    def is_currently_eligible(self, today: date | None = None) -> bool:
        if not self.active or self.cancelled:
            return False
        if self.state == TrainingState.ANNULE:
            return False
        if not self.registration_open:
            return False
        today = today or date.today()
        if self.end_date is not None and self.end_date < today:
            return False
        return True

    @property
    def target_knowledge_ids(self) -> set[str]:
        return {link.knowledge_id for link in self.competency_links}


class Enrollment(BaseModel):
    model_config = ConfigDict(frozen=True, extra="ignore")

    enrollment_id: str
    teacher_id: str
    training_id: str
    status: EnrollmentStatus = EnrollmentStatus.ENROLLED
    enrolled_at: date
    completion_date: Optional[date] = None
    certificate_issued: bool = False


class Certificate(BaseModel):
    model_config = ConfigDict(frozen=True, extra="ignore")

    certificate_id: str
    teacher_id: str
    training_id: str
    issued_date: date
    valid: bool = True


class Attendance(BaseModel):
    model_config = ConfigDict(frozen=True, extra="ignore")

    attendance_id: str
    teacher_id: str
    training_id: str
    session_date: date
    present: bool


class Evaluation(BaseModel):
    model_config = ConfigDict(frozen=True, extra="ignore")

    evaluation_id: str
    teacher_id: str
    training_id: str
    note: Optional[float] = Field(default=None, ge=0.0, le=20.0)
    satisfaisant: Optional[bool] = None
    evaluation_date: date


class TrainingNeed(BaseModel):
    model_config = ConfigDict(frozen=True, extra="ignore")

    need_id: str
    teacher_id: str
    knowledge_id: Optional[str] = None
    status: NeedStatus = NeedStatus.PENDING
    requested_at: date
    priority: Optional[int] = Field(default=None, ge=1, le=5)
    theme: str = ""
