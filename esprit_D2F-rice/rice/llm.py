"""LLM communication layer — Ollama removed, fallback regex always active."""

from __future__ import annotations

import logging
import re
from typing import Dict, List, Optional

logger = logging.getLogger("rice_analyzer")

# ── LLM désactivé (Ollama supprimé) ─────────────────────────────────────────
# Le service fonctionne en mode fallback regex/table NER uniquement.
# Pour réactiver un LLM local, implémenter un nouveau provider ici.
_LLM_OK = False
_LLM_MODEL = "none"
_OLLAMA_HOST = "disabled"
_LLM_TIMEOUT = 0


def _escape_prompt(text: str) -> str:
    """Strip characters that could confuse LLM prompts (kept for API compatibility)."""
    text = re.sub(r"[\x00-\x08\x0b\x0c\x0e-\x1f]", "", text)
    text = re.sub(r"\n{4,}", "\n\n\n", text)
    return text


def _llm_chat(messages: List[Dict], temperature: float = 0.05) -> Optional[str]:
    """LLM stub — always returns None (Ollama removed).

    The NLP pipeline falls back to table-based and regex-based NER
    automatically when this function returns None.
    """
    return None
