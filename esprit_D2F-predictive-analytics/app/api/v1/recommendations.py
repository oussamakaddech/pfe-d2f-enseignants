from typing import Annotated

from fastapi import APIRouter, Depends, Query

from app.api.deps import ContainerDependency, resolve_user_teacher
from app.api.v1.model_meta import build_model_meta
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
        recommendations = container.recommend_trainings.execute(
            teacher_id, competence_id, limit,
            dept_id=teacher.dept_id, up_id=teacher.up_id,
        )
    else:
        recommendations = _recommend_top_gaps(container, teacher_id, limit)
    # Contrat d'API (audit d'autorité 2026-09-22, §3.6 + §3.3) : les
    # recommandations n'exposaient NI le moteur qui les a produites NI le fait
    # qu'une justification est indisponible. Les deux sont désormais explicites.
    meta = build_model_meta(container)
    payload = [RecommendationOut(**r.to_dict()) for r in recommendations]
    justified = sum(1 for item in payload if item.justified)
    meta.update(
        {
            "limit": limit,
            "competence_id": competence_id,
            "recommandations": len(payload),
            "justifiees": justified,
            "justification_indisponible": len(payload) - justified,
            "taux_justification_pct": round(100.0 * justified / len(payload), 1) if payload else 0.0,
            "justification_note": (
                "Une recommandation est « justifiée » si elle couvre au moins un savoir "
                "réellement manquant pour l'enseignant. Cause racine des justifications "
                "indisponibles : liens formation↔savoir incomplets dans le référentiel."
            ),
        }
    )
    return ok(payload, meta)


def _recommend_top_gaps(container, teacher_id: str, limit: int) -> list:
    """Agrege les recommandations sur les competences en plus grand ecart.

    Lit les gaps persistes (pas de recalcul) pour éviter toute ecriture
    lors d'une simple lecture. Parcourt les competences par score decroissant
    jusqu'a `limit` recommandations distinctes : les competences du haut du
    classement n'ont pas toujours une formation dans le catalogue (couverture
    partielle), on ne s'arrete donc pas aux 3 premieres si le catalogue ne
    couvre pas leur savoir.
    """
    from app.domain.entities.recommendation import Recommendation

    gaps = container.analysis_repository.list_gaps_by_teacher(teacher_id)
    best_score: dict[int, float] = {}
    for gap in gaps:
        best_score[gap.competence_id] = max(best_score.get(gap.competence_id, 0.0), gap.gap_score)

    ordered = sorted(best_score.items(), key=lambda kv: kv[1], reverse=True)

    merged: dict[int, Recommendation] = {}
    # Périmètre de l'enseignant (parité avec l'analyse contextuelle) : sans
    # dept/up, TOUTES les formations de la compétence sont candidates, y
    # compris hors département/UP — recommandations hors périmètre.
    teacher = container.teacher_source.get_teacher(teacher_id)
    dept_id = teacher.dept_id if teacher else None
    up_id = teacher.up_id if teacher else None
    for competence_id, _ in ordered:
        for recommendation in container.recommend_trainings.execute(
            teacher_id, competence_id, limit, dept_id=dept_id, up_id=up_id,
        ):
            existing = merged.get(recommendation.formation_id)
            if existing is None or recommendation.rank_score > existing.rank_score:
                merged[recommendation.formation_id] = recommendation
        if len(merged) >= limit:
            break

    return sorted(merged.values(), key=lambda r: r.rank_score, reverse=True)[:limit]
