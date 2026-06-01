"""DSI §11.7 / §12.5 — Masquage des PII dans les logs Python.

Ce filter remplace dans tous les LogRecord.msg / args :
  - emails           -> ***@***.***
  - Authorization    -> Bearer ***
  - téléphones       -> +***
  - CIN tunisiens    -> CIN***
  - password/token/secret kv -> ***

Performance : 6 regex précompilées, ~quelques microsecondes par log.
"""
from __future__ import annotations

import logging
import re
from typing import Any

# Précompilation des patterns
_PATTERNS = [
    # Emails RFC 5322 simplifié
    (re.compile(r"[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}"), "***@***.***"),
    # JWT bearer (Authorization: Bearer xxxxx)
    (re.compile(r"(?i)(Bearer\s+)[A-Z0-9._\-+/=]+"), r"\1***"),
    # Numéros téléphoniques internationaux (e.164, formats TN)
    (re.compile(r"\+?\d{1,3}[\s.-]?\(?\d{2,4}\)?[\s.-]?\d{3,4}[\s.-]?\d{3,4}"), "+***"),
    # CIN 8 chiffres (Tunisie)
    (re.compile(r"\b\d{8}\b"), "CIN***"),
    # Paramètres sensibles : password=, token=, secret=, api_key=
    (re.compile(r"(?i)(password|token|secret|api[_-]?key)\s*[=:]\s*[^\s,;)\"']+"),
        r"\1=***"),
    # Mots de passe dans JSON ("password": "xxx")
    (re.compile(r"(?i)(\"(?:password|token|secret|api[_-]?key)\"\s*:\s*)\"[^\"]+\""),
        r'\1"***"'),
]


class PIIRedactingFilter(logging.Filter):
    """Logging filter applying all PII regex on message + args."""

    def filter(self, record: logging.LogRecord) -> bool:
        try:
            record.msg = self._redact(record.getMessage())
            record.args = ()
        except Exception:  # pragma: no cover — never break logging
            pass
        return True

    @staticmethod
    def _redact(text: Any) -> str:
        if not isinstance(text, str):
            text = str(text)
        for pattern, replacement in _PATTERNS:
            text = pattern.sub(replacement, text)
        return text
