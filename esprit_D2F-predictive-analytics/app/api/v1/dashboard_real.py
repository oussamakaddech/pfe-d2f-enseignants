"""Endpoint dashboard impact reel : lit la DB (pas le CSV legacy).

Retourne :
  - kpis reels (enseignants, coverage, gaps, alertes NG)
  - heatmap par departement (gaps persistes par competence)
  - top enseignants a risque (join risk_snapshots + skill_gaps)
  - top formations recommandees (analyse.recommendations joint aux formations)
"""
from typing import Annotated

from fastapi import APIRouter, Depends
from sqlalchemy import text

from app.api.deps import ContainerDependency, resolve_user_teacher
from app.core.envelope import ok
from app.core.security import CurrentUser, require_roles

router = APIRouter(prefix="/dashboard/real", tags=["dashboard-real"])

DECISION_ROLES = ("ADMIN", "CUP", "CHEF_DEPARTEMENT")

KPIS_SQL = """
SELECT
  (SELECT COUNT(*) FROM formation.enseignants WHERE deleted_at IS NULL) AS nb_enseignants,
  (SELECT COUNT(DISTINCT sg.enseignant_id) FROM "analyse".skill_gaps sg
     JOIN formation.enseignants e ON e.id = sg.enseignant_id AND e.deleted_at IS NULL) AS nb_enseignants_avec_gaps,
  (SELECT COUNT(DISTINCT ec.enseignant_id) FROM competence.enseignant_competences ec
     JOIN formation.enseignants e ON e.id = ec.enseignant_id AND e.deleted_at IS NULL) AS nb_enseignants_avec_competences,
  (SELECT COUNT(*) FROM "analyse".skill_gaps sg
     JOIN formation.enseignants e ON e.id = sg.enseignant_id AND e.deleted_at IS NULL
     WHERE UPPER(sg.niveau_urgence) = 'CRITIQUE') AS nb_gaps_critiques,
  (SELECT COUNT(*) FROM "analyse".skill_gaps sg
     JOIN formation.enseignants e ON e.id = sg.enseignant_id AND e.deleted_at IS NULL
     WHERE UPPER(sg.niveau_urgence) = 'HAUTE') AS nb_gaps_haute,
  (SELECT COUNT(*) FROM "analyse".skill_gaps sg
     JOIN formation.enseignants e ON e.id = sg.enseignant_id AND e.deleted_at IS NULL) AS nb_gaps_total,
  (SELECT ROUND(AVG(sg.gap_score)::numeric, 4) FROM "analyse".skill_gaps sg
     JOIN formation.enseignants e ON e.id = sg.enseignant_id AND e.deleted_at IS NULL) AS avg_gap_score,
  (SELECT COUNT(*) FROM "analyse".alert_events WHERE statut IN ('NOUVELLE', 'LUE')) AS nb_alertes_non_traitees,
  (SELECT COUNT(*) FROM "analyse".alert_events WHERE UPPER(severite) IN ('CRITIQUE','CRITICAL') AND statut IN ('NOUVELLE','LUE')) AS nb_alertes_critiques,
  (SELECT ROUND(AVG(score_risque)::numeric, 4)
     FROM (
       SELECT DISTINCT ON (enseignant_id) enseignant_id, score_risque
       FROM "analyse".teacher_risk_snapshots
       ORDER BY enseignant_id, computed_at DESC NULLS LAST, snapshot_date DESC
     ) t) AS avg_risk_score
"""

HEATMAP_SQL = """
SELECT
  e.dept_id,
  d.libelle AS dept_libelle,
  c.id AS competence_id,
  c.code AS competence_code,
  c.nom AS competence_nom,
  ROUND(AVG(sg.gap_score)::numeric, 4) AS avg_gap_score,
  COUNT(*) AS nb_occurrences,
  COUNT(*) FILTER (WHERE UPPER(sg.niveau_urgence) = 'CRITIQUE') AS nb_critiques,
  COUNT(*) FILTER (WHERE UPPER(sg.niveau_urgence) = 'HAUTE') AS nb_haute,
  COUNT(DISTINCT sg.enseignant_id) AS nb_enseignants_touches
FROM "analyse".skill_gaps sg
JOIN formation.enseignants e ON e.id = sg.enseignant_id AND e.deleted_at IS NULL
LEFT JOIN formation.departements d ON d.id = e.dept_id
JOIN competence.competences c ON c.id = sg.competence_id
GROUP BY e.dept_id, d.libelle, c.id, c.code, c.nom
HAVING COUNT(*) > 0
ORDER BY nb_critiques DESC, avg_gap_score DESC
"""

