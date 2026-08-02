from sqlalchemy import text

from app.core.logging import get_logger

logger = get_logger("dashboard_repository")

INSERT_SNAPSHOT = """
    INSERT INTO analyse.dashboard_snapshots (scope, scope_id, snapshot_date, kpis_json, computed_at)
    VALUES (:scope, :scope_id, CURRENT_DATE, :kpis_json, now())
"""

LATEST_SNAPSHOT = """
    SELECT kpis_json, snapshot_date
    FROM analyse.dashboard_snapshots
    WHERE scope = :scope AND (scope_id = :scope_id OR (scope_id IS NULL AND :scope_id IS NULL))
    ORDER BY snapshot_date DESC, id DESC
    LIMIT 1
"""

LATEST_DECLINING = """
    SELECT kpis_json
    FROM analyse.dashboard_snapshots
    WHERE scope = :scope AND (scope_id = :scope_id OR (scope_id IS NULL AND :scope_id IS NULL))
    ORDER BY snapshot_date DESC, id DESC
    LIMIT 1
"""


class SqlDashboardRepository:
    def __init__(self, database) -> None:
        self._database = database

    def save_snapshot(self, scope: str, scope_id: str | None, kpis: dict) -> None:
        try:
            with self._database.session() as session:
                session.execute(
                    text(INSERT_SNAPSHOT),
                    {"scope": scope, "scope_id": scope_id, "kpis_json": kpis},
                )
        except Exception as exc:
            logger.warning("persistance snapshot dashboard impossible", error=str(exc))

    def latest_snapshot(self, scope: str, scope_id: str | None = None) -> dict | None:
        with self._database.read_connection() as connection:
            row = connection.execute(
                text(LATEST_SNAPSHOT), {"scope": scope, "scope_id": scope_id}
            ).mappings().first()
        if not row:
            return None
        return {**dict(row["kpis_json"]), "snapshot_date": row["snapshot_date"].isoformat()}

    def declining_trends(self, scope: str, scope_id: str | None = None) -> list[dict]:
        with self._database.read_connection() as connection:
            row = connection.execute(
                text(LATEST_DECLINING), {"scope": scope, "scope_id": scope_id}
            ).mappings().first()
        if not row:
            return []
        kpis = row["kpis_json"] if isinstance(row["kpis_json"], dict) else {}
        return list(kpis.get("declining_competencies", []))
