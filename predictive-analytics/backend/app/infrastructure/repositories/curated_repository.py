"""Repository sur datasets curated (CSV) + reconstruction historique.

Permet de construire un TeacherContext « tel qu'il était » à une date donnée
(as_of), condition indispensable pour un apprentissage sans fuite de cible.
"""

from __future__ import annotations

import logging
from datetime import date, timedelta
from pathlib import Path
from typing import Any

import pandas as pd

from app.domain.entities.competency import (
    Competency,
    CompetencyHierarchy,
    Domain,
    Knowledge,
    KnowledgeRecord,
    SubCompetency,
)
from app.domain.entities.teacher import Teacher
from app.domain.entities.training import (
    Attendance,
    Certificate,
    Enrollment,
    Evaluation,
    Training,
    TrainingCompetencyLink,
    TrainingNeed,
)
from app.domain.enums.training import (
    EnrollmentStatus,
    NeedStatus,
    TrainingState,
)
from app.domain.enums.teacher import TeacherRole, TeacherStatus
from app.domain.services.context import TeacherContext
from app.infrastructure.cache.in_memory_cache import InMemoryCache

logger = logging.getLogger(__name__)


def _parse_date(value: Any) -> date | None:
    if value is None or (isinstance(value, str) and not value.strip()) or pd.isna(value):
        return None
    if isinstance(value, pd.Timestamp):
        return value.date()
    if isinstance(value, date):
        return value
    try:
        return pd.to_datetime(value).date()
    except (TypeError, ValueError):
        return None


def _parse_bool(value: Any) -> bool:
    if isinstance(value, bool):
        return value
    if value is None or pd.isna(value):
        return False
    return str(value).strip().lower() in {"true", "1", "oui", "yes"}


def _parse_int(value: Any) -> int | None:
    if value is None or pd.isna(value) or value == "":
        return None
    try:
        return int(float(str(value).strip()))
    except (TypeError, ValueError):
        return None


def _opt_str(value: Any) -> str | None:
    """Chaîne optionnelle: vide/NaN -> None (utile pour 'pas de restriction')."""
    if value is None or pd.isna(value):
        return None
    text = str(value).strip()
    return text if text and text.lower() != "nan" else None


