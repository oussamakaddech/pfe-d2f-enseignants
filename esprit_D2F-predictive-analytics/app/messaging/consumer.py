"""RabbitMQ AMQP consumer — réagit aux événements des autres microservices.

DSI §2 — standardise sur RabbitMQ (broker.dsi.local:5672) comme les autres
microservices. Remplace l'ancien consumer ActiveMQ STOMP (stomp.py).
"""

import json
import logging
import os
import threading
import time

import pika
import pika.exceptions

logger = logging.getLogger(__name__)

RABBITMQ_HOST     = os.getenv("RABBITMQ_HOST", "broker.dsi.local")
RABBITMQ_PORT     = int(os.getenv("RABBITMQ_PORT", "5672"))
RABBITMQ_USER     = os.getenv("RABBITMQ_USER", "")
RABBITMQ_PASSWORD = os.getenv("RABBITMQ_PASSWORD", "")
ANALYTICS_QUEUE   = os.getenv("RABBITMQ_ANALYTICS_QUEUE", "d2f.analytics.trigger")
ANALYTICS_DLQ     = ANALYTICS_QUEUE + ".dlq"
MESSAGING_ENABLED = os.getenv("MESSAGING_ENABLED", "false").lower() == "true"

_consumer_thread: threading.Thread | None = None

RECONNECT_DELAYS = [5, 10, 30, 60, 120]  # seconds, exponential backoff
MAX_RECONNECT_ATTEMPTS = 10


