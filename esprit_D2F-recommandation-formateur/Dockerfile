# ─── Stage 1: Builder ─────────────────────────────────────────────────────────
FROM python:3.13-slim AS builder

WORKDIR /build

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

# ─── Stage 2: Runtime ─────────────────────────────────────────────────────────
FROM python:3.13-slim

LABEL Author="seddik bouzayani <seddik.bouzayani@esprit.tn>"
LABEL maintainer="seddik bouzayani <seddik.bouzayani@esprit.tn>"

ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1

RUN apt-get update \
 && apt-get install -y --no-install-recommends \
      ca-certificates \
      curl \
      libgomp1 \
      libopenblas0 \
      libpq5 \
 && rm -rf /var/lib/apt/lists/*

COPY --from=builder /opt/venv /opt/venv
ENV PATH="/opt/venv/bin:$PATH"

RUN groupadd -g 2003 esprit && \
    useradd -m -u 2003 -g 2003 -s /usr/sbin/nologin esprit

WORKDIR /app

COPY --chown=esprit:esprit ai_reco.py .
COPY --chown=esprit:esprit utils.py .
COPY --chown=esprit:esprit report_generator.py .

RUN mkdir -p /app/cache /app/models && chown -R esprit:esprit /app
VOLUME ["/app/cache", "/app/models"]

USER esprit

EXPOSE 8000

HEALTHCHECK --interval=30s --timeout=10s --start-period=30s --retries=3 \
  CMD curl -sf http://localhost:8000/health || exit 1

CMD ["uvicorn", "ai_reco:app", "--host", "0.0.0.0", "--port", "8000"]