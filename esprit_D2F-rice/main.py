# main.py – RICE microservice
# RICE – Référentiel Intelligent de Compétences Enseignants
# Standalone FastAPI app exposing the RICE analysis endpoints

import logging
import os
import sys

# ── DSI §11.7 — Configuration logging avec masquage PII (FIRST import) ───────
# Charge dictConfig avec PIIRedactingFilter sur tous les handlers (incl. uvicorn).
from rice.observability.logging_config import configure_logging

configure_logging()

# Ajustement éventuel du niveau via env (DEBUG/INFO/WARNING/ERROR/CRITICAL)
_LOG_LEVEL = os.getenv("RICE_LOG_LEVEL", "INFO").upper()
logging.getLogger().setLevel(getattr(logging, _LOG_LEVEL, logging.INFO))
logging.getLogger("rice_analyzer").setLevel(getattr(logging, _LOG_LEVEL, logging.INFO))

from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.concurrency import run_in_threadpool
from fastapi.middleware.cors import CORSMiddleware
from rice.ratelimit import RateLimitMiddleware
from rice.jwt_middleware import JWTAuthMiddleware
from rice.error_handlers import register_exception_handlers
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

# ── JWT Authentication ─────────────────────────────────────────────────────────
app.add_middleware(JWTAuthMiddleware)

# ── Rate limiting ─────────────────────────────────────────────────────────────
app.add_middleware(RateLimitMiddleware)

# ── DSI exception handlers ────────────────────────────────────────────────────
# Enveloppe d'erreur normalisee : { timestamp, status, errorCode, message, path, traceId }
# Aucune stack trace n'est exposee au client ; toutes sont loggees server-side.
register_exception_handlers(app, service_prefix="RICE")

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

@app.get("/metrics")
def metrics():
    """Metriques techniques pour monitoring DSI."""
    import os, time
    return {
        "service": "rice",
        "uptime_seconds": time.time() - _start_time,
        "memory_mb": 0,
        "llm_available": False,
        "semantic_available": True,
        "cache_entries": 0,
    }

_start_time = __import__('time').time()
