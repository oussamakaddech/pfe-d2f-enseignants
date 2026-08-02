"""Pydantic schemas for inter-service events (DSI Section 2 — event-driven sync).

These schemas define the strict contract for events received from:
- User Management Service (user.updated)
- Competency Service (competency.updated)
- Training Service (training.completed)

All events MUST include:
- teacher_id: str matching pattern `^ENS[0-9]{3}$`
- event_id: str, unique UUID
- event_type: str, one of the defined event types
- correlation_id: str, optional but required if present in contract
- timestamp: ISO 8601 datetime

Invalid payloads are rejected with HTTP 400.
"""

import re
from datetime import datetime
from enum import Enum
from typing import Any, Optional

from pydantic import BaseModel, ConfigDict, Field, field_validator


TEACHER_ID_PATTERN = re.compile(r"^ENS\d{3}$")


def validate_teacher_id(value: str) -> str:
    """Validate teacher_id matches canonical ENS format."""
    if not isinstance(value, str):
        raise ValueError("teacher_id must be a string")
    value = value.strip().upper()
    if not TEACHER_ID_PATTERN.match(value):
        raise ValueError(
            f"teacher_id must match pattern ^ENS\\d{{3}}$, got: {value!r}"
        )
    return value


class EventType(str, Enum):
    """Supported inter-service event types."""

    USER_UPDATED = "user.updated"
    COMPETENCY_UPDATED = "competency.updated"
    TRAINING_COMPLETED = "training.completed"


class BaseEvent(BaseModel):
    """Base schema for all inter-service events.

    All events inherit from this base. The event_id ensures idempotency.
    """

    model_config = ConfigDict(extra="forbid", str_strip_whitespace=True)

    event_id: str = Field(
        ..., description="Unique UUID for this event (idempotency key)"
    )
    event_type: EventType = Field(
        ..., description="Type of event (user.updated, competency.updated, training.completed)"
    )
    teacher_id: str = Field(
        ..., description="Canonical teacher ID (ENSxxx)", min_length=6, max_length=6
    )
    correlation_id: Optional[str] = Field(
        default=None, description="Correlation ID for request tracing"
    )
    timestamp: datetime = Field(
        ..., description="ISO 8601 timestamp of when the event was emitted"
    )

    @field_validator("teacher_id")
    @classmethod
    def _validate_teacher_id(cls, v: str) -> str:
        return validate_teacher_id(v)

    @field_validator("event_id")
    @classmethod
    def _validate_event_id(cls, v: str) -> str:
        if not v or not v.strip():
            raise ValueError("event_id must not be empty")
        return v.strip()


class UserUpdatedEvent(BaseEvent):
    """Event emitted when a user's profile is updated in User Management.

    Triggers:
    - Update teacher context (department, UP, role, status)
    - Invalidate caches (profile, recommendations, risk, dashboard)
    - Verify scope permissions
    """

    event_type: EventType = Field(default=EventType.USER_UPDATED)

    data: dict[str, Any] = Field(
        ..., description="Updated user fields"
    )

    @field_validator("data")
    @classmethod
    def _validate_data(cls, v: dict[str, Any]) -> dict[str, Any]:
        if not isinstance(v, dict):
            raise ValueError("data must be a JSON object")
        allowed_fields = {
            "department_id", "up_id", "role_id", "status",
            "nom", "prenom", "email", "status_metier",
        }
        for key in v:
            if key not in allowed_fields:
                raise ValueError(
                    f"Unknown field in data: {key!r}. "
                    f"Allowed: {sorted(allowed_fields)}"
                )
        return v


class CompetencyUpdatedEvent(BaseEvent):
    """Event emitted when a teacher's competency level is updated.

    Triggers:
    - Validate competency and teacher exist
    - Update competency level
    - Recalculate gaps for the teacher only
    - Recalculate risk
    - Recalculate recommendations
    - Create/update alerts
    - Invalidate teacher's caches
    """

    event_type: EventType = Field(default=EventType.COMPETENCY_UPDATED)

    data: dict[str, Any] = Field(
        ..., description="Updated competency fields"
    )

    @field_validator("data")
    @classmethod
    def _validate_data(cls, v: dict[str, Any]) -> dict[str, Any]:
        if not isinstance(v, dict):
            raise ValueError("data must be a JSON object")
        required_fields = {"competence_id", "current_level"}
        missing = required_fields - set(v.keys())
        if missing:
            raise ValueError(
                f"Missing required fields in data: {sorted(missing)}"
            )
        if not isinstance(v["competence_id"], int):
            raise ValueError("competence_id must be an integer")
        if not isinstance(v["current_level"], int) or not (1 <= v["current_level"] <= 5):
            raise ValueError("current_level must be an integer between 1 and 5")
        return v


class TrainingCompletedEvent(BaseEvent):
    """Event emitted when a teacher completes a training.

    Triggers:
    - Prevent double processing via event_id
    - Mark training as completed
    - Exclude from recommendations immediately
    - Update training history
    - Recalculate gaps, risk, recommendations, alerts
    - Invalidate teacher's caches
    """

    event_type: EventType = Field(default=EventType.TRAINING_COMPLETED)

    data: dict[str, Any] = Field(
        ..., description="Completed training fields"
    )

    @field_validator("data")
    @classmethod
    def _validate_data(cls, v: dict[str, Any]) -> dict[str, Any]:
        if not isinstance(v, dict):
            raise ValueError("data must be a JSON object")
        required_fields = {"formation_id"}
        missing = required_fields - set(v.keys())
        if missing:
            raise ValueError(
                f"Missing required fields in data: {sorted(missing)}"
            )
        if not isinstance(v["formation_id"], int):
            raise ValueError("formation_id must be an integer")
        return v


class EventProcessingResult(BaseModel):
    """Result of processing an inter-service event."""

    model_config = ConfigDict(extra="forbid")

    event_id: str
    event_type: str
    teacher_id: str
    processed: bool = Field(..., description="Whether the event was processed")
    already_processed: bool = Field(
        default=False,
        description="Whether the event was already processed (idempotency)"
    )
    result: Optional[dict[str, Any]] = Field(
        default=None, description="Processing result details"
    )
    error: Optional[str] = Field(
        default=None, description="Error message if processing failed"
    )


# Union type for all event types
InterServiceEvent = UserUpdatedEvent | CompetencyUpdatedEvent | TrainingCompletedEvent