class AnalyticsEventConsumer:
    """Consomme les événements RabbitMQ et déclenche les analyses.

    Features:
    - Queue + DLQ déclarées automatiquement
    - Acknowledgement manuel (requeue en cas d'erreur)
    - Reconnexion automatique avec backoff exponentiel
    """

    def __init__(self):
        self._connection: pika.BlockingConnection | None = None
        self._channel = None
        self._reconnect_attempts = 0
        self._should_reconnect = True

    def _declare_queues(self, channel):
        """Declare l'exchange DLX, la queue analytics et sa DLQ."""
        # Dead-letter exchange (même convention que les autres services)
        channel.exchange_declare(exchange="d2f.dlx", exchange_type="direct", durable=True)

        # DLQ
        channel.queue_declare(
            queue=ANALYTICS_DLQ,
            durable=True,
            arguments={
                "x-message-ttl": 86400000,  # 24h
            },
        )
        channel.queue_bind(exchange="d2f.dlx", queue=ANALYTICS_DLQ, routing_key=ANALYTICS_DLQ)

        # Queue principale avec DLQ
        channel.queue_declare(
            queue=ANALYTICS_QUEUE,
            durable=True,
            arguments={
                "x-dead-letter-exchange": "d2f.dlx",
                "x-dead-letter-routing-key": ANALYTICS_DLQ,
            },
        )
        logger.info("Queues déclarées: %s + DLQ %s", ANALYTICS_QUEUE, ANALYTICS_DLQ)

    def _on_message(self, channel, method, properties, body):
        """Callback appelé pour chaque message reçu."""
        try:
            payload = json.loads(body)
            event   = payload.get("event", "")
            eid     = payload.get("enseignantId")
            logger.info("Event reçu : %s pour enseignant %s", event, eid)

            if eid and event in (
                "EVALUATION_SUBMITTED",
                "INSCRIPTION_APPROVED",
                "BESOIN_APPROVED",
            ):
                self._trigger_individual_analysis(eid)

            # Acknowledgement manuel — message traité
            channel.basic_ack(delivery_tag=method.delivery_tag)

        except Exception as exc:
            logger.warning("Erreur traitement message RabbitMQ : %s", exc)
            # Nack + requeue pour réessayer plus tard
            channel.basic_nack(delivery_tag=method.delivery_tag, requeue=True)

    def _trigger_individual_analysis(self, enseignant_id: str):
        """Déclenche une analyse individuelle dans un thread séparé."""
        def _run():
            from app.scheduler.jobs import _analyse_un_enseignant
            ok = _analyse_un_enseignant(enseignant_id)
            logger.info("Analyse event-driven pour %s : %s", enseignant_id, "OK" if ok else "ERR")

        t = threading.Thread(target=_run, daemon=True, name=f"analyse-{enseignant_id}")
        t.start()

    def connect(self):
        """Connecte à RabbitMQ, déclare les queues, démarre le consumer."""
        if not RABBITMQ_USER or not RABBITMQ_PASSWORD:
            raise RuntimeError(
                "RabbitMQ credentials missing. Set RABBITMQ_USER and "
                "RABBITMQ_PASSWORD env vars before enabling MESSAGING_ENABLED."
            )

        credentials = pika.PlainCredentials(RABBITMQ_USER, RABBITMQ_PASSWORD)
        params = pika.ConnectionParameters(
            host=RABBITMQ_HOST,
            port=RABBITMQ_PORT,
            credentials=credentials,
            heartbeat=600,
            blocked_connection_timeout=300,
            connection_attempts=3,
            retry_delay=5,
        )

        try:
            self._connection = pika.BlockingConnection(params)
            self._channel = self._connection.channel()
            self._declare_queues(self._channel)
            self._channel.basic_qos(prefetch_count=1)
            self._channel.basic_consume(
                queue=ANALYTICS_QUEUE,
                on_message_callback=self._on_message,
            )
            self._reconnect_attempts = 0
            logger.info(
                "Consumer RabbitMQ connecté sur %s:%d — queue %s",
                RABBITMQ_HOST, RABBITMQ_PORT, ANALYTICS_QUEUE,
            )
            # Bloque jusqu'à déconnexion (la thread tourne indéfiniment)
            self._channel.start_consuming()

        except pika.exceptions.AMQPConnectionError as exc:
            logger.error("Connexion RabbitMQ échouée : %s", exc)
            self._schedule_reconnect()
        except Exception as exc:
            logger.error("Erreur RabbitMQ : %s", exc)
            self._schedule_reconnect()

    def _schedule_reconnect(self):
        """Reconnexion avec backoff exponentiel."""
        if not self._should_reconnect:
            return
        if self._reconnect_attempts >= MAX_RECONNECT_ATTEMPTS:
            logger.error(
                "Max reconnection attempts (%d) atteint. Abandon.",
                MAX_RECONNECT_ATTEMPTS,
            )
            return

        delay_idx = min(self._reconnect_attempts, len(RECONNECT_DELAYS) - 1)
        delay = RECONNECT_DELAYS[delay_idx]
        self._reconnect_attempts += 1

        logger.info(
            "Reconnexion dans %ds (tentative %d/%d)...",
            delay, self._reconnect_attempts, MAX_RECONNECT_ATTEMPTS,
        )

        def _reconnect():
            time.sleep(delay)
            self.connect()

        t = threading.Thread(target=_reconnect, daemon=True, name="rabbitmq-reconnect")
        t.start()

    def disconnect(self):
        """Arrête proprement le consumer."""
        self._should_reconnect = False
        if self._connection and self._connection.is_open:
            try:
                if self._channel and self._channel.is_open:
                    self._channel.stop_consuming()
                self._connection.close()
            except Exception:
                pass


_consumer_instance: AnalyticsEventConsumer | None = None


def start_consumer():
    """Démarre le consumer RabbitMQ dans un thread daemon."""
    global _consumer_instance, _consumer_thread

    if not MESSAGING_ENABLED:
        logger.info("Messaging désactivé (MESSAGING_ENABLED=false)")
        return

    _consumer_instance = AnalyticsEventConsumer()

    def _run():
        _consumer_instance.connect()

    _consumer_thread = threading.Thread(target=_run, daemon=True, name="rabbitmq-consumer")
    _consumer_thread.start()
    logger.info("Consumer RabbitMQ démarré")


def stop_consumer():
    """Arrête le consumer RabbitMQ."""
    global _consumer_instance
    if _consumer_instance:
        _consumer_instance.disconnect()
