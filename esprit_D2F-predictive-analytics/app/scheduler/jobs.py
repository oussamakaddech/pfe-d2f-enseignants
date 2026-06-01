"""Tâches planifiées APScheduler — analyse batch nocturne et dashboard."""

import logging
import time

from apscheduler.schedulers.background import BackgroundScheduler
from apscheduler.triggers.cron import CronTrigger

from app.core.db import db_session
from app.engines.alert_engine import AlertEngine
from app.engines.dashboard_engine import DashboardEngine
from app.engines.feature_engine import FeatureEngine
from app.engines.gap_engine import GapEngine
from app.engines.recommendation_engine import RecommendationEngine
from app.models.db_models import AlertEvent, SkillGap
from app.routers.analytics import _upsert_risk_profile
from app.services.data_service import DataService
from app.services.analysis_collection_service import collect_analysis_data

logger = logging.getLogger(__name__)

_scheduler: BackgroundScheduler | None = None


def _analyse_un_enseignant(enseignant_id: str) -> bool:
    """Analyse complète pour un enseignant. Retourne True si succès."""
    try:
        with db_session() as db:
            svc = DataService(db)

            profiles = svc.get_teacher_profile(enseignant_id)
            if not profiles:
                return False
            profile = profiles[0]

            # Use centralized data collection service
            data = collect_analysis_data(svc, enseignant_id)

            feat_eng = FeatureEngine(db)
            snapshot = feat_eng.build_snapshot(
                enseignant_id, data["comp_levels"], profile, data["besoins"], data["certificats"]
            )

            gap_eng = GapEngine(db)
            gaps = gap_eng.compute_gaps(
                enseignant_id, data["comp_levels"], data["req_levels"],
                data["besoins"], None, data["dom_demand"]
            )

            if gaps:
                reco_eng = RecommendationEngine(db)
                all_evals = data["evaluations"] + data["eval_glob"]
                reco_eng.generate(
                    enseignant_id, gaps, data["formations"], data["form_comps"],
                    data["inscriptions"], all_evals, data["prereqs"],
                    float(snapshot.taux_completion_formations),
                    float(snapshot.taux_presence_moyen),
                )

                alert_eng = AlertEngine(db)
                dept_id = str(profile.get("departement_id") or "")
                alert_eng.detect_and_save(enseignant_id, gaps, profile, data["besoins"], dept_id)

                _upsert_risk_profile(db, enseignant_id, gaps, snapshot)

            db.commit()
            return True

    except Exception as exc:
        logger.error("Batch analysis failed for %s: %s", enseignant_id, exc)
        return False


def job_batch_analysis_all():
    """Job principal : analyse tous les enseignants actifs (02h00 chaque nuit).

    Uses ThreadPoolExecutor for parallel processing of teachers.
    """
    from concurrent.futures import ThreadPoolExecutor, as_completed

    logger.info("=== Démarrage analyse batch nocturne ===")
    t_start = time.time()

    try:
        with db_session() as db:
            svc = DataService(db)
            all_ens = svc.get_all_enseignants()

        enseignant_ids = [
            ens.get("enseignant_id") for ens in all_ens if ens.get("enseignant_id")
        ]

        nb_ok  = 0
        nb_err = 0

        # Process teachers in parallel (max 4 workers to avoid DB overload)
        max_workers = min(4, len(enseignant_ids)) if enseignant_ids else 1
        with ThreadPoolExecutor(max_workers=max_workers) as executor:
            futures = {
                executor.submit(_analyse_un_enseignant, eid): eid
                for eid in enseignant_ids
            }
            for future in as_completed(futures):
                eid = futures[future]
                try:
                    ok = future.result()
                    if ok:
                        nb_ok += 1
                    else:
                        nb_err += 1
                except Exception as exc:
                    logger.error("Batch analysis failed for %s: %s", eid, exc)
                    nb_err += 1

        duree = round(time.time() - t_start, 1)
        logger.info(
            "=== Batch terminé : %d OK / %d erreurs en %ss (%d workers) ===",
            nb_ok, nb_err, duree, max_workers
        )

    except Exception as exc:
        logger.error("Batch analysis job crashed: %s", exc)


def job_dashboard_refresh():
    """Rafraîchit le cache dashboard (03h00 chaque nuit)."""
    logger.info("Dashboard refresh démarré")
    try:
        with db_session() as db:
            engine = DashboardEngine(db)
            kpis   = engine.compute_all()
            db.commit()
        logger.info("Dashboard refresh terminé — %d KPI sections", len(kpis))
    except Exception as exc:
        logger.error("Dashboard refresh failed: %s", exc)


def job_alert_cleanup():
    """Archive les alertes traitées/ignorées de plus de 90 jours (dim. 04h00)."""
    from datetime import datetime, timedelta, timezone
    logger.info("Alert cleanup démarré")
    try:
        cutoff = datetime.now(timezone.utc) - timedelta(days=90)
        with db_session() as db:
            nb = (
                db.query(AlertEvent)
                .filter(
                    AlertEvent.statut.in_(["TRAITEE", "IGNOREE"]),
                    AlertEvent.updated_at < cutoff,
                )
                .delete(synchronize_session=False)
            )
            db.commit()
        logger.info("Alert cleanup : %d alertes archivées", nb)
    except Exception as exc:
        logger.error("Alert cleanup failed: %s", exc)


def start_scheduler():
    """Démarre le scheduler APScheduler en arrière-plan."""
    global _scheduler
    if _scheduler and _scheduler.running:
        return

    _scheduler = BackgroundScheduler(timezone="Africa/Tunis")

    # Analyse batch : chaque nuit à 02h00
    _scheduler.add_job(
        job_batch_analysis_all,
        CronTrigger(hour=2, minute=0),
        id="batch_analysis",
        name="Analyse batch nocturne",
        replace_existing=True,
        max_instances=1,
        misfire_grace_time=3600,
    )

    # Dashboard refresh : chaque nuit à 03h00
    _scheduler.add_job(
        job_dashboard_refresh,
        CronTrigger(hour=3, minute=0),
        id="dashboard_refresh",
        name="Refresh dashboard KPIs",
        replace_existing=True,
        max_instances=1,
    )

    # Nettoyage alertes : dimanche à 04h00
    _scheduler.add_job(
        job_alert_cleanup,
        CronTrigger(day_of_week="sun", hour=4, minute=0),
        id="alert_cleanup",
        name="Nettoyage alertes",
        replace_existing=True,
    )

    _scheduler.start()
    logger.info("Scheduler démarré : %d jobs enregistrés", len(_scheduler.get_jobs()))


def stop_scheduler():
    global _scheduler
    if _scheduler and _scheduler.running:
        logger.info("Scheduler : arrêt en cours (attente fin des jobs en cours)...")
        _scheduler.shutdown(wait=True)
        logger.info("Scheduler arrêté proprement")
