"""PII-safe logging utilities for GDPR compliance.
Automatically masks emails, phone numbers, IP addresses in log messages."""

import re
import logging

EMAIL_PATTERN = re.compile(r'[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}')
PHONE_PATTERN = re.compile(r'(\+\d{1,3}[\s-]?)?\d{8,15}')
IP_PATTERN = re.compile(r'\b(?:\d{1,3}\.){3}\d{1,3}\b')
REPLACEMENT = '***'


def sanitize(message: str) -> str:
    if not message:
        return message
    s = EMAIL_PATTERN.sub(REPLACEMENT, message)
    s = PHONE_PATTERN.sub(REPLACEMENT, s)
    s = IP_PATTERN.sub(REPLACEMENT, s)
    return s


class PiiSafeLogger:
    def __init__(self, name: str):
        self._logger = logging.getLogger(name)

    def info(self, msg: str, *args, **kwargs):
        self._logger.info(sanitize(msg), *args, **kwargs)

    def warning(self, msg: str, *args, **kwargs):
        self._logger.warning(sanitize(msg), *args, **kwargs)

    def error(self, msg: str, *args, **kwargs):
        self._logger.error(sanitize(msg), *args, **kwargs)

    def debug(self, msg: str, *args, **kwargs):
        self._logger.debug(sanitize(msg), *args, **kwargs)
