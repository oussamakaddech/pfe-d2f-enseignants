# main.py – RICE microservice
# RICE – Référentiel Intelligent de Compétences Enseignants
# Standalone FastAPI app exposing the RICE analysis endpoints

import asyncio
import logging
import os
import sys

# ── Logging configuration (MUST run before any module import) ────────────────
# Set via env var RICE_LOG_LEVEL (default: INFO).
# Accepted values: DEBUG, INFO, WARNING, ERROR, CRITICAL.
_LOG_LEVEL = os.getenv("RICE_LOG_LEVEL", "INFO").upper()
logging.basicConfig(
    level=getattr(logging, _LOG_LEVEL, logging.INFO),
    format="%(asctime)s [%(levelname)s] %(name)s: %(message)s",
    datefmt="%Y-%m-%d %H:%M:%S",
)
# Ensure rice_analyzer logger matches the configured level
logging.getLogger("rice_analyzer").setLevel(getattr(logging, _LOG_LEVEL, logging.INFO))

# Fix Windows ProactorEventLoop bug: ConnectionResetError WinError 10054
# The ProactorEventLoop crashes when a subprocess (Ollama llama runner) terminates
# abruptly. SelectorEventLoop avoids this entirely on Windows.
if sys.platform == "win32":
    asyncio.set_event_loop_policy(asyncio.WindowsSelectorEventLoopPolicy())

from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.concurrency import run_in_threadpool
from fastapi.middleware.cors import CORSMiddleware
from rice_analyzer import rice_router, _LLM_OK, _LLM_MODEL, _OLLAMA_HOST
from rice.ratelimit import RateLimitMiddleware


# ── Startup lifespan: pre-warm optional heavy components ─────────────────────
@asynccontextmanager
async def lifespan(app: FastAPI):
    """Pre-warm the sentence-transformer model + GC semantic corpus on startup.

    Running in a threadpool so it does not block the event loop.
    Any failure is silently ignored (the service still starts without
    semantic matching; keyword matching is always available as fallback).
    """
    try:
        from rice_analyzer import (
            _build_semantic_corpus,
            _get_semantic_model,
            _SEMANTIC_OK,
            _fetch_enseignant_affectations,
        )
        if _SEMANTIC_OK:
            await run_in_threadpool(_get_semantic_model)        # load model weights
            await run_in_threadpool(_build_semantic_corpus, "gc")  # encode GC corpus
        # Pre-fill the affectations cache so the first request is fast
        await run_in_threadpool(_fetch_enseignant_affectations)
    except Exception as exc:
        import logging
        logging.getLogger("rice_startup").warning(f"Pre-warm skipped: {exc}")
    yield   # application running
    # (shutdown hook can go here if needed)


app = FastAPI(
    title="RICE – Référentiel Intelligent de Compétences Enseignants",
    description="AI engine: extracts a structured competence tree from UE/module fiches (PDF/DOCX)",
    version="1.0.0",
    lifespan=lifespan,
)

# === CORS ===
origins = [
    "http://esprit-d2f.esprit.tn/*",
    "http://localhost:3000",
    "http://localhost:5173",
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    allow_headers=["*"],
)

# === Rate limiting (applied after CORS) ===
app.add_middleware(RateLimitMiddleware)

# === Register RICE router ===
app.include_router(rice_router)


@app.get("/health")
def health():
    llm_status = "unavailable"
    if _LLM_OK:
        try:
            import ollama
            client = ollama.Client(host=_OLLAMA_HOST)
            client.list()  # lightweight ping
            llm_status = f"ok ({_LLM_MODEL})"
        except Exception as e:
            llm_status = f"unreachable – {e}"
    return {
        "status": "ok",
        "service": "rice",
        "llm": llm_status,
        "llm_model": _LLM_MODEL,
        "ollama_host": _OLLAMA_HOST,
    }
