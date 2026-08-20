from dataclasses import dataclass
from datetime import date

from app.domain.entities.competency import Competency
from app.domain.entities.recommendation import Recommendation
from app.domain.entities.teacher_competency_state import TeacherCompetencyState

WEIGHT_CONTENT = 0.70
WEIGHT_QUALITY = 0.20
WEIGHT_RECENCY = 0.10
RECENCY_LOOKBACK_DAYS = 365


@dataclass(frozen=True)
class TrainingCandidate:
    formation_id: int
    titre: str
    savoir_ids: frozenset[int]
    start_date: date | None
    end_date: date | None
    avg_eval_score: float | None
    already_completed: bool = False


def missing_savoirs(state: TeacherCompetencyState) -> set[int]:
    return {
        savoir.id
        for savoir in state.competency.savoirs
        if state.savoir_levels.get(savoir.id, 0) < savoir.knowledge_difficulty_level
    }


def content_match(candidate: TrainingCandidate, state: TeacherCompetencyState) -> float:
    missing = missing_savoirs(state)
    if not missing:
        return 0.0
    if not candidate.savoir_ids:
        return 0.3
    return len(candidate.savoir_ids & missing) / len(missing)


def quality_score(candidate: TrainingCandidate) -> float:
    if candidate.avg_eval_score is None:
        return 0.5
    return min(1.0, max(0.0, candidate.avg_eval_score / 5.0))


def recency_score(candidate: TrainingCandidate, today: date) -> float:
    if candidate.end_date and candidate.end_date < today:
        days_since = (today - candidate.end_date).days
        return max(0.0, 1.0 - days_since / RECENCY_LOOKBACK_DAYS)
    return 1.0


def rank_score(candidate: TrainingCandidate, state: TeacherCompetencyState, today: date) -> float:
    return (
        WEIGHT_CONTENT * content_match(candidate, state)
        + WEIGHT_QUALITY * quality_score(candidate)
        + WEIGHT_RECENCY * recency_score(candidate, today)
    )


def rank_candidates(
    candidates: list[TrainingCandidate],
    state: TeacherCompetencyState,
    today: date,
    limit: int,
) -> list[Recommendation]:
    eligible = [c for c in candidates if not c.already_completed]
    scored = sorted(
        (
            Recommendation(
                teacher_id=state.teacher_id,
                formation_id=c.formation_id,
                titre=c.titre,
                competence_id=state.competency.id,
                rank_score=rank_score(c, state, today),
                reason=_build_reason(c, state),
                matched_savoirs=tuple(
                    s.nom for s in state.competency.savoirs if s.id in c.savoir_ids and s.id in missing_savoirs(state)
                ),
            )
            for c in eligible
        ),
        key=lambda r: r.rank_score,
        reverse=True,
    )
    return scored[:limit]


def _build_reason(candidate: TrainingCandidate, state: TeacherCompetencyState) -> str:
    match = content_match(candidate, state)
    if match >= 0.5:
        return "Couvre une grande part des savoirs manquants sur la compétence cible"
    if match > 0:
        return "Couvre partiellement les savoirs manquants de la compétence cible"
    return "Formation du domaine cible (savoirs non référencés dans le référentiel)"
