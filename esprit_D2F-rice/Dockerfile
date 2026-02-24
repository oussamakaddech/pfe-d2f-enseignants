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

# System dependencies
RUN apt-get update \
 && apt-get install -y --no-install-recommends \
      ca-certificates \
      curl \
      libpq5 \
      build-essential \
      git \
 && rm -rf /var/lib/apt/lists/*

# Create non-root user
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
ENV ENV_FILE=/app/.env

# Switch to non-root user
USER esprit

# Expose API port
EXPOSE 8001

# Default start command
CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8001"]
