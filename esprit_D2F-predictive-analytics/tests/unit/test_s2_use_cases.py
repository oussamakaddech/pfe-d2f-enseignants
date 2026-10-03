from datetime import date

import pytest

from app.application.use_cases.detect_needs import DetectNeeds
from app.application.use_cases.process_event import ProcessEvent
from app.domain.entities.skill_gap import SkillGap
from app.domain.entities.training_need import NeedTypeCollective, NeedTypeIndividual
from app.domain.services.need_detector import TeacherScope
from app.domain.value_objects.enums import Severity, Trend
from tests.fakes import FakeIdempotencyRepository, FakeTrainingNeedRepository, build_settings


def make_gap(teacher_id: str, competence_id: int, gap_score: float) -> SkillGap:
    return SkillGap(
        teacher_id=teacher_id,
        competence_id=competence_id,
        competence_code=f"C{competence_id}",
        competence_nom=f"Competence {competence_id}",
        observed_result=2.0,
        knowledge_difficulty_level=4.0,
        gap_score=gap_score,
        severity=Severity.HIGH,
        trend=Trend.STABLE,
        as_of=date(2026, 7, 1),
    )


@pytest.fixture
def gaps_by_teacher():
    return {
        "T1": [make_gap("T1", 1, 0.8)],
        "T2": [make_gap("T2", 1, 0.7)],
        "T3": [make_gap("T3", 1, 0.6)],
    }


@pytest.fixture
def scopes():
    return {
        "T1": TeacherScope("T1", "DEPARTEMENT", "D1"),
        "T2": TeacherScope("T2", "DEPARTEMENT", "D1"),
        "T3": TeacherScope("T3", "DEPARTEMENT", "D1"),
    }


def test_detect_needs_produces_individual_and_collective(gaps_by_teacher, scopes):
    settings = build_settings(need_detection_threshold=0.5, need_detection_min_teachers=3)
    repo = FakeTrainingNeedRepository()
    use_case = DetectNeeds(lambda t: gaps_by_teacher[t], lambda: scopes, repo, settings)

    result = use_case.execute()
    assert len(result.individual) == 3
    assert len(result.collective) == 1
    assert result.total == 4

    use_case.persist(result)
    assert len(repo.needs) == 4
    assert repo.needs[0].need_type == NeedTypeIndividual
    collective = [n for n in repo.needs if n.need_type == NeedTypeCollective]
    assert collective[0].teachers_count == 3
    assert collective[0].scope_id == "D1"


def test_detect_needs_no_collective_below_min(gaps_by_teacher, scopes):
    settings = build_settings(need_detection_threshold=0.5, need_detection_min_teachers=4)
    repo = FakeTrainingNeedRepository()
    use_case = DetectNeeds(lambda t: gaps_by_teacher[t], lambda: scopes, repo, settings)

    result = use_case.execute()
    assert result.collective == []
    assert len(result.individual) == 3


def test_detect_needs_skips_teacher_on_provider_error(scopes):
    settings = build_settings(need_detection_threshold=0.5, need_detection_min_teachers=3)
    repo = FakeTrainingNeedRepository()

    def failing_provider(teacher_id: str):
        raise RuntimeError("down")

    use_case = DetectNeeds(failing_provider, lambda: scopes, repo, settings)
    result = use_case.execute()
    assert result.total == 0


def test_process_event_marks_idempotent():
    repo = FakeIdempotencyRepository()
    calls = []

    def handler(payload):
        calls.append(payload)
        return {"ok": True}

    use_case = ProcessEvent(repo, {"analyse.requested": handler})
    event = {"event_id": "evt-1", "event_type": "analyse.requested", "payload": {"teacher_id": "T1"}}

    first = use_case.execute(event)
    second = use_case.execute(event)
    assert first["status"] == "processed"
    assert second["status"] == "duplicate"
    assert len(calls) == 1
    assert "evt-1" in repo.processed


def test_process_event_requires_event_id():
    repo = FakeIdempotencyRepository()
    use_case = ProcessEvent(repo, {})
    with pytest.raises(ValueError):
        use_case.execute({"event_type": "x", "payload": {}})


def test_process_event_unknown_type_still_marked():
    repo = FakeIdempotencyRepository()
    use_case = ProcessEvent(repo, {})
    result = use_case.execute({"event_id": "evt-2", "event_type": "inconnu", "payload": {}})
    assert result["status"] == "processed"
    assert result["result"] is None
