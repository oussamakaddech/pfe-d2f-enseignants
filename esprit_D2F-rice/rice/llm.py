"""LLM shim for RICE — provides disabled/default behavior.

This module intentionally implements lightweight stubs so the rest of the
package can import LLM-related symbols even when no LLM implementation is
present. The stubs reflect the repository's behavior where LLM assistance is
disabled and the code falls back to regex/table NER.
"""
from __future__ import annotations

import os
from typing import Any, Dict, List

# Environment-driven configuration (safe defaults)
_LLM_MODEL: str = os.environ.get("LLM_MODEL", "")
try:
    _LLM_TIMEOUT: int = int(os.environ.get("LLM_TIMEOUT", "5"))
except Exception:
    _LLM_TIMEOUT = 5

# Flag indicating whether an actual LLM integration is available.
# Keep False to force fallback behavior in the rest of the codebase.
_LLM_OK: bool = False


def _escape_prompt(prompt: str) -> str:
    """Return an escaped prompt (no-op for stub)."""
    return prompt


def _llm_chat(messages: List[Dict[str, Any]], * , model: str | None = None, timeout: int | None = None) -> Any:
    """Synchronous stub chat call.

    Always raises to indicate LLM is unavailable; callers should catch and
    fallback to regex/table NER.
    """
    raise RuntimeError("LLM integration is disabled in this environment")


def _llm_sync_chat(*args, **kwargs):
    """Alias for sync callers (keeps original API surface)."""
    return _llm_chat(*args, **kwargs)


__all__ = ["_LLM_OK", "_LLM_MODEL", "_LLM_TIMEOUT", "_escape_prompt", "_llm_chat", "_llm_sync_chat"]
