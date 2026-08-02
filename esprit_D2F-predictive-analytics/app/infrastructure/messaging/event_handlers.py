from typing import Any

from app.core.logging import get_logger
from app.core.messaging import build_broker

logger = get_logger("event_handlers")


def build_event_handlers(container: Any) -> dict[str, Any]:
    """Associe les types d'événements D2F aux use cases du service."""

    def handle_analysis_requested(payload: dict) -> dict:
        teacher_id = payload.get("teacher_id")
        if not teacher_id:
            raise ValueError("payload sans teacher_id")
        container.compute_gaps.execute(teacher_id)
        container.compute_risk.execute(teacher_id)
        return {"teacher_id": teacher_id, "status": "analysed"}

    def handle_teacher_created(payload: dict) -> dict:
        teacher_id = payload.get("teacher_id")
        if teacher_id:
            container.compute_gaps.execute(teacher_id)
            container.compute_risk.execute(teacher_id)
        return {"teacher_id": teacher_id, "status": "initialised"}

    def handle_besoin_formation(payload: dict) -> dict:
        teacher_id = payload.get("teacher_id") or payload.get("username")
        if teacher_id:
            container.compute_risk.execute(teacher_id)
        return {"teacher_id": teacher_id, "status": "risk_recomputed"}

    return {
        "analyse.requested": handle_analysis_requested,
        "enseignant.created": handle_teacher_created,
        "besoin.formation": handle_besoin_formation,
        "besoin.approuve": handle_besoin_formation,
    }


def start_consumer(container: Any) -> Any:
    """Démarre le consommateur RabbitMQ dans un thread dédié (non bloquant)."""
    from threading import Thread

    from app.application.use_cases.process_event import ProcessEvent
    from app.infrastructure.messaging.event_handlers import build_event_handlers

    process_event = ProcessEvent(container.idempotency_repository, build_event_handlers(container))
    broker = build_broker(container.settings)

    def _run() -> None:
        broker.start(process_event.execute)

    thread = Thread(target=_run, daemon=True, name="rabbit-consumer")
    thread.start()
    logger.info("consommateur demarre en arriere-plan")
    return broker
