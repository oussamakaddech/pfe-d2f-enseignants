from typing import Annotated

from fastapi import APIRouter, Depends, Query

from app.api.deps import ContainerDependency, resolve_user_teacher
from app.core.envelope import ok
from app.core.scope import enforce_teacher_access, resolve_teacher_or_404
from app.core.security import CurrentUser, require_roles
from app.schemas.analytics import RecommendationOut

router = APIRouter(prefix="/teachers/{teacher_id}/recommendations", tags=["recommendations"])

DECISION_ROLES = ("ADMIN", "CUP", "CHEF_DEPARTEMENT", "ENSEIGNANT")


@router.get("")
def list_recommendations(
    teacher_id: str,
    container: ContainerDependency,
    user: Annotated[CurrentUser, Depends(require_roles(*DECISION_ROLES))],
    competence_id: Annotated[int | None, Query()] = None,
    limit: Annotated[int, Query(ge=1, le=20)] = 5,
):
    teacher = resolve_teacher_or_404(teacher_id, container.teacher_source)
    user_teacher = resolve_user_teacher(container, user)
    enforce_teacher_access(user, teacher, user_teacher)

    if competence_id is not None:
        recommendations = container.recommend_trainings.execute(teacher_id, competence_id, limit)
    else:
        recommendations = _recommend_top_gaps(container, teacher_id, limit)
    return ok(
        [RecommendationOut(**r.to_dict()) for r in recommendations],
        {"limit": limit, "competence_id": competence_id},
    )


def _recommend_top_gaps(container, teacher_id: str, limit: int) -> list:
    """Agrege les recommandations sur les competences en plus grand ecart.

    Lit les gaps persistes (pas de recalcul) pour éviter toute ecriture
    lors d'une simple lecture.
    """
    from app.domain.entities.recommendation import Recommendation

    gaps = container.analysis_repository.list_gaps_by_teacher(teacher_id)
    best_score: dict[int, float] = {}
    for gap in gaps:
        best_score[gap.competence_id] = max(best_score.get(gap.competence_id, 0.0), gap.gap_score)

    merged: dict[int, Recommendation] = {}
    for competence_id, _ in sorted(best_score.items(), key=lambda kv: kv[1], reverse=True)[:3]:
        for recommendation in container.recommend_trainings.execute(teacher_id, competence_id, limit):
            existing = merged.get(recommendation.formation_id)
            if existing is None or recommendation.rank_score > existing.rank_score:
                merged[recommendation.formation_id] = recommendation

    return sorted(merged.values(), key=lambda r: r.rank_score, reverse=True)[:limit]
