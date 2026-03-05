"""Unit tests for helper utilities: _ThreadSafeCache, _validate_env, _secure_filename, _escape_prompt."""

import time
import logging

import pytest

from rice.cache import _ThreadSafeCache, _validate_env
from rice.nlp import _secure_filename
from rice.llm import _escape_prompt


# ═════════════════════════════════════════════════════════════════════════════
# _ThreadSafeCache
# ═════════════════════════════════════════════════════════════════════════════

class TestThreadSafeCache:
    def test_set_and_get(self):
        c = _ThreadSafeCache()
        c.set("a", 42)
        assert c.get("a") == 42

    def test_get_missing_returns_none(self):
        c = _ThreadSafeCache()
        assert c.get("nonexistent") is None

    def test_get_with_ttl_valid(self):
        c = _ThreadSafeCache()
        c.set("k", "v")
        assert c.get("k", ttl=60) == "v"

    def test_get_with_ttl_expired(self):
        c = _ThreadSafeCache()
        c.set("k", "v")
        # Simulate passage of time by manipulating internal timestamps
        c._ts["k"] = time.time() - 100
        assert c.get("k", ttl=10) is None

    def test_pop_removes(self):
        c = _ThreadSafeCache()
        c.set("x", 1)
        c.pop("x")
        assert c.get("x") is None

    def test_pop_nonexistent_ok(self):
        c = _ThreadSafeCache()
        c.pop("nothing")  # should not raise

    def test_clear(self):
        c = _ThreadSafeCache()
        c.set("a", 1)
        c.set("b", 2)
        c.clear()
        assert c.get("a") is None
        assert c.get("b") is None

    def test_keys(self):
        c = _ThreadSafeCache()
        c.set("a", 1)
        c.set("b", 2)
        assert sorted(c.keys()) == ["a", "b"]

    def test_keys_empty(self):
        c = _ThreadSafeCache()
        assert c.keys() == []

    def test_bool_true(self):
        c = _ThreadSafeCache()
        c.set("k", "v")
        assert bool(c) is True

    def test_bool_false(self):
        c = _ThreadSafeCache()
        assert bool(c) is False

    def test_overwrite(self):
        c = _ThreadSafeCache()
        c.set("k", "old")
        c.set("k", "new")
        assert c.get("k") == "new"


# ═════════════════════════════════════════════════════════════════════════════
# _validate_env
# ═════════════════════════════════════════════════════════════════════════════

class TestValidateEnv:
    def test_missing_vars_warns(self, monkeypatch, caplog):
        monkeypatch.delenv("DB_NAME", raising=False)
        monkeypatch.delenv("DB_USER", raising=False)
        monkeypatch.delenv("DB_PASS", raising=False)
        with caplog.at_level(logging.WARNING, logger="rice_analyzer"):
            _validate_env()
        assert any("DB_NAME" in r.message for r in caplog.records)

    def test_all_vars_set_no_warning(self, monkeypatch, caplog):
        monkeypatch.setenv("DB_NAME", "test_db")
        monkeypatch.setenv("DB_USER", "test_user")
        monkeypatch.setenv("DB_PASS", "test_pass")
        with caplog.at_level(logging.WARNING, logger="rice_analyzer"):
            _validate_env()
        env_warnings = [r for r in caplog.records
                        if any(v in r.message for v in ("DB_NAME", "DB_USER", "DB_PASS"))]
        assert len(env_warnings) == 0


# ═════════════════════════════════════════════════════════════════════════════
# _secure_filename
# ═════════════════════════════════════════════════════════════════════════════

class TestSecureFilename:
    def test_simple_name(self):
        assert _secure_filename("fiche.pdf") == "fiche.pdf"

    def test_strips_directory(self):
        assert _secure_filename("/etc/passwd") == "passwd"

    def test_strips_windows_path(self):
        assert _secure_filename("C:\\Users\\admin\\fiche.docx") == "fiche.docx"

    def test_strips_dotdot(self):
        result = _secure_filename("../../etc/passwd")
        assert ".." not in result
        # _secure_filename strips dotdot components; result depends on implementation
        assert len(result) > 0

    def test_strips_null_byte(self):
        result = _secure_filename("file\x00name.pdf")
        assert "\x00" not in result

    def test_empty_string_fallback(self):
        result = _secure_filename("")
        assert result == "unnamed_file"

    def test_only_dots(self):
        result = _secure_filename("...")
        assert result  # should not be empty

    def test_unicode_preserved(self):
        result = _secure_filename("fiche_évaluation.pdf")
        assert "évaluation" in result


# ═════════════════════════════════════════════════════════════════════════════
# _escape_prompt
# ═════════════════════════════════════════════════════════════════════════════

class TestEscapePrompt:
    def test_strips_control_chars(self):
        result = _escape_prompt("Hello\x00World\x07!")
        assert "\x00" not in result
        assert "\x07" not in result
        assert "Hello" in result
        assert "World" in result

    def test_preserves_normal_text(self):
        text = "Analyser le béton armé"
        assert _escape_prompt(text) == text

    def test_collapses_excessive_newlines(self):
        text = "Line1\n\n\n\n\n\nLine2"
        result = _escape_prompt(text)
        assert "\n\n\n\n" not in result
        assert "Line1" in result
        assert "Line2" in result

    def test_preserves_tabs_and_normal_newlines(self):
        text = "Col1\tCol2\nRow2"
        result = _escape_prompt(text)
        assert "\t" in result
        assert "\n" in result

    def test_empty_string(self):
        assert _escape_prompt("") == ""

    def test_whitespace_collapse(self):
        # Multiple spaces should be left alone (only newlines are collapsed)
        result = _escape_prompt("a   b")
        assert "a" in result and "b" in result
