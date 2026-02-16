# Base image (Debian-slim preferred for ML libs compatibility)
FROM python:3.13-slim

# Authors
LABEL Author="seddik bouzayani <seddik.bouzayani@esprit.tn>"
LABEL maintainer="seddik bouzayani <seddik.bouzayani@esprit.tn>"

# Python and pip behavior
ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1 \
    PIP_NO_CACHE_DIR=1 \
    PIP_DISABLE_PIP_VERSION_CHECK=1 \
    PIP_DEFAULT_TIMEOUT=600 \
    PIP_RETRIES=10

# System dependencies (runtime + minimal build tools if needed)
# - libgomp1, libopenblas0: needed by scikit-learn/faiss wheels
# - libpq5: runtime for psycopg2-binary
# - build-essential, gcc/g++ kept light for native builds if any wheels unavailable
RUN apt-get update \
 && apt-get install -y --no-install-recommends \
      ca-certificates \
      curl \
      libgomp1 \
      libopenblas0 \
      libpq5 \
      build-essential \
      git \
 && rm -rf /var/lib/apt/lists/*

# Create non-root user (as in your style)
RUN groupadd -g 2003 esprit && \
    useradd  -m -u 2003 -g 2003 -s /usr/sbin/nologin esprit

# Workdir
WORKDIR /app

# Copy and install Python dependencies first (better layer caching)
COPY requirements.txt ./
RUN pip install --upgrade pip \
 && pip install --no-cache-dir -r requirements.txt

# Copy application code
COPY --chown=esprit:esprit . .

# Optional: pass an env file at build time and place it at /app/.env
ARG ENV_FILE
RUN if [ -n "$ENV_FILE" ] && [ -f "$ENV_FILE" ]; then cp "$ENV_FILE" /app/.env; fi
# Make the path available at runtime
ENV ENV_FILE=/app/.env

# Prepare cache/model dirs
RUN mkdir -p /app/cache /app/models && chown -R esprit:esprit /app
VOLUME ["/app/cache", "/app/models"]

# Switch to non-root user
USER esprit

# Expose API port
EXPOSE 8000

# Default start command (FastAPI via Uvicorn)
CMD ["uvicorn", "ai_reco:app", "--host", "0.0.0.0", "--port", "8000"]
