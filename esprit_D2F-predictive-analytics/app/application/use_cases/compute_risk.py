from app.application.ports import AnalysisRepository, BesoinSource, CompetencySource, EvaluationSource, FormationSource, ModelPort
from app.core.config import Settings
from app.domain.entities.risk_profile import RiskProfile
from app.domain.services.risk_calculator import RiskInputs, compute_risk

DECLINE_LOOKBACK_MONTHS = 12
STAGNATION_LOOKBACK_MONTHS = 18


class ComputeRisk:
    def __init__(
        self,
        competency_source: CompetencySource,
        formation_source: FormationSource,
        evaluation_source: EvaluationSource,
        besoin_source: BesoinSource,
        analysis_repository: AnalysisRepository,
        model_port: ModelPort,
        settings: Settings,
    ) -> None:
        self._competency_source = competency_source
        self._formation_source = formation_source
        self._evaluation_source = evaluation_source
        self._besoin_source = besoin_source
        self._analysis_repository = analysis_repository
        self._model_port = model_port
        self._settings = settings

    def execute(self, teacher_id: str) -> tuple[RiskProfile, str, str | None, str | None]:
        status = self._model_port.status()
        model_mode = status.get("model_mode") or "HEURISTIC_FALLBACK"
        model_version = status.get("model_version")
        model_name = status.get("artifact_name") or status.get("model_name")

        ml_profile = self._model_port.predict_risk(teacher_id)
        if ml_profile is not None:
            self._analysis_repository.save_risk_snapshot(ml_profile)
            return ml_profile, model_mode, model_version, model_name

        profile = self._heuristic(teacher_id)
        self._analysis_repository.save_risk_snapshot(profile)
        return profile, model_mode, model_version, model_name

    def _heuristic(self, teacher_id: str) -> RiskProfile:
        history = self._competency_source.get_teacher_savoir_levels_history(teacher_id)
        has_decline = self._has_decline(history)

        latest_date = None
        for events in history.values():
            for date_str, _ in events:
                if latest_date is None or date_str > latest_date:
                    latest_date = date_str

        stagnation_months = self._stagnation_months(latest_date)
        attendance = self._formation_source.get_attendance_rate(teacher_id)
        avg_eval = self._evaluation_source.get_avg_eval_score(teacher_id)
        needs = self._besoin_source.count_declared_needs(teacher_id, 12)
        last_activity = self._formation_source.get_days_since_last_activity(teacher_id)

        inputs = RiskInputs(
            teacher_id=teacher_id,
            stagnation_months=stagnation_months,
            declined=has_decline,
            attendance_rate=attendance if attendance is not None else 0.5,
            avg_eval_score=avg_eval,
            repeated_need_count=float(needs),
            days_since_last_activity=last_activity,
        )
        return compute_risk(inputs, self._settings.risk_weights)

    def _stagnation_months(self, latest_date: str | None) -> float:
        if latest_date is None:
            return float(STAGNATION_LOOKBACK_MONTHS)
        from datetime import date, datetime

        try:
            last = datetime.fromisoformat(latest_date).date()
        except ValueError:
            return float(STAGNATION_LOOKBACK_MONTHS)
        return (date.today() - last).days / 30.44

    def _has_decline(self, history: dict[int, list[tuple[str, int]]]) -> bool:
        for events in history.values():
            levels = [level for _, level in events]
            if len(levels) >= 2 and levels[-1] < levels[0]:
                return True
        return False
