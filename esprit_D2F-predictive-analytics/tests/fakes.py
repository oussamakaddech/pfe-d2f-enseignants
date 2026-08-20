from datetime import date, datetime

from app.core.config import Settings
from app.domain.entities.alert import Alert
from app.domain.entities.competency import Competency, Savoir
from app.domain.entities.recommendation import Recommendation
from app.domain.entities.risk_profile import RiskProfile
from app.domain.entities.skill_gap import SkillGap
from app.domain.entities.teacher import Teacher
from app.domain.entities.training_need import TrainingNeed
from app.domain.services.ranking_service import TrainingCandidate
from app.application.use_cases.compute_gaps import ComputeGaps
from app.application.use_cases.compute_risk import ComputeRisk
from app.application.use_cases.recommend_trainings import RecommendTrainings

TEACHERS = [
    Teacher(id="T001", nom="Dupont", prenom="Alice", mail="alice.dupont@esprit.tn", up_id="UP1", dept_id="D1", user_id="U-ENS-1", date_recrutement=date(2019, 9, 1)),
    Teacher(id="T002", nom="Martin", prenom="Bob", mail="bob.martin@esprit.tn", up_id="UP2", dept_id="D2", user_id="U-ENS-2", date_recrutement=date(2021, 9, 1)),
]

COMPETENCIES = [
    Competency(
        id=1,
        code="C1",
        nom="Pedagogie active",
        domaine_id=10,
        domaine_nom="Pedagogie",
        savoirs=(Savoir(id=101, code="S101", nom="Classes inversees", knowledge_difficulty_level=4), Savoir(id=102, code="S102", nom="Evaluation formative", knowledge_difficulty_level=3)),
    ),
    Competency(
        id=2,
        code="C2",
        nom="Outils numeriques",
        domaine_id=10,
        domaine_nom="Pedagogie",
        savoirs=(Savoir(id=201, code="S201", nom="Tableaux interactifs", knowledge_difficulty_level=3),),
    ),
]

TEACHER_LEVELS = {
    "T001": {101: 1, 102: 2},
    "T002": {101: 4, 102: 4, 201: 3},
}

TEACHER_LEVELS_HISTORY = {
    "T001": {101: [("2024-01-10", 2), ("2025-06-01", 1)], 102: [("2024-01-10", 2)]},
    "T002": {101: [("2024-01-10", 4)]},
}

FORMATIONS = [
    TrainingCandidate(formation_id=100, titre="Classe inversee niveau 2", savoir_ids=frozenset({101, 102}), start_date=date(2026, 9, 1), end_date=date(2026, 10, 1), avg_eval_score=4.2),
    TrainingCandidate(formation_id=101, titre="Evaluation par competences", savoir_ids=frozenset({102}), start_date=date(2026, 11, 1), end_date=date(2026, 12, 1), avg_eval_score=None),
    TrainingCandidate(formation_id=102, titre="TBI avance", savoir_ids=frozenset({201}), start_date=date(2025, 1, 1), end_date=date(2025, 2, 1), avg_eval_score=3.0),
]


class FakeTeacherSource:
    def get_teacher(self, teacher_id: str) -> Teacher | None:
        return next((t for t in TEACHERS if t.id == teacher_id), None)

    def resolve_user_teacher(self, user_id: str) -> Teacher | None:
        return next((t for t in TEACHERS if t.user_id == user_id), None)

    def list_teachers(self) -> list[Teacher]:
        return list(TEACHERS)


class FakeCompetencySource:
    def list_competencies(self) -> list[Competency]:
        return list(COMPETENCIES)

    def list_competencies_for_scope(
        self, up_id: str | None, dept_id: str | None, specialite: str | None
    ) -> list[Competency]:
        # Simule le filtrage : T001 est rattaché au département D1 dont le
        # domaine 10 (Pedagogie) contient C1 ; C2 est hors périmètre pour D1.
        # Tout périmètre déclaré sans domaine correspondant -> liste vide
        # (aucun fallback silencieux sur le référentiel global).
        if dept_id == "D1":
            return [c for c in COMPETENCIES if c.id == 1]
        if up_id == "UP1":
            return [c for c in COMPETENCIES if c.id == 2]
        return []

    def get_teacher_savoir_levels(self, teacher_id: str) -> dict[int, int]:
        return dict(TEACHER_LEVELS.get(teacher_id, {}))

    def get_teacher_savoir_levels_history(self, teacher_id: str) -> dict[int, list[tuple[str, int]]]:
        return {sid: list(events) for sid, events in TEACHER_LEVELS_HISTORY.get(teacher_id, {}).items()}


