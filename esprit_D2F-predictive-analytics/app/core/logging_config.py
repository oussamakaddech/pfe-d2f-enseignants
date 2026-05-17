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


class DsiJsonFormatter(jsonlogger.JsonFormatter):
    """
    Formatter JSON enrichi :
      - Ajoute service, env, trace_id sur chaque record
      - Renomme asctime → timestamp, levelname → level
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

        # Trace ID de la requête courante (via contextvars)
        try:
            from app.core.observability import get_trace_id
            log_record.setdefault("trace_id", get_trace_id())
        except Exception:
            log_record.setdefault("trace_id", "-")


def configure_logging() -> None:
    """Configure le logger racine avec sortie JSON structurée."""
    # Note: use original field names (asctime/levelname) in the format string —
    # pythonjsonlogger 3.x consumes them before applying rename_fields, which
    # then raises KeyError if the renamed source field is missing.
    formatter = DsiJsonFormatter(
        "%(asctime)s %(levelname)s %(name)s %(message)s",
        rename_fields={"levelname": "level", "asctime": "timestamp"},
    )

    handler = logging.StreamHandler(sys.stdout)
    handler.setFormatter(formatter)

    root = logging.getLogger()
    root.handlers = []
    root.addHandler(handler)
    root.setLevel(logging.INFO)

    # Réduire la verbosité des libs tierces
    logging.getLogger("sqlalchemy.engine").setLevel(logging.WARNING)
    logging.getLogger("sqlalchemy.pool").setLevel(logging.WARNING)
    logging.getLogger("urllib3").setLevel(logging.WARNING)
    logging.getLogger("httpx").setLevel(logging.WARNING)
    logging.getLogger("apscheduler").setLevel(logging.WARNING)
    logging.getLogger("uvicorn.access").setLevel(logging.WARNING)
