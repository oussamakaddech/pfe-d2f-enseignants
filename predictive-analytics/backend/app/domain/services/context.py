from __future__ import annotations

from datetime import date
from typing import Any

from pydantic import BaseModel, ConfigDict, Field

from app.domain.entities.competency import CompetencyHierarchy, KnowledgeRecord
from app.domain.entities.gap import GapAggregate, GapDiagnostic, TeacherGapAnalysis
from app.domain.entities.teacher import Teacher
from app.domain.entities.training import (
    Attendance,
    Certificate,
    Enrollment,
    Evaluation,
    Training,
    TrainingNeed,
)
from app.domain.enums.gap import GapSeverity
from app.domain.enums.quality import DataQualityStatus


class TeacherContext(BaseModel):
    """Agrégat complet fourni aux moteurs. Aucune notion d'API/DB."""

    model_config = ConfigDict(extra="allow")

    teacher: Teacher
    hierarchy: CompetencyHierarchy = Field(default_factory=CompetencyHierarchy)
    records: list[KnowledgeRecord] = Field(default_factory=list)
    needs: list[TrainingNeed] = Field(default_factory=list)
    enrollments: list[Enrollment] = Field(default_factory=list)
    certificates: list[Certificate] = Field(default_factory=list)
    attendances: list[Attendance] = Field(default_factory=list)
    evaluations: list[Evaluation] = Field(default_factory=list)
    trainings: list[Training] = Field(default_factory=list)
    reference_date: date | None = None

    def records_for(self, knowledge_id: str) -> list[KnowledgeRecord]:
        return [r for r in self.records if r.knowledge_id == knowledge_id]

    def latest_record(self, knowledge_id: str) -> KnowledgeRecord | None:
        records = sorted(
            self.records_for(knowledge_id),
            key=lambda r: r.last_assessment_date or date.min,
            reverse=True,
        )
        return records[0] if records else None


SEVERITY_RANK = {
    GapSeverity.LOW: 1,
    GapSeverity.MEDIUM: 2,
    GapSeverity.HIGH: 3,
    GapSeverity.CRITICAL: 4,
}


def max_severity(severities: list[GapSeverity]) -> GapSeverity:
    if not severities:
        return GapSeverity.LOW
    return max(severities, key=lambda s: SEVERITY_RANK[s])


def apply_aggregate(
    teacher_id: str,
    gaps: list[GapDiagnostic],
    level: str,
    key_fn,
    ref_id_attr: str,
    name_attr: str = "",
    code_attr: str = "",
    parent_attr: str = "",
) -> list[GapAggregate]:
    """Générique: agrége les gaps unitaires à un niveau de la hiérarchie."""
    groups: dict[str, list[GapDiagnostic]] = {}
    for g in gaps:
        key = key_fn(g)
        if key:
            groups.setdefault(key, []).append(g)

    aggregates: list[GapAggregate] = []
    for key, members in groups.items():
        max_gap = max((m.gap_level for m in members), default=0)
        sev = max_severity([m.severity for m in members])
        quals = [m.data_quality_status for m in members]
        dq = (
            DataQualityStatus.DATA_INCOMPLETE
            if any(q == DataQualityStatus.DATA_INCOMPLETE for q in quals)
            else DataQualityStatus.COMPLETE
        )
        first = members[0]
        aggregates.append(
            GapAggregate(
                teacher_id=teacher_id,
                level=level,
                ref_id=key,
                ref_code=getattr(first, code_attr, "") or "",
                ref_name=getattr(first, name_attr, "") or "",
                parent_ref_id=getattr(first, parent_attr, "") or "",
                gap_level=max_gap,
                severity=sev,
                gap_count=len(members),
                critical_count=sum(
                    1 for m in members if m.severity == GapSeverity.CRITICAL
                ),
                high_count=sum(1 for m in members if m.severity == GapSeverity.HIGH),
                medium_count=sum(1 for m in members if m.severity == GapSeverity.MEDIUM),
                low_count=sum(1 for m in members if m.severity == GapSeverity.LOW),
                data_quality_status=dq,
            )
        )
    return aggregates
