from typing import Any

from app.application.ports import IdempotencyRepository
from app.core.logging import get_logger

logger = get_logger("process_event")


class ProcessEvent:
    # Injecte le dépôt d'idempotence (anti double-traitement) et les handlers
    # métier enregistrés par type d'événement.
    def __init__(self, idempotency_repository: IdempotencyRepository, handlers: dict[str, Any] | None = None) -> None:
        self._idempotency_repository = idempotency_repository
        self._handlers = handlers or {}

    # Enregistre un handler métier pour un type d'événement donné (ex: "EvaluationUpdated").
    def register(self, event_type: str, handler: Any) -> None:
        self._handlers[event_type] = handler

    # Traite un événement RabbitMQ : refuse les événements sans ID, ignore les
    # doublons (idempotence), exécute le handler correspondant puis marque
    # l'événement comme traité.
    def execute(self, event: dict) -> dict:
        event_id = event.get("event_id") or event.get("id")
        if not event_id:
            raise ValueError("Événement sans event_id")

        if self._idempotency_repository.already_processed(event_id):
            logger.info("evenement deja traite", event_id=event_id)
            return {"status": "duplicate", "event_id": event_id}

        event_type = event.get("event_type", "unknown")
        handler = self._handlers.get(event_type)
        if handler is None:
            logger.warning("gestionnaire evenement absent", event_type=event_type)
            result: dict | None = None
        else:
            result = handler(event.get("payload", {}))

        self._idempotency_repository.mark_processed(event_id, event_type)
        logger.info("evenement traite", event_id=event_id, event_type=event_type)
        return {"status": "processed", "event_id": event_id, "result": result}
