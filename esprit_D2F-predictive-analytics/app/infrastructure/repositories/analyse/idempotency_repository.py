from sqlalchemy import text

CHECK_EVENT = """
    SELECT 1 FROM analyse.event_processing WHERE event_id = :event_id
"""

INSERT_EVENT = """
    INSERT INTO analyse.event_processing (event_id, event_type)
    VALUES (:event_id, :event_type)
    ON CONFLICT (event_id) DO NOTHING
"""


class SqlIdempotencyRepository:
    def __init__(self, database) -> None:
        self._database = database

    def already_processed(self, event_id: str) -> bool:
        with self._database.read_connection() as connection:
            row = connection.execute(text(CHECK_EVENT), {"event_id": event_id}).mappings().first()
        return row is not None

    def mark_processed(self, event_id: str, event_type: str | None = None) -> None:
        with self._database.session() as session:
            session.execute(text(INSERT_EVENT), {"event_id": event_id, "event_type": event_type})
