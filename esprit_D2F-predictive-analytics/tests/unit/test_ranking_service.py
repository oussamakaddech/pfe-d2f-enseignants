from datetime import date

from app.domain.entities.competency import Competency, Savoir
from app.domain.entities.teacher_competency_state import TeacherCompetencyState
from app.domain.services.ranking_service import (
    TrainingCandidate,
    content_match,
    missing_savoirs,
    quality_score,
    rank_candidates,
    recency_score,
)

COMPETENCY = Competency(
    id=1,
    code="C1",
    nom="Pedagogie",
    domaine_id=None,
    domaine_nom=None,
    savoirs=(Savoir(id=101, code="S101", nom="S1", knowledge_difficulty_level=4), Savoir(id=102, code="S102", nom="S2", knowledge_difficulty_level=3)),
)

STATE = TeacherCompetencyState(teacher_id="T001", competency=COMPETENCY, observed_result=1.5, previous_observed_result=None, savoir_levels={101: 1, 102: 2})


def _candidate(savoir_ids: set[int], completed: bool = False, avg_eval: float | None = 4.0) -> TrainingCandidate:
    return TrainingCandidate(
        formation_id=10,
        titre="F",
        savoir_ids=frozenset(savoir_ids),
        start_date=date(2026, 9, 1),
        end_date=date(2026, 10, 1),
        avg_eval_score=avg_eval,
        already_completed=completed,
    )


def test_missing_savoirs():
    missing = missing_savoirs(STATE)
    assert missing == {101, 102}


def test_content_match_full_and_partial():
    assert content_match(_candidate({101, 102}), STATE) == 1.0
    assert content_match(_candidate({101}), STATE) == 0.5
    assert content_match(_candidate({999}), STATE) == 0.0


def test_content_match_empty_savoirs_defaults():
    assert content_match(_candidate(set()), STATE) == 0.3


def test_quality_score():
    assert quality_score(_candidate({101}, avg_eval=5.0)) == 1.0
    assert quality_score(_candidate({101}, avg_eval=2.5)) == 0.5
    assert quality_score(_candidate({101}, avg_eval=None)) == 0.5


def test_recency_future_full_past_decays():
    today = date(2026, 8, 1)
    future = TrainingCandidate(formation_id=1, titre="f", savoir_ids=frozenset(), start_date=date(2026, 9, 1), end_date=date(2026, 10, 1), avg_eval_score=None)
    past_old = TrainingCandidate(formation_id=2, titre="f", savoir_ids=frozenset(), start_date=date(2025, 1, 1), end_date=date(2025, 1, 2), avg_eval_score=None)
    assert recency_score(future, today) == 1.0
    assert recency_score(past_old, today) == 0.0


def test_completed_trainings_excluded():
    results = rank_candidates([_candidate({101, 102}, completed=True), _candidate({102})], STATE, date.today(), 5)
    assert len(results) == 1
    assert results[0].formation_id == 10


def test_ranking_order_by_score():
    better = TrainingCandidate(
        formation_id=1, titre="A", savoir_ids=frozenset({101, 102}), start_date=date(2026, 9, 1), end_date=date(2026, 10, 1), avg_eval_score=5.0
    )
    worse = TrainingCandidate(
        formation_id=2, titre="B", savoir_ids=frozenset({101}), start_date=date(2024, 1, 1), end_date=date(2024, 2, 1), avg_eval_score=1.0
    )
    results = rank_candidates([worse, better], STATE, date.today(), 5)
    assert [r.formation_id for r in results] == [1, 2]
    assert results[0].rank_score > results[1].rank_score


def test_limit_respected():
    results = rank_candidates([_candidate({101, 102}), _candidate({102})], STATE, date.today(), 1)
    assert len(results) == 1
