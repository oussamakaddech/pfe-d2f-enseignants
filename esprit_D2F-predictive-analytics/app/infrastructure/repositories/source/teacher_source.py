from sqlalchemy import text
from sqlalchemy.engine import Connection

from app.domain.entities.teacher import Teacher

TEACHER_BASE_SELECT = """
    SELECT e.id, e.nom, e.prenom, e.mail, e.up_id, e.dept_id, e.user_id,
           e.date_recrutement, e.specialite, e.grade,
           u.libelle AS up_libelle, d.libelle AS dept_libelle
    FROM formation.enseignants e
    LEFT JOIN formation.ups u ON u.id = e.up_id
    LEFT JOIN formation.departements d ON d.id = e.dept_id
"""

GET_TEACHER_QUERY = TEACHER_BASE_SELECT + """
    WHERE e.id = :teacher_id AND e.deleted_at IS NULL
"""

GET_TEACHER_BY_USER_QUERY = TEACHER_BASE_SELECT + """
    WHERE e.user_id = :user_id AND e.deleted_at IS NULL
"""

LIST_TEACHERS_QUERY = TEACHER_BASE_SELECT + """
    WHERE e.deleted_at IS NULL
"""


class SqlTeacherSource:
    def __init__(self, database) -> None:
        self._database = database

    def get_teacher(self, teacher_id: str) -> Teacher | None:
        with self._database.read_connection() as connection:
            return self._row_to_teacher(connection, GET_TEACHER_QUERY, {"teacher_id": teacher_id})

    def resolve_user_teacher(self, user_id: str) -> Teacher | None:
        with self._database.read_connection() as connection:
            return self._row_to_teacher(connection, GET_TEACHER_BY_USER_QUERY, {"user_id": user_id})

    def list_teachers(self) -> list[Teacher]:
        with self._database.read_connection() as connection:
            rows = connection.execute(text(LIST_TEACHERS_QUERY)).mappings().all()
            return [self._map_row(row) for row in rows]

    def _row_to_teacher(self, connection: Connection, query: str, params: dict) -> Teacher | None:
        row = connection.execute(text(query), params).mappings().first()
        return self._map_row(row) if row else None

    @staticmethod
    def _map_row(row) -> Teacher:
        return Teacher(
            id=str(row["id"]),
            nom=str(row["nom"] or ""),
            prenom=str(row["prenom"] or ""),
            mail=str(row["mail"] or ""),
            up_id=str(row["up_id"]) if row["up_id"] is not None else None,
            dept_id=str(row["dept_id"]) if row["dept_id"] is not None else None,
            user_id=row["user_id"],
            date_recrutement=row["date_recrutement"],
            specialite=str(row["specialite"]) if row["specialite"] else None,
            grade=str(row["grade"]) if row["grade"] else None,
            up_libelle=str(row["up_libelle"]) if row["up_libelle"] else None,
            dept_libelle=str(row["dept_libelle"]) if row["dept_libelle"] else None,
        )
