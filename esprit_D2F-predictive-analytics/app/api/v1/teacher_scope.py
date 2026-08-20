from datetime import datetime, timezone
from typing import Annotated

from fastapi import APIRouter, Depends, Query

from app.api.deps import ContainerDependency, resolve_user_teacher
from app.core.envelope import ok
from app.core.scope import enforce_teacher_access, resolve_teacher_or_404
from app.core.security import CurrentUser, require_roles
from app.schemas.analytics import (
    GapOut,
    RecommendationOut,
    ScopeOut,
    TeacherContextOut,
    TeacherScopeAnalysisOut,
)

router = APIRouter(prefix="/teachers/{teacher_id}/scope-analysis", tags=["teacher-scope-analysis"])

DECISION_ROLES = ("ADMIN", "CUP", "CHEF_DEPARTEMENT", "ENSEIGNANT")


@router.get("")
def get_teacher_scope_analysis(
    teacher_id: str,
    container: ContainerDependency,
    user: Annotated[CurrentUser, Depends(require_roles(*DECISION_ROLES))],
    min_gap_score: Annotated[float, Query(ge=0.0, le=1.0)] = 0.0,
    limit_recommendations: Annotated[int, Query(ge=1, le=20)] = 5,
):
    """Analyse contextuelle d'un enseignant : affectations/competences ->
    gaps + recommandations filtres par specialite, UP et departement."""
    teacher = resolve_teacher_or_404(teacher_id, container.teacher_source)
    user_teacher = resolve_user_teacher(container, user)
    enforce_teacher_access(user, teacher, user_teacher)

    analysis = container.analyze_teacher_scope.execute(teacher)

    gaps = [g for g in analysis.gaps if g.gap_score >= min_gap_score]
    recommendations = analysis.recommendations[:limit_recommendations]

    payload = TeacherScopeAnalysisOut(
        context=TeacherContextOut(
            teacher_id=teacher.id,
            nom_complet=teacher.full_name,
            mail=teacher.mail,
            specialite=teacher.specialite,
            grade=teacher.grade,
            up_id=teacher.up_id,
            up_libelle=teacher.up_libelle,
            dept_id=teacher.dept_id,
            dept_libelle=teacher.dept_libelle,
        ),
        gaps=[GapOut(**gap.to_dict()) for gap in gaps],
        recommendations=[RecommendationOut(**rec.to_dict()) for rec in recommendations],
        scoped_competencies_count=analysis.scoped_competencies_count,
        total_competencies_count=analysis.total_competencies,
        scope=ScopeOut(
            type=analysis.scope.type,
            is_global=analysis.scope.is_global,
            label=analysis.scope.label,
        ),
        computed_at=datetime.now(timezone.utc),
    )
    return ok(
        payload.model_dump(),
        {
            "min_gap_score": min_gap_score,
            "limit_recommendations": limit_recommendations,
            "gaps_count": len(gaps),
            "recommendations_count": len(recommendations),
        },
    )