class FakeFormationSource:
    def get_candidates_for_competency(self, competence_id: int) -> list[TrainingCandidate]:
        return [c for c in FORMATIONS if c.savoir_ids]

    def get_completed_formation_ids(self, teacher_id: str) -> set[int]:
        return {100} if teacher_id == "T001" else set()

    def get_attendance_rate(self, teacher_id: str) -> float:
        return 0.9 if teacher_id == "T001" else 0.5

    def get_days_since_last_activity(self, teacher_id: str) -> float | None:
        return 10.0 if teacher_id == "T001" else None


class FakeEvaluationSource:
    def get_avg_eval_score(self, teacher_id: str) -> float | None:
        return 4.5 if teacher_id == "T001" else None


class FakeBesoinSource:
    def count_declared_needs(self, teacher_id: str, months: int) -> int:
        return 0 if teacher_id == "T001" else 3


class FakeAnalysisRepository:
    def __init__(self) -> None:
        self.gaps: list[SkillGap] = []
        self.risk: list[RiskProfile] = []
        self.recommendations: list[Recommendation] = []

    def save_skill_gaps(self, gaps: list[SkillGap], teacher_id: str | None = None) -> None:
        self.gaps = list(gaps)

    def list_gaps_by_teacher(self, teacher_id: str) -> list[SkillGap]:
        return [g for g in self.gaps if g.teacher_id == teacher_id]

    def save_risk_snapshot(self, profile: RiskProfile) -> None:
        self.risk.append(profile)

    def save_recommendations(self, recommendations: list[Recommendation]) -> None:
        self.recommendations = list(recommendations)


class FakeModelPort:
    def predict_gaps(self, teacher_id: str) -> list[SkillGap] | None:
        return None

    def predict_risk(self, teacher_id: str) -> RiskProfile | None:
        return None

    def status(self) -> dict:
        return {
            "name": "gap_predictor",
            "available": False,
            "version": None,
            "mode": "HEURISTIC_FALLBACK",
            "model_mode": "HEURISTIC_FALLBACK",
            "model_version": None,
            "artifact_name": "gap_predictor",
            "model_name": "gap_predictor",
            "fallback_reason": "faux port de test",
            "prediction_horizon": None,
            "provenance": {
                "synthetic_share_pct": 0.0,
                "dataset_version": "test",
            },
        }

    def risk_available(self) -> bool:
        return False

    def relevance_available(self) -> bool:
        return False

    def score_relevance(self, teacher_id: str, formation_id: int, content_match_heuristic: float):
        return None


class FakeAlertRepository:
    def __init__(self) -> None:
        self.alerts: list[Alert] = []
        self._seq = 1

    def save(self, alert: Alert) -> Alert:
        saved = Alert(
            id=self._seq,
            alert_type=alert.alert_type,
            target_type=alert.target_type,
            severity=alert.severity,
            title=alert.title,
            message=alert.message,
            teacher_id=alert.teacher_id,
            department_id=alert.department_id,
            competence_id=alert.competence_id,
            skill_gap_id=alert.skill_gap_id,
            details=alert.details,
            status=alert.status,
            created_at=datetime.utcnow(),
        )
        self._seq += 1
        self.alerts.append(saved)
        return saved

    def _matches(self, alert: Alert, severity: str | None, status: str | None, target_type: str | None) -> bool:
        if severity and alert.severity != severity.upper():
            return False
        if status and alert.status != status.upper():
            return False
        if target_type and alert.target_type != target_type.upper():
            return False
        return True

    def list_alerts(self, page: int, size: int, severity: str | None = None, status: str | None = None, target_type: str | None = None, department_id: str | None = None) -> tuple[list[Alert], int]:
        matching = [a for a in self.alerts if self._matches(a, severity, status, target_type) and (not department_id or a.department_id == department_id)]
        start = (page - 1) * size
        return matching[start : start + size], len(matching)

    def list_for_teacher(self, teacher_id: str, page: int, size: int, severity: str | None = None, status: str | None = None) -> tuple[list[Alert], int]:
        matching = [a for a in self.alerts if a.teacher_id == teacher_id and self._matches(a, severity, status, None)]
        start = (page - 1) * size
        return matching[start : start + size], len(matching)

    def list_for_department(self, department_id: str, page: int, size: int, severity: str | None = None, status: str | None = None) -> tuple[list[Alert], int]:
        matching = [a for a in self.alerts if a.department_id == department_id and self._matches(a, severity, status, None)]
        start = (page - 1) * size
        return matching[start : start + size], len(matching)

    def count_open_by_severity(self, severity: str | None = None, status: str | None = None,
                               target_type: str | None = None,
                               teacher_id: str | None = None,
                               department_id: str | None = None) -> dict[str, int]:
        result = {"CRITICAL": 0, "WARNING": 0, "INFO": 0}
        for alert in self.alerts:
            if alert.status not in ("NOUVELLE", "LUE"):
                continue
            if severity and alert.severity != severity.upper():
                continue
            if status and alert.status != status.upper():
                continue
            if target_type and alert.target_type != target_type.upper():
                continue
            if teacher_id and alert.teacher_id != teacher_id:
                continue
            if department_id and alert.department_id != department_id:
                continue
            sev = alert.severity.upper()
            bucket = "CRITICAL" if sev in ("CRITICAL", "CRITIQUE") else "WARNING" if sev in ("WARNING", "HAUTE", "MOYENNE") else "INFO"
            result[bucket] += 1
        return result

    def list_open_since(self, cutoff_days: int) -> list[Alert]:
        return [a for a in self.alerts if a.status == "NOUVELLE"]

    def update_status(self, alert_id: int, status: str, actor: str | None = None, comment: str | None = None) -> Alert | None:
        for alert in self.alerts:
            if alert.id == alert_id:
                updated = Alert(
                    id=alert.id,
                    alert_type=alert.alert_type,
                    target_type=alert.target_type,
                    severity=alert.severity,
                    title=alert.title,
                    message=alert.message,
                    teacher_id=alert.teacher_id,
                    department_id=alert.department_id,
                    competence_id=alert.competence_id,
                    skill_gap_id=alert.skill_gap_id,
                    details=alert.details,
                    status=status.upper(),
                    created_at=alert.created_at,
                )
                self.alerts[self.alerts.index(alert)] = updated
                return updated
        return None


