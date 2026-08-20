from datetime import date
from typing import Callable

from app.application.ports import DashboardRepository
from app.core.logging import get_logger
from app.domain.entities.risk_profile import RiskProfile
from app.domain.entities.skill_gap import SkillGap
from app.domain.services.dashboard_aggregator import aggregate_declining, summarize_kpis
from app.domain.services.need_detector import TeacherScope

logger = get_logger("build_dashboards")


class BuildDashboards:
    def __init__(
        self,
        gaps_provider: Callable[[str], list[SkillGap]],
        risk_provider: Callable[[str], RiskProfile | None],
        teacher_scopes_provider: Callable[[], dict[str, TeacherScope]],
        dashboard_repository: DashboardRepository,
    ) -> None:
        self._gaps_provider = gaps_provider
        self._risk_provider = risk_provider
        self._teacher_scopes_provider = teacher_scopes_provider
        self._dashboard_repository = dashboard_repository

    def execute(self, scope: str = "GLOBAL", scope_id: str | None = None) -> dict:
        scopes = self._teacher_scopes_provider()
        teacher_ids = [tid for tid, s in scopes.items() if scope == "GLOBAL" or s.scope_id == scope_id or s.scope_type == scope]

        declining_rows: list[dict] = []
        coverage_rows: list[dict] = []
        at_risk = 0
        total_score = 0.0
        scored = 0

        for teacher_id in teacher_ids:
            gaps = self._gaps_provider_safe(teacher_id)
            for declining, coverage, contribution in self._gap_rows(gaps, teacher_id):
                declining_rows.append(declining)
                coverage_rows.append(coverage)
                total_score += contribution
                scored += 1
            profile = self._risk_provider_safe(teacher_id)
            if profile is not None and profile.risk_score >= 70:
                at_risk += 1

        declining = aggregate_declining(declining_rows)
        coverage_rate = sum(r["covered"] for r in coverage_rows) / len(coverage_rows) if coverage_rows else 0.0

        kpis = {
            "scope": scope,
            "scope_id": scope_id,
            "teachers_analysed": len(teacher_ids),
            "teachers_at_risk": at_risk,
            "competencies_analysed": len(declining_rows),
            "average_competence_score": round(total_score / scored, 4) if scored else 0.0,
            "coverage_rate": round(coverage_rate, 4),
            "declining_competencies": declining,
            "snapshot_date": date.today().isoformat(),
        }
        kpis = summarize_kpis(kpis)
        self._dashboard_repository.save_snapshot(scope, scope_id, kpis)
        return kpis

    def _gaps_provider_safe(self, teacher_id: str) -> list[SkillGap]:
        try:
            return self._gaps_provider(teacher_id)
        except Exception as exc:
            logger.warning("gaps indisponibles pour dashboard", teacher_id=teacher_id, error=str(exc))
            return []

    def _risk_provider_safe(self, teacher_id: str) -> RiskProfile | None:
        try:
            return self._risk_provider(teacher_id)
        except Exception as exc:
            logger.warning("risque indisponible pour dashboard", teacher_id=teacher_id, error=str(exc))
            return None

    def _gap_rows(self, gaps: list[SkillGap], teacher_id: str):
        for gap in gaps:
            declining = {
                "competence_id": gap.competence_id,
                "competence_nom": gap.competence_nom,
                "current_avg": gap.observed_result,
                "previous_avg": gap.knowledge_difficulty_level
                - gap.gap_score * gap.knowledge_difficulty_level,
            }
            coverage = {
                "competence_id": gap.competence_id,
                "observed_result": int(gap.observed_result),
                "knowledge_difficulty_level": int(gap.knowledge_difficulty_level),
                "covered": gap.observed_result >= gap.knowledge_difficulty_level,
                "teacher_id": teacher_id,
            }
            contribution = (
                min(gap.observed_result / gap.knowledge_difficulty_level, 1.0)
                if gap.knowledge_difficulty_level
                else 0.0
            )
            yield declining, coverage, contribution
