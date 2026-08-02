from collections import Counter
from dataclasses import dataclass

from app.domain.entities.skill_gap import SkillGap
from app.domain.entities.training_need import NeedTypeCollective, NeedTypeIndividual, TrainingNeed


@dataclass(frozen=True)
class TeacherScope:
    teacher_id: str
    scope_type: str
    scope_id: str | None


def detect_individual_needs(
    gaps_by_teacher: dict[str, list[SkillGap]],
    threshold: float,
) -> list[TrainingNeed]:
    needs: list[TrainingNeed] = []
    for teacher_id, gaps in gaps_by_teacher.items():
        for gap in gaps:
            if gap.gap_score >= threshold:
                needs.append(
                    TrainingNeed(
                        need_type=NeedTypeIndividual,
                        competence_id=gap.competence_id,
                        competence_code=gap.competence_code,
                        competence_nom=gap.competence_nom,
                        teachers_count=1,
                        evidence={"teacher_id": teacher_id, "gap_score": round(gap.gap_score, 4), "severity": gap.severity.api_value()},
                        scope_type="ENSEIGNANT",
                        scope_id=teacher_id,
                    )
                )
    return needs


def detect_collective_needs(
    gaps_by_teacher: dict[str, list[SkillGap]],
    teacher_scopes: dict[str, TeacherScope],
    threshold: float,
    min_teachers: int,
) -> list[TrainingNeed]:
    key_count: Counter[tuple[int, str, str | None]] = Counter()
    first_gap: dict[tuple[int, str, str | None], SkillGap] = {}

    for teacher_id, gaps in gaps_by_teacher.items():
        scope = teacher_scopes.get(teacher_id)
        for gap in gaps:
            if gap.gap_score < threshold:
                continue
            scope_type = scope.scope_type if scope else "GLOBAL"
            scope_id = scope.scope_id if scope else None
            key = (gap.competence_id, scope_type, scope_id)
            key_count[key] += 1
            first_gap.setdefault(key, gap)

    needs: list[TrainingNeed] = []
    for (competence_id, scope_type, scope_id), count in key_count.items():
        if count < min_teachers:
            continue
        gap = first_gap[(competence_id, scope_type, scope_id)]
        needs.append(
            TrainingNeed(
                need_type=NeedTypeCollective,
                competence_id=competence_id,
                competence_code=gap.competence_code,
                competence_nom=gap.competence_nom,
                teachers_count=count,
                evidence={"min_gap_score": round(gap.gap_score, 4), "teachers_threshold": min_teachers},
                scope_type=scope_type,
                scope_id=scope_id,
            )
        )
    return needs
