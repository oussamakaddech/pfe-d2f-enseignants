# main.py – RICE microservice
# RICE – Référentiel Intelligent de Compétences Enseignants
# Standalone FastAPI app exposing the RICE analysis endpoints

import logging
import os
import sys
import time

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
# DSI §11.4 — Production CORS origins MUST be set via CORS_ORIGINS env var (HTTPS only).
# The defaults below are dev-only localhost fallbacks; the prod URL must be HTTPS.
_DEFAULT_DEV_ORIGINS = "http://localhost:3000,http://localhost:5173"
_cors_raw = os.getenv("CORS_ORIGINS", _DEFAULT_DEV_ORIGINS)
origins = [o.strip() for o in _cors_raw.split(",") if o.strip()]

# ── JWT Authentication ─────────────────────────────────────────────────────────
app.add_middleware(JWTAuthMiddleware)

# ── Rate limiting ─────────────────────────────────────────────────────────────
app.add_middleware(RateLimitMiddleware)

# ── CORS (must be added LAST so it wraps the whole stack and runs FIRST on the
#    request path — DSI §11.4, Starlette S8414).
app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    allow_headers=["Authorization", "Content-Type", "Accept"],
)

# ── DSI exception handlers ────────────────────────────────────────────────────
# Enveloppe d'erreur normalisee : { timestamp, status, errorCode, message, path, traceId }
# Aucune stack trace n'est exposee au client ; toutes sont loggees server-side.
register_exception_handlers(app, service_prefix="RICE")

# ── RICE router ───────────────────────────────────────────────────────────────
app.include_router(rice_router)


# ── Health endpoint ───────────────────────────────────────────────────────────
def _ia_status() -> dict:
    """État RÉEL du moteur IA (aucune valeur codée en dur).

    RICE n'appelle aucun LLM ni aucune API externe : l'extraction est à base de
    règles (regex + NER sur tableaux + taxonomie de Bloom) et le rapprochement
    au référentiel utilise un modèle d'embeddings exécuté localement.
    """
    import rice.referential as _ref

    model_ref = _ref._SEMANTIC_MODEL_REF or os.getenv("RICE_SEMANTIC_MODEL", "")
    return {
        "llm": "aucun",
        "semantic_enabled": _ref._SEMANTIC_OK,
        "semantic_model_loaded": _ref._SEMANTIC_MODEL is not None,
        "semantic_model": model_ref,
        "semantic_model_local_path": os.path.isdir(os.getenv("RICE_SEMANTIC_MODEL", "")),
        "hf_offline": os.getenv("HF_HUB_OFFLINE") == "1",
        "semantic_threshold": _ref._SEMANTIC_THRESHOLD,
        "referentiels_en_cache": {
            dept: (_ref._REF_DB_CACHE.get(dept) or {}).get("source", "public.ref_*")
            for dept in _ref._REF_DB_CACHE.keys()
        },
        "corpus_semantiques": {d: len(e["codes"]) for d, e in _ref._SEMANTIC_CORPORA.items()},
    }


@app.get("/health")
def health():
    """Healthcheck public : statut + indicateur « IA locale » (sans détail interne)."""
    status = _ia_status()
    return {
        "status": "ok",
        "service": "rice",
        "llm": "aucun",
        "ia_locale": status["semantic_model_loaded"] and status["hf_offline"],
        "semantic_model_loaded": status["semantic_model_loaded"],
    }


@app.get("/metrics")
def metrics():
    """Métriques techniques pour monitoring DSI (route protégée par JWT)."""
    import resource

    return {
        "service": "rice",
        "uptime_seconds": round(time.time() - _start_time, 1),
        # ru_maxrss est en Ko sous Linux (image Docker).
        "max_rss_mb": round(resource.getrusage(resource.RUSAGE_SELF).ru_maxrss / 1024, 1),
        "ia": _ia_status(),
    }


_start_time = time.time()
