from datetime import date

from app.domain.entities.skill_gap import SkillGap
from app.domain.entities.training_need import NeedTypeCollective, NeedTypeIndividual
from app.domain.services.need_detector import TeacherScope, detect_collective_needs, detect_individual_needs
from app.domain.value_objects.enums import Severity, Trend


def make_gap(teacher_id: str, competence_id: int, code: str, nom: str, gap_score: float, severity: Severity = Severity.HIGH) -> SkillGap:
    return SkillGap(
        teacher_id=teacher_id,
        competence_id=competence_id,
        competence_code=code,
        competence_nom=nom,
        current_level=2.0,
        target_level=4.0,
        gap_score=gap_score,
        severity=severity,
        trend=Trend.STABLE,
        as_of=date(2026, 7, 1),
    )


def test_detect_individual_needs_filters_by_threshold():
    gaps = {
        "T1": [make_gap("T1", 1, "C1", "Pedagogie", 0.8)],
        "T2": [make_gap("T2", 1, "C1", "Pedagogie", 0.3)],
    }
    needs = detect_individual_needs(gaps, threshold=0.5)
    assert len(needs) == 1
    assert needs[0].need_type == NeedTypeIndividual
    assert needs[0].scope_id == "T1"
    assert needs[0].teachers_count == 1


def test_detect_collective_needs_groups_by_competence_and_scope():
    gaps = {
        "T1": [make_gap("T1", 1, "C1", "Pedagogie", 0.7)],
        "T2": [make_gap("T2", 1, "C1", "Pedagogie", 0.6)],
        "T3": [make_gap("T3", 1, "C1", "Pedagogie", 0.8)],
    }
    scopes = {
        "T1": TeacherScope("T1", "DEPARTEMENT", "D1"),
        "T2": TeacherScope("T2", "DEPARTEMENT", "D1"),
        "T3": TeacherScope("T3", "DEPARTEMENT", "D1"),
    }
    needs = detect_collective_needs(gaps, scopes, threshold=0.5, min_teachers=3)
    assert len(needs) == 1
    assert needs[0].need_type == NeedTypeCollective
    assert needs[0].scope_type == "DEPARTEMENT"
    assert needs[0].scope_id == "D1"
    assert needs[0].teachers_count == 3
    assert needs[0].competence_id == 1


def test_detect_collective_needs_respects_min_teachers():
    gaps = {
        "T1": [make_gap("T1", 1, "C1", "Pedagogie", 0.7)],
        "T2": [make_gap("T2", 1, "C1", "Pedagogie", 0.6)],
    }
    scopes = {
        "T1": TeacherScope("T1", "DEPARTEMENT", "D1"),
        "T2": TeacherScope("T2", "DEPARTEMENT", "D1"),
    }
    needs = detect_collective_needs(gaps, scopes, threshold=0.5, min_teachers=3)
    assert needs == []


def test_detect_collective_needs_splits_by_department():
    gaps = {
        "T1": [make_gap("T1", 1, "C1", "Pedagogie", 0.7)],
        "T2": [make_gap("T2", 1, "C1", "Pedagogie", 0.6)],
        "T3": [make_gap("T3", 1, "C1", "Pedagogie", 0.8)],
        "T4": [make_gap("T4", 1, "C1", "Pedagogie", 0.9)],
    }
    scopes = {
        "T1": TeacherScope("T1", "DEPARTEMENT", "D1"),
        "T2": TeacherScope("T2", "DEPARTEMENT", "D1"),
        "T3": TeacherScope("T3", "DEPARTEMENT", "D2"),
        "T4": TeacherScope("T4", "DEPARTEMENT", "D2"),
    }
    needs = detect_collective_needs(gaps, scopes, threshold=0.5, min_teachers=3)
    assert needs == []


def test_detect_individual_needs_no_gaps_returns_empty():
    assert detect_individual_needs({}, threshold=0.5) == []
