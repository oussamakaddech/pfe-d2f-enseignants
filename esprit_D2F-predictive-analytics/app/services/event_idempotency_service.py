"""Event idempotency service.

Ensures that events with the same event_id are not processed twice.
Uses an in-memory store with TTL for simplicity, backed by the database
for persistence across restarts.
"""

import logging
import time
from datetime import datetime, timezone
from typing import Any, Optional

from sqlalchemy import text

logger = logging.getLogger(__name__)

# In-memory cache for fast lookups (TTL: 1 hour)
_event_cache: dict[str, float] = {}
_CACHE_TTL_SECONDS = 3600


class IdempotencyError(Exception):
    """Raised when an event has already been processed."""

    def __init__(self, event_id: str):
        self.event_id = event_id
        super().__init__(f"Event {event_id} has already been processed")


class EventIdempotencyService:
    """Service for tracking processed events to ensure idempotency."""

    def __init__(self, db=None):
        self._db = db

    def is_processed(self, event_id: str) -> bool:
        """Check if an event has already been processed.

        Checks in-memory cache first, then database.
        """
        if not event_id:
            return False

        # Check in-memory cache first
        cached_time = _event_cache.get(event_id)
        if cached_time is not None:
            if time.time() - cached_time < _CACHE_TTL_SECONDS:
                return True
            else:
                # Expired from cache
                del _event_cache[event_id]

        # Check database if available
        if self._db is not None:
            try:
                result = self._db.execute(
                    text(
                        "SELECT 1 FROM event_processing_log "
                        "WHERE event_id = :event_id AND processed = TRUE "
                        "LIMIT 1"
                    ),
                    {"event_id": event_id},
                ).fetchone()
                if result:
                    _event_cache[event_id] = time.time()
                    return True
            except Exception as exc:
                logger.warning("DB check for event_id failed: %s", exc)

        return False

    def mark_processed(
        self,
        event_id: str,
        event_type: str,
        teacher_id: str,
        result: Optional[dict[str, Any]] = None,
    ) -> None:
        """Mark an event as processed.

        Args:
            event_id: Unique event identifier
            event_type: Type of event
            teacher_id: Teacher the event relates to
            result: Processing result details
        """
        if not event_id:
            return

        # Update in-memory cache
        _event_cache[event_id] = time.time()

        # Persist to database if available
        if self._db is not None:
            try:
                self._db.execute(
                    text(
                        """
                        INSERT INTO event_processing_log
                            (event_id, event_type, teacher_id, processed, result, processed_at)
                        VALUES
                            (:event_id, :event_type, :teacher_id, TRUE, :result, :processed_at)
                        ON CONFLICT (event_id) DO UPDATE SET
                            processed = TRUE,
                            result = :result,
                            processed_at = :processed_at
                        """
                    ),
                    {
                        "event_id": event_id,
                        "event_type": event_type,
                        "teacher_id": teacher_id,
                        "result": str(result) if result else None,
                        "processed_at": datetime.now(timezone.utc),
                    },
                )
                self._db.commit()
            except Exception as exc:
                logger.warning("Failed to persist event_id to DB: %s", exc)
                self._db.rollback()

    def clear_cache(self) -> int:
        """Clear the in-memory cache. Returns number of entries cleared."""
        count = len(_event_cache)
        _event_cache.clear()
        return count


# Global instance (no DB — will be set by the processing service)
_default_service = EventIdempotencyService()


def get_idempotency_service(db=None) -> EventIdempotencyService:
    """Get the idempotency service instance."""
    if db is not None:
        return EventIdempotencyService(db)
    return _default_service
