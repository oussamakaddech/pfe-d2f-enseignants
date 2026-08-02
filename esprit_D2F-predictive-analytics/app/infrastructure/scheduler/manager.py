from typing import Any

from app.core.logging import get_logger

logger = get_logger("scheduler")


class SchedulerManager:
    def __init__(self, container: Any) -> None:
        self._container = container
        self._scheduler = None

    def start(self) -> None:
        settings = self._container.settings
        if not settings.scheduler_enabled:
            logger.info("scheduler desactive (SCHEDULER_ENABLED=false)")
            return

        from apscheduler.schedulers.background import BackgroundScheduler
        from apscheduler.triggers.interval import IntervalTrigger

        from app.infrastructure.scheduler import jobs

        self._scheduler = BackgroundScheduler(timezone="UTC")
        self._scheduler.add_job(
            jobs.lancer_batch,
            IntervalTrigger(minutes=settings.scheduler_batch_interval_minutes),
            args=[self._container],
            id="batch_analyse",
            replace_existing=True,
            max_instances=1,
        )
        self._scheduler.add_job(
            jobs.calculer_toutes_alertes,
            IntervalTrigger(minutes=settings.scheduler_alerts_interval_minutes),
            args=[self._container],
            id="calcul_alertes",
            replace_existing=True,
            max_instances=1,
        )
        self._scheduler.add_job(
            jobs.detecter_besoins,
            IntervalTrigger(minutes=settings.scheduler_needs_interval_minutes),
            args=[self._container],
            id="detection_besoins",
            replace_existing=True,
            max_instances=1,
        )
        self._scheduler.start()
        logger.info("scheduler demarre")

    def stop(self) -> None:
        if self._scheduler is not None:
            self._scheduler.shutdown(wait=False)
            self._scheduler = None
