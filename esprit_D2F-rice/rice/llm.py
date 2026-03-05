"""Ollama LLM communication layer (pure transport, no NLP dependencies)."""

from __future__ import annotations

import os
import re
import logging
from typing import Dict, List, Optional

logger = logging.getLogger("rice_analyzer")

# ── Optional import ─────────────────────────────────────────────────────────
try:
    import ollama as _ollama
    _LLM_OK = True
except ImportError:
    _ollama = None  # type: ignore[assignment]
    _LLM_OK = False

# ── LLM configuration (Ollama) ─────────────────────────────────────────────
_LLM_MODEL  = os.getenv("OLLAMA_MODEL", "mistral")
_OLLAMA_HOST = os.getenv("OLLAMA_HOST", "http://localhost:11434")

_LLM_TIMEOUT = int(os.getenv("RICE_LLM_TIMEOUT", "90"))  # seconds


def _escape_prompt(text: str) -> str:
    """Strip characters that could confuse or inject into LLM prompts."""
    # Remove potential JSON-breaking chars and control sequences
    text = re.sub(r'[\x00-\x08\x0b\x0c\x0e-\x1f]', '', text)
    # Collapse excessive whitespace
    text = re.sub(r'\n{4,}', '\n\n\n', text)
    return text


def _llm_chat(messages: List[Dict], temperature: float = 0.05) -> Optional[str]:
    """Send a chat request to the local Ollama server.

    Returns the raw response string (expected to be JSON) or ``None`` on failure.
    A very low temperature (0.05) is used to get deterministic JSON output.
    Guarded by a configurable timeout (``RICE_LLM_TIMEOUT`` env var, default 90s).
    """
    if not _LLM_OK:
        return None
    # Sanitise message content
    safe_messages = [
        {**m, "content": _escape_prompt(m.get("content", ""))} for m in messages
    ]
    try:
        client = _ollama.Client(host=_OLLAMA_HOST, timeout=_LLM_TIMEOUT)
        response = client.chat(
            model=_LLM_MODEL,
            messages=safe_messages,
            format="json",
            options={"temperature": temperature, "num_predict": 2048, "num_gpu": 0},
        )
        return response["message"]["content"]
    except Exception as exc:
        logger.warning("LLM call failed (%s@%s): %s", _LLM_MODEL, _OLLAMA_HOST, exc)
        return None
