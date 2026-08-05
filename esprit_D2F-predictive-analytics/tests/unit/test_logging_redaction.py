"""Tests de la redaction PII des logs (remplacement regex lineaire)."""
from app.core.logging import redact_pii


def _process(**kwargs):
    event = {key: value for key, value in kwargs.items()}
    redact_pii(None, None, event)
    return event


def test_email_key_redacted_when_contains_at():
    assert _process(email="alice.dupont@esprit.tn")["email"] == "[EMAIL_REDACTED]"


def test_mail_key_redacted():
    assert _process(mail="bob@esprit.tn")["mail"] == "[EMAIL_REDACTED]"


def test_email_without_at_kept():
    assert _process(email="pas-une-adresse")["email"] == "pas-une-adresse"


def test_sensitive_keys_fully_redacted():
    event = _process(token="abc123", password="secret", authorization="Bearer x", payload='{"a": 1}')
    assert event["token"] == "[REDACTED]"
    assert event["password"] == "[REDACTED]"
    assert event["authorization"] == "[REDACTED]"
    assert event["payload"] == "[REDACTED]"


def test_non_sensitive_keys_untouched():
    event = _process(teacher_id="T001", score=0.8)
    assert event["teacher_id"] == "T001"
    assert event["score"] == 0.8
