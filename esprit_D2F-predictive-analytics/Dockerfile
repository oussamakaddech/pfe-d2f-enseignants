# ───────────────────────────────────────────────
# D2F Predictive Analytics Microservice
# FastAPI + scikit-learn + PostgreSQL
# ───────────────────────────────────────────────

FROM python:3.11-slim AS builder

WORKDIR /app

# System deps for compiling Python packages (numpy, pandas, psycopg2)
RUN apt-get update && apt-get install -y --no-install-recommends \
    gcc \
    g++ \
    libpq-dev \
    && rm -rf /var/lib/apt/lists/*

# Install Python deps into a virtual env
RUN python -m venv /opt/venv
ENV PATH="/opt/venv/bin:$PATH"

COPY requirements.txt .
RUN pip install --no-cache-dir --upgrade pip && \
    pip install --no-cache-dir -r requirements.txt

# ─── Production stage ──────────────────────────
FROM python:3.11-slim AS production

WORKDIR /app

# Runtime system deps only
RUN apt-get update && apt-get install -y --no-install-recommends \
    libpq5 \
    && rm -rf /var/lib/apt/lists/*

# Copy venv from builder
COPY --from=builder /opt/venv /opt/venv
ENV PATH="/opt/venv/bin:$PATH"

# Create non-root user for security
RUN groupadd -r appuser && useradd -r -g appuser appuser

# Copy application code
COPY app/ ./app/
COPY data/ ./data/
COPY tests/ ./tests/

# Ensure data directory is writable for model persistence
RUN mkdir -p /app/data/models && chown -R appuser:appuser /app/data

USER appuser

EXPOSE 8080

ENV PYTHONPATH=/app
ENV APP_ENV=production

# Healthcheck
HEALTHCHECK --interval=30s --timeout=10s --start-period=10s --retries=3 \
    CMD python -c "import urllib.request; urllib.request.urlopen('http://localhost:8080/health')" || exit 1

CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8080", "--workers", "2"]
