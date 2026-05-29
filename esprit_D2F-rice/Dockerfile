# ── Stage 1: Builder (install dependencies) ───────────────────────────────────
FROM python:3.13-slim AS builder

WORKDIR /build

# System deps for compiling C extensions (psycopg2, numpy, etc.)
RUN apt-get update \
 && apt-get install -y --no-install-recommends \
      gcc \
      g++ \
      libpq-dev \
 && rm -rf /var/lib/apt/lists/*

RUN python -m venv /opt/venv
ENV PATH="/opt/venv/bin:$PATH"

COPY requirements.txt .
RUN pip install --no-cache-dir --upgrade pip \
 && pip install --no-cache-dir -r requirements.txt

# ── Stage 2: Runtime (minimal image) ─────────────────────────────────────────
FROM python:3.13-slim

LABEL Author="seddik bouzayani <seddik.bouzayani@esprit.tn>"
LABEL maintainer="seddik bouzayani <seddik.bouzayani@esprit.tn>"

ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1

# Runtime-only system deps
RUN apt-get update \
 && apt-get install -y --no-install-recommends \
      ca-certificates \
      curl \
      libpq5 \
 && rm -rf /var/lib/apt/lists/*

# Copy pre-built venv from builder
COPY --from=builder /opt/venv /opt/venv
ENV PATH="/opt/venv/bin:$PATH"

# Create non-root user
RUN groupadd -g 2003 esprit && \
    useradd  -m -u 2003 -g 2003 -s /usr/sbin/nologin esprit

WORKDIR /app

# Selective COPY — application code only (no tests, no cache, no temp files)
COPY --chown=esprit:esprit main.py .
COPY --chown=esprit:esprit rice_analyzer.py .
COPY --chown=esprit:esprit extract_referentiel.py .
COPY --chown=esprit:esprit refs/ ./refs/

# Switch to non-root user
USER esprit

EXPOSE 8001

HEALTHCHECK --interval=30s --timeout=10s --start-period=15s --retries=3 \
  CMD python -c "import urllib.request; urllib.request.urlopen('http://localhost:8001/health')" || exit 1

CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8001"]
