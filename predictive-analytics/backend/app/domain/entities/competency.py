from __future__ import annotations

from datetime import date
from typing import Optional

from pydantic import BaseModel, ConfigDict, Field, field_validator

from app.domain.enums.gap import KnowledgeType, Level


def _level_int(v: int | Level | str | None) -> int | None:
    if v is None or v == "":
        return None
    if isinstance(v, Level):
        return v.int_value
    if isinstance(v, int):
        return v
    if isinstance(v, str):
        if v.upper().startswith("N") and len(v) == 2:
            return Level(v.upper()).int_value
        return int(v)
    raise TypeError(f"Invalid level value: {v!r}")


class Domain(BaseModel):
    model_config = ConfigDict(frozen=True, extra="ignore")

    domain_id: str
    code: str = ""
    name: str = ""


class Competency(BaseModel):
    model_config = ConfigDict(frozen=True, extra="ignore")

    competency_id: str
    code: str = ""
    name: str = ""
    domain_id: str = ""


class SubCompetency(BaseModel):
    model_config = ConfigDict(frozen=True, extra="ignore")

    sub_competency_id: str
    code: str = ""
    name: str = ""
    competency_id: str = ""


class Knowledge(BaseModel):
    """Savoir = feuille du référentiel. required_level est la valeur de référence."""

    model_config = ConfigDict(frozen=True, extra="ignore")

    knowledge_id: str
    code: str = ""
    name: str = ""
    sub_competency_id: str = ""
    knowledge_type: KnowledgeType = KnowledgeType.THEORETICAL
    required_level: int = Field(default=1, ge=1, le=5)
    prereq_knowledge_ids: list[str] = Field(default_factory=list)

    @field_validator("required_level", mode="before")
    @classmethod
    def _norm_required(cls, v):
        return _level_int(v)


class KnowledgeRecord(BaseModel):
    """Niveau d'un enseignant pour un savoir (source: évaluation/assignment)."""

    model_config = ConfigDict(frozen=True, extra="ignore")

    teacher_id: str
    knowledge_id: str
    current_level: Optional[int] = Field(default=None, ge=1, le=5)
    last_assessment_date: Optional[date] = None
    validated: bool = False
    source: str = "UNKNOWN"

    @field_validator("current_level", mode="before")
    @classmethod
    def _norm_current(cls, v):
        return _level_int(v)


class RequiredLevelOverride(BaseModel):
    """Niveau requis spécifique (ex: référentiel de poste)."""

    model_config = ConfigDict(frozen=True, extra="ignore")

    knowledge_id: str
    required_level: int = Field(ge=1, le=5)
    is_critical: bool = False


class CompetencyHierarchy(BaseModel):
    """Référentiel complet: Domaines -> Compétences -> Sous-compétences -> Savoirs."""

    domains: list[Domain] = Field(default_factory=list)
    competencies: list[Competency] = Field(default_factory=list)
    sub_competencies: list[SubCompetency] = Field(default_factory=list)
    knowledges: list[Knowledge] = Field(default_factory=list)

    def knowledge_by_id(self, knowledge_id: str) -> Knowledge | None:
        return next((k for k in self.knowledges if k.knowledge_id == knowledge_id), None)

    def sub_by_id(self, sub_competency_id: str) -> SubCompetency | None:
        return next(
            (s for s in self.sub_competencies if s.sub_competency_id == sub_competency_id),
            None,
        )

    def competency_by_id(self, competency_id: str) -> Competency | None:
        return next(
            (c for c in self.competencies if c.competency_id == competency_id), None
        )

    def domain_by_id(self, domain_id: str) -> Domain | None:
        return next((d for d in self.domains if d.domain_id == domain_id), None)

    def knowledges_for_sub(self, sub_competency_id: str) -> list[Knowledge]:
        return [k for k in self.knowledges if k.sub_competency_id == sub_competency_id]

    def sub_competencies_for_competency(self, competency_id: str) -> list[SubCompetency]:
        return [
            s
            for s in self.sub_competencies
            if s.competency_id == competency_id
        ]

    def competencies_for_domain(self, domain_id: str) -> list[Competency]:
        return [c for c in self.competencies if c.domain_id == domain_id]
