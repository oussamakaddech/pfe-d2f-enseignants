from fastapi import APIRouter

from app.api.v1 import (
    alerts,
    analysis,
    analytics_api_routes,
    dashboard_real,
    dashboards,
    gaps,
    health,
    integrations,
    needs,
    recommendations,
    risk,
    teacher_scope,
)

router = APIRouter(prefix="/api/v1/analytics")
router.include_router(health.router)
router.include_router(analytics_api_routes.router)
router.include_router(analysis.router)
router.include_router(gaps.router)
router.include_router(risk.router)
router.include_router(recommendations.router)
router.include_router(teacher_scope.router)
router.include_router(alerts.router)
router.include_router(needs.router)
router.include_router(dashboards.router)
router.include_router(dashboard_real.router)
router.include_router(integrations.router)
