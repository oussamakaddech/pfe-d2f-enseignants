from sqlalchemy import text

from app.core.logging import get_logger
from app.domain.entities.training_need import TrainingNeed

logger = get_logger("training_need_repository")

INSERT_NEED = """
    INSERT INTO analyse.training_needs
        (type_besoin, competence_id, competence_code, nom, scope_type, scope_id,
         nb_enseignants, evidence_json, statut, detected_at)
    VALUES
        (:type_besoin, :competence_id, :competence_code, :nom, :scope_type, :scope_id,
         :nb_enseignants, :evidence_json, :statut, now())
    RETURNING id, detected_at
"""

SELECT_NEED = """
    SELECT id, type_besoin, competence_id, competence_code, nom, scope_type, scope_id,
           nb_enseignants, evidence_json, statut, detected_at
    FROM analyse.training_needs
"""

CLOSE_NEED = """
    UPDATE analyse.training_needs
    SET statut = 'CLOSED'
    WHERE id = :need_id
"""


class SqlTrainingNeedRepository:
    def __init__(self, database) -> None:
        self._database = database

    def save(self, need: TrainingNeed) -> TrainingNeed:
        with self._database.session() as session:
            row = session.execute(
                text(INSERT_NEED),
                {
                    "type_besoin": need.need_type,
                    "competence_id": need.competence_id,
                    "competence_code": need.competence_code,
                    "nom": need.competence_nom,
                    "scope_type": need.scope_type,
                    "scope_id": need.scope_id,
                    "nb_enseignants": need.teachers_count,
                    "evidence_json": need.evidence,
                    "statut": need.status,
                },
            ).mappings().first()
        need_id = row["id"] if row else need.id
        detected_at = row["detected_at"] if row else need.detected_at
        return TrainingNeed(
            need_type=need.need_type,
            competence_id=need.competence_id,
            competence_code=need.competence_code,
            competence_nom=need.competence_nom,
            scope_type=need.scope_type,
            scope_id=need.scope_id,
            teachers_count=need.teachers_count,
            evidence=need.evidence,
            status=need.status,
            id=need_id,
            detected_at=detected_at,
        )

    def _run(self, session, query: str, params: dict, page: int, size: int) -> tuple[list[TrainingNeed], int]:
        count_row = session.execute(text(query.replace(SELECT_NEED, "SELECT COUNT(*) AS total FROM analyse.training_needs")), params).mappings().first()
        total = int(count_row["total"]) if count_row else 0
        rows = session.execute(text(query + " ORDER BY detected_at DESC LIMIT :limit OFFSET :offset"), {**params, "limit": size, "offset": (page - 1) * size}).mappings().all()
        return [self._map_row(row) for row in rows], total

    def list_needs(self, page: int, size: int, need_type: str | None = None, scope_type: str | None = None) -> tuple[list[TrainingNeed], int]:
        filters, params = [], {}
        if need_type:
            filters.append("type_besoin = :type_besoin")
            params["type_besoin"] = need_type.upper()
        if scope_type:
            filters.append("scope_type = :scope_type")
            params["scope_type"] = scope_type.upper()
        where = " WHERE " + " AND ".join(filters) if filters else ""
        with self._database.read_connection() as connection:
            return self._run(connection, SELECT_NEED + where, params, page, size)

    def list_for_teacher(self, teacher_id: str, page: int, size: int) -> tuple[list[TrainingNeed], int]:
        where = " WHERE scope_type = 'ENSEIGNANT' AND scope_id = :teacher_id"
        with self._database.read_connection() as connection:
            return self._run(connection, SELECT_NEED + where, {"teacher_id": teacher_id}, page, size)

    def list_for_department(self, department_id: str, page: int, size: int) -> tuple[list[TrainingNeed], int]:
        where = " WHERE scope_type = 'DEPARTEMENT' AND scope_id = :department_id"
        with self._database.read_connection() as connection:
            return self._run(connection, SELECT_NEED + where, {"department_id": department_id}, page, size)

    def close(self, need_id: int) -> TrainingNeed | None:
        try:
            with self._database.session() as session:
                session.execute(text(CLOSE_NEED), {"need_id": need_id})
        except Exception as exc:
            logger.warning("cloture besoin impossible", error=str(exc))
        with self._database.read_connection() as connection:
            row = connection.execute(text(SELECT_NEED + " WHERE id = :need_id"), {"need_id": need_id}).mappings().first()
        return self._map_row(row) if row else None

    @staticmethod
    def _map_row(row) -> TrainingNeed:
        return TrainingNeed(
            id=row["id"],
            need_type=row["type_besoin"],
            competence_id=row["competence_id"],
            competence_code=row["competence_code"],
            competence_nom=row["nom"],
            scope_type=row["scope_type"],
            scope_id=row["scope_id"],
            teachers_count=row["nb_enseignants"],
            evidence=dict(row["evidence_json"]) if row["evidence_json"] else {},
            status=row["statut"],
            detected_at=row["detected_at"],
        )
