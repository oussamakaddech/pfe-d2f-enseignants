from datetime import date

from app.application.ports import AnalysisRepository, CompetencySource, ModelPort
from app.core.config import Settings
from app.domain.entities.skill_gap import SkillGap
from app.domain.services.gap_calculator import compute_gap, trend_from_levels
from app.domain.value_objects.enums import DEFAULT_TARGET_LEVEL, Trend
from app.domain.value_objects.enums import level_to_int


class ComputeGaps:
    def __init__(self, competency_source: CompetencySource, analysis_repository: AnalysisRepository, model_port: ModelPort, settings: Settings) -> None:
        self._competency_source = competency_source
        self._analysis_repository = analysis_repository
        self._model_port = model_port
        self._settings = settings

    def execute(self, teacher_id: str) -> tuple[list[SkillGap], str, str | None]:
        ml_gaps = self._model_port.predict_gaps(teacher_id)
        if ml_gaps is not None:
            self._analysis_repository.save_skill_gaps(ml_gaps)
            return ml_gaps, "ML", self._model_port.status().get("version")

        gaps = self._heuristic(teacher_id)
        self._analysis_repository.save_skill_gaps(gaps)
        return gaps, "HEURISTIC_FALLBACK", None

    def _heuristic(self, teacher_id: str) -> list[SkillGap]:
        competencies = self._competency_source.list_competencies()
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
