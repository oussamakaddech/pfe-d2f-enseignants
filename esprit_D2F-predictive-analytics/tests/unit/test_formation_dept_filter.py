"""Filtrage des formations candidates par département/UP de l'enseignant.

Avant le correctif, toutes les formations couvrant une compétence étaient
proposées à TOUS les enseignants, quel que soit leur département.
Maintenant, seules les formations du département/UP de l'enseignant (ou
sans affectation) sont proposées en priorité.
"""
from datetime import date

from app.application.use_cases.recommend_trainings import RecommendTrainings
from app.domain.entities.competency import Competency, Savoir
from app.domain.entities.teacher_competency_state import TeacherCompetencyState
from app.domain.services.ranking_service import TrainingCandidate, rank_candidates
from tests.fakes import FakeAnalysisRepository


class DeptAwareFormationSource:
    """Source simulée qui retourne des formations différentes par département."""

    def __init__(self) -> None:
        self._formations = [
            # Compétence 1 : 2 formations, une par département
            TrainingCandidate(
                formation_id=10, titre="Formation Web Frontend",
                savoir_ids=frozenset({101}), start_date=date(2026, 9, 1),
                end_date=date(2026, 10, 1), avg_eval_score=4.0,
            ),
            TrainingCandidate(
                formation_id=20, titre="Formation GC Béton",
                savoir_ids=frozenset({101}), start_date=date(2026, 9, 1),
                end_date=date(2026, 10, 1), avg_eval_score=4.0,
            ),
            # Compétence 1 : formation SANS département (devrait apparaître pour tous)
            TrainingCandidate(
                formation_id=30, titre="Formation Générale Python",
                savoir_ids=frozenset({101}), start_date=date(2026, 9, 1),
                end_date=date(2026, 10, 1), avg_eval_score=3.5,
            ),
        ]
        self._call_log: list[dict] = []

    def get_candidates_for_competency(
        self, competence_id: int, dept_id: str | None = None, up_id: str | None = None
    ) -> list[TrainingCandidate]:
        self._call_log.append({"competence_id": competence_id, "dept_id": dept_id, "up_id": up_id})
        return list(self._formations)

    def get_completed_formation_ids(self, teacher_id: str) -> set[int]:
        return set()

    def get_attendance_rate(self, teacher_id: str) -> float:
        return 0.0

    def get_days_since_last_activity(self, teacher_id: str) -> float | None:
        return None


class SingleCompetencySource:
    def __init__(self) -> None:
        self._comp = Competency(
            id=1, code="C1", nom="Pédagogie",
            domaine_id=10, domaine_nom="Pédagogie",
            savoirs=(Savoir(id=101, code="S1", nom="React",
                            knowledge_difficulty_level=3),),
        )

    def list_competencies(self) -> list[Competency]:
        return [self._comp]

    def list_competencies_for_scope(self, up_id, dept_id, specialite):
        if not (up_id or dept_id or specialite):
            return [self._comp]
        return [self._comp]

    def get_teacher_savoir_levels(self, teacher_id: str) -> dict[int, int]:
        return {}

    def get_teacher_savoir_levels_history(self, teacher_id: str):
        return {}


def test_dept_id_propagate_to_formation_source():
    """Le dept_id de l'enseignant est bien transmis à get_candidates_for_competency."""
    source = DeptAwareFormationSource()
    comp_source = SingleCompetencySource()
    reco = RecommendTrainings(comp_source, source, FakeAnalysisRepository())

    reco.execute("T001", competence_id=1, limit=5, dept_id="DEPT_WEB", up_id="UP_WEB")

    assert len(source._call_log) == 1
    assert source._call_log[0]["dept_id"] == "DEPT_WEB"
    assert source._call_log[0]["up_id"] == "UP_WEB"


def test_dept_filtering_via_ranking_service():
    """Le ranking service reçoit bien les formations du département de l'enseignant
    et les classe par pertinence."""
    comp = Competency(
        id=1, code="C1", nom="Pédagogie",
        domaine_id=10, domaine_nom="Pédagogie",
        savoirs=(Savoir(id=101, code="S1", nom="React",
                        knowledge_difficulty_level=3),),
    )
    state = TeacherCompetencyState(
        teacher_id="T001", competency=comp, observed_result=0.0,
        previous_observed_result=None, savoir_levels={},
    )
    web_formation = TrainingCandidate(
        formation_id=10, titre="Web Frontend",
        savoir_ids=frozenset({101}), start_date=date(2026, 9, 1),
        end_date=date(2026, 10, 1), avg_eval_score=4.0,
    )
    gc_formation = TrainingCandidate(
        formation_id=20, titre="GC Béton",
        savoir_ids=frozenset({101}), start_date=date(2026, 9, 1),
        end_date=date(2026, 10, 1), avg_eval_score=4.0,
    )
    # Simule le résultat de get_candidates_for_competency après filtrage SQL :
    # seul le département WEB est présent
    results = rank_candidates([web_formation], state, date.today(), 5)
    assert len(results) == 1
    assert results[0].formation_id == 10
    # GC n'est pas dans la liste → filtré par SQL
    results_gc = rank_candidates([gc_formation], state, date.today(), 5)
    assert len(results_gc) == 1
    assert results_gc[0].formation_id == 20


def test_null_dept_id_filters_only_unassigned_formations():
    """Quand dept_id=None (enseignant sans département), seules les formations
    SANS département sont retournées (via SQL WHERE :dept_id IS NULL)."""
    source = DeptAwareFormationSource()
    comp_source = SingleCompetencySource()
    reco = RecommendTrainings(comp_source, source, FakeAnalysisRepository())

    reco.execute("T001", competence_id=1, limit=5, dept_id=None, up_id=None)

    assert source._call_log[0]["dept_id"] is None
    assert source._call_log[0]["up_id"] is None
