import pytest

from app.application.use_cases.compute_gaps import ComputeGaps
from app.application.use_cases.compute_risk import ComputeRisk
from tests.fakes import (
    FakeAnalysisRepository,
    FakeBesoinSource,
    FakeCompetencySource,
    FakeEvaluationSource,
    FakeFormationSource,
    FakeModelPort,
    FakeTeacherSource,
    build_settings,
)


@pytest.fixture
def repositories():
    return {
        "competency": FakeCompetencySource(),
        "formation": FakeFormationSource(),
        "evaluation": FakeEvaluationSource(),
        "besoin": FakeBesoinSource(),
        "analyse": FakeAnalysisRepository(),
        "model": FakeModelPort(),
        "teacher": FakeTeacherSource(),
    }


def test_compute_gaps_returns_heuristic_mode(repositories):
    settings = build_settings()
    use_case = ComputeGaps(repositories["competency"], repositories["analyse"], repositories["model"], settings, teacher_source=repositories["teacher"])
    gaps, mode, version = use_case.execute("T001")
    assert mode == "HEURISTIC_FALLBACK"
    assert version is None
    # Gaps filtres par scope : T001 est rattaché au departement D1 (Pedagogie),
    # une seule compétence dans le périmètre (C1).
    assert len(gaps) == 1
    assert all(gap.teacher_id == "T001" for gap in gaps)
    assert repositories["analyse"].gaps == gaps


def test_compute_risk_returns_heuristic_mode_and_persists(repositories):
    settings = build_settings()
    use_case = ComputeRisk(
        repositories["competency"],
        repositories["formation"],
        repositories["evaluation"],
        repositories["besoin"],
        repositories["analyse"],
        repositories["model"],
        settings,
    )
    profile, mode, _ = use_case.execute("T002")
    assert mode == "HEURISTIC_FALLBACK"
    assert 0 <= profile.risk_score <= 100
    assert repositories["analyse"].risk[-1] is profile


def test_risk_teacher_with_repeated_needs_higher(repositories):
    settings = build_settings()
    use_case = ComputeRisk(
        repositories["competency"],
        repositories["formation"],
        repositories["evaluation"],
        repositories["besoin"],
        repositories["analyse"],
        repositories["model"],
        settings,
    )
    low_profile, _, _ = use_case.execute("T001")
    high_profile, _, _ = use_case.execute("T002")
    assert high_profile.risk_score > low_profile.risk_score