class FakeTrainingNeedRepository:
    def __init__(self) -> None:
        self.needs: list[TrainingNeed] = []
        self._seq = 1

    def save(self, need: TrainingNeed) -> TrainingNeed:
        saved = TrainingNeed(
            id=self._seq,
            need_type=need.need_type,
            competence_id=need.competence_id,
            competence_code=need.competence_code,
            competence_nom=need.competence_nom,
            scope_type=need.scope_type,
            scope_id=need.scope_id,
            teachers_count=need.teachers_count,
            evidence=need.evidence,
            status=need.status,
            detected_at=datetime.utcnow(),
        )
        self._seq += 1
        self.needs.append(saved)
        return saved

    def list_needs(self, page: int, size: int, need_type: str | None = None, scope_type: str | None = None) -> tuple[list[TrainingNeed], int]:
        matching = [
            n
            for n in self.needs
            if (not need_type or n.need_type == need_type.upper()) and (not scope_type or n.scope_type == scope_type.upper())
        ]
        return matching, len(matching)

    def list_for_teacher(self, teacher_id: str, page: int, size: int) -> tuple[list[TrainingNeed], int]:
        matching = [n for n in self.needs if n.scope_type == "ENSEIGNANT" and n.scope_id == teacher_id]
        return matching, len(matching)

    def list_for_department(self, department_id: str, page: int, size: int) -> tuple[list[TrainingNeed], int]:
        matching = [n for n in self.needs if n.scope_type == "DEPARTEMENT" and n.scope_id == department_id]
        return matching, len(matching)

    def close(self, need_id: int) -> TrainingNeed | None:
        for need in self.needs:
            if need.id == need_id:
                updated = TrainingNeed(
                    id=need.id,
                    need_type=need.need_type,
                    competence_id=need.competence_id,
                    competence_code=need.competence_code,
                    competence_nom=need.competence_nom,
                    scope_type=need.scope_type,
                    scope_id=need.scope_id,
                    teachers_count=need.teachers_count,
                    evidence=need.evidence,
                    status="CLOSED",
                    detected_at=need.detected_at,
                )
                self.needs[self.needs.index(need)] = updated
                return updated
        return None


class FakeDashboardRepository:
    def __init__(self) -> None:
        self.snapshots: list[dict] = []

    def save_snapshot(self, scope: str, scope_id: str | None, kpis: dict) -> None:
        self.snapshots.append({"scope": scope, "scope_id": scope_id, "kpis": kpis})

    def latest_snapshot(self, scope: str, scope_id: str | None = None) -> dict | None:
        for snapshot in reversed(self.snapshots):
            if snapshot["scope"] == scope and snapshot["scope_id"] == scope_id:
                return snapshot["kpis"]
        return None

    def declining_trends(self, scope: str, scope_id: str | None = None) -> list[dict]:
        snapshot = self.latest_snapshot(scope, scope_id)
        return list(snapshot.get("declining_competencies", [])) if snapshot else []


