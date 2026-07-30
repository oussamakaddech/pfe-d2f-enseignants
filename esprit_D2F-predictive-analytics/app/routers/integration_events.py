"""REST endpoints for inter-service event integration.

These endpoints simulate RabbitMQ events when RabbitMQ is not available.
They use the exact same validation and processing logic as the RabbitMQ consumers.

Endpoints:
- POST /api/v1/integration/events/user-updated
- POST /api/v1/integration/events/competency-updated
- POST /api/v1/integration/events/training-completed
"""

import logging
from typing import Any

from fastapi import APIRouter, Body, Depends, HTTPException, Request, status

from app.core.event_validation import EventValidationError, validate_event_payload
from app.schemas.events import (
    CompetencyUpdatedEvent,
    EventProcessingResult,
    EventType,
    TrainingCompletedEvent,
    UserUpdatedEvent,
)
from app.services.event_processing_service import EventProcessingService

logger = logging.getLogger(__name__)

router = APIRouter(
    prefix="/api/v1/integration/events",
    tags=["Integration Events"],
)


def get_processing_service(request: Request) -> EventProcessingService:
    """Get the event processing service with DB session."""
    db = getattr(request.state, "db", None)
    if db is None:
        try:
            from app.core.db import SessionLocal
            db = SessionLocal()
        except Exception:
            db = None
    return EventProcessingService(db=db)


@router.post("/user-updated", response_model=EventProcessingResult)
def receive_user_updated(
    request: Request,
    payload: dict[str, Any] = Body(..., description="User updated event payload"),
    service: EventProcessingService = Depends(get_processing_service),
):
    """Receive a user.updated event from User Management Service.

    Triggers:
    - Update teacher context (department, UP, role, status)
    - Invalidate caches (profile, recommendations, risk, dashboard)
    - Verify scope permissions
    """
    try:
        event = validate_event_payload(payload)
        if not isinstance(event, UserUpdatedEvent):
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Expected user.updated event, got {event.event_type.value}",
            )
        result = service.process_event(event)
        return result
    except EventValidationError as exc:
        logger.warning("Invalid user.updated event: %s", exc.message)
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=exc.message,
            headers={"X-Error-Details": str(exc.details) if exc.details else ""},
        )


@router.post("/competency-updated", response_model=EventProcessingResult)
def receive_competency_updated(
    request: Request,
    payload: dict[str, Any] = Body(..., description="Competency updated event payload"),
    service: EventProcessingService = Depends(get_processing_service),
):
    """Receive a competency.updated event from Competency Service.

    Triggers:
    - Validate competency and teacher exist
    - Update competency level
    - Recalculate gaps for the teacher only
    - Recalculate risk
    - Recalculate recommendations
    - Create/update alerts
    - Invalidate teacher's caches
    """
    try:
        event = validate_event_payload(payload)
        if not isinstance(event, CompetencyUpdatedEvent):
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Expected competency.updated event, got {event.event_type.value}",
            )
        result = service.process_event(event)
        return result
    except EventValidationError as exc:
        logger.warning("Invalid competency.updated event: %s", exc.message)
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=exc.message,
            headers={"X-Error-Details": str(exc.details) if exc.details else ""},
        )


@router.post("/training-completed", response_model=EventProcessingResult)
def receive_training_completed(
    request: Request,
    payload: dict[str, Any] = Body(..., description="Training completed event payload"),
    service: EventProcessingService = Depends(get_processing_service),
):
    """Receive a training.completed event from Training Service.

    Triggers:
    - Prevent double processing via event_id
    - Mark training as completed
    - Exclude from recommendations immediately
    - Update training history
    - Recalculate gaps, risk, recommendations, alerts
    - Invalidate teacher's caches
    """
    try:
        event = validate_event_payload(payload)
        if not isinstance(event, TrainingCompletedEvent):
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Expected training.completed event, got {event.event_type.value}",
            )
        result = service.process_event(event)
        return result
    except EventValidationError as exc:
        logger.warning("Invalid training.completed event: %s", exc.message)
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=exc.message,
            headers={"X-Error-Details": str(exc.details) if exc.details else ""},
        )


@router.post("/generic", response_model=EventProcessingResult)
def receive_generic_event(
    request: Request,
    payload: dict[str, Any] = Body(..., description="Generic inter-service event payload"),
    service: EventProcessingService = Depends(get_processing_service),
):
    """Receive any valid inter-service event.

    The event_type field determines which handler is used.
    """
    try:
        event = validate_event_payload(payload)
        result = service.process_event(event)
        return result
    except EventValidationError as exc:
        logger.warning("Invalid event: %s", exc.message)
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=exc.message,
            headers={"X-Error-Details": str(exc.details) if exc.details else ""},
        )
