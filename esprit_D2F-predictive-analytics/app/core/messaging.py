import json
from typing import Any, Callable

from app.core.config import Settings
from app.core.logging import get_logger

logger = get_logger("messaging")


class MessageBroker:
    """Interface minimale d'un broker de messages (none | rabbitmq)."""

    def start(self, on_message: Callable[[dict], None]) -> None: ...

    def stop(self) -> None: ...

    def publish(self, routing_key: str, payload: dict) -> None: ...


class NullBroker(MessageBroker):
    """Broker désactivé — aucun envoi ni consommation (mode par défaut)."""

    def start(self, on_message: Callable[[dict], None]) -> None:
        logger.info("messagerie desactivee (type=none)")

    def stop(self) -> None:
        # No-op intentionnel : le broker Null n'ouvre aucune connexion,
        # il n'y a donc rien à arrêter.
        pass

    def publish(self, routing_key: str, payload: dict) -> None:
        logger.debug("publish ignore (broker none)", routing_key=routing_key)


def decode_message(body: bytes | str) -> dict[str, Any]:
    if isinstance(body, bytes):
        body = body.decode("utf-8")
    parsed = json.loads(body)
    if not isinstance(parsed, dict):
        raise ValueError("Message RabbitMQ non-objet JSON")
    return parsed


class RabbitBroker(MessageBroker):
    def __init__(self, settings: Settings) -> None:
        self._settings = settings
        self._channel = None
        self._connection = None
        self._consumer_tag = None

    def _connect(self):
        import pika

        self._connection = pika.BlockingConnection(
            pika.URLParameters(self._settings.rabbitmq_url)
        )
        self._channel = self._connection.channel()
        self._channel.exchange_declare(exchange=self._settings.rabbitmq_exchange, exchange_type="topic", durable=True)
        self._channel.queue_declare(queue=self._settings.rabbitmq_queue, durable=True)
        self._channel.queue_bind(
            exchange=self._settings.rabbitmq_exchange,
            queue=self._settings.rabbitmq_queue,
            routing_key=self._settings.rabbitmq_routing_key,
        )

    def start(self, on_message: Callable[[dict], None]) -> None:
        if not self._settings.rabbitmq_consumer_enabled:
            logger.info("consommateur RabbitMQ desactive (RABBITMQ_CONSUMER_ENABLED=false)")
            return
        self._connect()

        def _callback(_channel, _method, _properties, body: bytes) -> None:
            try:
                message = decode_message(body)
            except ValueError as exc:
                logger.warning("message ignore (non decodable)", error=str(exc))
                return
            try:
                on_message(message)
                _channel.basic_ack(delivery_tag=_method.delivery_tag)
            except Exception as exc:
                logger.error("echec traitement message", error=str(exc))
                _channel.basic_nack(delivery_tag=_method.delivery_tag, requeue=False)

        self._channel.basic_consume(queue=self._settings.rabbitmq_queue, on_message_callback=_callback)
        logger.info("consommateur RabbitMQ demarre", queue=self._settings.rabbitmq_queue)
        self._channel.start_consuming()

    def stop(self) -> None:
        if self._connection is not None:
            self._connection.close()
        self._connection = None
        self._channel = None

    def publish(self, routing_key: str, payload: dict) -> None:
        import pika

        if self._channel is None:
            self._connect()
        self._channel.basic_publish(
            exchange=self._settings.rabbitmq_exchange,
            routing_key=routing_key,
            body=json.dumps(payload, default=str),
        )


def build_broker(settings: Settings) -> MessageBroker:
    if settings.message_broker_type == "rabbitmq":
        return RabbitBroker(settings)
    return NullBroker()
