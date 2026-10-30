from dataclasses import dataclass
from datetime import date

from app.domain.entities.competency import Competency


@dataclass(frozen=True)
class TeacherCompetencyState:
    teacher_id: str
    competency: Competency
    observed_result: float
    previous_observed_result: float | None
    savoir_levels: dict[int, int]