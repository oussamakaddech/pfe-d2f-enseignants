"""DSI §11.7 — Configuration logging FastAPI conforme.

À appeler en première instruction du module d'entrée (ai_reco.py).
"""
import logging.config

from .pii_filter import PIIRedactingFilter

LOGGING_CONFIG = {
    "version": 1,
    "disable_existing_loggers": False,
    "filters": {"pii": {"()": PIIRedactingFilter}},
    "formatters": {
        "standard": {
            "format": "%(asctime)s %(levelname)s [%(name)s] %(message)s",
            "datefmt": "%Y-%m-%dT%H:%M:%S%z",
        }
    },
    "handlers": {
        "console": {
            "class": "logging.StreamHandler",
            "formatter": "standard",
            "filters": ["pii"],
            "stream": "ext://sys.stdout",
        }
    },
    "root": {"handlers": ["console"], "level": "INFO"},
    "loggers": {
        "uvicorn":        {"handlers": ["console"], "level": "INFO", "propagate": False},
        "uvicorn.access": {"handlers": ["console"], "level": "INFO", "propagate": False},
        "uvicorn.error":  {"handlers": ["console"], "level": "INFO", "propagate": False},
    },
}


def configure_logging() -> None:
    logging.config.dictConfig(LOGGING_CONFIG)
