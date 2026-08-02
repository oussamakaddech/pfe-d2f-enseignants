from contextlib import contextmanager

from sqlalchemy import create_engine
from sqlalchemy.engine import Connection, Engine
from sqlalchemy.orm import Session, sessionmaker

from app.core.config import Settings


def create_db_engine(settings: Settings) -> Engine:
    return create_engine(
        settings.database_url,
        pool_pre_ping=True,
        pool_size=5,
        max_overflow=10,
        connect_args={"connect_timeout": settings.db_connect_timeout},
    )


class Database:
    def __init__(self, settings: Settings) -> None:
        self._settings = settings
        self._engine: Engine | None = None
        self._session_factory: sessionmaker[Session] | None = None

    def connect(self) -> None:
        self._engine = create_db_engine(self._settings)
        self._session_factory = sessionmaker(bind=self._engine, autoflush=False, expire_on_commit=False)

    def dispose(self) -> None:
        if self._engine is not None:
            self._engine.dispose()
        self._engine = None
        self._session_factory = None

    @property
    def engine(self) -> Engine:
        if self._engine is None:
            raise RuntimeError("Database non connectée — appeler Database.connect() au démarrage")
        return self._engine

    @contextmanager
    def session(self) -> Session:
        if self._session_factory is None:
            raise RuntimeError("Database non connectée")
        session = self._session_factory()
        try:
            yield session
            session.commit()
        except Exception:
            session.rollback()
            raise
        finally:
            session.close()

    @contextmanager
    def read_connection(self) -> Connection:
        with self.engine.connect() as connection:
            yield connection


def ping_database(database: Database) -> bool:
    try:
        with database.read_connection() as connection:
            connection.execute(__import__("sqlalchemy").text("SELECT 1"))
        return True
    except Exception:
        return False
