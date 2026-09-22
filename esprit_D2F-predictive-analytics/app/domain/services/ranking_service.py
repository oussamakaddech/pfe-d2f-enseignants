from dataclasses import dataclass
from datetime import date

from app.domain.entities.competency import Competency
from app.domain.entities.recommendation import (
    JUSTIFICATION_INDISPONIBLE,
    JUSTIFICATION_JUSTIFIEE,
    JUSTIFICATION_SANS_COUVERTURE,
    Recommendation,
    _JUSTIFICATION_LABELS,
)
from app.domain.entities.teacher_competency_state import TeacherCompetencyState

WEIGHT_CONTENT = 0.70
WEIGHT_QUALITY = 0.20
WEIGHT_RECENCY = 0.10
RECENCY_LOOKBACK_DAYS = 365
# Echelle de notation des evaluations de formation (notes ramenees sur 0..1).
EVAL_SCALE_MAX = 5.0


@dataclass(frozen=True)
class RankingWeights:
    """Ponderation du classement des formations (CDC DSI 1.1 : parametre
    metier externalise, jamais fige dans le code).

    Les valeurs par defaut reproduisent le parametrage historique
    70 % contenu / 20 % qualite / 10 % recence.
    """

    content: float = WEIGHT_CONTENT
    quality: float = WEIGHT_QUALITY
    recency: float = WEIGHT_RECENCY
    recency_lookback_days: int = RECENCY_LOOKBACK_DAYS
    eval_scale_max: float = EVAL_SCALE_MAX


@dataclass(frozen=True)
class TrainingCandidate:
    formation_id: int
    titre: str
    savoir_ids: frozenset[int]
    start_date: date | None
    end_date: date | None
    avg_eval_score: float | None
    already_completed: bool = False


# Retourne l'ensemble des IDs de savoirs d'une compétence dont le niveau
# actuel de l'enseignant est inférieur au niveau requis (les "savoirs manquants").
def missing_savoirs(state: TeacherCompetencyState) -> set[int]:
    return {
        savoir.id
        for savoir in state.competency.savoirs
        if state.savoir_levels.get(savoir.id, 0) < savoir.knowledge_difficulty_level
    }


# Mesure la pertinence du CONTENU d'une formation candidate : proportion de
# savoirs manquants couverts par la formation (0 → rien couvert, 1 → tout couvert,
# 0.3 si la formation n'a pas de savoirs référencés mais est du bon domaine).
def content_match(
    candidate: TrainingCandidate,
    state: TeacherCompetencyState,
    missing: set[int] | None = None,
) -> float:
    # `missing` peut etre pre-calcule par l'appelant : rank_candidates l'evalue
    # une seule fois pour tout le lot au lieu de trois fois par candidate.
    missing = missing_savoirs(state) if missing is None else missing
    if not missing:
        return 0.0
    if not candidate.savoir_ids:
        return 0.3
    return len(candidate.savoir_ids & missing) / len(missing)


# Score de QUALITÉ d'une formation : note moyenne des évaluations normalisée
# sur l'échelle de notation. Note inconnue → 0.5 (valeur neutre).
def quality_score(candidate: TrainingCandidate, scale_max: float = EVAL_SCALE_MAX) -> float:
    if candidate.avg_eval_score is None:
        return 0.5
    if scale_max <= 0:
        return 0.5
    return min(1.0, max(0.0, candidate.avg_eval_score / scale_max))


# Score de RÉCENCE d'une formation : décroît linéairement sur la fenêtre de
# référence après sa fin. Formation à venir ou en cours → 1.0.
def recency_score(
    candidate: TrainingCandidate,
    today: date,
    lookback_days: int = RECENCY_LOOKBACK_DAYS,
) -> float:
    if candidate.end_date and candidate.end_date < today:
        if lookback_days <= 0:
            return 0.0
        days_since = (today - candidate.end_date).days
        return max(0.0, 1.0 - days_since / lookback_days)
    return 1.0


