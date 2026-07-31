"""Feature engineering temporel — features uniquement construites avec des
données antérieures ou égales à la date de référence (as_of). Aucune fuite."""

from __future__ import annotations

from datetime import date, timedelta

import pandas as pd

from app.domain.enums.gap import GapSeverity, GapType
from app.domain.services.context import TeacherContext
from app.engines.gap_engine import GapEngine
from app.infrastructure.repositories.curated_repository import CuratedRepository
from app.ml.features.feature_schema import FEATURE_COLUMNS

SEVERITY_RANK = {
    GapSeverity.LOW: 1,
    GapSeverity.MEDIUM: 2,
    GapSeverity.HIGH: 3,
    GapSeverity.CRITICAL: 4,
}


def build_feature_vector(
    context: TeacherContext,
    dept_pressure: float = 0.0,
    up_density: float = 0.0,
) -> dict[str, float] | None:
    """Calcule le vecteur de features à partir d'un contexte as-of.

    Retourne None si le profil est trop incomplet (pas assez d'historique).
    """
    if not context.records:
        return None

    gap_result = GapEngine().analyze(context)
    active_gaps = [g for g in gap_result.gaps if g.gap_level > 0]

    vector: dict[str, float] = {}
    vector["nb_gaps_open"] = float(len(active_gaps))
    if active_gaps:
        vector["weighted_gap_severity"] = sum(
            SEVERITY_RANK[g.severity] * g.gap_level for g in active_gaps
        ) / (4.0 * max(len(active_gaps), 1))
    else:
        vector["weighted_gap_severity"] = 0.0

    known = [r.current_level for r in context.records if r.current_level is not None]
    vector["avg_current_level"] = sum(known) / len(known) if known else 0.0

    reqs = [k.required_level for k in context.hierarchy.knowledges]
    vector["avg_required_level"] = sum(reqs) / len(reqs) if reqs else 0.0

    as_of = context.reference_date or date.today()

    completed_90 = [
        e
        for e in context.enrollments
        if e.status.value == "COMPLETED"
        and e.completion_date is not None
        and as_of - e.completion_date <= timedelta(days=90)
    ]
    vector["nb_trainings_completed_90d"] = float(len(completed_90))

    att_180 = [a for a in context.attendances if as_of - a.session_date <= timedelta(days=180)]
    if att_180:
        vector["attendance_rate_180d"] = sum(1 for a in att_180 if a.present) / len(att_180)
    else:
        vector["attendance_rate_180d"] = 0.0

    evals_180 = [e for e in context.evaluations if as_of - e.evaluation_date <= timedelta(days=180) and e.note is not None]
    vector["evaluation_avg_180d"] = (sum(e.note for e in evals_180) / len(evals_180)) / 20.0 if evals_180 else 0.0

    vector["certificate_rate"] = (
        len(context.certificates) / max(len(context.enrollments), 1)
    )

    vector["unresolved_need_count"] = float(
        sum(1 for n in context.needs if n.status.value in {"APPROVED", "PENDING"})
    )

    vector["dept_training_pressure"] = dept_pressure
    vector["up_gap_density"] = up_density

    last_training_date = max(
        [
            e.completion_date or e.enrolled_at
            for e in context.enrollments
            if e.enrolled_at <= as_of
        ],
        default=None,
    )
    vector["time_since_last_training_days"] = (
        (as_of - last_training_date).days if last_training_date else 365.0
    )

    assessed_dates = [
        r.last_assessment_date for r in context.records if r.last_assessment_date is not None
    ]
    last_assessed = max(assessed_dates, default=None)
    vector["time_since_last_assessment_days"] = (
        (as_of - last_assessed).days if last_assessed else 365.0
    )

    vector["prerequisite_missing_count"] = float(
        sum(1 for g in gap_result.gaps if g.gap_type == GapType.MISSING_PREREQUISITE)
    )

    ongoing = [
        e
        for e in context.enrollments
        if e.status.value == "ENROLLED"
        and e.completion_date is None
        and e.enrolled_at <= as_of
    ]
    vector["active_training_load"] = float(len(ongoing))

    total_enrollments = len(context.enrollments)
    completed_all = sum(1 for e in context.enrollments if e.status.value == "COMPLETED")
    vector["historical_completion_rate"] = (
        completed_all / total_enrollments if total_enrollments else 0.5
    )
    vector["historical_success_rate"] = (
        completed_all / max(total_enrollments, 1)
    )

    # cutoff date: feature la plus récente utilisée (pour le garde-fou anti-fuite)
    feature_dates = [as_of]
    for r in context.records:
        if r.last_assessment_date is not None:
            feature_dates.append(r.last_assessment_date)
    for e in context.enrollments:
        if e.completion_date is not None:
            feature_dates.append(e.completion_date)
        else:
            feature_dates.append(e.enrolled_at)
    for a in context.attendances:
        feature_dates.append(a.session_date)
    for ev in context.evaluations:
        feature_dates.append(ev.evaluation_date)
    vector["feature_cutoff_date"] = max(feature_dates).isoformat()

    return vector


