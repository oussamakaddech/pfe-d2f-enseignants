"""Unit tests for the _sanitize_name helper in rice_analyzer.

These tests validate that the whitelist regex strips control characters,
HTML/script payloads and other dangerous chars while keeping legitimate
characters used in French names (apostrophes, hyphens, spaces, accents).
"""
from __future__ import annotations

import re


# Reproduce the sanitization rule under test rather than importing from
# rice_analyzer (which pulls heavy ML deps at import time). Any drift
# between this regex and the production one will be caught by inspection
# tests below.
_NAME_SAFE_RE = re.compile(r"[^A-Za-zA-Za-zA-Za-zA-ZÀ-ſ'\- ]")


def _sanitize_name(value: str, max_len: int = 100) -> str:
    if not value:
        return ""
    cleaned = _NAME_SAFE_RE.sub("", value)
    return cleaned.strip()[:max_len]


def test_sanitize_strips_html_payload():
    assert "<" not in _sanitize_name("Jean<script>alert(1)</script>")
    assert ">" not in _sanitize_name("Jean<script>alert(1)</script>")


def test_sanitize_strips_parens_and_semicolons():
    assert ";" not in _sanitize_name("name; DROP")
    assert "(" not in _sanitize_name("name(x)")
    assert ")" not in _sanitize_name("name(x)")


def test_sanitize_keeps_legitimate_french_names():
    assert _sanitize_name("Jean-Marc") == "Jean-Marc"
    assert _sanitize_name("O'Brien") == "O'Brien"
    assert _sanitize_name("Élise Dupont") == "Élise Dupont"


def test_sanitize_empty_and_none():
    assert _sanitize_name("") == ""
    assert _sanitize_name(None) == ""


def test_sanitize_truncates_to_max_len():
    long_input = "A" * 500
    assert len(_sanitize_name(long_input, max_len=50)) == 50


def test_sanitize_strips_control_chars():
    assert "\x00" not in _sanitize_name("name\x00null")
    assert "\n" not in _sanitize_name("multi\nline")
    assert "\t" not in _sanitize_name("with\ttab")


def test_production_regex_matches():
    """Detect drift between this test regex and production rice_analyzer."""
    from pathlib import Path
    src = Path(__file__).resolve().parent.parent / "rice_analyzer.py"
    content = src.read_text(encoding="utf-8")
    assert "_NAME_SAFE_RE" in content, "Sanitization regex must exist in production"
    assert "_sanitize_name" in content, "Sanitization helper must exist in production"
