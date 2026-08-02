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
            try:
                gaps = self._gaps_provider(teacher_id)
            except Exception as exc:
                logger.warning("gaps indisponibles pour dashboard", teacher_id=teacher_id, error=str(exc))
                gaps = []
            for gap in gaps:
                declining_rows.append(
                    {
                        "competence_id": gap.competence_id,
                        "competence_nom": gap.competence_nom,
                        "current_avg": gap.current_level,
                        "previous_avg": gap.target_level - gap.gap_score * gap.target_level,
                    }
                )
                coverage_rows.append(
                    {
                        "competence_id": gap.competence_id,
                        "current_level": int(gap.current_level),
                        "required_level": int(gap.target_level),
                        "covered": gap.current_level >= gap.target_level,
                        "teacher_id": teacher_id,
                    }
                )
                total_score += min(gap.current_level / gap.target_level, 1.0) if gap.target_level else 0.0
                scored += 1

            try:
                profile = self._risk_provider(teacher_id)
            except Exception as exc:
                logger.warning("risque indisponible pour dashboard", teacher_id=teacher_id, error=str(exc))
                profile = None
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
