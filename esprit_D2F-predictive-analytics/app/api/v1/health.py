from fastapi import APIRouter
from fastapi.responses import JSONResponse

from app.api.deps import ContainerDependency
from app.core.config import Settings, get_settings
from app.infrastructure.db.database import ping_database
from app.schemas.analytics import HealthOut

router = APIRouter(tags=["health"])


def _build_health(container, settings: Settings) -> tuple[HealthOut, bool]:
    database = "ok" if ping_database(container.database) else "unreachable"
    health = HealthOut(
        status="ok" if database == "ok" else "degraded",
        service=settings.app_name,
        version=settings.app_version,
        database=database,
        model=container.model_port.status()["mode"],
    )
    return health, database == "ok"


@router.get("/health", include_in_schema=True)
def health(container: ContainerDependency, settings: Settings = get_settings()) -> HealthOut:
    health_out, _ = _build_health(container, settings)
    return health_out


@router.get("/ready", include_in_schema=True)
def ready(container: ContainerDependency, settings: Settings = get_settings()) -> JSONResponse:
    health_out, ready_ok = _build_health(container, settings)
    return JSONResponse(status_code=200 if ready_ok else 503, content=health_out.model_dump())
