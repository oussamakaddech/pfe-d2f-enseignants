from sqlalchemy import text

from app.core.logging import get_logger
from app.domain.entities.alert import Alert

logger = get_logger("alert_repository")

ALERT_EVENTS_TABLE = '"analyse".alert_events'
SEVERITY_FILTER = "severite = :severite"
STATUS_FILTER = "statut = :statut"
# Le filtre département couvre la colonne dénormalisée departement_id (souvent
# NULL selon le générateur) ET le département de l'enseignant ciblé.
DEPARTMENT_FILTER = """(
    departement_id = :departement_id
    OR (
        enseignant_id IS NOT NULL
        AND enseignant_id IN (
            SELECT e.id FROM formation.enseignants e
            WHERE e.dept_id = :departement_id AND e.deleted_at IS NULL
        )
    )
)"""

INSERT_ALERT = f"""
    INSERT INTO {ALERT_EVENTS_TABLE}
        (type_alerte, cible_type, enseignant_id, departement_id, competence_id,
         skill_gap_id, severite, titre, message, details_json, statut, created_at, updated_at)
    VALUES
        (:type_alerte, :cible_type, :enseignant_id, :departement_id, :competence_id,
         :skill_gap_id, :severite, :titre, :message, :details_json, :statut, now(), now())
    RETURNING id, created_at
"""

SELECT_ALERT = f"""
    SELECT id, type_alerte, cible_type, enseignant_id, departement_id, competence_id,
           skill_gap_id, severite, titre, message, details_json, statut, created_at
    FROM {ALERT_EVENTS_TABLE}
"""

UPDATE_STATUS = f"""
    UPDATE {ALERT_EVENTS_TABLE}
    SET {STATUS_FILTER},
        traite_par = :traite_par,
        commentaire_traitement = :commentaire_traitement,
        updated_at = now()
    WHERE id = :alert_id
"""

SELECT_OPEN_SINCE = f"""
    SELECT id, type_alerte, cible_type, enseignant_id, departement_id, competence_id,
           skill_gap_id, severite, titre, message, details_json, statut, created_at
    FROM {ALERT_EVENTS_TABLE}
    WHERE statut = 'NOUVELLE'
      AND created_at < now() - make_interval(days => :cutoff_days)
"""

SEVERITY_BREAKDOWN_SQL = f"""
    SELECT
      CASE
        WHEN UPPER(severite) IN ('CRITICAL', 'CRITIQUE') THEN 'CRITICAL'
        WHEN UPPER(severite) IN ('WARNING', 'HAUTE', 'MOYENNE') THEN 'WARNING'
        ELSE 'INFO'
      END AS bucket,
      COUNT(*) AS n
    FROM {ALERT_EVENTS_TABLE}
"""


