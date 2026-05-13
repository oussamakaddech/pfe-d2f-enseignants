# ─────────────────────────────────────────────────────────────────────────────
# D2F Predictive Analytics Microservice
# FastAPI + SQLAlchemy + PostgreSQL — port 8000
# ─────────────────────────────────────────────────────────────────────────────

FROM python:3.11-slim AS builder

WORKDIR /app

# Dépendances système pour compiler psycopg2, numpy, pandas
RUN apt-get update && apt-get install -y --no-install-recommends \
    gcc \
    g++ \
    libpq-dev \
    && rm -rf /var/lib/apt/lists/*

RUN python -m venv /opt/venv
ENV PATH="/opt/venv/bin:$PATH"

COPY requirements.txt .
RUN pip install --no-cache-dir --upgrade pip && \
    pip install --no-cache-dir -r requirements.txt

# ─── Stage de production ──────────────────────────────────────────────────────
FROM python:3.11-slim AS production

WORKDIR /app

# Runtime uniquement
RUN apt-get update && apt-get install -y --no-install-recommends \
    libpq5 \
    curl \
    && rm -rf /var/lib/apt/lists/*

COPY --from=builder /opt/venv /opt/venv
ENV PATH="/opt/venv/bin:$PATH"

# Utilisateur non-root (sécurité DSI §3)
RUN groupadd -r appuser && useradd -r -g appuser appuser

# Code applicatif
COPY app/ ./app/
COPY tests/ ./tests/
COPY init_db/ ./init_db/

# Répertoire de travail pour les logs en écriture
RUN mkdir -p /app/logs && chown -R appuser:appuser /app/logs

USER appuser

EXPOSE 8000

ENV PYTHONPATH=/app
ENV APP_ENV=production

HEALTHCHECK --interval=30s --timeout=10s --start-period=30s --retries=3 \
    CMD curl -sf http://localhost:8000/api/v1/analytics/health || exit 1

CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000", "--workers", "2"]
