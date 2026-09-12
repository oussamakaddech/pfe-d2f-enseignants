from dataclasses import dataclass, field
from datetime import date

from app.domain.value_objects.enums import Severity, Trend


@dataclass(frozen=True)
class SkillGap:
    teacher_id: str
    competence_id: int
    competence_code: str
    competence_nom: str
    observed_result: float
    knowledge_difficulty_level: float
    gap_score: float
    severity: Severity
    trend: Trend
    as_of: date

    def to_dict(self) -> dict:
        return {
            "competence_id": self.competence_id,
            "competence_code": self.competence_code,
            "competence_nom": self.competence_nom,
            "observed_result": self.observed_result,
            "knowledge_difficulty_level": self.knowledge_difficulty_level,
            "gap_score": self.gap_score,
            "severity": self.severity.api_value(),
            "trend": self.trend.value,
            "as_of": self.as_of.isoformat(),
        }