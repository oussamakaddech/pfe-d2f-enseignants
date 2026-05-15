"""Pytest configuration for reco-formateur tests.

Sets minimal environment variables so the application modules can import
without a live PostgreSQL/embeddings backend, and provides shared fixtures.
"""
from __future__ import annotations

import os
import sys
from pathlib import Path

# Ensure project root is importable (so `import ai_reco` works from tests/)
PROJECT_ROOT = Path(__file__).resolve().parent.parent
if str(PROJECT_ROOT) not in sys.path:
    sys.path.insert(0, str(PROJECT_ROOT))

# JWT_SECRET must be set BEFORE jwt_middleware is imported by ai_reco.
# Use a 64-char dummy to satisfy any future length check.
os.environ.setdefault("JWT_SECRET", "test-secret-" + ("x" * 60))
os.environ.setdefault("JWT_AUTH_ENABLED", "false")
os.environ.setdefault("APP_ENV", "test")
os.environ.setdefault("CORS_ORIGINS", "http://localhost:5173")
# Avoid real DB connections in tests.
os.environ.setdefault("DB_HOST", "127.0.0.1")
os.environ.setdefault("DB_NAME", "test_d2f")
os.environ.setdefault("DB_USER", "test")
os.environ.setdefault("DB_PASS", "test")
