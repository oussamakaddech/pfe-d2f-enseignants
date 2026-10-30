"""Endpoint d'observabilité du serving ML (gouvernance 7.6, limite 4).

Expose :
- le taux de fallback par jour (fenêtre glissante) ;
- les derniers appels journalisés (mode effectif, raison de repli,
  features hors plage) ;
- les compteurs agrégés (compteurs, latence, versions).

Réservé aux rôles d'administration (ADMIN / CUP) — le dashboard admin.
Aucune donnée personnelle sensible : identifiants enseignants uniquement
(déjà présents dans les snapshots d'analyse).
"""
from typing import Annotated

from fastapi import APIRouter, Depends, Query

from app.api.deps import ContainerDependency
from app.core.envelope import ok
from app.core.security import CurrentUser, require_roles
from app.infrastructure.ml.ml_observability import ml_observability

router = APIRouter(tags=["ml-observability"])

ADMIN_ROLES = ("ADMIN", "CUP")


@router.get("/ml-observability")
def get_ml_observability(
    container: ContainerDependency,
    user: Annotated[CurrentUser, Depends(require_roles(*ADMIN_ROLES))],
    days: Annotated[int, Query(ge=1, le=90)] = 30,
    limit: Annotated[int, Query(ge=1, le=500)] = 100,
):
    """Taux de fallback par jour + derniers appels de serving ML."""
    return ok(
        {
            "fallback_rate_per_day": ml_observability.fallback_rate_per_day(last_days=days),
            "recent_calls": ml_observability.recent_calls(limit=limit),
            "metrics": ml_observability.snapshot(),
        }
    )
