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

TEACHER_PROFILE_QUERY = """
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

# Taux de complétion réel par formation (inscriptions APPROVED / total).
FORMATION_COMPLETION_QUERY = """
SELECT i.formation_id,
       f.titre_formation,
       COUNT(*)                                       AS nb_inscriptions,
       COUNT(*) FILTER (WHERE i.etat = 'APPROVED')    AS nb_completed
FROM inscriptions i
JOIN formations f ON f.id_formation = i.formation_id
GROUP BY i.formation_id, f.titre_formation
HAVING COUNT(*) > 0
"""


# ── Reporting descriptif (features 1-4) ──────────────────────
# Toutes ces requêtes sont 100 % paramétrées (aucune valeur utilisateur
# concaténée). La granularité temporelle est passée comme argument texte à
# date_trunc(), qui l'accepte nativement — pas de concaténation SQL.

# Feature 1 — Enseignants sans formation depuis > N mois.
# « Dernière formation » = dernière inscription APPROVED (présence réelle à une
# séance prise en compte via la jointure presences pour ne pas rater les
# participations sans inscription formelle).
ENSEIGNANTS_SANS_FORMATION_QUERY = """
WITH derniere_participation AS (
    SELECT enseignant_id, MAX(dt) AS derniere_date
    FROM (
        SELECT i.enseignant_id, i.date_demande AS dt
        FROM inscriptions i
        WHERE i.etat = 'APPROVED'
        UNION ALL
        SELECT p.enseignant_id, f.date_fin AS dt
        FROM presences p
        JOIN seances sf ON sf.id_seance = p.seance_id
        JOIN formations f ON f.id_formation = sf.formation_id
        WHERE p.presence = TRUE AND f.date_fin IS NOT NULL
    ) parts
    GROUP BY enseignant_id
)
SELECT e.id        AS enseignant_id,
       e.nom,
       e.prenom,
       e.mail       AS email,
       e.dept_id    AS departement_id,
       d.libelle    AS departement_nom,
       e.up_id,
       u.libelle    AS up_nom,
       dp.derniere_date AS derniere_formation_date,
       CASE WHEN dp.derniere_date IS NULL THEN NULL
            ELSE (EXTRACT(YEAR  FROM AGE(CURRENT_DATE, dp.derniere_date)) * 12
                + EXTRACT(MONTH FROM AGE(CURRENT_DATE, dp.derniere_date)))::INT
       END AS nombre_mois_depuis_derniere_formation
FROM enseignants e
LEFT JOIN derniere_participation dp ON dp.enseignant_id = e.id
LEFT JOIN departements d ON d.id = e.dept_id
LEFT JOIN ups          u ON u.id = e.up_id
WHERE (dp.derniere_date IS NULL
       OR dp.derniere_date < (CURRENT_DATE - make_interval(months => :mois)))
  AND (:departement IS NULL OR e.dept_id = :departement)
  AND (:up IS NULL OR e.up_id = :up)
"""

# Feature 2 — Formations par période (granularité variable).
FORMATIONS_PAR_PERIODE_QUERY = """
WITH fwin AS (
    SELECT f.id_formation,
           date_trunc(:granul, f.date_debut) AS bucket
    FROM formations f
    WHERE f.etat_formation <> 'ANNULE'
      AND f.date_debut IS NOT NULL
      AND f.date_debut >= :debut
      AND f.date_debut <= :fin
      AND (:departement IS NULL OR f.departement_id = :departement)
      AND (:up IS NULL OR f.up_id = :up)
),
ins AS (
    SELECT i.formation_id,
           COUNT(*)                                     AS total,
           COUNT(*) FILTER (WHERE i.etat = 'APPROVED')  AS approved
    FROM inscriptions i
    GROUP BY i.formation_id
)
SELECT to_char(fwin.bucket, 'YYYY-MM-DD')        AS period_start,
       COUNT(DISTINCT fwin.id_formation)         AS nb_formations,
       COALESCE(SUM(ins.approved), 0)            AS nb_participants,
       COALESCE(SUM(ins.total), 0)               AS total_inscriptions
