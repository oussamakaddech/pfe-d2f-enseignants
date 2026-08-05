"""Compat runtime: expose the legacy D2F API while the migration is in progress.

Sprint 2 moved the legacy FastAPI application from ``app/`` to ``app_legacy/``.
The new DDD app (``app.main``) only serves ``/api/v1/analytics/*``. The webapp
still consumes ``/api/v1/d2f/*`` (D2FDashboard, D2FOverviewPage, D2FService)
and the legacy ``/api/v1/analytics`` endpoints (``supply-demand``,
``training-impact``, ...).

This module:
  1. registers ``sys.modules`` aliases so the legacy modules resolve their old
     ``app.*`` imports to ``app_legacy.*``;
  2. augments the new ``app.core.exceptions`` with the legacy exception classes
     required by ``app_legacy.core.db`` / ``app_legacy.ml.gap_predictor``;
  3. exposes the legacy ``d2f_master`` router (with the ``d2f_extras`` side
     effects: ``/heatmap``, ``/top-formations``, ``/plan-actions``, ``/stats``)
     for mounting under ``/api``;
  4. exposes the legacy ``/v1/analytics`` routers (``insights`` + ``analytics``,
     which carry ``/dashboard/supply-demand`` and ``/dashboard/training-impact``)
     for mounting under ``/api``;
  5. exposes the legacy ``JWTAuthMiddleware`` (which fills
     ``request.state.user_role`` consumed by ``require_roles``), with a shim
     disabling auth when no ``JWT_SECRET`` is present in the environment.
"""

from __future__ import annotations

import sys
import types

_ALIASED = False
_JWT_MIDDLEWARE_REAL: bool | None = None
JWT_MIDDLEWARE_MODULE = "app.core.jwt_middleware"


def _alias(name: str) -> None:
    """Point ``app.<name>`` at ``app_legacy.<name>`` in ``sys.modules``."""
    target = sys.modules.get("app_legacy." + name)
    if target is not None and sys.modules.get("app." + name) is None:
        sys.modules["app." + name] = target


def _alias_ml() -> None:
    """Alias the legacy ``app.ml`` package so lazy imports resolve.

    The heavy ML stack (sklearn/xgboost/lightgbm/shap) is only loaded when the
    ``/ml-signal`` endpoint is hit, mirroring the lazy import in d2f_master.
    """
    if sys.modules.get("app.ml") is not None:
        return
    import app_legacy.ml

    sys.modules["app.ml"] = app_legacy.ml
    # Sous-paquets: l'import `from app.ml.gap_predictor import ...` passera
    # par `__path__` du paquet alias, aucun chargement supplémentaire ici.


def ensure_legacy_aliases() -> None:
    """Idempotently alias the legacy modules under their old ``app.*`` names."""
    global _ALIASED
    if _ALIASED:
        return

    # Ordre important : `app_legacy.core.db` importe `DatabaseError` depuis
    # `app.core.exceptions` au chargement, donc l'augmentation des exceptions
    # doit avoir lieu AVANT l'import de `core.db`.
    import app_legacy.config  # noqa: F401
    _alias("config")

    import app_legacy.core.observability  # noqa: F401
    _alias("core.observability")

    _augment_exceptions()

    import app_legacy.core.db  # noqa: F401
    _alias("core.db")

    import app_legacy.models  # noqa: F401
    _alias("models")

    import app_legacy.models.db_models  # noqa: F401
    _alias("models.db_models")

    import app_legacy.risk_engine  # noqa: F401
    _alias("risk_engine")

    _alias_ml()

    # Modules requis par les routers legacy ``/v1/analytics`` (insights,
    # analytics) et par ``d2f_extras`` (patch du router d2f). Ordre important :
    # ``d2f_extras`` importe depuis ``app.routers.d2f_master``, donc le paquet
    # ``routers`` et ``routers.d2f_master`` doivent etre alias BEFORE.
    for name in (
        "core.auth",
        "core.id_policy",
        "core.response_envelope",
        "models.schemas",
        "services",
        "services.data_service",
        "services.analysis_collection_service",
        "engines",
        "engines.action_center",
        "engines.alert_engine",
        "engines.anomaly_engine",
        "engines.benchmark_engine",
        "engines.collaborative",
        "engines.dashboard_engine",
        "engines.feature_engine",
        "engines.forecast_engine",
        "engines.gap_engine",
        "engines.impact_engine",
        "engines.insights_engine",
        "engines.pilotage_dashboard_engine",
        "engines.predictive_gap_diagnostic",
        "engines.recommendation_engine",
        "engines.risk_scoring",
        "routers",
        "routers.d2f_master",
    ):
        import importlib

        importlib.import_module("app_legacy." + name)
        _alias(name)

    # Side-effect : enregistre /heatmap, /top-formations, /plan-actions,
    # /stats sur le router d2f_master (voir app_legacy/routers/d2f_extras.py).
    import app_legacy.routers.d2f_extras  # noqa: F401

    _alias_core_jwt_middleware()
    _ALIASED = True


