from __future__ import annotations

from enum import Enum


class KnowledgeType(str, Enum):
    THEORETICAL = "THEORETICAL"
    PRACTICAL = "PRACTICAL"


class GapType(str, Enum):
    LEVEL_DEFICIT = "LEVEL_DEFICIT"
    MISSING_ASSIGNMENT = "MISSING_ASSIGNMENT"
    MISSING_PREREQUISITE = "MISSING_PREREQUISITE"
    STALE_ASSESSMENT = "STALE_ASSESSMENT"
    ACTIVE_TRAINING_NEED = "ACTIVE_TRAINING_NEED"
    INCOMPLETE_PROFILE = "INCOMPLETE_PROFILE"


class GapSeverity(str, Enum):
    LOW = "LOW"
    MEDIUM = "MEDIUM"
    HIGH = "HIGH"
    CRITICAL = "CRITICAL"


class Level(str, Enum):
    N1 = "N1"
    N2 = "N2"
    N3 = "N3"
    N4 = "N4"
    N5 = "N5"

    @property
    def int_value(self) -> int:
        return int(self.value[1:])

    @classmethod
    def from_int(cls, value: int) -> "Level":
        if value < 1 or value > 5:
            raise ValueError(f"Level out of range N1..N5: {value}")
        return cls(f"N{value}")