FROM fwin
LEFT JOIN ins ON ins.formation_id = fwin.id_formation
GROUP BY fwin.bucket
ORDER BY fwin.bucket
"""

# Feature 3 — Agrégats par UP.
FORMATIONS_PAR_UP_QUERY = """
SELECT u.id       AS up_id,
       u.libelle  AS up_nom,
       (SELECT d.libelle
          FROM formations f2
          JOIN departements d ON d.id = f2.departement_id
         WHERE f2.up_id = u.id
         GROUP BY d.libelle
         ORDER BY COUNT(*) DESC
         LIMIT 1)                                       AS departement_nom,
       (SELECT COUNT(*) FROM enseignants e WHERE e.up_id = u.id) AS nombre_enseignants,
       COUNT(DISTINCT f.id_formation)                   AS nombre_formations_organisees,
       COUNT(i.id) FILTER (WHERE i.etat = 'APPROVED')   AS nombre_participations
FROM ups u
LEFT JOIN formations f
       ON f.up_id = u.id
      AND f.etat_formation <> 'ANNULE'
      AND (:annee IS NULL OR EXTRACT(YEAR FROM f.date_debut) = :annee)
LEFT JOIN inscriptions i ON i.formation_id = f.id_formation
WHERE (:departement IS NULL
       OR EXISTS (SELECT 1 FROM enseignants e WHERE e.up_id = u.id AND e.dept_id = :departement))
GROUP BY u.id, u.libelle
ORDER BY u.libelle
"""

# Feature 3/4 — Top compétences demandées par UP (via formation_competences).
TOP_COMPETENCES_PAR_UP_QUERY = """
SELECT f.up_id,
       fc.competence_id,
       COALESCE(c.nom, fc.competence_nom) AS competence_nom,
       COUNT(*) AS nb
FROM formation_competences fc
JOIN formations f ON f.id_formation = fc.formation_id
LEFT JOIN competences c ON c.id = fc.competence_id
WHERE f.etat_formation <> 'ANNULE'
  AND f.up_id IS NOT NULL
  AND (:annee IS NULL OR EXTRACT(YEAR FROM f.date_debut) = :annee)
GROUP BY f.up_id, fc.competence_id, COALESCE(c.nom, fc.competence_nom)
ORDER BY f.up_id, nb DESC
"""

# Feature 4 — Agrégats par département (même structure, niveau dept).
FORMATIONS_PAR_DEPARTEMENT_QUERY = """
SELECT d.id       AS departement_id,
       d.libelle  AS departement_nom,
       (SELECT COUNT(*) FROM enseignants e WHERE e.dept_id = d.id) AS nombre_enseignants,
       COUNT(DISTINCT f.id_formation)                   AS nombre_formations_organisees,
       COUNT(i.id) FILTER (WHERE i.etat = 'APPROVED')   AS nombre_participations
FROM departements d
LEFT JOIN formations f
       ON f.departement_id = d.id
      AND f.etat_formation <> 'ANNULE'
      AND (:annee IS NULL OR EXTRACT(YEAR FROM f.date_debut) = :annee)
