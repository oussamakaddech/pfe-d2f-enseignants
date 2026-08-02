"""
Logging structuré JSON — conformité DSI §4 observabilité.

Chaque ligne de log inclut :
  - service, environment, version
  - trace_id (corrélation par requête via contextvars)
  - level, logger, timestamp, message
"""

import logging
import os
import sys

from pythonjsonlogger import jsonlogger

from app.core.pii_safe_logger import sanitize


class DsiJsonFormatter(jsonlogger.JsonFormatter):
    """
    Formatter JSON enrichi :
      - Ajoute service, env, trace_id sur chaque record
      - Renomme asctime → timestamp, levelname → level
      - Masque les PII (emails, téléphones, IPs) dans les messages
    """

    _service = "d2f-predictive-analytics"
    _version = "1.0.0"
    _env     = os.getenv("APP_ENV", "development")

    def add_fields(self, log_record: dict, record: logging.LogRecord, message_dict: dict):
        super().add_fields(log_record, record, message_dict)

        # Champs fixes
        log_record.setdefault("service", self._service)
        log_record.setdefault("version", self._version)
        log_record.setdefault("env",     self._env)
        log_record.setdefault("level",   record.levelname)
        log_record.setdefault("logger",  record.name)

        # Masquage PII dans le message
        if isinstance(log_record.get("message"), str):
            log_record["message"] = sanitize(log_record["message"])

        # Trace ID de la requête courante (via contextvars)
        try:
            from app.core.observability import get_trace_id
            log_record.setdefault("trace_id", get_trace_id())
        except Exception:
            log_record.setdefault("trace_id", "-")


class PiiSafeFilter(logging.Filter):
    """Filtre de logging qui masque les PII dans tous les records."""

    def filter(self, record: logging.LogRecord) -> bool:
        if isinstance(record.msg, str):
            record.msg = sanitize(record.msg)
        return True


def configure_logging() -> None:
    """Configure le logger racine avec sortie JSON structurée et masquage PII."""
    # Note: use original field names (asctime/levelname) in the format string —
    # pythonjsonlogger 3.x consumes them before applying rename_fields, which
    # then raises KeyError if the renamed source field is missing.
    formatter = DsiJsonFormatter(
        "%(asctime)s %(levelname)s %(name)s %(message)s",
        rename_fields={"levelname": "level", "asctime": "timestamp"},
    )

    handler = logging.StreamHandler(sys.stdout)
    handler.setFormatter(formatter)

    # Filtre PII sur le handler
    handler.addFilter(PiiSafeFilter())

    root = logging.getLogger()
    root.handlers = []
    root.addHandler(handler)
    root.setLevel(logging.INFO)

    # Filtre PII global sur le root logger
    root.addFilter(PiiSafeFilter())

    # Réduire la verbosité des libs tierces
    logging.getLogger("sqlalchemy.engine").setLevel(logging.WARNING)
    logging.getLogger("sqlalchemy.pool").setLevel(logging.WARNING)
    logging.getLogger("urllib3").setLevel(logging.WARNING)
    logging.getLogger("httpx").setLevel(logging.WARNING)
    logging.getLogger("apscheduler").setLevel(logging.WARNING)
    logging.getLogger("uvicorn.access").setLevel(logging.WARNING)
