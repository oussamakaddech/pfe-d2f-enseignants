from collections import Counter
from dataclasses import dataclass
from typing import Callable

from app.application.ports import TrainingNeedRepository
from app.core.config import Settings
from app.core.logging import get_logger
from app.domain.entities.skill_gap import SkillGap
from app.domain.entities.training_need import NeedTypeCollective, NeedTypeIndividual, TrainingNeed
from app.domain.services.need_detector import TeacherScope

logger = get_logger("detect_needs")


@dataclass
class NeedDetectionResult:
    # Résultat de la détection : liste des besoins individuels et collectifs.
    individual: list[TrainingNeed]
    collective: list[TrainingNeed]

    # Nombre total de besoins détectés (individuels + collectifs).
    @property
    def total(self) -> int:
        return len(self.individual) + len(self.collective)


class DetectNeeds:
    # Injecte : le fournisseur de gaps par enseignant, le fournisseur des
    # périmètres, le dépôt des besoins de formation et la configuration.
    def __init__(
        self,
        gaps_provider: Callable[[str], list[SkillGap]],
        teacher_scopes_provider: Callable[[], dict[str, TeacherScope]],
        training_need_repository: TrainingNeedRepository,
        settings: Settings,
    ) -> None:
        self._gaps_provider = gaps_provider
        self._teacher_scopes_provider = teacher_scopes_provider
        self._training_need_repository = training_need_repository
        self._settings = settings

    # Orchestration : récupère les gaps de chaque enseignant (tolérant aux
    # erreurs), puis lance les détections individuelle et collective.
    def execute(self) -> NeedDetectionResult:
        scopes = self._teacher_scopes_provider()
        gaps_by_teacher: dict[str, list[SkillGap]] = {}
        for teacher_id in scopes:
            try:
                gaps = self._gaps_provider(teacher_id)
            except Exception as exc:
                logger.warning("gaps indisponibles pour detection besoins", teacher_id=teacher_id, error=str(exc))
                gaps = []
            gaps_by_teacher[teacher_id] = gaps

        individual = self._detect_individual(gaps_by_teacher)
        collective = self._detect_collective(gaps_by_teacher, scopes)
        return NeedDetectionResult(individual=individual, collective=collective)

    # Besoins individuels : un gap au-dessus du seuil → 1 besoin pour cet enseignant.
    def _detect_individual(self, gaps_by_teacher: dict[str, list[SkillGap]]) -> list[TrainingNeed]:
        needs: list[TrainingNeed] = []
        for teacher_id, gaps in gaps_by_teacher.items():
            for gap in gaps:
                if gap.gap_score >= self._settings.need_detection_threshold:
                    needs.append(
                        TrainingNeed(
                            need_type=NeedTypeIndividual,
                            competence_id=gap.competence_id,
                            competence_code=gap.competence_code,
                            competence_nom=gap.competence_nom,
                            teachers_count=1,
                            evidence={
                                "teacher_id": teacher_id,
                                "gap_score": round(gap.gap_score, 4),
                                "severity": gap.severity.api_value(),
                            },
                            scope_type="ENSEIGNANT",
                            scope_id=teacher_id,
                        )
                    )
        return needs

    # Besoins collectifs : regroupe les gaps par (compétence, périmètre) et ne
    # garde que ceux touchant au moins `need_detection_min_teachers` enseignants.
    def _detect_collective(self, gaps_by_teacher: dict[str, list[SkillGap]], scopes: dict[str, TeacherScope]) -> list[TrainingNeed]:
        key_count: Counter[tuple[int, str, str | None]] = Counter()
        first_gap: dict[tuple[int, str, str | None], SkillGap] = {}

        for teacher_id, gaps in gaps_by_teacher.items():
            scope = scopes.get(teacher_id)
            scope_type = scope.scope_type if scope else "GLOBAL"
            scope_id = scope.scope_id if scope else None
            for gap in gaps:
                if gap.gap_score < self._settings.need_detection_threshold:
                    continue
                key = (gap.competence_id, scope_type, scope_id)
                key_count[key] += 1
                first_gap.setdefault(key, gap)

        needs: list[TrainingNeed] = []
        for (competence_id, scope_type, scope_id), count in key_count.items():
            if count < self._settings.need_detection_min_teachers:
                continue
            gap = first_gap[(competence_id, scope_type, scope_id)]
            needs.append(
                TrainingNeed(
                    need_type=NeedTypeCollective,
                    competence_id=competence_id,
                    competence_code=gap.competence_code,
                    competence_nom=gap.competence_nom,
                    teachers_count=count,
                    evidence={
                        "min_gap_score": round(gap.gap_score, 4),
                        "teachers_threshold": self._settings.need_detection_min_teachers,
                    },
                    scope_type=scope_type,
                    scope_id=scope_id,
                )
            )
        return needs

    # Sauvegarde tous les besoins détectés (individuels puis collectifs) en base.
    def persist(self, result: NeedDetectionResult) -> None:
        for need in result.individual:
            self._training_need_repository.save(need)
        for need in result.collective:
            self._training_need_repository.save(need)
