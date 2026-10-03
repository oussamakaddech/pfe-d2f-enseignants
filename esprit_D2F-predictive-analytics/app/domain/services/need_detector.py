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


def _scope_key(scope: TeacherScope | None) -> tuple[str, str | None]:
    """Perimetre d'un enseignant, avec repli GLOBAL quand il est inconnu."""
    if scope is None:
        return "GLOBAL", None
    return scope.scope_type, scope.scope_id


def _aggregate_collective_keys(
    gaps_by_teacher: dict[str, list[SkillGap]],
    teacher_scopes: dict[str, TeacherScope],
    threshold: float,
) -> tuple[
    Counter[tuple[int, str, str | None]],
    dict[tuple[int, str, str | None], SkillGap],
    dict[tuple[int, str, str | None], float],
]:
    """Regroupe les ecarts au-dessus du seuil par (competence, perimetre).

    Renvoie le nombre d'enseignants par cle, le gap de reference pour le libelle
    (premier rencontre) et le gap MINIMAL reellement observe : la preuve annonce
    un "min_gap_score", elle doit porter le minimum du groupe et non le score de
    la premiere ligne croisee.
    """
    key_count: Counter[tuple[int, str, str | None]] = Counter()
    first_gap: dict[tuple[int, str, str | None], SkillGap] = {}
    min_score: dict[tuple[int, str, str | None], float] = {}

    for teacher_id, gaps in gaps_by_teacher.items():
        scope_type, scope_id = _scope_key(teacher_scopes.get(teacher_id))
        for gap in gaps:
            if gap.gap_score < threshold:
                continue
            key = (gap.competence_id, scope_type, scope_id)
            key_count[key] += 1
            first_gap.setdefault(key, gap)
            previous = min_score.get(key)
            if previous is None or gap.gap_score < previous:
                min_score[key] = gap.gap_score

    return key_count, first_gap, min_score


# Détecte les besoins de formation COLLECTIFS : regroupe les écarts par
# (compétence, périmètre — département/UP/global) et ne retient que ceux
# touchant au moins `min_teachers` enseignants.
def detect_collective_needs(
    gaps_by_teacher: dict[str, list[SkillGap]],
    teacher_scopes: dict[str, TeacherScope],
    threshold: float,
    min_teachers: int,
) -> list[TrainingNeed]:
    key_count, first_gap, min_score = _aggregate_collective_keys(
        gaps_by_teacher, teacher_scopes, threshold
    )

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
