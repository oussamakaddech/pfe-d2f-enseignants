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
# torch CPU seul AVANT les dépendances : le service n'a pas de GPU, et la roue
# par défaut (CUDA) ajoutait ~3,2 Go de bibliothèques NVIDIA jamais chargées.
RUN pip install --no-cache-dir --upgrade pip \
 && pip install --no-cache-dir --index-url https://download.pytorch.org/whl/cpu torch \
 && pip install --no-cache-dir -r requirements.txt

# ── Pré-téléchargement du modèle sémantique (DSI #9) ──────────────────────────
# Vendu dans l'image (révision épinglée) : aucun appel HuggingFace au runtime.
# Modèle MULTILINGUE : les fiches sont en français. Retenu sur banc
# d'évaluation FR (70 acquis, référentiel officiel) contre all-MiniLM-L6-v2
# (anglais) : top-1 60 % -> 69 %, faux positifs hors sujet 5/10 -> 0-1/10.
# Seuls les fichiers chargés par sentence-transformers sont téléchargés
# (pas les variantes ONNX / OpenVINO / TF / .bin en double).
ARG SEMANTIC_MODEL_REPO=sentence-transformers/paraphrase-multilingual-MiniLM-L12-v2
ARG SEMANTIC_MODEL_REVISION=e8f8c211226b894fcb81acc59f3b34ba3efd5f42
RUN python -c "from huggingface_hub import snapshot_download; \
snapshot_download('${SEMANTIC_MODEL_REPO}', revision='${SEMANTIC_MODEL_REVISION}', \
local_dir='/opt/models/semantic', allow_patterns=[ \
'modules.json', 'config.json', 'config_sentence_transformers.json', \
'sentence_bert_config.json', 'model.safetensors', 'tokenizer.json', \
'tokenizer_config.json', 'special_tokens_map.json', '1_Pooling/config.json'])" \
 && echo "${SEMANTIC_MODEL_REPO}@${SEMANTIC_MODEL_REVISION}" > /opt/models/semantic/MODEL_ID

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

# Modèle sémantique vendu dans l'image + mode hors-ligne strict (DSI #9).
COPY --from=builder /opt/models /opt/models
ENV RICE_SEMANTIC_MODEL=/opt/models/semantic \
    RICE_SEMANTIC_THRESHOLD=0.40 \
    RICE_SEMANTIC_CACHE_DIR=/tmp/rice-semantic-cache \
    HF_HUB_OFFLINE=1 \
    TRANSFORMERS_OFFLINE=1 \
    HF_HUB_DISABLE_TELEMETRY=1

# Create non-root user
RUN groupadd -g 2003 esprit && \
    useradd  -m -u 2003 -g 2003 -s /usr/sbin/nologin esprit

WORKDIR /app

# Selective COPY — application code only (no tests, no cache, no temp files)
COPY --chown=esprit:esprit main.py .
COPY --chown=esprit:esprit rice_analyzer.py .
COPY --chown=esprit:esprit rice/ ./rice/
COPY --chown=esprit:esprit refs/ ./refs/

# Switch to non-root user
USER esprit

EXPOSE 8001

HEALTHCHECK --interval=30s --timeout=10s --start-period=15s --retries=3 \
  CMD python -c "import urllib.request; urllib.request.urlopen('http://localhost:8001/health')" || exit 1

CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8001"]
