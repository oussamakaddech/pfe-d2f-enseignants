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


def test_compute_gaps_never_claims_ml_when_serving_failed(repositories):
    """Modèle chargé (PRODUCTION_ML) mais serving indisponible (features
    invalides) : les gaps renvoyés sont heuristiques -> le mode exposé doit
    rester HEURISTIC_FALLBACK, jamais un mode ML mensonger."""
    class LoadedButFailingPort(FakeModelPort):
        def status(self) -> dict:
            return {
                **super().status(),
                "available": True,
                "model_mode": "PRODUCTION_ML",
                "model_version": "v1.0.0",
            }

    settings = build_settings()
    use_case = ComputeGaps(
        repositories["competency"],
        repositories["analyse"],
        LoadedButFailingPort(),
        settings,
        teacher_source=repositories["teacher"],
    )
    gaps, mode, version = use_case.execute("T001")
    assert mode == "HEURISTIC_FALLBACK"
    assert version is None
    assert len(gaps) == 1  # gaps heuristiques scopés, jamais 0


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
    profile, mode, _, _ = use_case.execute("T002")
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
    low_profile, _, _, _ = use_case.execute("T001")
    high_profile, _, _, _ = use_case.execute("T002")
    assert high_profile.risk_score > low_profile.risk_score
