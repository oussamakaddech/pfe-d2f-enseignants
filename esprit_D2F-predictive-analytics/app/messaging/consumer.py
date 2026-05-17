"""ActiveMQ STOMP consumer — réagit aux événements des autres microservices."""

import json
import logging
import os
import threading

logger = logging.getLogger(__name__)

ACTIVEMQ_HOST     = os.getenv("ACTIVEMQ_HOST", "localhost")
ACTIVEMQ_PORT     = int(os.getenv("ACTIVEMQ_STOMP_PORT", "61613"))
ACTIVEMQ_USER     = os.getenv("ACTIVEMQ_USER", "admin")
ACTIVEMQ_PASSWORD = os.getenv("ACTIVEMQ_PASSWORD", "admin")
ANALYTICS_QUEUE   = "/queue/d2f.analytics.trigger"
MESSAGING_ENABLED = os.getenv("MESSAGING_ENABLED", "false").lower() == "true"

_consumer_thread: threading.Thread | None = None

# Resolve the stomp ConnectionListener base class at import time so the
# subclass declaration works whether or not stomp.py is installed.
try:
    import stomp as _stomp  # type: ignore
    _STOMP_BASE = _stomp.ConnectionListener
except ImportError:
    _stomp = None
    _STOMP_BASE = object


def _has_stomp() -> bool:
    """Check if stomp.py is available for import."""
    return _stomp is not None


class AnalyticsEventConsumer(_STOMP_BASE):
    """Consomme les événements ActiveMQ et déclenche les analyses.

    Features:
    - Automatic reconnection with exponential backoff
    - Heartbeat monitoring
    - Graceful error handling
    """

    RECONNECT_DELAYS = [5, 10, 30, 60, 120]  # seconds, exponential backoff
    MAX_RECONNECT_ATTEMPTS = 10

    def __init__(self):
        self._conn = None
        self._reconnect_attempts = 0
        self._should_reconnect = True

    def on_message(self, frame):
        try:
            body    = frame.body if hasattr(frame, "body") else str(frame)
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

        except Exception as exc:
            logger.warning("Erreur traitement message ActiveMQ : %s", exc)

    def on_error(self, frame):
        logger.error("ActiveMQ error: %s", frame.body if hasattr(frame, "body") else frame)

    def on_disconnected(self):
        logger.warning("ActiveMQ déconnecté — tentative de reconnexion...")
        self._schedule_reconnect()

    def _trigger_individual_analysis(self, enseignant_id: str):
        """Déclenche une analyse individuelle dans un thread séparé."""
        def _run():
            from app.scheduler.jobs import _analyse_un_enseignant
            ok = _analyse_un_enseignant(enseignant_id)
            logger.info("Analyse event-driven pour %s : %s", enseignant_id, "OK" if ok else "ERR")

        t = threading.Thread(target=_run, daemon=True, name=f"analyse-{enseignant_id}")
        t.start()

    def connect(self):
        try:
            import stomp
            self._conn = stomp.Connection(
                [(ACTIVEMQ_HOST, ACTIVEMQ_PORT)],
                heartbeats=(10000, 10000),  # 10s heartbeat
            )
            self._conn.set_listener("analytics_listener", self)
            self._conn.connect(ACTIVEMQ_USER, ACTIVEMQ_PASSWORD, wait=True)
            self._conn.subscribe(destination=ANALYTICS_QUEUE, id=1, ack="auto")
            self._reconnect_attempts = 0  # Reset on successful connect
            logger.info("Consumer ActiveMQ connecté sur %s:%d — queue %s",
                        ACTIVEMQ_HOST, ACTIVEMQ_PORT, ANALYTICS_QUEUE)
        except ImportError:
            logger.warning("stomp.py non installé — messaging désactivé")
        except Exception as exc:
            logger.error("Connexion ActiveMQ échouée : %s", exc)
            self._schedule_reconnect()

    def _schedule_reconnect(self):
        """Schedule a reconnection attempt with exponential backoff."""
        if not self._should_reconnect:
            return
        if self._reconnect_attempts >= self.MAX_RECONNECT_ATTEMPTS:
            logger.error(
                "Max reconnection attempts (%d) reached. Giving up.",
                self.MAX_RECONNECT_ATTEMPTS,
            )
            return

        delay_idx = min(self._reconnect_attempts, len(self.RECONNECT_DELAYS) - 1)
        delay = self.RECONNECT_DELAYS[delay_idx]
        self._reconnect_attempts += 1

        logger.info("Reconnexion dans %ds (tentative %d/%d)...",
                     delay, self._reconnect_attempts, self.MAX_RECONNECT_ATTEMPTS)

        def _reconnect():
            import time
            time.sleep(delay)
            self.connect()

        t = threading.Thread(target=_reconnect, daemon=True, name="activemq-reconnect")
        t.start()

    def disconnect(self):
        self._should_reconnect = False
        if self._conn:
            try:
                self._conn.disconnect()
            except Exception:
                pass


_consumer_instance: AnalyticsEventConsumer | None = None


def start_consumer():
    """Démarre le consumer STOMP dans un thread daemon."""
    global _consumer_instance, _consumer_thread

    if not MESSAGING_ENABLED:
        logger.info("Messaging désactivé (MESSAGING_ENABLED=false)")
        return

    _consumer_instance = AnalyticsEventConsumer()

    def _run():
        _consumer_instance.connect()
        # Le consumer tourne indéfiniment grâce au framework stomp.py

    _consumer_thread = threading.Thread(target=_run, daemon=True, name="activemq-consumer")
    _consumer_thread.start()
    logger.info("Consumer ActiveMQ démarré")


def stop_consumer():
    global _consumer_instance
    if _consumer_instance:
        _consumer_instance.disconnect()
