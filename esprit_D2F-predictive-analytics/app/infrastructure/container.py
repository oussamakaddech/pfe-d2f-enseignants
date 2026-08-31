from app.application.ports import (
    AlertRepository,
    AnalysisRepository,
    BesoinSource,
    CompetencySource,
    DashboardRepository,
    EvaluationSource,
    FormationSource,
    IdempotencyRepository,
    ModelPort,
    TeacherSource,
    TrainingNeedRepository,
)
from app.application.use_cases.analyze_teacher_scope import AnalyzeTeacherScope
from app.application.use_cases.build_dashboards import BuildDashboards
from app.application.use_cases.compute_gaps import ComputeGaps
from app.application.use_cases.compute_risk import ComputeRisk
from app.application.use_cases.detect_needs import DetectNeeds
from app.application.use_cases.generate_alerts import GenerateAlerts
from app.application.use_cases.process_event import ProcessEvent
from app.application.use_cases.recommend_trainings import RecommendTrainings
from app.core.config import Settings
from app.domain.services.need_detector import TeacherScope
from app.infrastructure.db.database import Database
from app.infrastructure.messaging.event_handlers import build_event_handlers
from app.infrastructure.ml.ml_observability import ml_observability
from app.infrastructure.ml.predictor import ArtifactModelPort
from app.infrastructure.repositories.analyse.alert_repository import SqlAlertRepository
from app.infrastructure.repositories.analyse.analysis_repository import SqlAnalysisRepository
from app.infrastructure.repositories.analyse.dashboard_repository import SqlDashboardRepository
from app.infrastructure.repositories.analyse.idempotency_repository import SqlIdempotencyRepository
from app.infrastructure.repositories.analyse.training_need_repository import SqlTrainingNeedRepository
from app.infrastructure.repositories.source.besoin_source import SqlBesoinSource
from app.infrastructure.repositories.source.competency_source import SqlCompetencySource
from app.infrastructure.repositories.source.evaluation_source import SqlEvaluationSource
from app.infrastructure.repositories.source.formation_source import SqlFormationSource
from app.infrastructure.repositories.source.teacher_source import SqlTeacherSource


class Container:
    def __init__(self, settings: Settings) -> None:
        self.settings = settings
        self.database = Database(settings)
        self.teacher_source: TeacherSource = SqlTeacherSource(self.database)
        self.competency_source: CompetencySource = SqlCompetencySource(self.database)
        self.formation_source: FormationSource = SqlFormationSource(self.database)
        self.evaluation_source: EvaluationSource = SqlEvaluationSource(self.database)
        self.besoin_source: BesoinSource = SqlBesoinSource(self.database)
        self.analysis_repository: AnalysisRepository = SqlAnalysisRepository(self.database)
        self.alert_repository: AlertRepository = SqlAlertRepository(self.database)
        self.training_need_repository: TrainingNeedRepository = SqlTrainingNeedRepository(self.database)
        self.dashboard_repository: DashboardRepository = SqlDashboardRepository(self.database)
        self.idempotency_repository: IdempotencyRepository = SqlIdempotencyRepository(self.database)
        self.model_port: ModelPort = ArtifactModelPort(settings, self.database)

        self.compute_gaps = ComputeGaps(
            self.competency_source, self.analysis_repository, self.model_port, settings,
            teacher_source=self.teacher_source,
        )
        self.compute_risk = ComputeRisk(
            self.competency_source,
            self.formation_source,
            self.evaluation_source,
            self.besoin_source,
            self.analysis_repository,
            self.model_port,
            settings,
        )
        self.recommend_trainings = RecommendTrainings(
            self.competency_source, self.formation_source, self.analysis_repository,
            model_port=self.model_port,
        )
        self.analyze_teacher_scope = AnalyzeTeacherScope(
            self.competency_source, self.recommend_trainings, settings
        )

        self.detect_needs = DetectNeeds(
            gaps_provider=lambda teacher_id: self.compute_gaps.execute(teacher_id)[0],
            teacher_scopes_provider=self._teacher_scopes,
            training_need_repository=self.training_need_repository,
            settings=settings,
        )
        self.build_dashboards = BuildDashboards(
            gaps_provider=lambda teacher_id: self.compute_gaps.execute(teacher_id)[0],
            risk_provider=lambda teacher_id: self.compute_risk.execute(teacher_id)[0],
            teacher_scopes_provider=self._teacher_scopes,
            dashboard_repository=self.dashboard_repository,
        )
        self.generate_alerts = GenerateAlerts(
            teacher_source=self.teacher_source,
            gaps_provider=lambda teacher_id: self.compute_gaps.execute(teacher_id)[0],
            risk_provider=lambda teacher_id: self.compute_risk.execute(teacher_id)[0],
            alert_repository=self.alert_repository,
            settings=settings,
        )
        self.process_event = ProcessEvent(
            idempotency_repository=self.idempotency_repository,
            handlers=build_event_handlers(self),
        )

    def _teacher_scopes(self) -> dict[str, TeacherScope]:
        scopes: dict[str, TeacherScope] = {}
        for teacher in self.teacher_source.list_teachers():
            scopes[teacher.id] = TeacherScope(
                teacher_id=teacher.id,
                scope_type="DEPARTEMENT",
                scope_id=teacher.dept_id,
            )
        return scopes

    def connect(self) -> None:
        self.database.connect()
        # GOUVERNANCE 7.6 (limite 4) : persistance best-effort du journal de
        # serving ML dans analyse.ml_observability (fail-safe mémoire).
        ml_observability.attach_db_sink(self.database)

    def dispose(self) -> None:
        self.database.dispose()
