from sqlalchemy import text

from app.domain.entities.competency import Competency, Savoir
from app.domain.value_objects.enums import level_to_int

LIST_COMPETENCIES_QUERY = """
    SELECT c.id, c.code, c.nom, c.domaine_id, d.nom AS domaine_nom
    FROM competence.competences c
    LEFT JOIN competence.domaines d ON d.id = c.domaine_id
    ORDER BY c.id
"""

LIST_COMPETENCIES_SCOPED_QUERY = """
    SELECT c.id, c.code, c.nom, c.domaine_id, d.nom AS domaine_nom
    FROM competence.competences c
    LEFT JOIN competence.domaines d ON d.id = c.domaine_id
    WHERE (
        (:dept_id IS NOT NULL AND CAST(d.departement_id AS TEXT) = :dept_id)
        OR (:up_id IS NOT NULL AND CAST(d.up_id AS TEXT) = :up_id)
        OR (:specialite IS NOT NULL AND (
            d.nom ILIKE '%' || :specialite || '%'
            OR c.nom ILIKE '%' || :specialite || '%'
        ))
    )
    ORDER BY c.id
"""

LIST_SAVOIRS_QUERY = """
    SELECT s.id, s.code, s.nom,
           COALESCE(sc.competence_id, s.competence_id) AS competence_id,
           r.required_level
    FROM competence.savoirs s
    LEFT JOIN competence.sous_competences sc ON sc.id = s.sous_competence_id
    LEFT JOIN (
        SELECT savoir_id, MAX(
            CASE niveau
                WHEN 'N1_DEBUTANT' THEN 1
                WHEN 'N2_ELEMENTAIRE' THEN 2
                WHEN 'N3_INTERMEDIAIRE' THEN 3
                WHEN 'N4_AVANCE' THEN 4
                WHEN 'N5_EXPERT' THEN 5
                ELSE 0
            END
        ) AS required_level
        FROM competence.niveau_savoir_requis
        GROUP BY savoir_id
    ) r ON r.savoir_id = s.id
    WHERE COALESCE(sc.competence_id, s.competence_id) IS NOT NULL
"""

TEACHER_LEVELS_QUERY = """
    SELECT savoir_id, niveau
    FROM competence.enseignant_competences
    WHERE enseignant_id = :teacher_id
"""

TEACHER_LEVELS_HISTORY_QUERY = """
    SELECT savoir_id, date_acquisition, niveau
    FROM competence.enseignant_competences
    WHERE enseignant_id = :teacher_id AND date_acquisition IS NOT NULL
    ORDER BY date_acquisition ASC
"""


class SqlCompetencySource:
    def __init__(self, database) -> None:
        self._database = database

    def list_competencies(self) -> list[Competency]:
        with self._database.read_connection() as connection:
            competency_rows = connection.execute(text(LIST_COMPETENCIES_QUERY)).mappings().all()
        return self._build_competencies(competency_rows)

    def list_competencies_for_scope(
        self, up_id: str | None, dept_id: str | None, specialite: str | None
    ) -> list[Competency]:
        """Retourne les compétences rattachées au périmètre de l'enseignant
        (département / unité pédagogique / spécialité).

        Aucun fallback sur le référentiel global : si le périmètre est déclaré
        mais qu'aucun domaine ne correspond, la liste est vide (comportement
        honnête — jamais de compétences hors périmètre, ex : Génie Civil pour
        un enseignant du Département Technologie Web).
        """
        if not up_id and not dept_id and not specialite:
            return self.list_competencies()
        with self._database.read_connection() as connection:
            rows = connection.execute(
                text(LIST_COMPETENCIES_SCOPED_QUERY),
                {"up_id": up_id, "dept_id": dept_id, "specialite": specialite},
            ).mappings().all()
        return self._build_competencies(rows)

    def _build_competencies(self, competency_rows) -> list[Competency]:
        with self._database.read_connection() as connection:
            savoir_rows = connection.execute(text(LIST_SAVOIRS_QUERY)).mappings().all()

        savoirs_by_competency: dict[int, list[Savoir]] = {}
        for row in savoir_rows:
            savoirs_by_competency.setdefault(int(row["competence_id"]), []).append(
                Savoir(id=int(row["id"]), code=str(row["code"]), nom=str(row["nom"]), knowledge_difficulty_level=int(row["required_level"] or 0))
            )

        competencies: list[Competency] = []
        for row in competency_rows:
            cid = int(row["id"])
            competencies.append(
                Competency(
                    id=cid,
                    code=str(row["code"]),
                    nom=str(row["nom"]),
                    domaine_id=int(row["domaine_id"]) if row["domaine_id"] is not None else None,
                    domaine_nom=str(row["domaine_nom"]) if row["domaine_nom"] else None,
                    savoirs=tuple(savoirs_by_competency.get(cid, [])),
                )
            )
        return competencies

    def get_teacher_savoir_levels(self, teacher_id: str) -> dict[int, int]:
        with self._database.read_connection() as connection:
            rows = connection.execute(text(TEACHER_LEVELS_QUERY), {"teacher_id": teacher_id}).mappings().all()
        return {int(row["savoir_id"]): level_to_int(row["niveau"]) for row in rows}

    def get_teacher_savoir_levels_history(self, teacher_id: str) -> dict[int, list[tuple[str, int]]]:
        with self._database.read_connection() as connection:
            rows = connection.execute(text(TEACHER_LEVELS_HISTORY_QUERY), {"teacher_id": teacher_id}).mappings().all()
        history: dict[int, list[tuple[str, int]]] = {}
        for row in rows:
            date_str = row["date_acquisition"].isoformat() if row["date_acquisition"] else "1900-01-01"
            history.setdefault(int(row["savoir_id"]), []).append((date_str, level_to_int(row["niveau"])))
        return history