class CuratedRepository:
    """Charge les datasets curated et expose des accès typés."""

    REQUIRED_FILES = [
        "teachers",
        "required_levels",
        "training_catalog",
        "training_competency_links",
        "teacher_competencies",
        "enrollments",
        "attendance",
        "evaluations",
        "certificates",
        "training_needs",
        "teacher_profile_snapshots",
        "training_outcomes",
    ]

    def __init__(
        self,
        curated_dir: str | Path,
        cache: InMemoryCache | None = None,
        *,
        reference_date: date | None = None,
    ) -> None:
        self.dir = Path(curated_dir)
        self.cache = cache or InMemoryCache(default_ttl_seconds=300)
        self.reference_date = reference_date or date.today()
        self._data: dict[str, pd.DataFrame] = {}
        self._load_all()

    # ------------------------------------------------------------------ loading
    def _load_all(self) -> None:
        for name in self.REQUIRED_FILES:
            path = self.dir / f"{name}.csv"
            if path.exists():
                self._data[name] = pd.read_csv(path, dtype=str)
            else:
                logger.warning("dataset curated absent: %s", path)
                self._data[name] = pd.DataFrame()

    def df(self, name: str) -> pd.DataFrame:
        return self._data.get(name, pd.DataFrame())

    # ------------------------------------------------------------------- helpers
    def teacher_ids(self) -> list[str]:
        return sorted(self.df("teachers")["teacher_id"].dropna().unique().tolist())

    def teacher(self, teacher_id: str) -> Teacher | None:
        rows = self.df("teachers")
        match = rows[rows["teacher_id"] == teacher_id]
        if match.empty:
            return None
        row = match.iloc[0]
        role = str(row.get("role", "TEACHER") or "TEACHER").strip().upper()
        status = str(row.get("status", "ACTIVE") or "ACTIVE").strip().upper()
        try:
            role_enum = TeacherRole(role)
        except ValueError:
            role_enum = TeacherRole.TEACHER
        try:
            status_enum = TeacherStatus(status)
        except ValueError:
            status_enum = TeacherStatus.ACTIVE
        return Teacher(
            teacher_id=teacher_id,
            full_name=str(row.get("full_name", "") or ""),
            department_code=str(row.get("department_code", "") or ""),
            department_name=str(row.get("department_name", "") or ""),
            up_code=str(row.get("up_code", "") or ""),
            role=role_enum,
            status=status_enum,
            hire_date=_parse_date(row.get("hire_date")),
        )

    def hierarchy(self) -> CompetencyHierarchy:
        cache_key = "hierarchy"
        cached = self.cache.get(cache_key)
        if cached is not None:
            return cached
        rl = self.df("required_levels")
        domains: dict[str, Domain] = {}
        competencies: dict[str, Competency] = {}
        sub_competencies: dict[str, SubCompetency] = {}
        knowledges: list[Knowledge] = []
        for _, row in rl.iterrows():
            did = str(row.get("domain_id", "") or "")
            if did and did not in domains:
                domains[did] = Domain(domain_id=did, code=str(row.get("domain_name", "") or ""), name=str(row.get("domain_name", "") or ""))
            cid = str(row.get("competency_id", "") or "")
            if cid and cid not in competencies:
                competencies[cid] = Competency(
                    competency_id=cid,
                    code=str(row.get("competency_name", "") or ""),
                    name=str(row.get("competency_name", "") or ""),
                    domain_id=did,
                )
            sid = str(row.get("sub_competency_id", "") or "")
            if sid and sid not in sub_competencies:
                sub_competencies[sid] = SubCompetency(
                    sub_competency_id=sid,
                    code=str(row.get("sub_competency_name", "") or ""),
                    name=str(row.get("sub_competency_name", "") or ""),
                    competency_id=cid,
                )
            req = _parse_int(row.get("required_level")) or 1
            prereqs = [
                p for p in str(row.get("prereq_knowledge_ids", "") or "").split("|") if p
            ]
            knowledges.append(
                Knowledge(
                    knowledge_id=str(row.get("knowledge_id", "") or ""),
                    code=str(row.get("knowledge_code", "") or ""),
                    name=str(row.get("knowledge_name", "") or ""),
                    sub_competency_id=sid,
                    knowledge_type=str(row.get("knowledge_type", "THEORETICAL") or "THEORETICAL").upper(),
                    required_level=req,
                    prereq_knowledge_ids=prereqs,
                )
            )
        h = CompetencyHierarchy(
            domains=list(domains.values()),
            competencies=list(competencies.values()),
            sub_competencies=list(sub_competencies.values()),
            knowledges=knowledges,
        )
        self.cache.set(cache_key, h)
        return h

    def trainings(self) -> list[Training]:
        catalog = self.df("training_catalog")
        links_df = self.df("training_competency_links")
        links_by_training: dict[str, list[TrainingCompetencyLink]] = {}
        for _, row in links_df.iterrows():
            tid = str(row.get("training_id", "") or "")
            if not tid:
                continue
            links_by_training.setdefault(tid, []).append(
                TrainingCompetencyLink(
                    knowledge_id=str(row.get("knowledge_id", "") or ""),
                    niveau_prerequis=_parse_int(row.get("niveau_prerequis")),
                    niveau_vise=_parse_int(row.get("niveau_vise")),
                )
            )
        trainings: list[Training] = []
        for _, row in catalog.iterrows():
            tid = str(row.get("training_id", "") or "")
            if not tid:
                continue
            state_raw = str(row.get("state", "PLANIFIE") or "PLANIFIE").strip().upper()
            try:
                state = TrainingState(state_raw)
            except ValueError:
                state = TrainingState.PLANIFIE
            prereqs = [
                p for p in str(row.get("prereq_training_ids", "") or "").split("|") if p
            ]
            trainings.append(
                Training(
                    training_id=tid,
                    title=str(row.get("title", "") or ""),
                    state=state,
                    active=_parse_bool(row.get("active")),
                    cancelled=_parse_bool(row.get("cancelled")),
                    registration_open=_parse_bool(row.get("registration_open")),
                    start_date=_parse_date(row.get("start_date")),
                    end_date=_parse_date(row.get("end_date")),
                    duration_hours=float(row.get("duration_hours", 0) or 0),
                    department_code=_opt_str(row.get("department_code")),
                    up_code=_opt_str(row.get("up_code")),
                    role=_opt_str(row.get("role")),
                    capacity=_parse_int(row.get("capacity")),
                    registration_count=_parse_int(row.get("registration_count")) or 0,
                    competency_links=links_by_training.get(tid, []),
                    prereq_training_ids=prereqs,
                    available_from=_parse_date(row.get("available_from")),
                )
            )
        return trainings

    def needs(self, teacher_id: str) -> list[TrainingNeed]:
        df = self.df("training_needs")
        rows = df[df["teacher_id"] == teacher_id]
        needs: list[TrainingNeed] = []
        for _, row in rows.iterrows():
            try:
                status = NeedStatus(str(row.get("status", "PENDING") or "PENDING").strip().upper())
            except ValueError:
                status = NeedStatus.PENDING
            needs.append(
                TrainingNeed(
                    need_id=str(row.get("need_id", "") or ""),
                    teacher_id=teacher_id,
                    knowledge_id=str(row.get("knowledge_id", "") or "") or None,
                    status=status,
                    requested_at=_parse_date(row.get("requested_at")) or date.today(),
                    priority=_parse_int(row.get("priority")),
                    theme=str(row.get("theme", "") or ""),
                )
            )
        return needs

    def enrollments(self, teacher_id: str) -> list[Enrollment]:
        df = self.df("enrollments")
        rows = df[df["teacher_id"] == teacher_id]
        out: list[Enrollment] = []
        for _, row in rows.iterrows():
            try:
                status = EnrollmentStatus(str(row.get("status", "ENROLLED") or "ENROLLED").strip().upper())
            except ValueError:
                status = EnrollmentStatus.ENROLLED
            out.append(
                Enrollment(
                    enrollment_id=str(row.get("enrollment_id", "") or ""),
                    teacher_id=teacher_id,
                    training_id=str(row.get("training_id", "") or ""),
                    status=status,
                    enrolled_at=_parse_date(row.get("enrolled_at")) or date.today(),
                    completion_date=_parse_date(row.get("completion_date")),
                    certificate_issued=_parse_bool(row.get("certificate_issued")),
                )
            )
        return out

    def certificates(self, teacher_id: str) -> list[Certificate]:
        df = self.df("certificates")
        rows = df[df["teacher_id"] == teacher_id]
        return [
            Certificate(
                certificate_id=str(row.get("certificate_id", "") or ""),
                teacher_id=teacher_id,
                training_id=str(row.get("training_id", "") or ""),
                issued_date=_parse_date(row.get("issued_date")) or date.today(),
                valid=_parse_bool(row.get("valid")),
            )
            for _, row in rows.iterrows()
        ]

    def attendances(self, teacher_id: str) -> list[Attendance]:
        df = self.df("attendance")
        rows = df[df["teacher_id"] == teacher_id]
        return [
            Attendance(
                attendance_id=str(row.get("attendance_id", "") or ""),
                teacher_id=teacher_id,
                training_id=str(row.get("training_id", "") or ""),
                session_date=_parse_date(row.get("session_date")) or date.today(),
                present=_parse_bool(row.get("present")),
            )
            for _, row in rows.iterrows()
        ]

    def evaluations(self, teacher_id: str) -> list[Evaluation]:
        df = self.df("evaluations")
        rows = df[df["teacher_id"] == teacher_id]
        out: list[Evaluation] = []
        for _, row in rows.iterrows():
            note = row.get("note")
            note_f = None if note is None or pd.isna(note) or str(note).strip() == "" else float(note)
            out.append(
                Evaluation(
                    evaluation_id=str(row.get("evaluation_id", "") or ""),
                    teacher_id=teacher_id,
                    training_id=str(row.get("training_id", "") or ""),
                    note=note_f,
                    satisfaisant=_parse_bool(row.get("satisfaisant")) if not pd.isna(row.get("satisfaisant")) else None,
                    evaluation_date=_parse_date(row.get("evaluation_date")) or date.today(),
                )
            )
        return out

    def outcomes(self, teacher_id: str) -> pd.DataFrame:
        df = self.df("training_outcomes")
        return df[df["teacher_id"] == teacher_id] if not df.empty else df

    # --------------------------------------------------------- historical context
    def build_context(self, teacher_id: str, as_of: date | None = None) -> TeacherContext | None:
        """Construit le contexte d'un enseignant tel qu'il était à `as_of`."""
        teacher = self.teacher(teacher_id)
        if teacher is None:
            return None
        as_of = as_of or self.reference_date

        records = self._records_as_of(teacher_id, as_of)

        # Sanitisation temporelle: une inscription connue à t n'a pas encore sa
        # date de complétion future (sinon fuite de cible).
        enrollments = []
        for e in self.enrollments(teacher_id):
            if e.enrolled_at > as_of:
                continue
            if e.completion_date is not None and e.completion_date > as_of:
                e = Enrollment(
                    enrollment_id=e.enrollment_id,
                    teacher_id=e.teacher_id,
                    training_id=e.training_id,
                    status=EnrollmentStatus.ENROLLED,
                    enrolled_at=e.enrolled_at,
                    completion_date=None,
                    certificate_issued=False,
                )
            enrollments.append(e)

        return TeacherContext(
            teacher=teacher,
            hierarchy=self.hierarchy(),
            records=records,
            needs=[n for n in self.needs(teacher_id) if n.requested_at <= as_of],
            enrollments=enrollments,
            certificates=[c for c in self.certificates(teacher_id) if c.issued_date <= as_of],
            attendances=[a for a in self.attendances(teacher_id) if a.session_date <= as_of],
            evaluations=[e for e in self.evaluations(teacher_id) if e.evaluation_date <= as_of],
            trainings=self.trainings(),
            reference_date=as_of,
        )

    def _records_as_of(self, teacher_id: str, as_of: date) -> list[KnowledgeRecord]:
        df = self.df("teacher_competencies")
        rows = df[df["teacher_id"] == teacher_id]
        records: list[KnowledgeRecord] = []
        for _, row in rows.iterrows():
            assessed = _parse_date(row.get("last_assessment_date"))
            if assessed is not None and assessed > as_of:
                continue  # future info never leaks into the past
            records.append(
                KnowledgeRecord(
                    teacher_id=teacher_id,
                    knowledge_id=str(row.get("knowledge_id", "") or ""),
                    current_level=_parse_int(row.get("current_level")),
                    last_assessment_date=assessed,
                    validated=_parse_bool(row.get("validated")),
                    source=str(row.get("source", "UNKNOWN") or "UNKNOWN"),
                )
            )
        return records