AT_RISK_SQL = """
SELECT
  rs.enseignant_id,
  e.nom,
  e.prenom,
  e.specialite,
  e.grade,
  e.up_id,
  e.dept_id,
  u.libelle AS up_libelle,
  d.libelle AS dept_libelle,
  rs.score_risque,
  rs.niveau_risque,
  rs.tendance,
  rs.snapshot_date,
  COALESCE(sg.nb_gaps, 0) AS nb_gaps_persistes,
  COALESCE(sg.nb_critiques, 0) AS nb_gaps_critiques,
  COALESCE(sg.max_gap, 0) AS max_gap_score
FROM (
  SELECT DISTINCT ON (enseignant_id)
    enseignant_id, score_risque, niveau_risque, tendance, snapshot_date
  FROM "analyse".teacher_risk_snapshots
  ORDER BY enseignant_id, computed_at DESC NULLS LAST, snapshot_date DESC
) rs
JOIN formation.enseignants e ON e.id = rs.enseignant_id AND e.deleted_at IS NULL
LEFT JOIN formation.ups u ON u.id = e.up_id
LEFT JOIN formation.departements d ON d.id = e.dept_id
LEFT JOIN (
  SELECT enseignant_id,
         COUNT(*) AS nb_gaps,
         COUNT(*) FILTER (WHERE UPPER(niveau_urgence) = 'CRITIQUE') AS nb_critiques,
         MAX(gap_score) AS max_gap
  FROM "analyse".skill_gaps
  GROUP BY enseignant_id
) sg ON sg.enseignant_id = rs.enseignant_id
ORDER BY rs.score_risque DESC
LIMIT 50
"""

TOP_FORMATIONS_SQL = """
SELECT
  r.formation_id,
  f.titre_formation,
  r.competence_id,
  c.nom AS competence_nom,
  COUNT(*) AS nb_recommandations,
  COUNT(DISTINCT r.enseignant_id) AS nb_enseignants,
  ROUND(AVG(r.score_global)::numeric, 4) AS score_moyen,
  ROUND(MAX(r.score_global)::numeric, 4) AS score_max,
  (SELECT COUNT(*) FROM "analyse".recommendations r2
   JOIN formation.enseignants e2 ON e2.id = r2.enseignant_id AND e2.deleted_at IS NULL
   WHERE r2.formation_id = r.formation_id AND r2.statut IN ('SUGGESTED', 'PROPOSEE')) AS en_attente
FROM "analyse".recommendations r
JOIN formation.enseignants e ON e.id = r.enseignant_id AND e.deleted_at IS NULL
LEFT JOIN formation.formations f ON f.id_formation = r.formation_id
LEFT JOIN competence.competences c ON c.id = r.competence_id
GROUP BY r.formation_id, f.titre_formation, r.competence_id, c.nom
ORDER BY nb_recommandations DESC, score_moyen DESC
LIMIT 15
"""

COVERAGE_SQL = """
SELECT
  e.dept_id,
  d.libelle AS dept_libelle,
  COUNT(DISTINCT e.id) AS nb_enseignants,
  COUNT(DISTINCT CASE WHEN ec.id IS NOT NULL THEN e.id END) AS nb_enseignants_avec_competences,
  COUNT(ec.id) AS nb_affectations,
  ROUND(AVG(CASE
    WHEN ec.niveau IN ('N5_EXPERT','EXPERT','NIVEAU_5','5') THEN 5
    WHEN ec.niveau IN ('N4_AVANCE','AVANCE','NIVEAU_4','4') THEN 4
    WHEN ec.niveau IN ('N3_INTERMEDIAIRE','CONFIRME','NIVEAU_3','3') THEN 3
    WHEN ec.niveau IN ('N2_ELEMENTAIRE','INITIE','NIVEAU_2','2') THEN 2
    WHEN ec.niveau IN ('N1_DEBUTANT','DEBUTANT','NIVEAU_1','1') THEN 1
    ELSE 0 END)::numeric, 2) AS niveau_moyen
FROM formation.enseignants e
LEFT JOIN formation.departements d ON d.id = e.dept_id
LEFT JOIN competence.enseignant_competences ec ON ec.enseignant_id = e.id
WHERE e.deleted_at IS NULL
  AND (:dept_id IS NULL OR e.dept_id = :dept_id)
GROUP BY e.dept_id, d.libelle
ORDER BY nb_enseignants DESC
"""

# Dept-scoped versions of the queries — use :dept_id parameter
# When dept_id is NULL, no filtering is applied (full access for ADMIN/CUP).
_KPIS_DEPT = "AND (:dept_id IS NULL OR e.dept_id = :dept_id)"

