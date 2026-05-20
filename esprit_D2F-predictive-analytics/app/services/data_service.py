"""Data access layer: raw SQL queries to the D2F shared PostgreSQL database.

Notes sur les conventions de nommage :
- Formation.etatFormation → valeurs : NOUVEAU, ENREGISTRE, PLANIFIE, EN_COURS, ACHEVE, ANNULE, VISIBLE
- Inscription.etat        → valeurs : PENDING, APPROVED, REJECTED
- EnseignantCompetence.niveau → NiveauMaitrise : N1_DEBUTANT...N5_EXPERT
- Enseignant.mail         → colonne mail (pas email)
- Enseignant.dept         → FK dept_id
"""

import logging
from typing import Any

from sqlalchemy.orm import Session

from app.core.db import execute_query

logger = logging.getLogger(__name__)

# ── NiveauMaitrise → entier (utilisé dans CASE WHEN SQL) ──
NIVEAU_CASE = """
    CASE ec.niveau
        WHEN 'N1_DEBUTANT'     THEN 1
        WHEN 'N2_ELEMENTAIRE'  THEN 2
        WHEN 'N3_INTERMEDIAIRE' THEN 3
        WHEN 'N4_AVANCE'       THEN 4
        WHEN 'N5_EXPERT'       THEN 5
        ELSE 0
    END
"""

NIVEAU_REQUIS_CASE = """
    CASE nsr.niveau
        WHEN 'N1_DEBUTANT'     THEN 1
        WHEN 'N2_ELEMENTAIRE'  THEN 2
        WHEN 'N3_INTERMEDIAIRE' THEN 3
        WHEN 'N4_AVANCE'       THEN 4
        WHEN 'N5_EXPERT'       THEN 5
        ELSE 0
    END
"""

# ── Queries ────────────────────────────────────────────────

TEACHER_PROFILE_QUERY = f"""
WITH tf AS (
    SELECT i.enseignant_id,
           COUNT(DISTINCT i.formation_id) FILTER (WHERE i.etat = 'APPROVED') AS nb_completed,
           COUNT(DISTINCT i.formation_id) FILTER (WHERE i.etat = 'PENDING')  AS nb_in_progress,
           MAX(i.date_demande) AS last_inscription,
           MIN(i.date_demande) AS first_inscription
    FROM inscriptions i
    GROUP BY i.enseignant_id
),
tp AS (
    SELECT p.enseignant_id,
           SUM(CASE WHEN p.presence THEN 1 ELSE 0 END)::FLOAT
               / NULLIF(COUNT(*), 0) AS taux_assiduite
    FROM presences p
    GROUP BY p.enseignant_id
),
tb AS (
    SELECT bf.username AS enseignant_id,
           COUNT(*) AS nb_besoins,
           COUNT(*) FILTER (WHERE bf.approuve_admin = TRUE) AS nb_approved
    FROM besoin_formation bf
    GROUP BY bf.username
),
te AS (
    SELECT ef.enseignant_id,
           AVG(ef.note)::FLOAT AS avg_note,
           COUNT(*)             AS nb_evals
    FROM evaluation_formateur ef
    GROUP BY ef.enseignant_id
)
SELECT e.id              AS enseignant_id,
       e.nom,
       e.prenom,
       e.mail            AS email,
       e.dept_id         AS departement_id,
       e.up_id,
       COALESCE(tf.nb_completed,   0)   AS nb_formations_completed,
       COALESCE(tf.nb_in_progress, 0)   AS nb_formations_in_progress,
       COALESCE(tp.taux_assiduite, 0.0) AS taux_assiduite,
       COALESCE(tb.nb_besoins,     0)   AS nb_besoins_exprimes,
       COALESCE(tb.nb_approved,    0)   AS nb_besoins_approuves,
       COALESCE(te.avg_note,       0.0) AS avg_eval_score,
       COALESCE(te.nb_evals,       0)   AS nb_evaluations,
       EXTRACT(DAY FROM CURRENT_DATE - tf.last_inscription)::INT
           AS days_since_last_training,
       CASE WHEN tf.nb_completed > 0
            THEN EXTRACT(DAY FROM CURRENT_DATE - tf.first_inscription)::INT
                 / tf.nb_completed
            ELSE NULL
       END AS avg_days_between_trainings
FROM enseignants e
LEFT JOIN tf ON tf.enseignant_id = e.id
LEFT JOIN tp ON tp.enseignant_id = e.id
LEFT JOIN tb ON tb.enseignant_id = e.id
LEFT JOIN te ON te.enseignant_id = e.id
WHERE e.id = :teacher_id OR :teacher_id IS NULL
"""