LEFT JOIN inscriptions i ON i.formation_id = f.id_formation
GROUP BY d.id, d.libelle
ORDER BY d.libelle
"""

# Clause de pagination réutilisée par les méthodes paginées du DataService.
# Définie au niveau module : les méthodes la référencent par nom nu
# (`query += _LIMIT_OFFSET_CLAUSE`), ce qui exige une portée module, pas un
# attribut de classe (sinon NameError au runtime).
_LIMIT_OFFSET_CLAUSE = " LIMIT :limit OFFSET :offset"


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
            query += _LIMIT_OFFSET_CLAUSE
            params["limit"] = size
            params["offset"] = page * size
        return execute_query(self.db, query, params)

    def get_prerequisite_graph(self) -> list[dict[str, Any]]:
        return execute_query(self.db, PREREQUISITE_GRAPH_QUERY)

    def get_formation_competencies(self, page: int = 0, size: int = 0) -> list[dict[str, Any]]:
        query = FORMATION_COMPETENCIES_QUERY
        params: dict[str, Any] = {}
        if size > 0:
            query += _LIMIT_OFFSET_CLAUSE
            params["limit"] = size
            params["offset"] = page * size
        return execute_query(self.db, query, params)

    def get_all_formations(self, page: int = 0, size: int = 0) -> list[dict[str, Any]]:
        query = FORMATIONS_ALL_QUERY
        params: dict[str, Any] = {}
        if size > 0:
            query += _LIMIT_OFFSET_CLAUSE
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
            query += _LIMIT_OFFSET_CLAUSE
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

    def get_formation_completion(self) -> list[dict[str, Any]]:
        """Taux de complétion réel par formation (pour l'efficacité formation)."""
        return execute_query(self.db, FORMATION_COMPLETION_QUERY)

    # ── Reporting descriptif (features 1-4) ──────────────────

    def get_enseignant_scope(self, user_id: str | None) -> dict[str, Any] | None:
        """UP/département d'un utilisateur (scoping RBAC du CUP). None si introuvable."""
        if not user_id:
            return None
        rows = execute_query(
            self.db,
            "SELECT up_id, dept_id AS departement_id FROM enseignants "
            "WHERE id = :uid OR mail = :uid LIMIT 1",
            {"uid": user_id},
        )
        return rows[0] if rows else None

    def get_enseignants_sans_formation(
        self,
        mois: int,
        departement: str | None = None,
        up: str | None = None,
        page: int = 0,
        size: int = 20,
    ) -> list[dict[str, Any]]:
        """Enseignants sans formation depuis > `mois` mois, triés du plus à risque."""
        query = (
            ENSEIGNANTS_SANS_FORMATION_QUERY
            + " ORDER BY nombre_mois_depuis_derniere_formation DESC NULLS FIRST, e.nom"
            + _LIMIT_OFFSET_CLAUSE
        )
        return execute_query(self.db, query, {
            "mois": mois, "departement": departement, "up": up,
            "limit": size, "offset": page * size,
        })

    def count_enseignants_sans_formation(
        self, mois: int, departement: str | None = None, up: str | None = None,
    ) -> int:
        """Total (pour la pagination) sans charger toutes les lignes."""
        wrapped = f"SELECT COUNT(*) AS total FROM ({ENSEIGNANTS_SANS_FORMATION_QUERY}) sub"
        rows = execute_query(self.db, wrapped, {"mois": mois, "departement": departement, "up": up})
        return int(rows[0]["total"]) if rows else 0

    def get_formations_par_periode(
        self,
        granul: str,
        debut: str,
        fin: str,
        departement: str | None = None,
        up: str | None = None,
    ) -> list[dict[str, Any]]:
        """Comptage formations/participants par bucket temporel (granul validé en amont)."""
        return execute_query(self.db, FORMATIONS_PAR_PERIODE_QUERY, {
            "granul": granul, "debut": debut, "fin": fin,
            "departement": departement, "up": up,
        })

    def get_formations_par_up(
        self, annee: int | None = None, departement: str | None = None,
    ) -> list[dict[str, Any]]:
        return execute_query(self.db, FORMATIONS_PAR_UP_QUERY, {
            "annee": annee, "departement": departement,
        })

    def get_top_competences_par_up(self, annee: int | None = None) -> list[dict[str, Any]]:
        return execute_query(self.db, TOP_COMPETENCES_PAR_UP_QUERY, {"annee": annee})

    def get_formations_par_departement(self, annee: int | None = None) -> list[dict[str, Any]]:
        return execute_query(self.db, FORMATIONS_PAR_DEPARTEMENT_QUERY, {"annee": annee})
