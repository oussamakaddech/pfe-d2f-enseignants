from datetime import date

from app.application.ports import AnalysisRepository, CompetencySource, FormationSource
from app.domain.entities.competency import Competency
from app.domain.entities.recommendation import Recommendation
from app.domain.entities.teacher_competency_state import TeacherCompetencyState
from app.domain.services.ranking_service import RankingWeights, content_match, rank_candidates


class RecommendTrainings:
    # Injecte : source des compétences, source des formations, dépôt
    # d'analyse et (optionnel) port ML pour le blending des scores.
    def __init__(
        self,
        competency_source: CompetencySource,
        formation_source: FormationSource,
        analysis_repository: AnalysisRepository,
        model_port=None,  # optionnel : ModelPort pour le blending ML
        settings=None,  # optionnel : pondérations externalisées (CDC DSI 1.1)
    ) -> None:
        self._competency_source = competency_source
        self._formation_source = formation_source
        self._analysis_repository = analysis_repository
        self._model_port = model_port
        self._weights = self._build_weights(settings)
        # Part du score ML dans le mélange ; 0.0 => heuristique pure.
        self._ml_blend_ratio = (
            getattr(settings, "ranking_ml_blend_ratio", 0.30) if settings is not None else 0.30
        )

    # Construit les pondérations de classement depuis la configuration.
    # Sans settings (tests, appels directs), on retombe sur les valeurs par
    # défaut documentées de RankingWeights — jamais sur des constantes muettes.
    @staticmethod
    def _build_weights(settings) -> RankingWeights:
        if settings is None:
            return RankingWeights()
        return RankingWeights(
            content=settings.ranking_weight_content,
            quality=settings.ranking_weight_quality,
            recency=settings.ranking_weight_recency,
            recency_lookback_days=settings.ranking_recency_lookback_days,
            eval_scale_max=settings.ranking_eval_scale_max,
        )

    # Recommande les `limit` meilleures formations pour une compétence donnée :
    # construit l'état de compétence de l'enseignant, marque les formations
    # déjà suivies, classe les candidates (heuristique) puis mélange
    # éventuellement 70% heuristique / 30% ML, et persiste les recommandations.
    def execute(
        self, teacher_id: str, competence_id: int, limit: int,
        dept_id: str | None = None, up_id: str | None = None,
    ) -> list[Recommendation]:
        competency = self._find_competency(competence_id)
        if competency is None:
            return []

        state = TeacherCompetencyState(
            teacher_id=teacher_id,
            competency=competency,
            observed_result=self._current_level(competency, teacher_id),
            previous_observed_result=None,
            savoir_levels=self._competency_source.get_teacher_savoir_levels(teacher_id),
        )

        candidates = self._formation_source.get_candidates_for_competency(
            competence_id, dept_id=dept_id, up_id=up_id,
        )
        completed = self._formation_source.get_completed_formation_ids(teacher_id)
        candidates = [self._mark_completed(candidate, completed) for candidate in candidates]

        recommendations = rank_candidates(candidates, state, date.today(), limit, self._weights)

        # Blending ML : si le modele de pertinence est disponible, on mixe
        # l'heuristique et le ML selon le ratio configure (lisse l'impact des
        # erreurs ML). Ratio 0.30 par defaut => 70% heuristique / 30% ML.
        if self._model_port is not None and getattr(self._model_port, "relevance_available", lambda: False)():
            by_id = {c.formation_id: c for c in candidates}
            ml_ratio = self._ml_blend_ratio
            enhanced: list[Recommendation] = []
            for rec in recommendations:
                candidate = by_id.get(rec.formation_id)
                if candidate is None:
                    enhanced.append(rec)
                    continue
                h_score = content_match(candidate, state)
                ml_score = self._model_port.score_relevance(teacher_id, rec.formation_id, h_score)
                if ml_score is None:
                    enhanced.append(rec)
                    continue
                blended = (1.0 - ml_ratio) * rec.rank_score + ml_ratio * ml_score
                from dataclasses import replace
                enhanced.append(replace(rec, rank_score=round(blended, 4)))
            recommendations = sorted(enhanced, key=lambda r: r.rank_score, reverse=True)

        self._analysis_repository.save_recommendations(recommendations)
        return recommendations

    # Cherche une compétence par son ID dans la liste des compétences connues.
    def _find_competency(self, competence_id: int) -> Competency | None:
        return next((c for c in self._competency_source.list_competencies() if c.id == competence_id), None)

    # Niveau actuel moyen de l'enseignant sur les savoirs de la compétence (0 si vide).
    def _current_level(self, competency: Competency, teacher_id: str) -> float:
        levels = self._competency_source.get_teacher_savoir_levels(teacher_id)
        ids = competency.savoir_ids()
        if not ids:
            return 0.0
        values = [levels.get(sid, 0) for sid in ids]
        return sum(values) / len(ids) if any(values) else 0.0

    # Marque une formation candidate comme "déjà suivie" si son ID figure
    # dans l'historique des formations complétées de l'enseignant.
    @staticmethod
    def _mark_completed(candidate, completed: set[int]):
        from dataclasses import replace

        return replace(candidate, already_completed=candidate.formation_id in completed)