COMPETENCY_LEVELS_QUERY = f"""
SELECT ec.enseignant_id,
       s.id   AS savoir_id,
       s.nom  AS savoir_nom,
       s.type AS savoir_type,
       {NIVEAU_CASE}   AS current_level,
       ec.date_acquisition,
       COALESCE(sc.id,  c_direct.id)   AS competence_id,
       COALESCE(sc.nom, c_direct.nom)  AS competence_nom,
       COALESCE(d_via_sc.id,  d_direct.id)  AS domaine_id,
       COALESCE(d_via_sc.nom, d_direct.nom) AS domaine_nom,
       sc.id  AS sous_competence_id,
       sc.nom AS sous_competence_nom
FROM enseignant_competences ec
JOIN savoirs s ON s.id = ec.savoir_id
-- savoir lié à une sous-compétence (cas principal)
LEFT JOIN sous_competences sc       ON sc.id = s.sous_competence_id
LEFT JOIN competences c_via_sc      ON c_via_sc.id = sc.competence_id
LEFT JOIN domaines d_via_sc         ON d_via_sc.id = c_via_sc.domaine_id
-- savoir lié directement à une compétence (cas alternatif)
LEFT JOIN competences c_direct      ON c_direct.id = s.competence_id
LEFT JOIN domaines d_direct         ON d_direct.id = c_direct.domaine_id
WHERE ec.enseignant_id = :teacher_id OR :teacher_id IS NULL
"""

REQUIRED_LEVELS_QUERY = f"""
SELECT nsr.id,
       COALESCE(nsr.competence_id, sc.competence_id) AS competence_id,
       COALESCE(c_direct.nom, c_via_sc.nom)          AS competence_nom,
       COALESCE(d_direct.id, d_via_sc.id)            AS domaine_id,
       COALESCE(d_direct.nom, d_via_sc.nom)          AS domaine_nom,
       sc.id  AS sous_competence_id,
       sc.nom AS sous_competence_nom,
       {NIVEAU_REQUIS_CASE}  AS required_level,
       s.id   AS savoir_id,
       s.nom  AS savoir_nom
FROM niveau_savoir_requis nsr
JOIN savoirs s ON s.id = nsr.savoir_id
LEFT JOIN competences c_direct      ON c_direct.id = nsr.competence_id
LEFT JOIN domaines d_direct         ON d_direct.id = c_direct.domaine_id
LEFT JOIN sous_competences sc       ON sc.id = nsr.sous_competence_id
LEFT JOIN competences c_via_sc      ON c_via_sc.id = sc.competence_id
LEFT JOIN domaines d_via_sc         ON d_via_sc.id = c_via_sc.domaine_id
"""

PREREQUISITE_GRAPH_QUERY = """
SELECT cp.competence_id AS target_id,
       c1.nom           AS target_name,
       cp.prerequisite_id AS prereq_id,
       c2.nom             AS prereq_name,
       cp.niveau_minimum
FROM competence_prerequisite cp
JOIN competences c1 ON c1.id = cp.competence_id
JOIN competences c2 ON c2.id = cp.prerequisite_id
"""

FORMATION_COMPETENCIES_QUERY = """
SELECT f.id_formation,
       f.titre_formation,
       f.date_debut,
       f.date_fin,
       f.charge_horaire_global,
       f.etat_formation,
       f.type_formation,
       f.inscriptions_ouvertes,
       f.ouverte,
       fc.competence_id,
       fc.sous_competence_id,
       fc.savoir_id,
       fc.niveau_prerequis,
       fc.niveau_vise,
       fc.competence_nom
FROM formation_competences fc
JOIN formations f ON f.id_formation = fc.formation_id
WHERE f.etat_formation NOT IN ('ANNULE')
"""

FORMATIONS_ALL_QUERY = """
SELECT f.id_formation,
       f.titre_formation,
       f.date_debut,
       f.date_fin,
       f.charge_horaire_global,
       f.etat_formation,
       f.type_formation,
       f.inscriptions_ouvertes,
       f.ouverte,
       f.departement_id,
       f.up_id
FROM formations f
WHERE f.etat_formation NOT IN ('ANNULE')
"""

INSCRIPTIONS_TEACHER_QUERY = """
SELECT i.id,
       i.formation_id,
       i.enseignant_id,
       i.etat,
       i.date_demande
FROM inscriptions i
WHERE i.enseignant_id = :teacher_id OR :teacher_id IS NULL
"""

