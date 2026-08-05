import logging
import sys

import structlog


def _redact_email(value: str) -> str:
    """Redacte une valeur ressemblant a une adresse email (verification lineaire)."""
    if "@" not in value:
        return value
    return "[EMAIL_REDACTED]"


def redact_pii(_, __, event_dict: dict) -> dict:
    for key, value in list(event_dict.items()):
        if isinstance(value, str) and key in {"email", "mail", "payload", "token", "password", "authorization"}:
            if key == "mail" or key == "email":
                event_dict[key] = _redact_email(value)
            else:
                event_dict[key] = "[REDACTED]"
    return event_dict


def setup_logging(log_level: str, app_env: str) -> None:
    shared_processors: list = [
        structlog.contextvars.merge_contextvars,
        structlog.processors.add_log_level,
        structlog.processors.TimeStamper(fmt="iso"),
        structlog.processors.StackInfoRenderer(),
        structlog.processors.format_exc_info,
        redact_pii,
    ]

    if app_env == "production":
        processors = shared_processors + [structlog.processors.JSONRenderer()]
    else:
        processors = shared_processors + [structlog.dev.ConsoleRenderer()]

    structlog.configure(
        processors=processors,
        wrapper_class=structlog.make_filtering_bound_logger(logging.getLevelName(log_level)),
        cache_logger_on_first_use=True,
    )

    logging.basicConfig(stream=sys.stdout, level=log_level)


def get_logger(name: str) -> structlog.stdlib.BoundLogger:
    return structlog.get_logger(name)
