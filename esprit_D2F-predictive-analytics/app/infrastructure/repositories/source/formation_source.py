from datetime import date, datetime, timedelta

from sqlalchemy import text

from app.domain.services.ranking_service import TrainingCandidate

CANDIDATES_QUERY = """
    SELECT f.id_formation, f.titre_formation, f.date_debut, f.date_fin,
           COALESCE(array_agg(fc.savoir_id) FILTER (WHERE fc.savoir_id IS NOT NULL), '{}') AS savoir_ids,
           eg.note_globale
    FROM formation.formations f
    JOIN formation.formation_competences fc ON fc.formation_id = f.id_formation
    LEFT JOIN evaluation.evaluation_globale eg ON eg.formation_id = f.id_formation AND eg.deleted_at IS NULL
    WHERE fc.competence_id = :competence_id
      AND f.deleted_at IS NULL
      AND f.etat_formation IN ('PLANIFIE', 'EN_COURS', 'ACHEVE')
    GROUP BY f.id_formation, eg.note_globale
"""

COMPLETED_FORMATIONS_QUERY = """
    SELECT DISTINCT formation_id
    FROM formation.inscriptions
    WHERE enseignant_id = :teacher_id AND etat = 'APPROVED'
"""

ATTENDANCE_RATE_QUERY = """
    SELECT COUNT(*) FILTER (WHERE p.presence)::float / NULLIF(COUNT(*), 0) AS rate
    FROM formation.presences p
    JOIN formation.seances s ON s.id_seance = p.seance_id
    WHERE p.enseignant_id = :teacher_id
"""

LAST_ACTIVITY_QUERY = """
    SELECT MAX(date_demande) AS last_activity
    FROM formation.inscriptions
    WHERE enseignant_id = :teacher_id AND date_demande IS NOT NULL
"""


class SqlFormationSource:
    def __init__(self, database) -> None:
        self._database = database

    def get_candidates_for_competency(self, competence_id: int) -> list[TrainingCandidate]:
        with self._database.read_connection() as connection:
            rows = connection.execute(text(CANDIDATES_QUERY), {"competence_id": competence_id}).mappings().all()
        return [
            TrainingCandidate(
                formation_id=int(row["id_formation"]),
                titre=str(row["titre_formation"]),
                savoir_ids=frozenset(int(sid) for sid in row["savoir_ids"]),
                start_date=row["date_debut"],
                end_date=row["date_fin"],
                avg_eval_score=float(row["note_globale"]) if row["note_globale"] is not None else None,
            )
            for row in rows
        ]

    def get_completed_formation_ids(self, teacher_id: str) -> set[int]:
        with self._database.read_connection() as connection:
            rows = connection.execute(text(COMPLETED_FORMATIONS_QUERY), {"teacher_id": teacher_id}).mappings().all()
        return {int(row["formation_id"]) for row in rows}

    def get_attendance_rate(self, teacher_id: str) -> float:
        with self._database.read_connection() as connection:
            row = connection.execute(text(ATTENDANCE_RATE_QUERY), {"teacher_id": teacher_id}).mappings().first()
        return float(row["rate"]) if row and row["rate"] is not None else 0.0

    def get_days_since_last_activity(self, teacher_id: str) -> float | None:
        with self._database.read_connection() as connection:
            row = connection.execute(text(LAST_ACTIVITY_QUERY), {"teacher_id": teacher_id}).mappings().first()
        last_activity = row["last_activity"] if row else None
        if last_activity is None:
            return None
        if isinstance(last_activity, datetime):
            last_date = last_activity.date()
        elif isinstance(last_activity, date):
            last_date = last_activity
        else:
            return None
        return max(0.0, (date.today() - last_date).days)
