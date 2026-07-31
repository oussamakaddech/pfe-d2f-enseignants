from __future__ import annotations

from datetime import date
from typing import Any

from pydantic import BaseModel, ConfigDict, Field, field_validator

from app.domain.enums.gap import GapSeverity, GapType
from app.domain.enums.quality import DataQualityStatus
from app.domain.value_objects.explainability import Explainability


class GapDiagnostic(BaseModel):
    """Un gap unitaire, explicable, au niveau savoir (feuille du référentiel)."""

    model_config = ConfigDict(extra="allow")

    teacher_id: str
    domain_id: str = ""
    competency_id: str = ""
    sub_competency_id: str = ""
    knowledge_id: str = ""
    knowledge_code: str = ""
    knowledge_name: str = ""
    knowledge_type: str = "THEORETICAL"
    current_level: int | None = None
    required_level: int | None = None
    gap_level: int = 0
    gap_type: GapType = GapType.LEVEL_DEFICIT
    severity: GapSeverity = GapSeverity.LOW
    evidence: list[dict[str, Any]] = Field(default_factory=list)
    explainability: Explainability | None = None
    data_quality_status: DataQualityStatus = DataQualityStatus.COMPLETE
    detected_at: date | None = None

    @property
    def is_zero(self) -> bool:
        return self.gap_level == 0 and self.gap_type not in {
            GapType.MISSING_ASSIGNMENT,
            GapType.MISSING_PREREQUISITE,
            GapType.INCOMPLETE_PROFILE,
        }


class GapAggregate(BaseModel):
    """Agrégation d'un gap à un niveau de la hiérarchie."""

    model_config = ConfigDict(extra="allow")

    teacher_id: str
    level: str  # DOMAIN | COMPETENCY | SUB_COMPETENCY
    ref_id: str
    ref_code: str = ""
    ref_name: str = ""
    parent_ref_id: str = ""
    gap_level: int = 0
    severity: GapSeverity = GapSeverity.LOW
    gap_count: int = 0
    critical_count: int = 0
    high_count: int = 0
    medium_count: int = 0
    low_count: int = 0
    data_quality_status: DataQualityStatus = DataQualityStatus.COMPLETE


class TeacherGapAnalysis(BaseModel):
    """Résultat complet du GapEngine pour un enseignant."""

    teacher_id: str
    gaps: list[GapDiagnostic] = Field(default_factory=list)
    aggregates: list[GapAggregate] = Field(default_factory=list)
    data_quality_status: DataQualityStatus = DataQualityStatus.COMPLETE
    detected_at: date | None = None
    has_competency_records: bool = True
    warnings: list[str] = Field(default_factory=list)

    def severities(self) -> dict[str, int]:
        counts = {"LOW": 0, "MEDIUM": 0, "HIGH": 0, "CRITICAL": 0}
        for g in self.gaps:
            counts[g.severity.value] += 1
        return counts
