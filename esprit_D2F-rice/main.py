# main.py – RICE microservice
# RICE – Référentiel Intelligent de Compétences Enseignants
# Standalone FastAPI app exposing the RICE analysis endpoints

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
logging.getLogger("rice_analyzer").setLevel(getattr(logging, _LOG_LEVEL, logging.INFO))

from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.concurrency import run_in_threadpool
from fastapi.middleware.cors import CORSMiddleware
from rice.ratelimit import RateLimitMiddleware
from rice_analyzer import rice_router


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
            _SEMANTIC_OK,
            _build_semantic_corpus,
            _fetch_enseignant_affectations,
            _get_semantic_model,
        )

        if _SEMANTIC_OK:
            await run_in_threadpool(_get_semantic_model)
            await run_in_threadpool(_build_semantic_corpus, "gc")
        await run_in_threadpool(_fetch_enseignant_affectations)
    except Exception as exc:
        logging.getLogger("rice_startup").warning(f"Pre-warm skipped: {exc}")
    yield


app = FastAPI(
    title="RICE – Référentiel Intelligent de Compétences Enseignants",
    description="AI engine: extracts a structured competence tree from UE/module fiches (PDF/DOCX)",
    version="1.0.0",
    lifespan=lifespan,
)

# ── CORS ──────────────────────────────────────────────────────────────────────
_cors_raw = os.getenv("CORS_ORIGINS", "http://localhost:3000,http://localhost:5173,http://esprit-d2f.esprit.tn")
origins = [o.strip() for o in _cors_raw.split(",") if o.strip()]

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    allow_headers=["*"],
)

# ── Rate limiting ─────────────────────────────────────────────────────────────
app.add_middleware(RateLimitMiddleware)

# ── RICE router ───────────────────────────────────────────────────────────────
app.include_router(rice_router)


# ── Health endpoint ───────────────────────────────────────────────────────────
@app.get("/health")
def health():
    """Healthcheck endpoint — retourne le statut du service RICE."""
    return {
        "status": "ok",
        "service": "rice",
        "llm": "disabled",
        "extraction_mode": "regex + table NER",
    }