PRESENCES_TEACHER_QUERY = """
SELECT p.id_participation,
       p.enseignant_id,
       p.presence,
       p.seance_id,
       sf.formation_id
FROM presences p
JOIN seances sf ON sf.id_seance = p.seance_id
WHERE p.enseignant_id = :teacher_id OR :teacher_id IS NULL
"""

BESOINS_TEACHER_QUERY = """
SELECT bf.id_besoin_formation,
       bf.username           AS enseignant_id,
       bf.titre,
       bf.theme,
       bf.priorite,
       bf.approuve_cup,
       bf.approuve_admin,
       bf.last_refresh_date
FROM besoin_formation bf
WHERE bf.username = :teacher_id OR :teacher_id IS NULL
"""

EVALUATIONS_TEACHER_QUERY = """
SELECT ef.id_eval_participant,
       ef.enseignant_id,
       ef.formation_id,
       ef.note,
       ef.satisfaisant
FROM evaluation_formateur ef
WHERE ef.enseignant_id = :teacher_id OR :teacher_id IS NULL
"""

EVALUATIONS_GLOBALES_QUERY = """
SELECT eg.id_eval_globale,
       eg.formation_id,
       eg.note_globale,
       eg.date_evaluation
FROM evaluation_globale eg
"""

CERTIFICATS_TEACHER_QUERY = """
SELECT c.id_certificate,
       c.enseignant_id,
       c.formation_id,
       c.titre_formation,
       c.delivered
FROM certificates c
WHERE c.enseignant_id = :teacher_id OR :teacher_id IS NULL
"""

BESOIN_DEMAND_QUERY = """
-- Matching bidirectionnel et tokenisé : un besoin matche une compétence si
--   • un mot (>3 chars) du nom de compétence apparaît dans theme/titre, OU
--   • un mot (>3 chars) de theme/titre apparaît dans le nom de compétence.
-- Sans cela, des thèmes comme "Cybersécurité Web OWASP" ne matchent jamais
-- "Sécurité Applicative" en ILIKE substring direct.
SELECT c.id  AS competence_id,
       c.nom AS competence_nom,
       d.nom AS domaine_nom,
       COUNT(*) FILTER (
           WHERE bf.last_refresh_date >= CURRENT_DATE - INTERVAL '3 months'
       ) AS demand_3m,
       COUNT(*) FILTER (
           WHERE bf.last_refresh_date >= CURRENT_DATE - INTERVAL '12 months'
       ) AS demand_12m,
       COUNT(*) AS total_demand
FROM besoin_formation bf
LEFT JOIN competences c ON (
    EXISTS (
        SELECT 1
        FROM regexp_split_to_table(LOWER(c.nom), '[^[:alnum:]]+') AS t(token)
        WHERE LENGTH(t.token) > 3
          AND (LOWER(COALESCE(bf.theme, '')) LIKE '%' || t.token || '%'
            OR LOWER(COALESCE(bf.titre, '')) LIKE '%' || t.token || '%')
    )
    OR EXISTS (
        SELECT 1
        FROM regexp_split_to_table(
            LOWER(COALESCE(bf.theme, '') || ' ' || COALESCE(bf.titre, '')),
            '[^[:alnum:]]+'
        ) AS t(token)
        WHERE LENGTH(t.token) > 3
          AND LOWER(c.nom) LIKE '%' || t.token || '%'
    )
)
LEFT JOIN domaines d ON d.id = c.domaine_id
WHERE bf.approuve_admin = TRUE
GROUP BY c.id, c.nom, d.nom
"""

# Optimized version using pg_trgm similarity for better performance and accuracy.
# Requires: CREATE EXTENSION IF NOT EXISTS pg_trgm; on the database.
# Falls back to BESOIN_DEMAND_QUERY if pg_trgm is not available.
BESOIN_DEMAND_QUERY_PGTRGM = """
SELECT c.id  AS competence_id,
       c.nom AS competence_nom,
       d.nom AS domaine_nom,
       COUNT(*) FILTER (
           WHERE bf.last_refresh_date >= CURRENT_DATE - INTERVAL '3 months'
       ) AS demand_3m,
       COUNT(*) FILTER (
           WHERE bf.last_refresh_date >= CURRENT_DATE - INTERVAL '12 months'
       ) AS demand_12m,
       COUNT(*) AS total_demand
FROM besoin_formation bf
LEFT JOIN competences c
    ON similarity(c.nom, COALESCE(bf.theme, '')) > 0.15
    OR similarity(c.nom, COALESCE(bf.titre, '')) > 0.15
LEFT JOIN domaines d ON d.id = c.domaine_id
WHERE bf.approuve_admin = TRUE
GROUP BY c.id, c.nom, d.nom
"""

