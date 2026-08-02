from sqlalchemy import text

AVG_EVAL_QUERY = """
    SELECT AVG(note) AS avg_note
    FROM evaluation.evaluation_formateur
    WHERE enseignant_id = :teacher_id
"""


class SqlEvaluationSource:
    def __init__(self, database) -> None:
        self._database = database

    def get_avg_eval_score(self, teacher_id: str) -> float | None:
        with self._database.read_connection() as connection:
            row = connection.execute(text(AVG_EVAL_QUERY), {"teacher_id": teacher_id}).mappings().first()
        if row is None or row["avg_note"] is None:
            return None
        return float(row["avg_note"])
