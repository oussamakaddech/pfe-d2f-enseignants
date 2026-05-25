"""
tests/test_llm.py — Unit tests for rice.llm (LLM stubs).
"""
import sys
import os
import pytest

sys.path.insert(0, os.path.dirname(os.path.dirname(__file__)))

os.environ.setdefault("DB_NAME", "test")
os.environ.setdefault("DB_USER", "test")
os.environ.setdefault("DB_PASS", "test")
os.environ.setdefault("DB_HOST", "localhost")
os.environ.setdefault("DB_PORT", "5432")

from rice.llm import (
    _LLM_OK,
    _LLM_MODEL,
    _LLM_TIMEOUT,
    _escape_prompt,
    _llm_chat,
    _llm_sync_chat,
)


class TestLLMConfig:
    def test_llm_ok_is_false(self):
        assert _LLM_OK is False

    def test_llm_model_is_string(self):
        assert isinstance(_LLM_MODEL, str)

    def test_llm_timeout_is_int(self):
        assert isinstance(_LLM_TIMEOUT, int)
        assert _LLM_TIMEOUT > 0


class TestEscapePrompt:
    def test_returns_same_string(self):
        assert _escape_prompt("hello world") == "hello world"

    def test_empty_string(self):
        assert _escape_prompt("") == ""

    def test_special_characters(self):
        text = 'Test with <tags> & quotes and double'
        assert _escape_prompt(text) == text


class TestLLMChat:
    def test_raises_runtime_error(self):
        with pytest.raises(RuntimeError, match="LLM integration is disabled"):
            _llm_chat([{"role": "user", "content": "hello"}])

    def test_raises_with_model_kwarg(self):
        with pytest.raises(RuntimeError):
            _llm_chat([{"role": "user", "content": "test"}], model="gpt-4")

    def test_raises_with_timeout_kwarg(self):
        with pytest.raises(RuntimeError):
            _llm_chat([{"role": "user", "content": "test"}], timeout=10)

    def test_raises_with_temperature_kwarg(self):
        with pytest.raises(RuntimeError):
            _llm_chat([{"role": "user", "content": "test"}], temperature=0.7)


class TestLLMSyncChat:
    def test_sync_chat_raises_runtime_error(self):
        with pytest.raises(RuntimeError, match="LLM integration is disabled"):
            _llm_sync_chat([{"role": "user", "content": "hello"}])

    def test_sync_chat_passes_kwargs(self):
        with pytest.raises(RuntimeError):
            _llm_sync_chat([{"role": "user", "content": "test"}], model="test", timeout=5)
