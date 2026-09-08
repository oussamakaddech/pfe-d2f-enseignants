from fastapi import APIRouter
from fastapi.responses import JSONResponse
from typing import Annotated

from fastapi import Depends

from app.api.deps import ContainerDependency
from app.core.config import Settings, get_settings
from app.core.envelope import ok
from app.core.security import CurrentUser, require_roles
from app.infrastructure.db.database import ping_database
from app.infrastructure.ml.ml_observability import ml_observability
from app.schemas.analytics import HealthOut


router = APIRouter(tags=["health"])

ADMIN_ROLES = ("ADMIN", "CUP")


def _build_health(container, settings: Settings) -> tuple[HealthOut, bool]:
    database = "ok" if ping_database(container.database) else "unreachable"
    try:
        model_status = container.model_port.status()
    except Exception:
        model_status = {}
    try:
        risk_ml_status = container.model_port.risk_ml_status()
    except Exception:
        risk_ml_status = {}

    # Counts de serving des ecarts : enseignants distincts servis en mode ML
    # (PRODUCTION_ML / DEMO_ML) vs repli heuristique, depuis l'observabilite.
    ml_teachers: set[str] = set()
    fallback_teachers: set[str] = set()
    fallback_reasons: dict[str, str] = {}
    try:
        for call in ml_observability.recent_calls(limit=2000):
            tid = str((call.get("teacher_id") if isinstance(call, dict) else getattr(call, "teacher_id", None)) or "")
            mode = str(call.get("mode") if isinstance(call, dict) else getattr(call, "mode", ""))
            if not tid:
                continue
            if mode in ("PRODUCTION_ML", "DEMO_ML", "ML"):
                ml_teachers.add(tid)
            elif mode == "HEURISTIC_FALLBACK":
                reason = str(call.get("fallback_reason") if isinstance(call, dict) else getattr(call, "fallback_reason", "") or "")
                fallback_teachers.add(tid)
                if reason:
                    fallback_reasons[tid] = reason
    except Exception:
        pass
    ml_teachers -= fallback_teachers  # un enseignant en repli n'est pas compte en ML

    risk_mode = "ML" if risk_ml_status.get("risk_ml_active") else "HEURISTIC"
    health = HealthOut(
        status="ok" if database == "ok" else "degraded",
        service=settings.app_name,
        version=settings.app_version,
        database=database,
        model=model_status.get("mode", "HEURISTIC_FALLBACK"),
        target_validity=model_status.get("target_validity"),
        data_origin=model_status.get("data_origin"),
        validation_scope=model_status.get("validation_scope"),
        model_version=model_status.get("model_version"),
        ml_serving_count=f"{len(ml_teachers)}/{len(ml_teachers) + len(fallback_teachers)}" if (ml_teachers or fallback_teachers) else None,
        ml_serving_teachers=len(ml_teachers) if (ml_teachers or fallback_teachers) else None,
        ml_heuristic_fallback_teachers=len(fallback_teachers) if (ml_teachers or fallback_teachers) else None,
        risk_ml_active=bool(risk_ml_status.get("risk_ml_active")),
        risk_model_version=risk_ml_status.get("risk_model_version"),
        risk_mode=risk_mode,
        risk_ml_serving_count=risk_ml_status.get("risk_ml_serving_count"),
        risk_heuristic_fallback_count=risk_ml_status.get("risk_heuristic_fallback_count"),
        risk_fallback_reason=risk_ml_status.get("risk_fallback_reason"),
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


@router.get("/model-health", include_in_schema=True)
def model_health(
    container: ContainerDependency,
    user: Annotated[CurrentUser, Depends(require_roles(*ADMIN_ROLES))],
):
    """Santé du modèle ML servi : métriques test (r2, mae, rmse) + skew guard KS.

    Suivi de dérive documenté (gouvernance MLOps) : le test KS compare les
    features servies (fenêtre glissante) au corpus d'entraînement —
    ``skew_detected=true`` signifie que le serving a basculé en heuristique.
    Réservé aux rôles d'administration (ADMIN / CUP).
    """
    try:
        payload = container.model_port.model_health()
    except Exception:
        payload = {
            "mode": "UNKNOWN",
            "r2": None,
            "mae": None,
            "rmse": None,
            "skew_detected": False,
            "skew_checked": False,
            "skew_reason": "port ML indisponible",
        }
    return ok(payload)
