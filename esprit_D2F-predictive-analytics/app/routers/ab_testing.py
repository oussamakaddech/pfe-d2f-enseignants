"""Routes A/B Testing — compare les stratégies de recommandation.

Endpoints :
- POST /v1/analytics/ab/assign — assigne un enseignant à une variante
- POST /v1/analytics/ab/event — enregistre un événement
- GET  /v1/analytics/ab/results/{experiment} — résultats agrégés
- GET  /v1/analytics/ab/winner/{experiment} — variante gagnante
"""

from __future__ import annotations

from typing import Any

from fastapi import APIRouter, Depends, HTTPException, Query
from pydantic import BaseModel
from sqlalchemy.orm import Session

from app.db import get_db
from app.engines.ab_testing import (
    compute_results,
    get_variant,
    get_winner,
    record_event,
)

router = APIRouter(prefix="/v1/analytics/ab", tags=["A/B Testing"])


class AssignRequest(BaseModel):
    teacher_id: str
    experiment_name: str = "recommendation_strategy"


class EventRequest(BaseModel):
    teacher_id: str
    experiment_name: str = "recommendation_strategy"
    variant: str
    event_type: str  # shown, accepted, completed, scored, days_to_enroll
    formation_id: int | None = None
    value: float = 1.0
    metadata_json: dict[str, Any] | None = None


@router.post("/assign", response_model=dict[str, Any])
def assign_variant(
    req: AssignRequest,
    db: Session = Depends(get_db),
) -> dict[str, Any]:
    """Assigne un enseignant à une variante A/B (déterministe)."""
    variant = get_variant(db, req.teacher_id, req.experiment_name)
    return {
        "teacher_id": req.teacher_id,
        "experiment_name": req.experiment_name,
        "variant": variant,
    }


@router.post("/event", response_model=dict[str, str])
def log_event(
    req: EventRequest,
    db: Session = Depends(get_db),
) -> dict[str, str]:
    """Enregistre un événement d'A/B test."""
    record_event(
        db=db,
        teacher_id=req.teacher_id,
        experiment_name=req.experiment_name,
        variant=req.variant,
        event_type=req.event_type,
        formation_id=req.formation_id,
        value=req.value,
        metadata_json=req.metadata_json,
    )
    return {"status": "recorded"}


@router.get("/results/{experiment}", response_model=list[dict[str, Any]])
def get_results(
    experiment: str,
    db: Session = Depends(get_db),
) -> list[dict[str, Any]]:
    """Retourne les métriques agrégées pour chaque variante."""
    return compute_results(db, experiment)


@router.get("/winner/{experiment}", response_model=dict[str, Any])
def get_winner_variant(
    experiment: str,
    db: Session = Depends(get_db),
) -> dict[str, Any]:
    """Détermine la variante gagnante d'un A/B test."""
    results = compute_results(db, experiment)
    winner = get_winner(results)
    if not winner:
        raise HTTPException(status_code=404, detail="No results found")
    return winner
