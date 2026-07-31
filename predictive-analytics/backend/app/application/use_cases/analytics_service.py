"""Use cases: orchestration repository -> moteurs, avec cache contrôlé."""

from __future__ import annotations

import logging
from datetime import date

from app.application.ports import TeacherContextProvider
from app.core.exceptions import TeacherNotFoundError
from app.domain.entities.gap import TeacherGapAnalysis
from app.engines.data_quality_engine import (
    DataQualityEngine,
    TeacherDataQualityReport,
)
from app.engines.dashboard_engine import (
    DashboardEngine,
    GlobalKpis,
    HeatmapCell,
    RiskRow,
    TrainingDemandRow,
)
from app.engines.gap_engine import GapEngine
from app.engines.learning_path_engine import LearningPath, LearningPathEngine
from app.engines.recommendation_engine import (
    RecommendationEngine,
    RecommendationResult,
)
from app.engines.risk_engine import RiskEngine, RiskProfile
from app.infrastructure.cache.in_memory_cache import InMemoryCache
from app.ml.inference.scoring import InferenceService, ScoreResponse

logger = logging.getLogger(__name__)


class AnalyticsUseCases:
    def __init__(
        self,
        provider: TeacherContextProvider,
        *,
        gap_engine: GapEngine | None = None,
        recommendation_engine: RecommendationEngine | None = None,
        learning_path_engine: LearningPathEngine | None = None,
        risk_engine: RiskEngine | None = None,
        data_quality_engine: DataQualityEngine | None = None,
        dashboard_engine: DashboardEngine | None = None,
        inference: InferenceService | None = None,
        cache: InMemoryCache | None = None,
        cache_ttl: int = 60,
    ) -> None:
        self.provider = provider
        self.gap_engine = gap_engine or GapEngine()
        self.recommendation_engine = recommendation_engine or RecommendationEngine()
        self.learning_path_engine = learning_path_engine or LearningPathEngine()
        self.risk_engine = risk_engine or RiskEngine()
        self.data_quality_engine = data_quality_engine or DataQualityEngine()
        self.dashboard_engine = dashboard_engine
        self.inference = inference
        self.cache = cache or InMemoryCache(default_ttl_seconds=cache_ttl)
        self.cache_ttl = cache_ttl

    # ------------------------------------------------------------------ helpers
    def _context(self, teacher_id: str):
        context = self.provider.build_context(teacher_id)
        if context is None:
            raise TeacherNotFoundError(teacher_id)
        return context

    def _cached(self, key: str, loader, ttl: int | None = None):
        cached = self.cache.get(key)
        if cached is not None:
            return cached
        value = loader()
        self.cache.set(key, value, ttl or self.cache_ttl)
        return value

    # ------------------------------------------------------------- per teacher
    def get_gaps(self, teacher_id: str) -> TeacherGapAnalysis:
        def load() -> TeacherGapAnalysis:
            context = self._context(teacher_id)
            return self.gap_engine.analyze(context)

        return self._cached(f"gaps:{teacher_id}", load)

    def get_recommendations(self, teacher_id: str) -> RecommendationResult:
        def load() -> RecommendationResult:
            context = self._context(teacher_id)
            analysis = self.gap_engine.analyze(context)
            return self.recommendation_engine.recommend(context, analysis)

        return self._cached(f"recs:{teacher_id}", load)

    def get_learning_path(self, teacher_id: str) -> LearningPath:
        def load() -> LearningPath:
            context = self._context(teacher_id)
            analysis = self.gap_engine.analyze(context)
            recs = self.recommendation_engine.recommend(context, analysis)
            return self.learning_path_engine.build(context, recs)

        return self._cached(f"path:{teacher_id}", load)

    def get_risk(self, teacher_id: str) -> RiskProfile:
        def load() -> RiskProfile:
            context = self._context(teacher_id)
            analysis = self.gap_engine.analyze(context)
            ml_prob = None
            model_version = None
            if self.inference is not None:
                try:
                    score = self.inference.score("stagnation_risk_future", teacher_id)
                    if score.status == "OK":
                        ml_prob = score.score
                        model_version = score.model_version
                except Exception:  # noqa: BLE001
                    logger.warning("score stagnation ML indisponible pour %s", teacher_id)
            return self.risk_engine.evaluate(context, analysis, ml_prob, model_version)

        return self._cached(f"risk:{teacher_id}", load, ttl=self.cache_ttl * 2)

    def get_data_quality(self, teacher_id: str) -> TeacherDataQualityReport:
        def load() -> TeacherDataQualityReport:
            context = self._context(teacher_id)
            return self.data_quality_engine.audit(context)

        return self._cached(f"quality:{teacher_id}", load)

    def score(self, target: str, teacher_id: str) -> ScoreResponse:
        if self.inference is None:
            raise RuntimeError("inference service non configuré")
        return self.inference.score(target, teacher_id)

    # ------------------------------------------------------------- dashboard
    def dashboard_kpis(self) -> GlobalKpis:
        if self.dashboard_engine is None:
            raise RuntimeError("dashboard engine non configuré")
        return self._cached("dashboard:kpis", self.dashboard_engine.kpis, ttl=self.cache_ttl * 3)

    def dashboard_teachers_at_risk(self) -> list[RiskRow]:
        if self.dashboard_engine is None:
            raise RuntimeError("dashboard engine non configuré")
        return self._cached(
            "dashboard:at-risk", self.dashboard_engine.teachers_at_risk, ttl=self.cache_ttl * 3
        )

    def dashboard_gap_heatmap(self) -> list[HeatmapCell]:
        if self.dashboard_engine is None:
            raise RuntimeError("dashboard engine non configuré")
        return self._cached(
            "dashboard:heatmap", self.dashboard_engine.gap_heatmap, ttl=self.cache_ttl * 3
        )

    def dashboard_training_demand(self) -> list[TrainingDemandRow]:
        if self.dashboard_engine is None:
            raise RuntimeError("dashboard engine non configuré")
        return self._cached(
            "dashboard:demand", self.dashboard_engine.training_demand, ttl=self.cache_ttl * 3
        )