class FeatureVectorBuilder:
    """Construit des DataFrames de features à partir d'un CuratedRepository."""

    def __init__(self, repository: CuratedRepository) -> None:
        self.repository = repository

    def vector(
        self, teacher_id: str, as_of: date, dept_pressure: float = 0.0, up_density: float = 0.0
    ) -> dict[str, float] | None:
        context = self.repository.build_context(teacher_id, as_of)
        if context is None:
            return None
        return build_feature_vector(context, dept_pressure, up_density)


def compute_department_pressure(
    repository: CuratedRepository, as_of: date
) -> dict[str, float]:
    """Pression de formation par département = nb gaps ouverts / taille dépt."""
    builder = FeatureVectorBuilder(repository)
    pressure: dict[str, list[float]] = {}
    for tid in repository.teacher_ids():
        vec = builder.vector(tid, as_of)
        if vec is None:
            continue
        teacher = repository.teacher(tid)
        if teacher is None:
            continue
        pressure.setdefault(teacher.department_code, []).append(vec["nb_gaps_open"])
    return {
        dept: (sum(v) / len(v)) if v else 0.0 for dept, v in pressure.items()
    }


def compute_up_gap_density(
    repository: CuratedRepository, as_of: date
) -> dict[str, float]:
    builder = FeatureVectorBuilder(repository)
    density: dict[str, list[float]] = {}
    for tid in repository.teacher_ids():
        vec = builder.vector(tid, as_of)
        if vec is None:
            continue
        teacher = repository.teacher(tid)
        if teacher is None:
            continue
        density.setdefault(teacher.up_code, []).append(vec["weighted_gap_severity"])
    return {
        up: (sum(v) / len(v)) if v else 0.0 for up, v in density.items()
    }


def featurize_batch(
    repository: CuratedRepository,
    teacher_ids: list[str],
    as_of: date,
) -> pd.DataFrame:
    """DataFrame de features pour tous les enseignants à une date donnée."""
    dept_pressure = compute_department_pressure(repository, as_of)
    up_density = compute_up_gap_density(repository, as_of)
    builder = FeatureVectorBuilder(repository)
    rows: list[dict] = []
    for tid in teacher_ids:
        teacher = repository.teacher(tid)
        if teacher is None:
            continue
        vec = builder.vector(
            tid,
            as_of,
            dept_pressure.get(teacher.department_code, 0.0),
            up_density.get(teacher.up_code, 0.0),
        )
        if vec is None:
            continue
        vec["teacher_id"] = tid
        vec["as_of"] = as_of.isoformat()
        rows.append(vec)
    return pd.DataFrame(rows, columns=["teacher_id", "as_of"] + FEATURE_COLUMNS)
