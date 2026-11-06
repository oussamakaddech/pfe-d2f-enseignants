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


def test_reason_never_claims_coverage_without_savoir_links():
    """Audit d'autorité Point 8 — une formation SANS savoirs référencés
    (prior domaine 0.3) ne doit JAMais revendiquer une couverture des savoirs
    manquants : le libellé est « Justification indisponible » (lien
    formation↔savoir absent) et matched_savoirs est vide."""
    from app.domain.services.ranking_service import rank_score

    no_links = _candidate(set())
    results = rank_candidates([no_links], STATE, date.today(), 5)
    assert len(results) == 1
    rec = results[0]
    assert "Couvre" not in (rec.reason or ""), "le libellé ne doit pas revendiquer une couverture"
    assert "Justification indisponible" in (rec.reason or "")
    assert rec.matched_savoirs == ()
    # Le score conserve le prior domaine 0.3 documenté (0.7*0.3 + 0.2*qualité + 0.1*récence).
    expected = 0.7 * 0.3 + 0.2 * quality_score(no_links) + 0.1 * recency_score(no_links, date.today())
    assert abs(rec.rank_score - round(rank_score(no_links, STATE, date.today()), 4)) < 0.01
    assert abs(rec.rank_score - round(expected, 4)) < 0.01


def test_reason_claims_coverage_only_with_real_missing_savoirs():
    """Une formation AVEC savoirs référencés couvrant les savoirs manquants
    affiche « Couvre... » ET des matched_savoirs non vides (justification réelle)."""
    partial = _candidate({101})
    results = rank_candidates([partial], STATE, date.today(), 5)
    rec = results[0]
    assert "Couvre" in (rec.reason or "")
    assert list(rec.matched_savoirs) == ["S1"], "matched_savoirs = savoir manquant réellement couvert"


def test_ranking_weights_are_configurable():
    """Les ponderations pilotent reellement le classement (CDC DSI 1.1).

    Deux formations : l'une couvre tous les savoirs manquants mais est mal
    notee, l'autre ne couvre rien mais est excellente. Basculer la ponderation
    de "contenu" vers "qualite" doit inverser le classement.
    """
    from app.domain.services.ranking_service import RankingWeights, rank_candidates

    pertinente = TrainingCandidate(
        formation_id=1, titre="Couvre les savoirs manquants",
        savoir_ids=frozenset({101, 102}), start_date=None, end_date=None,
        avg_eval_score=0.0,
    )
    bien_notee = TrainingCandidate(
        formation_id=2, titre="Hors sujet mais excellente",
        savoir_ids=frozenset({999}), start_date=None, end_date=None,
        avg_eval_score=5.0,
    )
    candidates = [pertinente, bien_notee]
    today = date(2026, 1, 1)

    contenu_prioritaire = rank_candidates(candidates, STATE, today, 2, RankingWeights(content=1.0, quality=0.0, recency=0.0))
    assert [r.formation_id for r in contenu_prioritaire] == [1, 2]

    qualite_prioritaire = rank_candidates(candidates, STATE, today, 2, RankingWeights(content=0.0, quality=1.0, recency=0.0))
    assert [r.formation_id for r in qualite_prioritaire] == [2, 1]


def test_recency_lookback_is_configurable():
    """La fenetre de decroissance de la recence vient de la configuration."""
    from app.domain.services.ranking_service import recency_score

    terminee = TrainingCandidate(
        formation_id=10, titre="F", savoir_ids=frozenset({101}),
        start_date=date(2025, 1, 1), end_date=date(2025, 7, 1), avg_eval_score=4.0,
    )
    today = date(2026, 1, 1)  # 184 jours apres la fin
    # Fenetre 365 j : il reste environ la moitie de la fraicheur.
    assert recency_score(terminee, today, 365) > 0.4
    # Fenetre 90 j : la formation est consideree perimee.
    assert recency_score(terminee, today, 90) == 0.0
