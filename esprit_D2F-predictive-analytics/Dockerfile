# ─────────────────────────────────────────────────────────────────────────────
# D2F Predictive Analytics Microservice — Sprint 1 (architecture DDD cible)
# FastAPI + SQLAlchemy + PostgreSQL — port 8000
# ─────────────────────────────────────────────────────────────────────────────

FROM python:3.11-slim AS builder

WORKDIR /app

RUN apt-get update && apt-get install -y --no-install-recommends \
    gcc \
    libpq-dev \
    && rm -rf /var/lib/apt/lists/*

RUN python -m venv /opt/venv
ENV PATH="/opt/venv/bin:$PATH"

COPY requirements.txt .
RUN pip install --no-cache-dir --upgrade pip && \
    pip install --no-cache-dir -r requirements.txt

FROM python:3.11-slim AS production

WORKDIR /app

RUN apt-get update && apt-get install -y --no-install-recommends \
    libpq5 \
    curl \
    && rm -rf /var/lib/apt/lists/*

COPY --from=builder /opt/venv /opt/venv
ENV PATH="/opt/venv/bin:$PATH"

RUN groupadd -r appuser && useradd -r -g appuser appuser

# Architecture cible (Sprint 1/2 DDD) : app/main.py + app/api/v1
COPY app/ ./app/
# Héritage Sprint 1 (routes /api/v1/d2f/* consommées par le webapp pendant la migration)
COPY app_legacy/ ./app_legacy/
# Dataset maître D2F + modèles ML — source de vérité pour /api/v1/d2f/*
COPY data/clean/ ./data/clean/
COPY data/models/ ./data/models/
COPY data/exports/ ./data/exports/

RUN mkdir -p /app/ml/artifacts /app/logs && chown -R appuser:appuser /app/ml /app/logs

USER appuser

EXPOSE 8000

ENV PYTHONPATH=/app
ENV APP_ENV=production
ENV MODELS_DIR=/app/data/models

HEALTHCHECK --interval=30s --timeout=10s --start-period=30s --retries=3 \
    CMD curl -sf http://localhost:8000/api/v1/analytics/health || exit 1

CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000", "--workers", "2"]
