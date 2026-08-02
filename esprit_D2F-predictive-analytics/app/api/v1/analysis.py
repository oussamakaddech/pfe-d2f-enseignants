import uuid
from datetime import datetime, timezone

from fastapi import APIRouter, BackgroundTasks, Depends

from app.api.deps import ContainerDependency, resolve_user_teacher
from app.core.envelope import ok
from app.core.scope import enforce_teacher_access, resolve_teacher_or_404
from app.core.security import CurrentUser, require_roles
from app.schemas.analytics import AnalysisAcceptedOut, AnalysisOut, GapOut, RecommendationOut, RiskOut

router = APIRouter(tags=["analysis"])

DECISION_ROLES = ("ADMIN", "CUP", "CHEF_DEPARTEMENT", "ENSEIGNANT")


@router.post("/analysis/{teacher_id}", response_model=AnalysisAcceptedOut, status_code=202)
def submit_analysis(
    teacher_id: str,
    container: ContainerDependency,
    background_tasks: BackgroundTasks,
    user: CurrentUser = Depends(require_roles(*DECISION_ROLES)),
):
    teacher = resolve_teacher_or_404(teacher_id, container.teacher_source)
    user_teacher = resolve_user_teacher(container, user)
    enforce_teacher_access(user, teacher, user_teacher)

    analysis_id = str(uuid.uuid4())

    def run_analysis() -> None:
        container.compute_gaps.execute(teacher_id)
        container.compute_risk.execute(teacher_id)

    background_tasks.add_task(run_analysis)
    return AnalysisAcceptedOut(analysis_id=analysis_id)


@router.get("/teachers/{teacher_id}/analysis")
def get_analysis(
    teacher_id: str,
    container: ContainerDependency,
    user: CurrentUser = Depends(require_roles(*DECISION_ROLES)),
):
    teacher = resolve_teacher_or_404(teacher_id, container.teacher_source)
    user_teacher = resolve_user_teacher(container, user)
    enforce_teacher_access(user, teacher, user_teacher)

    gaps, model_mode, model_version = container.compute_gaps.execute(teacher_id)
    profile, _, _ = container.compute_risk.execute(teacher_id)
    payload = AnalysisOut(
        teacher_id=teacher_id,
        gaps=[GapOut(**gap.to_dict()) for gap in gaps],
        risk=RiskOut(
            teacher_id=profile.teacher_id,
            risk_score=round(profile.risk_score, 2),
            risk_level=profile.risk_level.value,
            factors=[f.__dict__ for f in profile.factors],
            computed_at=profile.computed_at,
        ),
        recommendations=[],
        model_mode=model_mode,
        computed_at=datetime.now(timezone.utc),
    )
    return ok(payload.model_dump(mode="json"), {"model_mode": model_mode, "model_version": model_version})
