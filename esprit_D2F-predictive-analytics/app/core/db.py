"""Database connection layer using SQLAlchemy."""

import logging
from contextlib import contextmanager
from typing import Generator

from sqlalchemy import create_engine, text
from sqlalchemy.orm import Session, sessionmaker

from app.config import settings

logger = logging.getLogger(__name__)

# ── Engine ─────────────────────────────────────
engine = create_engine(
    str(settings.database_url),
    pool_size=settings.db_pool_size,
    max_overflow=settings.db_max_overflow,
    pool_pre_ping=True,  # Verify connections before use
    pool_recycle=3600,   # Recycle connections after 1h
    echo=settings.debug,
)

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
