from datetime import date

from app.application.ports import AnalysisRepository, CompetencySource, FormationSource
from app.domain.entities.competency import Competency
from app.domain.entities.recommendation import Recommendation
from app.domain.entities.teacher_competency_state import TeacherCompetencyState
from app.domain.services.ranking_service import content_match, rank_candidates


class RecommendTrainings:
    def __init__(
        self,
        competency_source: CompetencySource,
        formation_source: FormationSource,
        analysis_repository: AnalysisRepository,
        model_port=None,  # optionnel : ModelPort pour le blending ML
    ) -> None:
        self._competency_source = competency_source
        self._formation_source = formation_source
        self._analysis_repository = analysis_repository
        self._model_port = model_port

    def execute(self, teacher_id: str, competence_id: int, limit: int) -> list[Recommendation]:
        competency = self._find_competency(competence_id)
        if competency is None:
            return []

        state = TeacherCompetencyState(
            teacher_id=teacher_id,
            competency=competency,
            current_level=self._current_level(competency, teacher_id),
            previous_level=None,
            savoir_levels=self._competency_source.get_teacher_savoir_levels(teacher_id),
        )

        candidates = self._formation_source.get_candidates_for_competency(competence_id)
        completed = self._formation_source.get_completed_formation_ids(teacher_id)
        candidates = [self._mark_completed(candidate, completed) for candidate in candidates]

        recommendations = rank_candidates(candidates, state, date.today(), limit)

        # Blending ML : si le modele de pertinence est disponible, on mixe
        # 70% heuristique / 30% ML (lisse l'impact des erreurs ML).
        if self._model_port is not None and getattr(self._model_port, "relevance_available", lambda: False)():
            state_today = date.today()
            enhanced: list[Recommendation] = []
            for rec in recommendations:
                h_score = content_match(
                    next(c for c in candidates if c.formation_id == rec.formation_id), state
                )
                ml_score = self._model_port.score_relevance(teacher_id, rec.formation_id, h_score)
                if ml_score is None:
                    enhanced.append(rec)
                    continue
                blended = 0.7 * rec.rank_score + 0.3 * ml_score
                from dataclasses import replace
                enhanced.append(replace(rec, rank_score=round(blended, 4)))
            recommendations = sorted(enhanced, key=lambda r: r.rank_score, reverse=True)

        self._analysis_repository.save_recommendations(recommendations)
        return recommendations

    def _find_competency(self, competence_id: int) -> Competency | None:
        return next((c for c in self._competency_source.list_competencies() if c.id == competence_id), None)

    def _current_level(self, competency: Competency, teacher_id: str) -> float:
        levels = self._competency_source.get_teacher_savoir_levels(teacher_id)
        ids = competency.savoir_ids()
        if not ids:
            return 0.0
        values = [levels.get(sid, 0) for sid in ids]
        return sum(values) / len(ids) if any(values) else 0.0

    @staticmethod
    def _mark_completed(candidate, completed: set[int]):
        from dataclasses import replace

        return replace(candidate, already_completed=candidate.formation_id in completed)