def _augment_exceptions() -> None:
    """Add the legacy exception classes to the new ``app.core.exceptions``.

    ``app_legacy.core.db`` and ``app_legacy.ml.gap_predictor`` import from
    ``app.core.exceptions``; the new module only defines the DDD ``AppError``
    family. We inject the legacy classes so both namespaces keep working.
    """
    import app.core.exceptions as new_exc
    import app_legacy.core.exceptions as legacy_exc

    for name in (
        "DatabaseError",
        "ModelNotTrainedError",
        "InsufficientDataError",
        "TeacherNotFoundError",
    ):
        if not hasattr(new_exc, name) and hasattr(legacy_exc, name):
            setattr(new_exc, name, getattr(legacy_exc, name))


def _alias_core_jwt_middleware() -> None:
    """Alias ``app.core.jwt_middleware`` vers le module legacy.

    ``app_legacy.core.auth.require_roles`` importe ``JWT_AUTH_ENABLED`` depuis
    ``app.core.jwt_middleware`` a la requete. Le module legacy leve
    ``RuntimeError`` a l'import quand ``JWT_SECRET`` n'est pas dans
    l'environnement (tests, dev local sans secret). Dans ce cas on installe un
    shim qui desactive l'auth (``JWT_AUTH_ENABLED=False``) : c'est le mode
    documente du dev local / tests (voir app_legacy/core/auth.py).
    """
    global _JWT_MIDDLEWARE_REAL
    if sys.modules.get(JWT_MIDDLEWARE_MODULE) is not None:
        return
    try:
        import app_legacy.core.jwt_middleware as jwt_middleware
    except RuntimeError:
        jwt_middleware = types.ModuleType(JWT_MIDDLEWARE_MODULE)
        jwt_middleware.JWT_AUTH_ENABLED = False
        jwt_middleware.JWT_ALGORITHM = "HS512"
        jwt_middleware.JWT_SECRET = ""
        jwt_middleware.JWTAuthMiddleware = None
        _JWT_MIDDLEWARE_REAL = False
    else:
        _JWT_MIDDLEWARE_REAL = True
    sys.modules[JWT_MIDDLEWARE_MODULE] = jwt_middleware


def get_legacy_jwt_auth_middleware():
    """Return the legacy ``JWTAuthMiddleware`` (or ``None`` when auth is off).

    The middleware decodes the JWT forwarded by the gateway
    (``Authorization: Bearer <jwt>``) and fills ``request.state.user_role`` /
    ``user_id`` / ``user_email`` consumed by ``app_legacy.core.auth.require_roles``
    and the legacy ``/v1/analytics`` handlers.
    """
    ensure_legacy_aliases()
    if not _JWT_MIDDLEWARE_REAL:
        return None
    from app_legacy.core.jwt_middleware import JWTAuthMiddleware

    return JWTAuthMiddleware


def get_legacy_all_router():
    """Return the legacy ``app.routers.all`` router (mounted under ``/api``).

    Carry the remaining legacy contract consumed by the webapp through the
    gateway ``/api/analyse/**`` rewrite: ``/health``, ``/predict/*``,
    ``/recommend/path``, ``/detect/*`` and ``/dashboard/{summary,
    in-demand-competencies, declining-competencies, teacher-risk-indicators,
    department/{id}}``. The router also includes ``d2f_master`` (``/v1/d2f``)
    and ``d2f_compat`` (``/v1/compat``), so mounting it restores the exact
    surface the legacy ``main.py`` exposed under ``/api``.
    """
    ensure_legacy_aliases()
    from app_legacy.routers.all import router

    return router


def get_legacy_analytics_router():
    """Return the legacy ``/v1/analytics`` routers (mounted under ``/api``).

    ``insights`` carries ``/dashboard/supply-demand`` and ``analytics`` carries
    ``/dashboard/training-impact`` (+ ``/formations``), still consumed by the
    webapp while the new ``app.api.v1`` only exposes ``/dashboard``.
    """
    ensure_legacy_aliases()
    from fastapi import APIRouter

    from app_legacy.routers import analytics, insights

    router = APIRouter()
    router.include_router(insights.router)
    router.include_router(analytics.router)
    return router
