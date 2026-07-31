from __future__ import annotations

import re
from enum import Enum

TEACHER_ID_PATTERN = re.compile(r"^ENS\d{3,6}$")
LEGACY_TEACHER_ID_PATTERN = re.compile(r"^T\d{3,6}$")
FORMATION_SERVICE_ID_PATTERN = re.compile(r"^E\d{5}$")


class TeacherRole(str, Enum):
    TEACHER = "TEACHER"
    DEPARTMENT_HEAD = "DEPARTMENT_HEAD"
    UP_HEAD = "UP_HEAD"
    ADMIN = "ADMIN"


class TeacherStatus(str, Enum):
    ACTIVE = "ACTIVE"
    INACTIVE = "INACTIVE"
    ON_LEAVE = "ON_LEAVE"


def normalize_teacher_id(teacher_id: str) -> str:
    """Normalize a teacher id to the canonical ENSxxx format.

    - Accepts 'ens001', 'ENS001', '  ENS001  '.
    - Legacy 'T001' is rejected (caller may use an alias table first).
    - Formation-service 'E00001' is rejected by default.
    """
    if not isinstance(teacher_id, str) or not teacher_id.strip():
        raise ValueError("teacher_id cannot be empty")
    tid = teacher_id.strip().upper()
    if TEACHER_ID_PATTERN.match(tid):
        return tid
    if LEGACY_TEACHER_ID_PATTERN.match(tid) or FORMATION_SERVICE_ID_PATTERN.match(tid):
        raise ValueError(
            f"Non-canonical teacher id {teacher_id!r}: only ENSxxx ids are accepted. "
            "Map legacy ids via an alias table first."
        )
    raise ValueError(f"Invalid teacher id format {teacher_id!r}: must match ENSxxx")


def is_valid_teacher_id(teacher_id: str) -> bool:
    try:
        normalize_teacher_id(teacher_id)
        return True
    except ValueError:
        return False
