from __future__ import annotations

from enum import Enum


class DataQualityStatus(str, Enum):
    COMPLETE = "COMPLETE"
    DATA_INCOMPLETE = "DATA_INCOMPLETE"
    MISSING_COMPETENCIES = "MISSING_COMPETENCIES"
    STALE = "STALE"


class ValidationSeverity(str, Enum):
    ERROR = "ERROR"
    WARNING = "WARNING"
    INFO = "INFO"


class MlResultStatus(str, Enum):
    OK = "OK"
    INSUFFICIENT_HISTORICAL_DATA = "INSUFFICIENT_HISTORICAL_DATA"
    MODEL_UNAVAILABLE = "MODEL_UNAVAILABLE"
