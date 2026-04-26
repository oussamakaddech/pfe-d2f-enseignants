"""Data access layer: raw SQL queries to the D2F PostgreSQL database."""

import logging
from typing import Any

from sqlalchemy.orm import Session

from app.core.db import execute_query

logger = logging.getLogger(__name__)

# ── SQL Queries ────────────────────────────────

TEACHER_PROFILE_QUERY = """
WITH tf AS (
    SELECT i.enseignant_id,
           COUNT(DISTINCT i.formation_id) FILTER (WHERE f.etat_formation = 'TERMINEE') AS nb_completed,
           COUNT(DISTINCT i.formation_id) FILTER (WHERE i.etat = 'INSCRIT') AS nb_in_progress,
           MAX(i.date_inscription) AS last_inscription,
           MIN(i.date_inscription) AS first_inscription
    FROM inscriptions i
    JOIN formations f ON f.id_formation = i.formation_id
    GROUP BY i.enseignant_id
),
tp AS (
    SELECT p.enseignant_id,
           COUNT(*) AS total_seances,
           SUM(CASE WHEN p.present THEN 1 ELSE 0 END)::FLOAT / NULLIF(COUNT(*), 0) AS taux_assiduite
    FROM presences p
    GROUP BY p.enseignant_id
),
tb AS (
    SELECT username AS enseignant_id,
           COUNT(*) AS nb_besoins,
           COUNT(*) FILTER (WHERE approuve_admin) AS nb_approved,
           MAX(created_at) AS last_besoin
    FROM besoin_formation
    GROUP BY username
),
te AS (
    SELECT enseignant_id,
           AVG(note)::FLOAT AS avg_note,
           COUNT(*) AS nb_evals
    FROM evaluation_formateur
    GROUP BY enseignant_id
)
SELECT e.id AS enseignant_id, e.nom, e.prenom, e.email,
       e.departement_id, e.up_id,
       COALESCE(tf.nb_completed, 0) AS nb_formations_completed,
       COALESCE(tf.nb_in_progress, 0) AS nb_formations_in_progress,
       COALESCE(tp.taux_assiduite, 0.0) AS taux_assiduite,
       COALESCE(tb.nb_besoins, 0) AS nb_besoins_exprimes,
       COALESCE(tb.nb_approved, 0) AS nb_besoins_approuves,
       COALESCE(te.avg_note, 0.0) AS avg_eval_score,
       COALESCE(te.nb_evals, 0) AS nb_evaluations,
       EXTRACT(DAY FROM CURRENT_DATE - tf.last_inscription)::INT AS days_since_last_training,
       CASE WHEN tf.nb_completed > 0
            THEN EXTRACT(DAY FROM CURRENT_DATE - tf.first_inscription)::INT / tf.nb_completed
            ELSE NULL END AS avg_days_between_trainings
FROM enseignants e
LEFT JOIN tf ON tf.enseignant_id = e.id
LEFT JOIN tp ON tp.enseignant_id = e.id
LEFT JOIN tb ON tb.enseignant_id = e.id
LEFT JOIN te ON te.enseignant_id = e.id
WHERE e.id = :teacher_id OR :teacher_id IS NULL
"""

COMPETENCY_LEVELS_QUERY = """
SELECT ec.enseignant_id, s.id AS savoir_id, s.nom AS savoir_nom, s.type_savoir,
       sc.id AS sous_competence_id, sc.nom AS sous_competence_nom,
       c.id AS competence_id, c.nom AS competence_nom,
       d.id AS domaine_id, d.nom AS domaine_nom,
       ec.niveau AS current_level, ec.created_at, ec.updated_at
FROM enseignant_competences ec
JOIN savoirs s ON s.id = ec.savoir_id
JOIN sous_competences sc ON sc.id = s.sous_competence_id
JOIN competences c ON c.id = sc.competence_id
JOIN domaines d ON d.id = c.domaine_id
WHERE ec.enseignant_id = :teacher_id OR :teacher_id IS NULL
"""

