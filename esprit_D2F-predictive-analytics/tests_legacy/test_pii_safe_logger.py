"""Tests for app.core.pii_safe_logger — PII masking utility."""
from __future__ import annotations

import logging

from app.core.pii_safe_logger import PiiSafeLogger, sanitize


def test_sanitize_masks_email():
    out = sanitize("user is john.doe@esprit.tn please contact him")
    assert "@" not in out
    assert "john.doe" not in out
    assert "***" in out


def test_sanitize_masks_phone():
    out = sanitize("phone: +21655123456")
    assert "55123456" not in out


def test_sanitize_masks_ip():
    out = sanitize("from IP 192.168.1.42 with traffic")
    assert "192.168.1.42" not in out


def test_sanitize_keeps_safe_text():
    out = sanitize("Migration completed successfully (table users)")
    assert out == "Migration completed successfully (table users)"


def test_sanitize_handles_none_and_empty():
    assert sanitize("") == ""
    assert sanitize(None) is None


def test_sanitize_multiple_pii_in_one_line():
    out = sanitize("contact john@a.tn at 192.168.0.1 or +21698765432")
    assert "john@a.tn" not in out
    assert "192.168.0.1" not in out
    assert "98765432" not in out


def test_logger_info_masks_email(caplog):
    log = PiiSafeLogger("d2f.test")
    with caplog.at_level(logging.INFO, logger="d2f.test"):
        log.info("user alice@example.com logged in")
    full = "\n".join(record.getMessage() for record in caplog.records)
    assert "alice@example.com" not in full
    assert "***" in full


def test_logger_warning_masks_ip(caplog):
    log = PiiSafeLogger("d2f.test.warn")
    with caplog.at_level(logging.WARNING, logger="d2f.test.warn"):
        log.warning("rejected request from 10.0.0.5")
    full = "\n".join(record.getMessage() for record in caplog.records)
    assert "10.0.0.5" not in full
