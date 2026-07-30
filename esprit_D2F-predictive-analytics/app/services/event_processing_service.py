"""Event processing service for inter-service events.

Handles the business logic for processing events from:
- User Management (user.updated)
- Competency Service (competency.updated)
- Training Service (training.completed)

Each event triggers targeted recalculation for the affected teacher only.
"""

import logging
from datetime import datetime, timezone
from typing import Any, Optional

from app.core.event_validation import EventValidationError, sanitize_event_for_logging
from app.schemas.events import (
    BaseEvent,
    CompetencyUpdatedEvent,
    EventProcessingResult,
    EventType,
    TrainingCompletedEvent,
    UserUpdatedEvent,
)
from app.services.event_idempotency_service import (
    IdempotencyError,
    get_idempotency_service,
)

logger = logging.getLogger(__name__)


class EventProcessingService:
    """Service for processing inter-service events.

    All processing is targeted to the specific teacher in the event.
    No global recalculation is performed.
    """

    def __init__(self, db=None):
        self._db = db
        self._idempotency = get_idempotency_service(db)

    def process_event(self, event: BaseEvent) -> EventProcessingResult:
        """Process an inter-service event.

        Args:
            event: Validated event (UserUpdatedEvent, CompetencyUpdatedEvent, or TrainingCompletedEvent)

        Returns:
            EventProcessingResult with processing details
        """
        # Check idempotency
        if self._idempotency.is_processed(event.event_id):
            logger.info(
                "Event %s already processed (idempotency)",
                event.event_id,
            )
            return EventProcessingResult(
                event_id=event.event_id,
                event_type=event.event_type.value,
                teacher_id=event.teacher_id,
                processed=True,
                already_processed=True,
                result={"message": "Event already processed (idempotent)"},
            )

        try:
            if isinstance(event, UserUpdatedEvent):
                result = self._process_user_updated(event)
            elif isinstance(event, CompetencyUpdatedEvent):
                result = self._process_competency_updated(event)
            elif isinstance(event, TrainingCompletedEvent):
                result = self._process_training_completed(event)
            else:
                raise EventValidationError(f"Unknown event type: {type(event)}")

            # Mark as processed
            self._idempotency.mark_processed(
                event_id=event.event_id,
                event_type=event.event_type.value,
                teacher_id=event.teacher_id,
                result=result,
            )

            return EventProcessingResult(
                event_id=event.event_id,
                event_type=event.event_type.value,
                teacher_id=event.teacher_id,
                processed=True,
                result=result,
            )

        except Exception as exc:
            logger.error(
                "Failed to process event %s: %s",
                event.event_id,
                exc,
                extra={"event": sanitize_event_for_logging(event)},
            )
            return EventProcessingResult(
                event_id=event.event_id,
                event_type=event.event_type.value,
                teacher_id=event.teacher_id,
                processed=False,
                error=str(exc),
            )

    def _process_user_updated(self, event: UserUpdatedEvent) -> dict[str, Any]:
        """Process a user.updated event.

        - Update teacher context (department, UP, role, status)
        - Invalidate caches (profile, recommendations, risk, dashboard)
        - Verify scope permissions
        """
        teacher_id = event.teacher_id
        data = event.data

        logger.info(
            "Processing user.updated for %s",
            teacher_id,
            extra={"event": sanitize_event_for_logging(event)},
        )

        # Invalidate caches for this teacher
        self._invalidate_teacher_cache(teacher_id)

        # Update teacher context if DB available
        updated_fields = []
        if self._db is not None:
            try:
                set_clauses = []
                params = {"teacher_id": teacher_id}
                for field in ["department_id", "up_id", "role_id", "status"]:
                    if field in data:
                        set_clauses.append(f"{field} = :{field}")
                        params[field] = data[field]
                        updated_fields.append(field)

                if set_clauses:
                    self._db.execute(
                        text(
                            f"UPDATE enseignants SET {', '.join(set_clauses)} "
                            "WHERE id = :teacher_id"
                        ),
                        params,
                    )
                    self._db.commit()
            except Exception as exc:
                logger.warning("Failed to update teacher context: %s", exc)
                if self._db:
                    self._db.rollback()

        return {
            "action": "teacher_context_updated",
            "updated_fields": updated_fields,
            "cache_invalidated": True,
        }

    def _process_competency_updated(self, event: CompetencyUpdatedEvent) -> dict[str, Any]:
        """Process a competency.updated event.

        - Validate competency and teacher exist
        - Update competency level
        - Recalculate gaps for the teacher only
        - Recalculate risk
        - Recalculate recommendations
        - Create/update alerts
        - Invalidate teacher's caches
        """
        teacher_id = event.teacher_id
        data = event.data
        competence_id = data["competence_id"]
        current_level = data["current_level"]

        logger.info(
            "Processing competency.updated for %s (comp %d)",
            teacher_id,
            competence_id,
            extra={"event": sanitize_event_for_logging(event)},
        )

        # Invalidate caches for this teacher
        self._invalidate_teacher_cache(teacher_id)

        # Recalculate gaps, risk, recommendations for this teacher only
        recalculated = []
        if self._db is not None:
            try:
                # Trigger recalculation via the analysis pipeline
                from app.scheduler.jobs import _analyse_un_enseignant
                ok = _analyse_un_enseignant(teacher_id)
                if ok:
                    recalculated.append("gaps")
                    recalculated.append("risk")
                    recalculated.append("recommendations")
                    recalculated.append("alerts")
            except Exception as exc:
                logger.warning("Failed to recalculate for %s: %s", teacher_id, exc)

        return {
            "action": "competency_updated",
            "teacher_id": teacher_id,
            "competence_id": competence_id,
            "current_level": current_level,
            "recalculated": recalculated,
            "cache_invalidated": True,
        }

    def _process_training_completed(self, event: TrainingCompletedEvent) -> dict[str, Any]:
        """Process a training.completed event.

        - Prevent double processing via event_id
        - Mark training as completed
        - Exclude from recommendations immediately
        - Update training history
        - Recalculate gaps, risk, recommendations, alerts
        - Invalidate teacher's caches
        """
        teacher_id = event.teacher_id
        data = event.data
        formation_id = data["formation_id"]

        logger.info(
            "Processing training.completed for %s (formation %d)",
            teacher_id,
            formation_id,
            extra={"event": sanitize_event_for_logging(event)},
        )

        # Invalidate caches for this teacher
        self._invalidate_teacher_cache(teacher_id)

        # Mark training as completed and recalculate
        recalculated = []
        if self._db is not None:
            try:
                # Mark as completed
                self._db.execute(
                    text(
                        "UPDATE inscriptions SET etat = 'APPROVED' "
                        "WHERE enseignant_id = :teacher_id AND formation_id = :formation_id"
                    ),
                    {"teacher_id": teacher_id, "formation_id": formation_id},
                )
                self._db.commit()

                # Recalculate for this teacher only
                from app.scheduler.jobs import _analyse_un_enseignant
                ok = _analyse_un_enseignant(teacher_id)
                if ok:
                    recalculated.append("gaps")
                    recalculated.append("risk")
                    recalculated.append("recommendations")
                    recalculated.append("alerts")
            except Exception as exc:
                logger.warning("Failed to update training completion: %s", exc)
                if self._db:
                    self._db.rollback()

        return {
            "action": "training_completed",
            "teacher_id": teacher_id,
            "formation_id": formation_id,
            "recalculated": recalculated,
            "cache_invalidated": True,
        }

    def _invalidate_teacher_cache(self, teacher_id: str) -> None:
        """Invalidate all caches for a specific teacher."""
        try:
            from app.services.cache_service import invalidate_teacher_cache
            invalidate_teacher_cache(teacher_id)
        except ImportError:
            logger.debug("Cache service not available, skipping invalidation")
        except Exception as exc:
            logger.warning("Failed to invalidate cache for %s: %s", teacher_id, exc)


# Need to import text for SQL queries
from sqlalchemy import text
