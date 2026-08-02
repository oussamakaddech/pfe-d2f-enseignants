from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.api.error_handlers import register_error_handlers
from app.api.v1.router import router as v1_router
from app.core.config import get_settings
from app.core.logging import get_logger, setup_logging
from app.infrastructure.container import Container
from app.infrastructure.db.init_db import init_analyse_schema
from app.infrastructure.messaging.event_handlers import start_consumer
from app.infrastructure.scheduler.manager import SchedulerManager

logger = get_logger("main")


def create_app() -> FastAPI:
    settings = get_settings()
    setup_logging(settings.log_level, settings.app_env)
    container = Container(settings)

    @asynccontextmanager
    async def lifespan(app: FastAPI):
        container.connect()
        try:
            init_analyse_schema(container.database.engine)
            logger.info("schema analyse initialise")
        except Exception as exc:
            logger.warning("initialisation schema analyse ignoree", error=str(exc))
        app.state.container = container

        scheduler = SchedulerManager(container)
        scheduler.start()
        broker = start_consumer(container) if settings.rabbitmq_consumer_enabled else None

        logger.info("service demarre", env=settings.app_env)
        yield
        if broker is not None:
            broker.stop()
        scheduler.stop()
        container.dispose()
        logger.info("service arrete")

    app = FastAPI(
        title="D2F Predictive Analytics Service",
        description="Analyse predictive des competences, risques et besoins de formation des enseignants (ESPRIT).",
        version=settings.app_version,
        docs_url="/docs" if not settings.debug else "/docs",
        redoc_url="/redoc",
        lifespan=lifespan,
    )

    app.add_middleware(
        CORSMiddleware,
        allow_origins=settings.cors_origins_list,
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )

    app.include_router(v1_router)

    from app.legacy_compat_runtime import (
        get_legacy_analytics_router,
        get_legacy_d2f_router,
        get_legacy_jwt_auth_middleware,
    )
    app.include_router(get_legacy_d2f_router(), prefix="/api")
    app.include_router(get_legacy_analytics_router(), prefix="/api")

    jwt_auth_middleware = get_legacy_jwt_auth_middleware()
    if jwt_auth_middleware is not None:
        app.add_middleware(jwt_auth_middleware)

    register_error_handlers(app)
    return app


app = create_app()