KPIS_SCOPED_SQL = f"""
SELECT
  (SELECT COUNT(*) FROM formation.enseignants e WHERE e.deleted_at IS NULL {_KPIS_DEPT}) AS nb_enseignants,
  (SELECT COUNT(DISTINCT sg.enseignant_id) FROM "analyse".skill_gaps sg
     JOIN formation.enseignants e ON e.id = sg.enseignant_id AND e.deleted_at IS NULL
     {_KPIS_DEPT}) AS nb_enseignants_avec_gaps,
  (SELECT COUNT(DISTINCT ec.enseignant_id) FROM competence.enseignant_competences ec
     JOIN formation.enseignants e ON e.id = ec.enseignant_id AND e.deleted_at IS NULL
     {_KPIS_DEPT}) AS nb_enseignants_avec_competences,
  (SELECT COUNT(*) FROM "analyse".skill_gaps sg
     JOIN formation.enseignants e ON e.id = sg.enseignant_id AND e.deleted_at IS NULL
     WHERE UPPER(sg.niveau_urgence) = 'CRITIQUE' {_KPIS_DEPT.replace('AND', 'AND')}) AS nb_gaps_critiques,
  (SELECT COUNT(*) FROM "analyse".skill_gaps sg
     JOIN formation.enseignants e ON e.id = sg.enseignant_id AND e.deleted_at IS NULL
     WHERE UPPER(sg.niveau_urgence) = 'HAUTE' {_KPIS_DEPT.replace('AND', 'AND')}) AS nb_gaps_haute,
  (SELECT COUNT(*) FROM "analyse".skill_gaps sg
     JOIN formation.enseignants e ON e.id = sg.enseignant_id AND e.deleted_at IS NULL
     {_KPIS_DEPT}) AS nb_gaps_total,
  (SELECT ROUND(AVG(sg.gap_score)::numeric, 4) FROM "analyse".skill_gaps sg
     JOIN formation.enseignants e ON e.id = sg.enseignant_id AND e.deleted_at IS NULL
     {_KPIS_DEPT}) AS avg_gap_score,
  (SELECT COUNT(*) FROM "analyse".alert_events WHERE statut IN ('NOUVELLE', 'LUE')) AS nb_alertes_non_traitees,
  (SELECT COUNT(*) FROM "analyse".alert_events WHERE UPPER(severite) IN ('CRITIQUE','CRITICAL') AND statut IN ('NOUVELLE','LUE')) AS nb_alertes_critiques,
  (SELECT ROUND(AVG(score_risque)::numeric, 4)
     FROM (
       SELECT DISTINCT ON (enseignant_id) enseignant_id, score_risque
       FROM "analyse".teacher_risk_snapshots
       ORDER BY enseignant_id, computed_at DESC NULLS LAST, snapshot_date DESC
     ) t) AS avg_risk_score
"""

HEATMAP_SCOPED_SQL = """
SELECT
  e.dept_id,
  d.libelle AS dept_libelle,
  c.id AS competence_id,
  c.code AS competence_code,
  c.nom AS competence_nom,
  ROUND(AVG(sg.gap_score)::numeric, 4) AS avg_gap_score,
  COUNT(*) AS nb_occurrences,
  COUNT(*) FILTER (WHERE UPPER(sg.niveau_urgence) = 'CRITIQUE') AS nb_critiques,
  COUNT(*) FILTER (WHERE UPPER(sg.niveau_urgence) = 'HAUTE') AS nb_haute,
  COUNT(DISTINCT sg.enseignant_id) AS nb_enseignants_touches
FROM "analyse".skill_gaps sg
JOIN formation.enseignants e ON e.id = sg.enseignant_id AND e.deleted_at IS NULL
LEFT JOIN formation.departements d ON d.id = e.dept_id
JOIN competence.competences c ON c.id = sg.competence_id
WHERE (:dept_id IS NULL OR e.dept_id = :dept_id)
GROUP BY e.dept_id, d.libelle, c.id, c.code, c.nom
HAVING COUNT(*) > 0
ORDER BY nb_critiques DESC, avg_gap_score DESC
"""

