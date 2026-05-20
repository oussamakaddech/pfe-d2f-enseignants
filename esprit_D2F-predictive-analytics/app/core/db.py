"""Database connection layer using SQLAlchemy."""

import logging
import os
from contextlib import contextmanager
from typing import Generator

from sqlalchemy import create_engine, event, text
from sqlalchemy.orm import Session, sessionmaker

from app.config import settings

logger = logging.getLogger(__name__)

# Les requêtes raw SQL de ce service lisent des tables qui vivent dans plusieurs
# schémas Postgres écrits par les microservices Java (formation, competence,
# besoin, evaluation, certificat, auth) en plus du schéma analyse propre à ce
# service. Sans cela, des requêtes comme `FROM enseignants e` lèveraient
# `relation "enseignants" does not exist` → DatabaseError → 503 côté gateway.
# Note: les schémas sont quotés car `analyse` est un mot-clé Postgres (alias d'ANALYZE).
_DEFAULT_SCHEMAS = ("analyse", "formation", "competence", "besoin", "evaluation", "certificat", "auth", "public")
SEARCH_PATH = os.getenv(
    "DB_SEARCH_PATH",
    ",".join(f'"{s}"' for s in _DEFAULT_SCHEMAS),
)

# ── Engine ─────────────────────────────────────
engine = create_engine(
    str(settings.database_url),
    pool_size=settings.db_pool_size,
    max_overflow=settings.db_max_overflow,
    pool_pre_ping=True,  # Verify connections before use
    pool_recycle=3600,   # Recycle connections after 1h
    echo=settings.debug,
)


@event.listens_for(engine, "connect")
def _set_search_path(dbapi_connection, _connection_record):
    cursor = dbapi_connection.cursor()
    try:
        cursor.execute(f"SET search_path TO {SEARCH_PATH}")
    finally:
        cursor.close()

SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)


# ── Dependency for FastAPI ─────────────────────
def get_db() -> Generator[Session, None, None]:
    """Yield a database session for dependency injection."""
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


@contextmanager
def db_session() -> Generator[Session, None, None]:
    """Context manager for manual DB sessions (non-FastAPI contexts)."""
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


def execute_query(db: Session, query: str, params: dict | None = None) -> list[dict]:
    """Execute a raw SQL query and return results as list of dicts.

    Raises DatabaseError if the query fails for any reason.
    """
    from app.core.exceptions import DatabaseError
    try:
        result = db.execute(text(query), params or {})
        rows = result.mappings().all()
        return [dict(row) for row in rows]
    except Exception as e:
        logger.error("SQL query failed: %s | Params: %s | Error: %s", query[:200], params, str(e))
        db.rollback()
        raise DatabaseError(detail=f"Database query failed: {str(e)[:200]}") from e
