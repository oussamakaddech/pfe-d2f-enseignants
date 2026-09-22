from collections import Counter
from dataclasses import dataclass

from app.domain.entities.skill_gap import SkillGap
from app.domain.entities.training_need import NeedTypeCollective, NeedTypeIndividual, TrainingNeed


@dataclass(frozen=True)
class TeacherScope:
    teacher_id: str
    scope_type: str
    scope_id: str | None
    # UP de rattachement (distincte du département) : permet le filtrage des
    # dashboards au périmètre UP du CUP (scope="UP").
    up_id: str | None = None


# Détecte les besoins de formation INDIVIDUELS : pour chaque enseignant, tout
# écart (gap) dont le score dépasse le seuil devient un besoin de type INDIVIDUEL.
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


# Détecte les besoins de formation COLLECTIFS : regroupe les écarts par
# (compétence, périmètre — département/UP/global) et ne retient que ceux
# touchant au moins `min_teachers` enseignants.
def detect_collective_needs(
    gaps_by_teacher: dict[str, list[SkillGap]],
    teacher_scopes: dict[str, TeacherScope],
    threshold: float,
    min_teachers: int,
) -> list[TrainingNeed]:
    key_count: Counter[tuple[int, str, str | None]] = Counter()
    # Gap de reference pour le libelle (premier rencontre) ET gap minimal
    # reellement observe : la preuve annonce un "min_gap_score", elle doit donc
    # porter le minimum du groupe, pas le score de la premiere ligne croisee.
    first_gap: dict[tuple[int, str, str | None], SkillGap] = {}
    min_score: dict[tuple[int, str, str | None], float] = {}

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
            previous = min_score.get(key)
            if previous is None or gap.gap_score < previous:
                min_score[key] = gap.gap_score

    needs: list[TrainingNeed] = []
    for (competence_id, scope_type, scope_id), count in key_count.items():
        if count < min_teachers:
            continue
        key = (competence_id, scope_type, scope_id)
        gap = first_gap[key]
        needs.append(
            TrainingNeed(
                need_type=NeedTypeCollective,
                competence_id=competence_id,
                competence_code=gap.competence_code,
                competence_nom=gap.competence_nom,
                teachers_count=count,
                evidence={"min_gap_score": round(min_score[key], 4), "teachers_threshold": min_teachers},
                scope_type=scope_type,
                scope_id=scope_id,
            )
        )
    return needs