AT_RISK_SCOPED_SQL = """
SELECT
  rs.enseignant_id,
  e.nom,
  e.prenom,
  e.specialite,
  e.grade,
  e.up_id,
  e.dept_id,
  u.libelle AS up_libelle,
  d.libelle AS dept_libelle,
  rs.score_risque,
  rs.niveau_risque,
  rs.tendance,
  rs.snapshot_date,
  COALESCE(sg.nb_gaps, 0) AS nb_gaps_persistes,
  COALESCE(sg.nb_critiques, 0) AS nb_gaps_critiques,
  COALESCE(sg.max_gap, 0) AS max_gap_score
FROM (
  SELECT DISTINCT ON (enseignant_id)
    enseignant_id, score_risque, niveau_risque, tendance, snapshot_date
  FROM "analyse".teacher_risk_snapshots
  ORDER BY enseignant_id, computed_at DESC NULLS LAST, snapshot_date DESC
) rs
JOIN formation.enseignants e ON e.id = rs.enseignant_id AND e.deleted_at IS NULL
LEFT JOIN formation.ups u ON u.id = e.up_id
LEFT JOIN formation.departements d ON d.id = e.dept_id
LEFT JOIN (
  SELECT enseignant_id,
         COUNT(*) AS nb_gaps,
         COUNT(*) FILTER (WHERE UPPER(niveau_urgence) = 'CRITIQUE') AS nb_critiques,
         MAX(gap_score) AS max_gap
  FROM "analyse".skill_gaps
  GROUP BY enseignant_id
) sg ON sg.enseignant_id = rs.enseignant_id
WHERE (:dept_id IS NULL OR e.dept_id = :dept_id)
ORDER BY rs.score_risque DESC
LIMIT 50
"""

TOP_FORMATIONS_SCOPED_SQL = """
SELECT
  r.formation_id,
  f.titre_formation,
  r.competence_id,
  c.nom AS competence_nom,
  COUNT(*) AS nb_recommandations,
  COUNT(DISTINCT r.enseignant_id) AS nb_enseignants,
  ROUND(AVG(r.score_global)::numeric, 4) AS score_moyen,
  ROUND(MAX(r.score_global)::numeric, 4) AS score_max,
  (SELECT COUNT(*) FROM "analyse".recommendations r2
   JOIN formation.enseignants e2 ON e2.id = r2.enseignant_id AND e2.deleted_at IS NULL
   WHERE r2.formation_id = r.formation_id AND r2.statut IN ('SUGGESTED', 'PROPOSEE')) AS en_attente
FROM "analyse".recommendations r
JOIN formation.enseignants e ON e.id = r.enseignant_id AND e.deleted_at IS NULL
LEFT JOIN formation.formations f ON f.id_formation = r.formation_id
LEFT JOIN competence.competences c ON c.id = r.competence_id
WHERE (:dept_id IS NULL OR e.dept_id = :dept_id)
GROUP BY r.formation_id, f.titre_formation, r.competence_id, c.nom
ORDER BY nb_recommandations DESC, score_moyen DESC
LIMIT 15
"""


def _resolve_dept_filter(user: CurrentUser, container: ContainerDependency) -> tuple[str, dict]:
    """Return (SQL fragment, params) for department scoping.

    CHEF_DEPARTEMENT sees only teachers from their own department.
    ADMIN / CUP see all departments (empty filter).
    """
    if user.is_chef_departement and not user.is_admin and not user.is_cup:
        teacher = resolve_user_teacher(container, user)
        if teacher and teacher.dept_id:
            return "AND e.dept_id = :dept_id", {"dept_id": teacher.dept_id}
    return "", {}


@router.get("/impact")
def get_real_dashboard_impact(
    container: ContainerDependency,
    user: Annotated[CurrentUser, Depends(require_roles(*DECISION_ROLES))],
):
    _, dept_params = _resolve_dept_filter(user, container)
    # dept_id=None when no scoping needed → (:dept_id IS NULL OR ...) is always true
    dept_id = dept_params.get("dept_id")

    db = container.database
    with db.read_connection() as conn:
        kpis_row = conn.execute(text(KPIS_SCOPED_SQL), {"dept_id": dept_id}).mappings().first()
        heatmap_rows = conn.execute(text(HEATMAP_SCOPED_SQL), {"dept_id": dept_id}).mappings().all()
        at_risk_rows = conn.execute(text(AT_RISK_SCOPED_SQL), {"dept_id": dept_id}).mappings().all()
        top_formations = conn.execute(text(TOP_FORMATIONS_SCOPED_SQL), {"dept_id": dept_id}).mappings().all()
        coverage_rows = conn.execute(text(COVERAGE_SQL), {"dept_id": dept_id}).mappings().all()

    kpis = dict(kpis_row) if kpis_row else {}
    # Normalisation legere
    kpis["nb_enseignants"] = int(kpis.get("nb_enseignants") or 0)
    kpis["taux_couverture_pct"] = round(
        100.0 * kpis.get("nb_enseignants_avec_competences", 0) / max(1, kpis["nb_enseignants"]), 1
    )
    kpis["model"] = container.model_port.status()

    return ok({
        "kpis": kpis,
        "heatmap": [dict(r) for r in heatmap_rows],
        "at_risk_teachers": [dict(r) for r in at_risk_rows],
        "top_formations": [dict(r) for r in top_formations],
        "coverage_by_dept": [dict(r) for r in coverage_rows],
        "data_source": "database",
        "note": "Donnees reelles issues des schemas formation/competence/analyse",
    })