class SqlAlertRepository:
    def __init__(self, database) -> None:
        self._database = database

    def save(self, alert: Alert) -> Alert:
        with self._database.session() as session:
            row = session.execute(
                text(INSERT_ALERT),
                {
                    "type_alerte": alert.alert_type,
                    "cible_type": alert.target_type,
                    "enseignant_id": alert.teacher_id,
                    "departement_id": alert.department_id,
                    "competence_id": alert.competence_id,
                    "skill_gap_id": alert.skill_gap_id,
                    "severite": alert.severity,
                    "titre": alert.title,
                    "message": alert.message,
                    "details_json": alert.details or {},
                    "statut": alert.status,
                },
            ).mappings().first()
        created_at = row["created_at"] if row else alert.created_at
        alert_id = row["id"] if row else alert.id
        return Alert(
            alert_type=alert.alert_type,
            target_type=alert.target_type,
            severity=alert.severity,
            title=alert.title,
            message=alert.message,
            teacher_id=alert.teacher_id,
            department_id=alert.department_id,
            competence_id=alert.competence_id,
            skill_gap_id=alert.skill_gap_id,
            details=alert.details,
            status=alert.status,
            id=alert_id,
            created_at=created_at,
        )

    @staticmethod
    def _build_query(filters: list[str]) -> str:
        where = " WHERE " + " AND ".join(filters) if filters else ""
        return SELECT_ALERT + where + " ORDER BY created_at DESC"

    def _run(self, session, query: str, params: dict, page: int, size: int) -> tuple[list[Alert], int]:
        count_query = query.replace(SELECT_ALERT, "SELECT COUNT(*) AS total FROM \"analyse\".alert_events")
        count_query = count_query.replace(" ORDER BY created_at DESC", "")
        count_row = session.execute(text(count_query), params).mappings().first()
        total = int(count_row["total"]) if count_row else 0
        rows = session.execute(text(query + " LIMIT :limit OFFSET :offset"), {**params, "limit": size, "offset": (page - 1) * size}).mappings().all()
        return [self._map_row(row) for row in rows], total

    def list_alerts(self, page: int, size: int, severity: str | None = None, status: str | None = None, target_type: str | None = None, department_id: str | None = None) -> tuple[list[Alert], int]:
        filters, params = [], {}
        if severity:
            filters.append(SEVERITY_FILTER)
            params["severite"] = severity.upper()
        if status:
            filters.append(STATUS_FILTER)
            params["statut"] = status.upper()
        if target_type:
            filters.append("cible_type = :cible_type")
            params["cible_type"] = target_type.upper()
        if department_id:
            filters.append(DEPARTMENT_FILTER)
            params["departement_id"] = department_id
        with self._database.read_connection() as connection:
            return self._run(connection, self._build_query(filters), params, page, size)

    def list_for_teacher(self, teacher_id: str, page: int, size: int, severity: str | None = None, status: str | None = None) -> tuple[list[Alert], int]:
        filters, params = ["enseignant_id = :enseignant_id"], {"enseignant_id": teacher_id}
        if severity:
            filters.append(SEVERITY_FILTER)
            params["severite"] = severity.upper()
        if status:
            filters.append(STATUS_FILTER)
            params["statut"] = status.upper()
        with self._database.read_connection() as connection:
            return self._run(connection, self._build_query(filters), params, page, size)

    def list_for_department(self, department_id: str, page: int, size: int, severity: str | None = None, status: str | None = None) -> tuple[list[Alert], int]:
        filters, params = [DEPARTMENT_FILTER], {"departement_id": department_id}
        if severity:
            filters.append(SEVERITY_FILTER)
            params["severite"] = severity.upper()
        if status:
            filters.append(STATUS_FILTER)
            params["statut"] = status.upper()
        with self._database.read_connection() as connection:
            return self._run(connection, self._build_query(filters), params, page, size)

    @staticmethod
    def _severity_breakdown_query(filters: list[str]) -> str:
        where = " WHERE " + " AND ".join(filters) if filters else ""
        return SEVERITY_BREAKDOWN_SQL + where + " GROUP BY bucket"

    def count_open_by_severity(self, severity: str | None = None, status: str | None = None,
                               target_type: str | None = None,
                               teacher_id: str | None = None,
                               department_id: str | None = None) -> dict[str, int]:
        """Nb d'alertes OUVRES (NOUVELLE/LUE) par bucket de severite, meme scope que la liste."""
        filters, params = ["statut IN ('NOUVELLE', 'LUE')"], {}
        if severity:
            filters.append(SEVERITY_FILTER)
            params["severite"] = severity.upper()
        if status:
            filters.append(STATUS_FILTER)
            params["statut"] = status.upper()
        if target_type:
            filters.append("cible_type = :cible_type")
            params["cible_type"] = target_type.upper()
        if teacher_id:
            filters.append("enseignant_id = :enseignant_id")
            params["enseignant_id"] = teacher_id
        if department_id:
            filters.append(DEPARTMENT_FILTER)
            params["departement_id"] = department_id
        with self._database.read_connection() as connection:
            rows = connection.execute(
                text(self._severity_breakdown_query(filters)), params
            ).mappings().all()
        result = {"CRITICAL": 0, "WARNING": 0, "INFO": 0}
        for row in rows:
            result[row["bucket"]] = int(row["n"])
        return result

    def list_open_since(self, cutoff_days: int) -> list[Alert]:
        with self._database.read_connection() as connection:
            rows = connection.execute(text(SELECT_OPEN_SINCE), {"cutoff_days": cutoff_days}).mappings().all()
        return [self._map_row(row) for row in rows]

    def update_status(self, alert_id: int, status: str, actor: str | None = None, comment: str | None = None) -> Alert | None:
        try:
            with self._database.session() as session:
                session.execute(
                    text(UPDATE_STATUS),
                    {"alert_id": alert_id, "statut": status.upper(), "traite_par": actor, "commentaire_traitement": comment},
                )
        except Exception as exc:
            logger.warning("mise a jour alerte impossible", error=str(exc))
        with self._database.read_connection() as connection:
            row = connection.execute(text(SELECT_ALERT + " WHERE id = :alert_id"), {"alert_id": alert_id}).mappings().first()
        return self._map_row(row) if row else None

    @staticmethod
    def _map_row(row) -> Alert:
        return Alert(
            id=row["id"],
            alert_type=row["type_alerte"],
            target_type=row["cible_type"],
            teacher_id=row["enseignant_id"],
            department_id=row["departement_id"],
            competence_id=row["competence_id"],
            skill_gap_id=row["skill_gap_id"],
            severity=row["severite"],
            title=row["titre"],
            message=row["message"],
            details=dict(row["details_json"]) if row["details_json"] else None,
            status=row["statut"],
            created_at=row["created_at"],
        )
