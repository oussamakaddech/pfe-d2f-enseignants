"""DSI §11.7 / §12.5 — Masquage des PII dans les logs Python.

Voir documentation détaillée dans le module homonyme du service rice.
"""
from __future__ import annotations

import logging
import re
from typing import Any

_PATTERNS = [
    (re.compile(r"[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}"), "***@***.***"),
    (re.compile(r"(?i)(Bearer\s+)[A-Za-z0-9._\-+/=]+"), r"\1***"),
    (re.compile(r"\+?\d{1,3}[\s.-]?\(?\d{2,4}\)?[\s.-]?\d{3,4}[\s.-]?\d{3,4}"), "+***"),
    (re.compile(r"\b\d{8}\b"), "CIN***"),
    (re.compile(r"(?i)(password|token|secret|api[_-]?key)\s*[=:]\s*[^\s,;)\"']+"),
        r"\1=***"),
    (re.compile(r"(?i)(\"(?:password|token|secret|api[_-]?key)\"\s*:\s*)\"[^\"]+\""),
        r'\1"***"'),
]


class PIIRedactingFilter(logging.Filter):
    def filter(self, record: logging.LogRecord) -> bool:
        try:
            record.msg = self._redact(record.getMessage())
            record.args = ()
        except Exception:
            pass
        return True

    @staticmethod
    def _redact(text: Any) -> str:
        if not isinstance(text, str):
            text = str(text)
        for pattern, replacement in _PATTERNS:
            text = pattern.sub(replacement, text)
        return text