# Score global de classement d'une formation candidate :
# pertinence du contenu + qualité + récence, pondérés par la configuration.
def rank_score(
    candidate: TrainingCandidate,
    state: TeacherCompetencyState,
    today: date,
    weights: RankingWeights | None = None,
    missing: set[int] | None = None,
) -> float:
    w = weights or RankingWeights()
    return (
        w.content * content_match(candidate, state, missing)
        + w.quality * quality_score(candidate, w.eval_scale_max)
        + w.recency * recency_score(candidate, today, w.recency_lookback_days)
    )


# Classe les formations candidates pour un état de compétence donné :
# exclut celles déjà suivies, calcule le score de chaque, trie par score
# décroissant et renvoie les `limit` meilleures sous forme de Recommendations.
def rank_candidates(
    candidates: list[TrainingCandidate],
    state: TeacherCompetencyState,
    today: date,
    limit: int,
    weights: RankingWeights | None = None,
) -> list[Recommendation]:
    w = weights or RankingWeights()
    # Les savoirs manquants ne dependent que de `state` : on les calcule UNE
    # fois pour tout le lot (auparavant trois fois par candidate, via
    # rank_score, _build_reason et matched_savoirs).
    missing = missing_savoirs(state)
    eligible = [c for c in candidates if not c.already_completed]

    # Statut de justification (audit d'autorité 2026-09-22, §3.3) : chaque
    # recommandation DIT si elle est justifiée par des savoirs manquants réels
    # ou si la justification est indisponible (lien formation↔savoir absent du
    # référentiel, ou aucun savoir manquant couvert). Cause racine mesurée en
    # base : 16 liens formation↔savoir porteurs d'un savoir sur 66.
    def _justification(c: TrainingCandidate) -> tuple[str, str]:
        if not c.savoir_ids:
            return JUSTIFICATION_INDISPONIBLE, _JUSTIFICATION_LABELS[JUSTIFICATION_INDISPONIBLE]
        if c.savoir_ids & missing:
            return JUSTIFICATION_JUSTIFIEE, _JUSTIFICATION_LABELS[JUSTIFICATION_JUSTIFIEE]
        return JUSTIFICATION_SANS_COUVERTURE, _JUSTIFICATION_LABELS[JUSTIFICATION_SANS_COUVERTURE]

    def _to_recommendation(c: TrainingCandidate) -> Recommendation:
        status, label = _justification(c)
        return Recommendation(
            teacher_id=state.teacher_id,
            formation_id=c.formation_id,
            titre=c.titre,
            competence_id=state.competency.id,
            rank_score=rank_score(c, state, today, w, missing),
            reason=_build_reason(c, state, missing),
            matched_savoirs=tuple(
                s.nom for s in state.competency.savoirs if s.id in c.savoir_ids and s.id in missing
            ),
            justification_status=status,
            justification_label=label,
        )

    scored = sorted(
        (_to_recommendation(c) for c in eligible),
        key=lambda r: r.rank_score,
        reverse=True,
    )
    return scored[:limit]


# Construit la phrase d'explication humaine ("pourquoi cette formation ?")
# affichée à côté de chaque recommandation.
def _build_reason(
    candidate: TrainingCandidate,
    state: TeacherCompetencyState,
    missing: set[int] | None = None,
) -> str:
    # Prior domaine (0.3) quand la formation n'a AUCUN savoir référencé : le
    # score conserve ce prior documenté, mais le libellé ne doit JAMAIS
    # revendiquer une couverture des savoirs manquants (audit 4.4 — justification
    # par les savoirs réels uniquement) et doit dire EXPLICITEMENT que la
    # justification est indisponible (audit d'autorité 2026-09-22, §3.3 : 90 %
    # des recommandations n'étaient justifiées par rien, sans que la réponse le
    # signale).
    if not candidate.savoir_ids:
        return (
            "Justification indisponible : aucun savoir du référentiel n'est rattaché à cette "
            "formation (lien formation↔savoir absent) — classement par domaine cible"
        )
    match = content_match(candidate, state, missing)
    if match >= 0.5:
        return "Couvre une grande part des savoirs manquants sur la compétence cible"
    if match > 0:
        return "Couvre partiellement les savoirs manquants de la compétence cible"
    return (
        "Justification indisponible : formation rattachée à des savoirs, mais aucun n'est "
        "manquant pour cet enseignant (classement par domaine cible)"
    )
