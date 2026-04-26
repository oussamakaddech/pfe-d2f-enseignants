"""Structured JSON logging configuration."""

import logging
import sys

from pythonjsonlogger import jsonlogger


class CustomJsonFormatter(jsonlogger.JsonFormatter):
    """Custom JSON formatter adding service name and environment."""

    def add_fields(self, log_record, record, message_dict):
        super().add_fields(log_record, record, message_dict)
        log_record.setdefault("service", "d2f-predictive-analytics")
        log_record.setdefault("level", record.levelname)
        log_record.setdefault("logger", record.name)


def configure_logging() -> None:
    """Configure root logger with structured JSON output."""
    formatter = CustomJsonFormatter(
        "%(timestamp)s %(level)s %(name)s %(message)s %(service)s",
        rename_fields={"levelname": "level", "asctime": "timestamp"},
    )

    handler = logging.StreamHandler(sys.stdout)
    handler.setFormatter(formatter)

    root_logger = logging.getLogger()
    root_logger.handlers = []
    root_logger.addHandler(handler)
    root_logger.setLevel(logging.INFO)

    # Reduce verbosity of third-party libraries
    logging.getLogger("sqlalchemy.engine").setLevel(logging.WARNING)
    logging.getLogger("urllib3").setLevel(logging.WARNING)