class FakeIdempotencyRepository:
    def __init__(self) -> None:
        self.processed: set[str] = set()

    def already_processed(self, event_id: str) -> bool:
        return event_id in self.processed

    def mark_processed(self, event_id: str, event_type: str | None = None) -> None:
        self.processed.add(event_id)


class FakeDatabase:
    def __init__(self) -> None:
        self.pingable = True

    def read_connection(self):
        if not self.pingable:
            raise ConnectionError("db down")
        from contextlib import nullcontext

        return nullcontext()


def build_settings(**overrides) -> Settings:
    defaults = {
        "jwt_secret": "test-secret-at-least-32-chars-long-for-hs512",
        "jwt_auth_enabled": True,
        "database_url": "postgresql://test:test@localhost:1/test",
    }
    defaults.update(overrides)
    return Settings(**defaults)


def build_fake_container(settings: Settings | None = None):
    settings = settings or build_settings()
    competency_source = FakeCompetencySource()
    formation_source = FakeFormationSource()
    evaluation_source = FakeEvaluationSource()
    besoin_source = FakeBesoinSource()
    analysis_repository = FakeAnalysisRepository()
    model_port = FakeModelPort()
    alert_repository = FakeAlertRepository()
    training_need_repository = FakeTrainingNeedRepository()
    dashboard_repository = FakeDashboardRepository()
    idempotency_repository = FakeIdempotencyRepository()

    class FakeContainer:
        pass

    container = FakeContainer()
    container.settings = settings
    container.database = FakeDatabase()
    container.teacher_source = FakeTeacherSource()
    container.competency_source = competency_source
    container.formation_source = formation_source
    container.evaluation_source = evaluation_source
    container.besoin_source = besoin_source
    container.analysis_repository = analysis_repository
    container.alert_repository = alert_repository
    container.training_need_repository = training_need_repository
    container.dashboard_repository = dashboard_repository
    container.idempotency_repository = idempotency_repository
    container.model_port = model_port
    container.compute_gaps = ComputeGaps(competency_source, analysis_repository, model_port, settings, teacher_source=container.teacher_source)
    # Seed persistant des gaps pour T001 : requis par les tests d'intégration gaps.
    # Le service calculant ces gaps appelle save_skill_gaps — on les ré-insère aussitôt.
    _seed_gaps, _, _ = container.compute_gaps.execute("T001")
    # compute_gaps a persisté via save_skill_gaps (le fake garde en mémoire).
    container.compute_risk = ComputeRisk(
        competency_source, formation_source, evaluation_source, besoin_source, analysis_repository, model_port, settings
    )
    container.recommend_trainings = RecommendTrainings(competency_source, formation_source, analysis_repository)

    from app.application.use_cases.analyze_teacher_scope import AnalyzeTeacherScope

    container.analyze_teacher_scope = AnalyzeTeacherScope(
        competency_source, container.recommend_trainings, settings
    )

    from app.application.use_cases.build_dashboards import BuildDashboards
    from app.application.use_cases.detect_needs import DetectNeeds
    from app.application.use_cases.generate_alerts import GenerateAlerts
    from app.application.use_cases.process_event import ProcessEvent
    from app.domain.services.need_detector import TeacherScope

    def teacher_scopes() -> dict[str, TeacherScope]:
        return {t.id: TeacherScope(t.id, "DEPARTEMENT", t.dept_id) for t in TEACHERS}

    container.teacher_scopes = teacher_scopes
    container.detect_needs = DetectNeeds(
        gaps_provider=lambda teacher_id: container.compute_gaps.execute(teacher_id)[0],
        teacher_scopes_provider=teacher_scopes,
        training_need_repository=training_need_repository,
        settings=settings,
    )
    container.build_dashboards = BuildDashboards(
        gaps_provider=lambda teacher_id: container.compute_gaps.execute(teacher_id)[0],
        risk_provider=lambda teacher_id: container.compute_risk.execute(teacher_id)[0],
        teacher_scopes_provider=teacher_scopes,
        dashboard_repository=dashboard_repository,
    )
    container.generate_alerts = GenerateAlerts(
        teacher_source=container.teacher_source,
        gaps_provider=lambda teacher_id: container.compute_gaps.execute(teacher_id)[0],
        risk_provider=lambda teacher_id: container.compute_risk.execute(teacher_id)[0],
        alert_repository=alert_repository,
        settings=settings,
    )
    container.process_event = ProcessEvent(
        idempotency_repository=idempotency_repository,
        handlers={
            "analyse.requested": lambda payload: {
                "teacher_id": payload.get("teacher_id"),
                "status": "analysed",
            },
        },
    )
    return container
