"""Event validation utilities for inter-service events.

Provides strict validation of event payloads before processing.
All validation errors result in HTTP 400 rejection.
"""

import logging
from datetime import datetime, timezone
from typing import Any

from app.schemas.events import (
    BaseEvent,
    CompetencyUpdatedEvent,
    EventType,
    TrainingCompletedEvent,
    UserUpdatedEvent,
    validate_teacher_id,
)

logger = logging.getLogger(__name__)


class EventValidationError(Exception):
    """Raised when an event payload fails validation."""

    def __init__(self, message: str, details: dict[str, Any] | None = None):
        self.message = message
        self.details = details or {}
        super().__init__(self.message)


def normalize_teacher_id(teacher_id: str) -> str:
    """Normalize teacher_id to canonical ENS format.

    - Strips whitespace
    - Converts to uppercase
    - Rejects T-format (legacy) — only ENS format accepted
    """
    if not isinstance(teacher_id, str):
        raise EventValidationError(
            f"teacher_id must be a string, got {type(teacher_id).__name__}"
        )
    normalized = teacher_id.strip().upper()
    if normalized.startswith("T") and normalized[1:].isdigit():
        raise EventValidationError(
            f"Legacy teacher_id format Txxx is not accepted. "
            f"Use canonical ENS format. Got: {teacher_id!r}"
        )
    return validate_teacher_id(normalized)


def validate_event_payload(payload: dict[str, Any]) -> BaseEvent:
    """Validate an event payload and return the typed event.

    Args:
        payload: Raw JSON payload from RabbitMQ or REST endpoint

    Returns:
        Typed event (UserUpdatedEvent, CompetencyUpdatedEvent, or TrainingCompletedEvent)

    Raises:
        EventValidationError: If the payload is invalid
    """
    if not isinstance(payload, dict):
        raise EventValidationError("Payload must be a JSON object")

    # Extract event_type first to determine which schema to use
    event_type_raw = payload.get("event_type")
    if not event_type_raw:
        raise EventValidationError("Missing required field: event_type")

    try:
        event_type = EventType(event_type_raw)
    except ValueError:
        raise EventValidationError(
            f"Invalid event_type: {event_type_raw!r}. "
            f"Must be one of: {[e.value for e in EventType]}"
        )

    # Validate teacher_id early (before full schema validation)
    teacher_id_raw = payload.get("teacher_id")
    if not teacher_id_raw:
        raise EventValidationError("Missing required field: teacher_id")
    normalized_tid = normalize_teacher_id(teacher_id_raw)
    payload["teacher_id"] = normalized_tid

    # Validate timestamp
    timestamp_raw = payload.get("timestamp")
    if timestamp_raw:
        if isinstance(timestamp_raw, str):
            try:
                payload["timestamp"] = datetime.fromisoformat(
                    timestamp_raw.replace("Z", "+00:00")
                )
            except ValueError:
                raise EventValidationError(
                    f"Invalid timestamp format: {timestamp_raw!r}. "
                    "Must be ISO 8601."
                )
        elif isinstance(timestamp_raw, datetime):
            payload["timestamp"] = timestamp_raw
        else:
            raise EventValidationError(
                f"timestamp must be a string or datetime, got {type(timestamp_raw).__name__}"
            )
    else:
        # Set default timestamp if missing
        payload["timestamp"] = datetime.now(timezone.utc)

    # Validate using the appropriate schema
    try:
        if event_type == EventType.USER_UPDATED:
            return UserUpdatedEvent(**payload)
        elif event_type == EventType.COMPETENCY_UPDATED:
            return CompetencyUpdatedEvent(**payload)
        elif event_type == EventType.TRAINING_COMPLETED:
            return TrainingCompletedEvent(**payload)
    except Exception as exc:
        raise EventValidationError(
            f"Schema validation failed for event_type={event_type.value}: {exc}"
        )

    raise EventValidationError(
        f"Unknown event_type after validation: {event_type!r}"
    )


def validate_event_for_rabbitmq(body: bytes) -> BaseEvent:
    """Validate a raw RabbitMQ message body.

    Args:
        body: Raw message body from RabbitMQ

    Returns:
        Typed event

    Raises:
        EventValidationError: If the message is invalid
    """
    import json

    try:
        payload = json.loads(body)
    except (json.JSONDecodeError, UnicodeDecodeError) as exc:
        raise EventValidationError(f"Invalid JSON in message body: {exc}")

    return validate_event_payload(payload)


def sanitize_event_for_logging(event: BaseEvent) -> dict[str, Any]:
    """Create a sanitized dict for logging (no PII).

    Removes sensitive fields like email, name from data.
    """
    result = {
        "event_id": event.event_id,
        "event_type": event.event_type.value,
        "teacher_id": event.teacher_id,
        "timestamp": event.timestamp.isoformat() if isinstance(event.timestamp, datetime) else str(event.timestamp),
    }
    if hasattr(event, "data") and isinstance(event.data, dict):
        # Only include non-sensitive fields
        safe_fields = {"competence_id", "current_level", "formation_id", "required_level"}
        result["data"] = {k: v for k, v in event.data.items() if k in safe_fields}
    return result
