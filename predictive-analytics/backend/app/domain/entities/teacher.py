from __future__ import annotations

from datetime import date
from typing import Optional

from pydantic import BaseModel, ConfigDict, field_validator

from app.domain.enums.teacher import TeacherRole, TeacherStatus, normalize_teacher_id


class Teacher(BaseModel):
    model_config = ConfigDict(frozen=True, extra="ignore")

    teacher_id: str
    full_name: str = ""
    department_code: str = ""
    department_name: str = ""
    up_code: str = ""
    role: TeacherRole = TeacherRole.TEACHER
    status: TeacherStatus = TeacherStatus.ACTIVE
    hire_date: Optional[date] = None

    @field_validator("teacher_id")
    @classmethod
    def _canonical_id(cls, v: str) -> str:
        return normalize_teacher_id(v)


class Department(BaseModel):
    model_config = ConfigDict(frozen=True, extra="ignore")

    department_code: str
    name: str
    up_code: str = ""


class UnitePedagogique(BaseModel):
    model_config = ConfigDict(frozen=True, extra="ignore")

    up_code: str
    name: str = ""
