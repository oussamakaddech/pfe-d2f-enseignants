from sqlalchemy import text

DECLARED_NEEDS_QUERY = """
    SELECT COUNT(*) AS need_count
    FROM besoin.besoin_formation
    WHERE username = :teacher_id
      AND approuve_admin = TRUE
      AND deleted_at IS NULL
      AND created_at >= now() - make_interval(months => :months)
"""


class SqlBesoinSource:
    def __init__(self, database) -> None:
        self._database = database

    def count_declared_needs(self, teacher_id: str, months: int) -> int:
        with self._database.read_connection() as connection:
            row = connection.execute(text(DECLARED_NEEDS_QUERY), {"teacher_id": teacher_id, "months": months}).mappings().first()
        return int(row["need_count"]) if row else 0