ALL_ENSEIGNANTS_QUERY = """
SELECT e.id AS enseignant_id, e.nom, e.prenom, e.mail AS email, e.dept_id AS departement_id
FROM enseignants e
"""


class DataService:
    """Service d'accès aux données en lecture sur la base D2F partagée."""

    DEFAULT_PAGE_SIZE = 500

    def __init__(self, db: Session):
        self.db = db

    def get_teacher_profile(self, teacher_id: str | None = None) -> list[dict[str, Any]]:
        return execute_query(self.db, TEACHER_PROFILE_QUERY, {"teacher_id": teacher_id})

    def get_competency_levels(self, teacher_id: str | None = None) -> list[dict[str, Any]]:
        return execute_query(self.db, COMPETENCY_LEVELS_QUERY, {"teacher_id": teacher_id})

    def get_required_levels(self, page: int = 0, size: int = 0) -> list[dict[str, Any]]:
        query = REQUIRED_LEVELS_QUERY
        params: dict[str, Any] = {}
        if size > 0:
            query += " LIMIT :limit OFFSET :offset"
            params["limit"] = size
            params["offset"] = page * size
        return execute_query(self.db, query, params)

    def get_prerequisite_graph(self) -> list[dict[str, Any]]:
        return execute_query(self.db, PREREQUISITE_GRAPH_QUERY)

    def get_formation_competencies(self, page: int = 0, size: int = 0) -> list[dict[str, Any]]:
        query = FORMATION_COMPETENCIES_QUERY
        params: dict[str, Any] = {}
        if size > 0:
            query += " LIMIT :limit OFFSET :offset"
            params["limit"] = size
            params["offset"] = page * size
        return execute_query(self.db, query, params)

    def get_all_formations(self, page: int = 0, size: int = 0) -> list[dict[str, Any]]:
        query = FORMATIONS_ALL_QUERY
        params: dict[str, Any] = {}
        if size > 0:
            query += " LIMIT :limit OFFSET :offset"
            params["limit"] = size
            params["offset"] = page * size
        return execute_query(self.db, query, params)

    def get_inscriptions(self, teacher_id: str | None = None) -> list[dict[str, Any]]:
        return execute_query(self.db, INSCRIPTIONS_TEACHER_QUERY, {"teacher_id": teacher_id})

    def get_presences(self, teacher_id: str | None = None) -> list[dict[str, Any]]:
        return execute_query(self.db, PRESENCES_TEACHER_QUERY, {"teacher_id": teacher_id})

    def get_besoins(self, teacher_id: str | None = None) -> list[dict[str, Any]]:
        return execute_query(self.db, BESOINS_TEACHER_QUERY, {"teacher_id": teacher_id})

    def get_evaluations(self, teacher_id: str | None = None) -> list[dict[str, Any]]:
        return execute_query(self.db, EVALUATIONS_TEACHER_QUERY, {"teacher_id": teacher_id})

    def get_evaluations_globales(self, page: int = 0, size: int = 0) -> list[dict[str, Any]]:
        query = EVALUATIONS_GLOBALES_QUERY
        params: dict[str, Any] = {}
        if size > 0:
            query += " LIMIT :limit OFFSET :offset"
            params["limit"] = size
            params["offset"] = page * size
        return execute_query(self.db, query, params)

    def get_certificats(self, teacher_id: str | None = None) -> list[dict[str, Any]]:
        return execute_query(self.db, CERTIFICATS_TEACHER_QUERY, {"teacher_id": teacher_id})

    def get_besoin_demand(self, use_pgtrgm: bool = True) -> list[dict[str, Any]]:
        """Get besoin demand data, with optional pg_trgm optimization.

        Tries pg_trgm similarity first (better performance + accuracy).
        Falls back to ILIKE if pg_trgm extension is not available.
        """
        if use_pgtrgm:
            try:
                return execute_query(self.db, BESOIN_DEMAND_QUERY_PGTRGM)
            except Exception:
                logger.info("pg_trgm not available, falling back to ILIKE query")
        return execute_query(self.db, BESOIN_DEMAND_QUERY)

    def get_all_enseignants(self) -> list[dict[str, Any]]:
        return execute_query(self.db, ALL_ENSEIGNANTS_QUERY)
