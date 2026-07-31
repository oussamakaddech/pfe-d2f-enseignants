from __future__ import annotations

from enum import Enum


class TrainingState(str, Enum):
    DRAFT = "DRAFT"
    PLANIFIE = "PLANIFIE"
    ANNULE = "ANNULE"
    EN_COURS = "EN_COURS"
    ACHEVE = "ACHEVE"


class EnrollmentStatus(str, Enum):
    ENROLLED = "ENROLLED"
    COMPLETED = "COMPLETED"
    DROPPED = "DROPPED"
    PENDING = "PENDING"


class TrainingType(str, Enum):
    INTERNE = "INTERNE"
    EXTERNE = "EXTERNE"
    EN_LIGNE = "EN_LIGNE"


class NeedStatus(str, Enum):
    PENDING = "PENDING"
    APPROVED = "APPROVED"
    REJECTED = "REJECTED"
    FULFILLED = "FULFILLED"


class RecommendationPriority(str, Enum):
    LOW = "LOW"
    MEDIUM = "MEDIUM"
    HIGH = "HIGH"
