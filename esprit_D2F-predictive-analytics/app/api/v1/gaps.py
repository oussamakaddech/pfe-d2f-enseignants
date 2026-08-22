from typing import Annotated

from fastapi import APIRouter, Depends, Query

from app.api.deps import ContainerDependency, resolve_user_teacher
from app.core.envelope import ok_page
from app.core.pagination import paginate
from app.core.scope import enforce_teacher_access, resolve_teacher_or_404
from app.core.security import CurrentUser, require_roles
from app.schemas.analytics import GapOut

router = APIRouter(prefix="/teachers/{teacher_id}/gaps", tags=["gaps"])

DECISION_ROLES = ("ADMIN", "CUP", "CHEF_DEPARTEMENT", "ENSEIGNANT")


@router.get("")
def list_gaps(
    teacher_id: str,
    container: ContainerDependency,
    user: Annotated[CurrentUser, Depends(require_roles(*DECISION_ROLES))],
    page: Annotated[int, Query(ge=1)] = 1,
    size: Annotated[int, Query(ge=1, le=100)] = 20,
    severity: Annotated[str | None, Query()] = None,
):
    teacher = resolve_teacher_or_404(teacher_id, container.teacher_source)
    user_teacher = resolve_user_teacher(container, user)
    enforce_teacher_access(user, teacher, user_teacher)

    # Lecture seule : renvoie le dernier snapshot persisté. Le recalcul est déclenché
    # via POST /analysis/{id} ou par le scheduler batch — jamais à chaque lecture.
    gaps = container.analysis_repository.list_gaps_by_teacher(teacher_id)
    model_mode = None
    model_version = None
    fallback_reason = None
    dataset_version = None
    prediction_horizon = None
    synthetic_share_pct = None
    provenance = {}
    predictions: list[dict] = []
    try:
        status = container.model_port.status()
        model_mode = status.get("model_mode") or status.get("mode")
        model_version = status.get("model_version") or status.get("version")
        fallback_reason = status.get("fallback_reason")
        prediction_horizon = status.get("prediction_horizon")
        provenance = status.get("provenance") or {}
        if isinstance(provenance, dict):
            dataset_version = provenance.get("dataset_version")
            synthetic_share_pct = provenance.get("synthetic_share_pct")
    except Exception:
        pass
    # Mode effectif des lignes servies : les marqueurs DECLARED_ML / WORSENING
    # ne sont produits que par le modèle ; STABLE / DECLINING uniquement par le
    # moteur heuristique (compute_gaps._heuristic_on). Si les lignes persistées
    # portent des tendances heuristiques alors que le statut global annonce un
    # mode ML (ex : features hors plages au dernier calcul), on expose
    # HEURISTIC_FALLBACK — jamais un mode ML mensonger.
    if gaps and model_mode in ("PRODUCTION_ML", "DEMO_ML"):
        trends = {getattr(g.trend, "value", str(g.trend)) for g in gaps}
        rows_from_ml = bool(trends & {"DECLARED_ML", "WORSENING"})
        rows_heuristic_only = bool(trends & {"STABLE", "DECLINING"})
        if not rows_from_ml and rows_heuristic_only:
            model_mode = "HEURISTIC_FALLBACK"
            fallback_reason = (
                fallback_reason
                or "dernier calcul hors plages d'entraînement : moteur heuristique explicable appliqué"
            )
    if severity:
        gaps = [gap for gap in gaps if gap.severity.api_value() == severity.upper()]
    page_result = paginate([GapOut(**gap.to_dict()) for gap in gaps], page, size)
    if model_mode in ("PRODUCTION_ML", "DEMO_ML"):
        predictions = [gap.to_dict() for gap in gaps]
    return ok_page(
        page_result.data,
        page_result.meta,
        {
            "model_mode": model_mode,
            "model_version": model_version,
            "fallback_reason": fallback_reason,
            "dataset_version": dataset_version,
            "prediction_horizon": prediction_horizon,
            "synthetic_share_pct": synthetic_share_pct,
            "provenance": provenance,
            "predictions": predictions,
        },
    )
