"""Endpoints /api/v1/analytics/* — insights avancés & centre d'action.

Regroupe les fonctionnalités ajoutées (dashboards riches + alertes/recommandations
intelligentes) hors de `analytics.py` pour éviter d'alourdir ce module. Le préfixe
`/v1/analytics` reste identique afin que le gateway (`/api/analyse/**`) et le
frontend (`ANALYTICS_V1`) continuent de fonctionner sans changement.

RBAC : appliqué au gateway sur `/api/analyse/**` (AuthorizationFilter). Les
endpoints de lecture restent alignés sur les autres endpoints dashboard du
service (pas de garde de rôle additionnelle), conformément à `analytics.py`.
"""

import logging
from typing import Annotated, Any, Optional

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session

from app.core.auth import require_roles
from app.core.db import get_db
from app.engines.action_center import ActionCenter
from app.engines.insights_engine import InsightsEngine
from app.models.schemas import BatchRecommendationRequest, BulkAlertUpdateRequest

router = APIRouter(prefix="/v1/analytics", tags=["Analytics — Insights"])
logger = logging.getLogger(__name__)

DbSession = Annotated[Session, Depends(get_db)]
ReadAuth = Annotated[dict, Depends(require_roles("ADMIN", "CUP"))]
MonthsParam = Annotated[int, Query(ge=1, le=24, description="Horizon de projection en mois")]
HistoryParam = Annotated[int, Query(ge=2, le=36, description="Profondeur d'historique en mois")]
LimitParam = Annotated[int, Query(ge=1, le=100)]
DeptFilter = Annotated[Optional[str], Query(description="Filtre département (id)")]


# ── Dashboards riches ────────────────────────────────────────
@router.get("/dashboard/overview", summary="Tuiles d'en-tête avec variations (deltas)")
async def dashboard_overview(auth: ReadAuth, db: DbSession) -> dict[str, Any]:
    return InsightsEngine(db).overview()


@router.get("/dashboard/demand-forecast", summary="Prévision de la demande de formation")
async def dashboard_demand_forecast(
    auth: ReadAuth,
    db: DbSession,
    months: MonthsParam = 6,
    history_months: HistoryParam = 12,
) -> dict[str, Any]:
    return InsightsEngine(db).demand_forecast(months=months, history_months=history_months)


@router.get("/dashboard/supply-demand", summary="Matrice offre/demande par compétence")
async def dashboard_supply_demand(auth: ReadAuth, db: DbSession) -> list[dict[str, Any]]:
    return InsightsEngine(db).supply_demand()


@router.get(
    "/dashboard/training-needs-forecast",
    summary="Prévision des besoins de formation par département",
)
async def dashboard_training_needs_forecast(
    auth: ReadAuth,
    db: DbSession,
    months: MonthsParam = 6,
    history_months: HistoryParam = 12,
) -> dict[str, Any]:
    return InsightsEngine(db).training_needs_forecast(months=months, history_months=history_months)


@router.get("/dashboard/risk-distribution", summary="Distribution du risque (histogramme + répartitions)")
async def dashboard_risk_distribution(auth: ReadAuth, db: DbSession) -> dict[str, Any]:
    return InsightsEngine(db).risk_distribution()


@router.get(
    "/dashboard/gap-heatmap/{departement}/{competence_id}",
    summary="Détail des enseignants d'une cellule de la heatmap (drill-down)",
)
async def dashboard_heatmap_drilldown(
    auth: ReadAuth,
    departement: str,
    competence_id: int,
    db: DbSession,
) -> dict[str, Any]:
    return InsightsEngine(db).heatmap_cell_drilldown(departement, competence_id)


# ── Centre d'action : alertes intelligentes ──────────────────
@router.get("/alerts/summary", summary="Synthèse des alertes (agrégats + tendance 30j)")
async def alerts_summary(db: DbSession) -> dict[str, Any]:
    return ActionCenter(db).alert_summary()


@router.patch(
    "/alerts/bulk",
    summary="Triage de masse des alertes",
    responses={400: {"description": "Statut invalide"}},
)
async def alerts_bulk_update(
    payload: BulkAlertUpdateRequest,
    db: DbSession,
) -> dict[str, Any]:
    try:
        return ActionCenter(db).bulk_update(
            alert_ids=payload.alert_ids,
            statut=payload.statut,
            traite_par=payload.traite_par,
            commentaire=payload.commentaire,
        )
    except ValueError as exc:
        raise HTTPException(status_code=400, detail={"message": str(exc)}) from exc


# ── Centre d'action : recommandations actionnables ───────────
@router.get("/actions/priority", summary="File d'actions priorisée (enseignants à traiter)")
async def actions_priority(
    db: DbSession,
    limit: LimitParam = 20,
    departement_id: DeptFilter = None,
) -> list[dict[str, Any]]:
    return ActionCenter(db).priority_actions(limit=limit, departement_id=departement_id)


@router.post("/recommendations/batch", summary="Recommandations agrégées sur une cohorte")
async def recommendations_batch(
    payload: BatchRecommendationRequest,
    db: DbSession,
) -> dict[str, Any]:
    return ActionCenter(db).batch_recommendations(
        teacher_ids=payload.teacher_ids,
        departement_id=payload.departement_id,
        top_n=payload.top_n,
    )