REQUIRED_LEVELS_QUERY = """
SELECT nsr.id, COALESCE(nsr.competence_id, sc.competence_id) AS competence_id,
       c.nom AS competence_nom, sc.id AS sous_competence_id, sc.nom AS sous_competence_nom,
       nsr.niveau AS required_level, s.id AS savoir_id, s.nom AS savoir_nom
FROM niveau_savoir_requis nsr
JOIN savoirs s ON s.id = nsr.savoir_id
LEFT JOIN competences c ON c.id = nsr.competence_id
LEFT JOIN sous_competences sc ON sc.id = nsr.sous_competence_id
"""

PREREQUISITE_GRAPH_QUERY = """
SELECT cp.competence_id AS target_id, c1.nom AS target_name,
       cp.prerequisite_id AS prereq_id, c2.nom AS prereq_name
FROM competence_prerequisite cp
JOIN competences c1 ON c1.id = cp.competence_id
JOIN competences c2 ON c2.id = cp.prerequisite_id
"""

FORMATION_COMPETENCIES_QUERY = """
SELECT fc.formation_id, f.titre_formation, f.date_debut, f.date_fin, f.duree_formation,
       fc.competence_id, fc.sous_competence_id, fc.savoir_id, fc.niveau_cible
FROM formation_competences fc
JOIN formations f ON f.id_formation = fc.formation_id
WHERE f.etat_formation = 'TERMINEE'
"""

BESOIN_DEMAND_QUERY = """
SELECT c.id AS competence_id, c.nom AS competence_nom, d.nom AS domaine_nom,
       COUNT(*) FILTER (WHERE bf.created_at >= CURRENT_DATE - INTERVAL '3 months') AS demand_3m,
       COUNT(*) FILTER (WHERE bf.created_at >= CURRENT_DATE - INTERVAL '12 months') AS demand_12m,
       COUNT(*) AS total_demand
FROM besoin_formation bf
LEFT JOIN competences c ON c.nom ILIKE '%' || bf.theme || '%' OR c.nom ILIKE '%' || bf.titre || '%'
LEFT JOIN domaines d ON d.id = c.domaine_id
WHERE bf.approuve_admin = TRUE
GROUP BY c.id, c.nom, d.nom
"""

TRAINING_EFFECTIVENESS_QUERY = """
SELECT i.enseignant_id, f.id_formation, f.titre_formation,
       f.date_debut, f.date_fin, fc.savoir_id, fc.niveau_cible,
       eg.note_globale AS post_eval_score
FROM inscriptions i
JOIN formations f ON f.id_formation = i.formation_id
LEFT JOIN formation_competences fc ON fc.formation_id = f.id_formation
LEFT JOIN evaluation_globale eg ON eg.formation_id = f.id_formation
WHERE f.etat_formation = 'TERMINEE' AND i.etat = 'COMPLETED'
"""


class DataService:
    """Read-only data access service for the predictive analytics pipeline."""

    def __init__(self, db: Session):
        self.db = db

    def get_teacher_profile(self, teacher_id: str | None = None) -> list[dict[str, Any]]:
        """Fetch teacher(s) profile with aggregated metrics."""
        return execute_query(self.db, TEACHER_PROFILE_QUERY, {"teacher_id": teacher_id})

    def get_competency_levels(self, teacher_id: str | None = None) -> list[dict[str, Any]]:
        """Fetch current competency levels for teacher(s)."""
        return execute_query(self.db, COMPETENCY_LEVELS_QUERY, {"teacher_id": teacher_id})

    def get_required_levels(self) -> list[dict[str, Any]]:
        """Fetch the reference competency requirements."""
        return execute_query(self.db, REQUIRED_LEVELS_QUERY)

    def get_prerequisite_graph(self) -> list[dict[str, Any]]:
        """Fetch the competency prerequisite graph."""
        return execute_query(self.db, PREREQUISITE_GRAPH_QUERY)

    def get_formation_competencies(self) -> list[dict[str, Any]]:
        """Fetch formation-to-competency mappings."""
        return execute_query(self.db, FORMATION_COMPETENCIES_QUERY)

    def get_besoin_demand(self) -> list[dict[str, Any]]:
        """Fetch aggregated training need demand per competency."""
        return execute_query(self.db, BESOIN_DEMAND_QUERY)

    def get_training_effectiveness(self) -> list[dict[str, Any]]:
        """Fetch training effectiveness data."""
        return execute_query(self.db, TRAINING_EFFECTIVENESS_QUERY)
