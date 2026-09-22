import pytest

from app.application.use_cases.compute_gaps import ComputeGaps
from app.application.use_cases.compute_risk import ComputeRisk
from app.domain.value_objects.enums import Trend
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


def test_heuristic_trend_stable_without_history(repositories):
    """Sans historique daté sur les savoirs d'une compétence : STABLE, jamais
    IMPROVING par défaut (l'absence d'historique donnait previous=0.0, donc
    tout enseignant avec des niveaux mais sans date_acquisition affichait
    IMPROVING à tort — avec la référence la plus récente sinon)."""
    settings = build_settings()
    use_case = ComputeGaps(repositories["competency"], repositories["analyse"], repositories["model"], settings, teacher_source=repositories["teacher"])
    gaps, mode, _ = use_case.execute("T002")
    assert mode == "HEURISTIC_FALLBACK"
    # T002 : périmètre global (D2 sans domaine) → C1 (historique partiel :
    # 101 daté, 102 non daté) + C2 (savoir 201 jamais daté).
    assert len(gaps) == 2
    assert all(g.trend is Trend.STABLE for g in gaps)


def test_heuristic_trend_detects_real_decline(repositories):
    """T001 a REELLEMENT regresse sur le savoir 101 (niveau 2 en 2024 -> 1 en
    2025). La reference de tendance doit etre le PREMIER niveau date : prendre
    le dernier evenement la rendrait egale au niveau courant et effacerait la
    regression."""
    settings = build_settings()
    use_case = ComputeGaps(repositories["competency"], repositories["analyse"], repositories["model"], settings, teacher_source=repositories["teacher"])
    gaps, _, _ = use_case.execute("T001")
    assert [g.trend for g in gaps] == [Trend.DECLINING]


def test_trend_ignores_savoirs_without_reference(repositories):
    """Comparaison appariee : un enseignant partiellement evalue mais STABLE ne
    doit jamais apparaitre DECLINING a cause d'un ecart de denominateur.

    Le savoir 2 n'a aucune reference datee ; il est donc exclu des DEUX
    moyennes. Le comparer ferait chuter la moyenne courante (0-fill) face a une
    reference calculee sur le seul savoir connu -> DECLINING fantome.
    """
    from app.domain.entities.competency import Competency, Savoir

    competency = Competency(
        id=99, code="C99", nom="Competence partielle", domaine_id=None, domaine_nom=None,
        savoirs=(
            Savoir(id=1, code="S1", nom="savoir date", knowledge_difficulty_level=4),
            Savoir(id=2, code="S2", nom="savoir jamais date", knowledge_difficulty_level=4),
        ),
    )
    current = {1: 3, 2: 3}          # niveaux connus sur les deux savoirs
    reference = {1: 3}              # seul le savoir 1 porte une date_acquisition

    assert ComputeGaps._trend_for(competency, current, reference) is Trend.STABLE
    # Une vraie progression sur le savoir reference reste detectee.
    assert ComputeGaps._trend_for(competency, {1: 4, 2: 3}, reference) is Trend.IMPROVING
    # Aucune reference datee du tout -> STABLE, jamais une tendance inventee.
    assert ComputeGaps._trend_for(competency, current, {}) is Trend.STABLE


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
    assert mode == "HEURISTIC"

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
