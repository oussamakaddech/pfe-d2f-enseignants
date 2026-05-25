"""
tests/test_observability.py — Unit tests for rice.observability (PII filter + logging config).
"""
import sys
import os
import logging
import pytest

sys.path.insert(0, os.path.dirname(os.path.dirname(__file__)))

os.environ.setdefault("DB_NAME", "test")
os.environ.setdefault("DB_USER", "test")
os.environ.setdefault("DB_PASS", "test")
os.environ.setdefault("DB_HOST", "localhost")
os.environ.setdefault("DB_PORT", "5432")

from rice.observability.pii_filter import PIIRedactingFilter, _PATTERNS
from rice.observability.logging_config import configure_logging, LOGGING_CONFIG


# ── PIIRedactingFilter ──────────────────────────────────────────────────────

class TestPIIRedactingFilter:
    def test_redact_email(self):
        result = PIIRedactingFilter._redact("Contact: user@example.com for info")
        assert "user@example.com" not in result
        assert "***@***.***" in result

    def test_redact_bearer_token(self):
        result = PIIRedactingFilter._redact("Authorization: Bearer eyJhbGciOiJIUzUxMiJ9.abc123")
        assert "eyJhbGciOiJIUzUxMiJ9.abc123" not in result
        assert "Bearer ***" in result

    def test_redact_phone_number(self):
        result = PIIRedactingFilter._redact("Phone: +216 55 123 4567")
        assert "+216 55 123 4567" not in result
        assert "+***" in result

    def test_redact_cin(self):
        result = PIIRedactingFilter._redact("CIN: 12345678")
        assert "12345678" not in result
        assert "CIN***" in result

    def test_redact_password_param(self):
        result = PIIRedactingFilter._redact("password=secret123")
        assert "secret123" not in result
        assert "password=***" in result

    def test_redact_token_param(self):
        result = PIIRedactingFilter._redact("token=abc123def")
        assert "abc123def" not in result
        assert "token=***" in result

    def test_redact_secret_param(self):
        result = PIIRedactingFilter._redact("secret=my_secret_value")
        assert "my_secret_value" not in result
        assert "secret=***" in result

    def test_redact_api_key_param(self):
        result = PIIRedactingFilter._redact("api_key=sk-12345")
        assert "sk-12345" not in result
        assert "api_key=***" in result

    def test_redact_json_password(self):
        result = PIIRedactingFilter._redact('{"password": "myPass123"}')
        assert "myPass123" not in result
        assert '"***"' in result

    def test_redact_json_token(self):
        result = PIIRedactingFilter._redact('{"token": "jwt-value-here"}')
        assert "jwt-value-here" not in result

    def test_no_redaction_needed(self):
        text = "Normal log message without PII"
        result = PIIRedactingFilter._redact(text)
        assert result == text

    def test_redact_non_string_input(self):
        result = PIIRedactingFilter._redact(42)
        assert result == "42"

    def test_redact_none_converted(self):
        result = PIIRedactingFilter._redact(None)
        assert isinstance(result, str)

    def test_filter_method_returns_true(self):
        filt = PIIRedactingFilter()
        record = logging.LogRecord("test", logging.INFO, "", 0, "user@test.com", (), None)
        result = filt.filter(record)
        assert result is True
        assert "***@***.***" in record.msg
        assert record.args == ()

    def test_multiple_pii_in_one_message(self):
        result = PIIRedactingFilter._redact(
            "Email: admin@corp.com password=hunter2 phone: +216 55 123 4567"
        )
        assert "admin@corp.com" not in result
        assert "hunter2" not in result
        assert "+216 55 123 4567" not in result

    def test_patterns_are_compiled(self):
        """All patterns should be compiled regex objects."""
        import re
        for pattern, replacement in _PATTERNS:
            assert isinstance(pattern, re.Pattern)


# ── Logging configuration ───────────────────────────────────────────────────

class TestLoggingConfig:
    def test_configure_logging_idempotent(self):
        # Should not raise even if called multiple times
        configure_logging()
        configure_logging()

    def test_logging_config_structure(self):
        assert LOGGING_CONFIG["version"] == 1
        assert "filters" in LOGGING_CONFIG
        assert "pii" in LOGGING_CONFIG["filters"]
        assert "handlers" in LOGGING_CONFIG
        assert "console" in LOGGING_CONFIG["handlers"]
        assert "root" in LOGGING_CONFIG

    def test_pii_filter_in_handler(self):
        console_handler = LOGGING_CONFIG["handlers"]["console"]
        assert "pii" in console_handler.get("filters", [])

    def test_loggers_configured(self):
        loggers = LOGGING_CONFIG.get("loggers", {})
        assert "uvicorn" in loggers
        assert "uvicorn.access" in loggers
        assert "uvicorn.error" in loggers
