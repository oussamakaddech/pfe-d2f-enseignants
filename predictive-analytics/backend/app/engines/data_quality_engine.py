"""DataQualityEngine — audit de la complétude/qualité des données d'un enseignant."""

from __future__ import annotations

from datetime import date

from pydantic import BaseModel, Field

from app.domain.enums.quality import DataQualityStatus
from app.domain.services.context import TeacherContext


class QualityMetric(BaseModel):
    name: str
    status: DataQualityStatus
    score: float  # 0..1
    detail: str = ""


class TeacherDataQualityReport(BaseModel):
    teacher_id: str
    overall_status: DataQualityStatus
    overall_score: float
    metrics: list[QualityMetric] = Field(default_factory=list)
    missing_competency_ids: list[str] = Field(default_factory=list)
    stale_assessment_ids: list[str] = Field(default_factory=list)


class DataQualityEngine:
    def __init__(self, stale_threshold_days: int = 365) -> None:
        self.stale_threshold_days = stale_threshold_days

    def audit(self, context: TeacherContext) -> TeacherDataQualityReport:
        teacher_id = context.teacher.teacher_id
        metrics: list[QualityMetric] = []

        # ---- profile completeness ----
        profile_ok = bool(
            context.teacher.department_code and context.teacher.up_code
        )
        metrics.append(
            QualityMetric(
                name="PROFILE_COMPLETENESS",
                status=DataQualityStatus.COMPLETE if profile_ok else DataQualityStatus.DATA_INCOMPLETE,
                score=1.0 if profile_ok else 0.5,
                detail=(
                    "profil complet"
                    if profile_ok
                    else "department_code ou up_code manquant"
                ),
            )
        )

        # ---- competencies coverage ----
        known_ids = {k.knowledge_id for k in context.hierarchy.knowledges}
        covered = {r.knowledge_id for r in context.records}
        missing = sorted(known_ids - covered)
        coverage = (len(covered) / len(known_ids)) if known_ids else 0.0
        comp_status = (
            DataQualityStatus.COMPLETE
            if coverage == 1.0
            else (
                DataQualityStatus.MISSING_COMPETENCIES
                if not context.records
                else DataQualityStatus.DATA_INCOMPLETE
            )
        )
        metrics.append(
            QualityMetric(
                name="COMPETENCY_COVERAGE",
                status=comp_status,
                score=round(coverage, 4),
                detail=f"{len(covered)}/{len(known_ids)} savoirs renseignés",
            )
        )

        # ---- level completeness (records with current_level) ----
        level_known = [r for r in context.records if r.current_level is not None]
        level_coverage = (len(level_known) / len(context.records)) if context.records else 0.0
        metrics.append(
            QualityMetric(
                name="LEVEL_COMPLETENESS",
                status=(
                    DataQualityStatus.COMPLETE
                    if level_coverage == 1.0
                    else DataQualityStatus.DATA_INCOMPLETE
                ),
                score=round(level_coverage, 4),
                detail=f"{len(level_known)}/{len(context.records)} niveaux renseignés",
            )
        )

        # ---- assessment recency ----
        today = context.reference_date or date.today()
        stale_ids = [
            r.knowledge_id
            for r in context.records
            if r.last_assessment_date is None
            or (today - r.last_assessment_date).days > self.stale_threshold_days
        ]
        recency = 1.0 - (len(stale_ids) / len(context.records)) if context.records else 0.0
        metrics.append(
            QualityMetric(
                name="ASSESSMENT_RECENCY",
                status=(
                    DataQualityStatus.COMPLETE
                    if recency == 1.0
                    else DataQualityStatus.STALE
                ),
                score=round(recency, 4),
                detail=f"{len(stale_ids)} évaluations périmées",
            )
        )

        overall_score = round(sum(m.score for m in metrics) / len(metrics), 4)
        worst = min(metrics, key=lambda m: m.score)
        overall_status = worst.status

        return TeacherDataQualityReport(
            teacher_id=teacher_id,
            overall_status=overall_status,
            overall_score=overall_score,
            metrics=metrics,
            missing_competency_ids=missing,
            stale_assessment_ids=stale_ids,
        )
