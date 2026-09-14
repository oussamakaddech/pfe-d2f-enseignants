from typing import Any

from sqlalchemy import text

from app.core.logging import get_logger

logger = get_logger("scheduler_jobs")


def lancer_batch(container: Any) -> dict:
    """Analyse tous les enseignants : gaps + risque (persistés) + snapshot niveaux."""
    teacher_ids = [teacher.id for teacher in container.teacher_source.list_teachers()]
    analysed = 0
    for teacher_id in teacher_ids:
        try:
            container.compute_gaps.execute(teacher_id)
            container.compute_risk.execute(teacher_id)
            analysed += 1
        except Exception as exc:
            logger.warning("enseignant en erreur dans le batch", teacher_id=teacher_id, error=str(exc))
    # Historisation mensuelle des niveaux (limite 7.6.2) : idempotente par
    # date (UNIQUE teacher_id, savoir_id, snapshot_date) — chaque exécution
    # du scheduler nocturne remplit/maintient le snapshot du jour.
    historiser_niveaux(container)
    logger.info("batch analyse termine", teachers=analysed, total=len(teacher_ids))
    return {"status": "ok", "analysed": analysed, "total": len(teacher_ids)}


def historiser_niveaux(container: Any) -> dict:
    """Snapshot mensuel des niveaux par (enseignant, savoir) — limite 7.6.2.

    Alimente ``analyse.niveau_snapshot`` depuis les vraies saisies de
    ``competence.enseignant_competences``. Ce flux historisé nourrira le futur
    corpus d'entraînement SANS extrapolation (paires niveau_t / niveau_t+3m
    réelles). Aucune donnée n'est imputée ni générée : seules les lignes
    réellement saisies en base sont snapshottées.
    """
    insert_sql = text("""
        INSERT INTO "analyse".niveau_snapshot (teacher_id, savoir_id, niveau, snapshot_date)
        SELECT ec.enseignant_id, ec.savoir_id,
               CASE ec.niveau
                   WHEN 'N1_DEBUTANT' THEN 1 WHEN 'N2_ELEMENTAIRE' THEN 2
                   WHEN 'N3_INTERMEDIAIRE' THEN 3 WHEN 'N4_AVANCE' THEN 4
                   WHEN 'N5_EXPERT' THEN 5
                   WHEN 'DEBUTANT' THEN 1 WHEN 'INITIE' THEN 2
                   WHEN 'CONFIRME' THEN 3 WHEN 'AVANCE' THEN 4 WHEN 'EXPERT' THEN 5
                   ELSE 0
               END,
               CURRENT_DATE
        FROM competence.enseignant_competences ec
        WHERE ec.date_acquisition IS NOT NULL
        ON CONFLICT (teacher_id, savoir_id, snapshot_date) DO NOTHING
    """)
    try:
        with container.database.session() as session:
            result = session.execute(insert_sql)
            inserted = int(result.rowcount or 0)
        logger.info("snapshot niveaux mensuel termine", lignes=inserted)
        return {"status": "ok", "snapshot_rows": inserted}
    except Exception as exc:
        # La table peut être absente si init_db n'est pas encore passé :
        # loggé, sans casser le reste du batch.
        logger.warning("snapshot niveaux impossible (table absente ?)", error=str(exc))
        return {"status": "skipped", "reason": str(exc)}


def calculer_toutes_alertes(container: Any) -> dict:
    """Re-génère et persiste les alertes pour l'ensemble des enseignants."""
    saved = container.generate_alerts.persist_all()
    logger.info("calcul alertes termine", count=len(saved))
    return {"status": "ok", "alerts": len(saved)}


def detecter_besoins(container: Any) -> dict:
    """Détecte les besoins de formation (individuels + collectifs) et les persiste."""
    result = container.detect_needs.execute()
    container.detect_needs.persist(result)
    logger.info("detection besoins terminee", total=result.total)
    return {"status": "ok", "needs": result.total}


def construire_dashboards(container: Any) -> dict:
    """Construit et persiste les snapshots dashboards (GLOBAL puis par département)."""
    kpis = container.build_dashboards.execute(scope="GLOBAL")
    depts = {teacher.dept_id for teacher in container.teacher_source.list_teachers() if teacher.dept_id}
    for dept_id in depts:
        container.build_dashboards.execute(scope="DEPARTEMENT", scope_id=dept_id)
    logger.info("dashboards construits", global_snapshot=str(kpis.get("snapshot_date")))
    return {"status": "ok", "departements": len(depts)}
