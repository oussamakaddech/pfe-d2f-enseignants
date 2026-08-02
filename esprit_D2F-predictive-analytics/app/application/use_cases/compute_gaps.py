from datetime import date

from app.application.ports import AnalysisRepository, CompetencySource, ModelPort
from app.core.config import Settings
from app.domain.entities.competency import Competency
from app.domain.entities.skill_gap import SkillGap
from app.domain.services.gap_calculator import compute_gap, trend_from_levels
from app.domain.value_objects.enums import DEFAULT_TARGET_LEVEL, Trend
from app.domain.value_objects.enums import level_to_int


class ComputeGaps:
    def __init__(self, competency_source: CompetencySource, analysis_repository: AnalysisRepository, model_port: ModelPort, settings: Settings, teacher_source=None) -> None:
        self._competency_source = competency_source
        self._analysis_repository = analysis_repository
        self._model_port = model_port
        self._settings = settings
        self._teacher_source = teacher_source

    def execute(self, teacher_id: str) -> tuple[list[SkillGap], str, str | None]:
        """Calcule les gaps d'un enseignant dans son périmètre.

        Stratégie :
        1) Le modèle ML (entraîné sur un référentiel éventuellement partiel)
           prédit des brutes ; on les filtre au périmètre.
        2) Si aucun gap ML ne reste dans le périmètre (modèle hors référentiel)
           on complète avec l'heuristique sur le même périmètre afin qu'un
           enseignant n'ait jamais de page blanche ni de gaps hors métier.
        """
        scoped = self._scoped_competencies(teacher_id)
        ml_gaps = self._model_port.predict_gaps(teacher_id)
        if ml_gaps is not None:
            filtered = self._filter_to_scope_ids(scoped, ml_gaps)
            if filtered:
                self._analysis_repository.save_skill_gaps(filtered, teacher_id=teacher_id)
                return filtered, "ML", self._model_port.status().get("version")
            # Le ML ne couvre pas le périmètre : fallback heuristique ciblé.
            gaps = self._heuristic_on(competencies=scoped, teacher_id=teacher_id)
            self._analysis_repository.save_skill_gaps(gaps, teacher_id=teacher_id)
            return gaps, "HEURISTIC_FALLBACK", None

        gaps = self._heuristic(teacher_id)
        self._analysis_repository.save_skill_gaps(gaps, teacher_id=teacher_id)
        return gaps, "HEURISTIC_FALLBACK", None

    @staticmethod
    def _filter_to_scope_ids(competencies: list[Competency], gaps: list[SkillGap]) -> list[SkillGap]:
        """Retire les gaps hors périmètre (par id de compétence)."""
        allowed = {c.id for c in competencies}
        return [gap for gap in gaps if gap.competence_id in allowed]

    def _scoped_competencies(self, teacher_id: str) -> list[Competency]:
        """Compétences du périmètre de l'enseignant (département/UP/spécialité)."""
        if self._teacher_source is None:
            return self._competency_source.list_competencies()
        teacher = self._teacher_source.get_teacher(teacher_id)
        if teacher is None:
            return self._competency_source.list_competencies()
        up_id, dept_id, specialite = teacher.up_id, teacher.dept_id, teacher.specialite
        if not (up_id or dept_id or specialite):
            return self._competency_source.list_competencies()
        scoped = self._competency_source.list_competencies_for_scope(up_id, dept_id, specialite)
        return scoped if scoped else self._competency_source.list_competencies()

    def _heuristic(self, teacher_id: str) -> list[SkillGap]:
        competencies = self._scoped_competencies(teacher_id)
        return self._heuristic_on(competencies=competencies, teacher_id=teacher_id)

    def _heuristic_on(self, competencies: list[Competency], teacher_id: str) -> list[SkillGap]:
        levels = self._competency_source.get_teacher_savoir_levels(teacher_id)
        history = self._competency_source.get_teacher_savoir_levels_history(teacher_id)
        today = date.today()
        gaps: list[SkillGap] = []

        previous_levels = {sid: events[0][1] for sid, events in history.items() if events}

        for competency in competencies:
            current_level = self._average_current_level(competency, levels)
            previous_level = self._average_current_level(competency, previous_levels)
            gap_score, severity = compute_gap(
                current_level,
                float(competency.target_level),
                self._settings.seuil_gap_critique,
                self._settings.seuil_gap_haute,
                self._settings.seuil_gap_moyenne,
            )
            trend = trend_from_levels(current_level, previous_level)
            gaps.append(
                SkillGap(
                    teacher_id=teacher_id,
                    competence_id=competency.id,
                    competence_code=competency.code,
                    competence_nom=competency.nom,
                    current_level=current_level,
                    target_level=float(competency.target_level),
                    gap_score=gap_score,
                    severity=severity,
                    trend=trend,
                    as_of=today,
                )
            )
        return gaps

    @staticmethod
    def _average_current_level(competency, savoir_levels: dict[int, int]) -> float:
        ids = competency.savoir_ids()
        if not ids:
            return float(DEFAULT_TARGET_LEVEL)
        values = [savoir_levels.get(sid, 0) for sid in ids]
        if not any(values):
            return 0.0
        return sum(values) / len(ids)
