from typing import Any

from app.core.logging import get_logger

logger = get_logger("scheduler_jobs")


def lancer_batch(container: Any) -> dict:
    """Analyse tous les enseignants : gaps + risque (persistés)."""
    teacher_ids = [teacher.id for teacher in container.teacher_source.list_teachers()]
    analysed = 0
    for teacher_id in teacher_ids:
        try:
            container.compute_gaps.execute(teacher_id)
            container.compute_risk.execute(teacher_id)
            analysed += 1
        except Exception as exc:
            logger.warning("enseignant en erreur dans le batch", teacher_id=teacher_id, error=str(exc))
    logger.info("batch analyse termine", teachers=analysed, total=len(teacher_ids))
    return {"status": "ok", "analysed": analysed, "total": len(teacher_ids)}


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
