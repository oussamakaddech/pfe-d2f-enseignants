from typing import Annotated

from fastapi import APIRouter, Depends, Query

from app.api.deps import ContainerDependency, resolve_user_teacher
from app.api.v1.model_meta import build_model_meta
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
    # Bloc meta contractuel (audit d'autorité 2026-09-22 §3.6) : model_mode /
    # model_version / fallback_reason / provenance, construit par le helper
    # partagé — jamais recopié à la main endpoint par endpoint.
    meta = build_model_meta(container)
    model_mode = meta["model_mode"]
    fallback_reason = meta["fallback_reason"]
    # Mode effectif des lignes servies (fail-closed) : les marqueurs DECLARED_ML /
    # WORSENING ne sont produits QUE par le modèle. IMPROVING est AMBIGU (produit
    # aussi bien par le ML que par l'heuristique avec historique), STABLE /
    # DECLINING uniquement par l'heuristique — donc SEULE la présence d'un
    # marqueur ML prouve le ML. Sans marqueur, on expose HEURISTIC_FALLBACK,
    # jamais un mode ML mensonger (ex : heuristique IMPROVING à tort, ou lignes
    # calculées hors plages d'entraînement).
    if gaps and model_mode in ("PRODUCTION_ML", "DEMO_ML"):
        trends = {getattr(g.trend, "value", str(g.trend)) for g in gaps}
        rows_from_ml = bool(trends & {"DECLARED_ML", "WORSENING"})
        if not rows_from_ml:
            model_mode = "HEURISTIC_FALLBACK"
            fallback_reason = (
                fallback_reason
                or "dernier calcul hors modèle ML : moteur heuristique explicable appliqué"
            )
            # Audit d'autorite 2026-09-22 (§3.4, point 2) : les lignes servies ne
            # viennent PAS du modele — annoncer sa version (v1.2.0-gb) laisserait
            # croire le contraire. La version disponible reste consultable via
            # `provenance` / `registry_entry` du port, pas comme version servie.
            meta["model_version"] = None
            meta["model_name"] = None
    if severity:
        gaps = [gap for gap in gaps if gap.severity.api_value() == severity.upper()]
    # GOUVERNANCE 7.6 (limite 4.2) : avertissement non bloquant quand une
    # feature servie est proche des bornes d'entraînement (< 5 %).
    near_boundary = None
    try:
        near_boundary = container.model_port.near_boundary_warning(teacher_id)
    except Exception:
        near_boundary = None
    page_result = paginate([GapOut(**gap.to_dict()) for gap in gaps], page, size)
    predictions = []
    if model_mode in ("PRODUCTION_ML", "DEMO_ML"):
        predictions = [gap.to_dict() for gap in gaps]
    # Le mode effectif des LIGNES serties peut être plus bas que le mode du
    # port : on réexpose le couple cohérent mode/raison.
    meta["model_mode"] = model_mode
    meta["fallback_reason"] = fallback_reason
    meta["predictions"] = predictions
    meta["near_boundary_warning"] = near_boundary
    return ok_page(page_result.data, page_result.meta, meta)
