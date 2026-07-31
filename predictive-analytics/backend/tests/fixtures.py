from __future__ import annotations

from datetime import date, timedelta

from app.domain.entities.competency import (
    Competency,
    CompetencyHierarchy,
    Domain,
    Knowledge,
    KnowledgeRecord,
    SubCompetency,
)
from app.domain.entities.gap import TeacherGapAnalysis
from app.domain.entities.teacher import Teacher
from app.domain.entities.training import (
    Enrollment,
    Training,
    TrainingCompetencyLink,
    TrainingNeed,
)
from app.domain.enums.gap import KnowledgeType
from app.domain.enums.training import (
    EnrollmentStatus,
    NeedStatus,
    TrainingState,
)
from app.domain.enums.teacher import TeacherRole, TeacherStatus
from app.domain.services.context import TeacherContext


def build_hierarchy() -> CompetencyHierarchy:
    dom = Domain(domain_id="DOM-INFO", code="INFO", name="Informatique")
    comp = Competency(competency_id="COMP-ALGO", code="ALGO", name="Algorithmique", domain_id="DOM-INFO")
    sub = SubCompetency(sub_competency_id="SUB-SORT", code="SORT", name="Tri & Complexité", competency_id="COMP-ALGO")

    k_algo = Knowledge(
        knowledge_id="KN-ALGO-1",
        code="ALGO_BASE",
        name="Algorithmes fondamentaux",
        sub_competency_id="SUB-SORT",
        knowledge_type=KnowledgeType.THEORETICAL,
        required_level=4,
    )
    k_loop = Knowledge(
        knowledge_id="KN-ALGO-2",
        code="RECURSION",
        name="Récursivité",
        sub_competency_id="SUB-SORT",
        knowledge_type=KnowledgeType.PRACTICAL,
        required_level=3,
        prereq_knowledge_ids=["KN-ALGO-1"],
    )
    return CompetencyHierarchy(
        domains=[dom],
        competencies=[comp],
        sub_competencies=[sub],
        knowledges=[k_algo, k_loop],
    )


def build_teacher(teacher_id: str = "ENS001") -> Teacher:
    return Teacher(
        teacher_id=teacher_id,
        full_name="Zineb Bouaziz",
        department_code="GL",
        department_name="Génie Logiciel",
        up_code="UP-GL",
        role=TeacherRole.TEACHER,
        status=TeacherStatus.ACTIVE,
        hire_date=date(2024, 1, 14),
    )


def record(knowledge_id: str, level: int | None, assessed_days_ago: int | None = 30) -> KnowledgeRecord:
    return KnowledgeRecord(
        teacher_id="ENS001",
        knowledge_id=knowledge_id,
        current_level=level,
        last_assessment_date=(
            date.today() - timedelta(days=assessed_days_ago)
            if assessed_days_ago is not None
            else None
        ),
        validated=level is not None,
    )


def build_context(
    *,
    records: list[KnowledgeRecord] | None = None,
    needs: list[TrainingNeed] | None = None,
    trainings: list[Training] | None = None,
    enrollments: list[Enrollment] | None = None,
    teacher: Teacher | None = None,
    reference_date: date | None = None,
) -> TeacherContext:
    teacher = teacher or build_teacher()
    return TeacherContext(
        teacher=teacher,
        hierarchy=build_hierarchy(),
        records=records or [],
        needs=needs or [],
        trainings=trainings or [],
        enrollments=enrollments or [],
        reference_date=reference_date or date.today(),
    )


def training(
    training_id: str = "TR-001",
    *,
    title: str = "Algorithmes avancés",
    knowledge_ids: list[str] | None = None,
    prereq_training_ids: list[str] | None = None,
    capacity: int | None = 30,
    registration_count: int = 0,
    start: date | None = None,
    end: date | None = None,
    active: bool = True,
    cancelled: bool = False,
    registration_open: bool = True,
    department_code: str | None = None,
    up_code: str | None = None,
    role: str | None = None,
    duration_hours: float = 20.0,
    effectiveness_score: float | None = 0.8,
    available_from: date | None = None,
    niveau_vise: int | None = None,
    niveau_prerequis: int | None = None,
) -> Training:
    today = date.today()
    knowledge_ids = knowledge_ids or ["KN-ALGO-1"]
    links = [
        TrainingCompetencyLink(
            knowledge_id=k,
            niveau_vise=niveau_vise,
            niveau_prerequis=niveau_prerequis,
        )
        for k in knowledge_ids
    ]
    return Training(
        training_id=training_id,
        title=title,
        state=TrainingState.PLANIFIE,
        active=active,
        cancelled=cancelled,
        registration_open=registration_open,
        start_date=start or (today + timedelta(days=30)),
        end_date=end or (today + timedelta(days=35)),
        duration_hours=duration_hours,
        department_code=department_code,
        up_code=up_code,
        role=role,
        capacity=capacity,
        registration_count=registration_count,
        competency_links=links,
        prereq_training_ids=prereq_training_ids or [],
        effectiveness_score=effectiveness_score,
        available_from=available_from,
    )


def empty_gap_analysis(teacher_id: str = "ENS001") -> TeacherGapAnalysis:
    return TeacherGapAnalysis(teacher_id=teacher_id, gaps=[], has_competency_records=False)


def need(knowledge_id: str, status: NeedStatus = NeedStatus.APPROVED) -> TrainingNeed:
    return TrainingNeed(
        need_id=f"NEED-{knowledge_id}",
        teacher_id="ENS001",
        knowledge_id=knowledge_id,
        status=status,
        requested_at=date.today() - timedelta(days=10),
    )


def completed_enrollment(training_id: str) -> Enrollment:
    return Enrollment(
        enrollment_id=f"ENR-{training_id}",
        teacher_id="ENS001",
        training_id=training_id,
        status=EnrollmentStatus.COMPLETED,
        enrolled_at=date.today() - timedelta(days=60),
        completion_date=date.today() - timedelta(days=40),
        certificate_issued=True,
    )
