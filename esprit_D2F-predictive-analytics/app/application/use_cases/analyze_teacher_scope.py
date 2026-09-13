from dataclasses import dataclass

from app.application.ports import CompetencySource, FormationSource
from app.application.use_cases.compute_gaps import ComputeGaps
from app.application.use_cases.recommend_trainings import RecommendTrainings
from app.core.config import Settings
from app.domain.entities.recommendation import Recommendation
from app.domain.entities.skill_gap import SkillGap
from app.domain.entities.teacher import Teacher


@dataclass(frozen=True)
class ScopeInfo:
    """Périmètre de l'analyse contextuelle, rendu explicite.

    - ``type`` : GLOBAL (aucun rattachement département/UP), DEPARTMENT
      (département de l'enseignant), UP (unité pédagogique).
    - ``is_global`` : vrai uniquement si le périmètre global est utilisé par
      choix (enseignant sans rattachement), jamais comme fallback silencieux.
    - ``fallback`` : vrai quand le périmètre déclaré ne couvre aucune
      compétence (référentiel incomplet pour ce département/UP) et que
      l'analyse a été élargie au référentiel global — TOUJOURS explicite via
      ``fallback_reason``, jamais silencieux.
    - ``label`` : libellé affichable ("Périmètre global", "Département ...",
      "Unité pédagogique ...").
    """

    type: str
    is_global: bool
    label: str
    fallback: bool = False
    fallback_reason: str | None = None


@dataclass(frozen=True)
class TeacherScopeAnalysis:
    """Agregat de l'analyse contextuelle d'un enseignant.

    Contient le contexte (specialite / UP / departement), le périmètre
    explicite (ScopeInfo), les gaps calculés sur les competences de son
    perimetre, et les recommandations de formations associées aux gaps les
    plus critiques.
    """

    teacher: Teacher
    scoped_competence_ids: set[int]
    gaps: list[SkillGap]
    recommendations: list[Recommendation]
    total_competencies: int
    scoped_competencies_count: int
    scope: ScopeInfo


class AnalyzeTeacherScope:
    """Analyse contextuelle d'un enseignant : gaps + recommandations sur les
    compétences de son périmètre (spécialité/UP/département).

    SOURCE UNIQUE : les gaps viennent de ``ComputeGaps`` (ML d'abord, puis
    heuristique sur le périmètre) — exactement les mêmes que l'onglet Gaps
    (``/teachers/{id}/gaps``) et que le calcul de risque. On ne recalcule
    jamais d'heuristique locale : cela affichait des gaps à 100 % sur des
    compétences sans aucune donnée de l'enseignant.

    Regle de périmètre : les domaines rattachés au département/UP (ou dont
    le nom matche la spécialité) sont analysés en priorité. Le périmètre
    est TOUJOURS explicite :
    - GLOBAL uniquement si l'enseignant n'a ni departement ni UP ;
    - DEPARTMENT / UP sinon — si aucun domaine ne correspond (référentiel
      incomplet), l'analyse est élargie au référentiel global avec
      ``fallback=True`` + ``fallback_reason`` explicite (jamais silencieux).
    """

    FALLBACK_REASON = (
        "Référentiel incomplet pour ce périmètre : aucune compétence rattachée "
        "— analyse élargie au référentiel global"
    )

    # Injecte les dépendances : source des compétences, calcul des gaps
    # (source unique ML-first), use case de recommandation, configuration
    # et bornes (recos par gap, max de gaps traités).
    def __init__(
        self,
        competency_source: CompetencySource,
        recommend_trainings: RecommendTrainings,
        settings: Settings,
        compute_gaps: ComputeGaps,
        recommendations_per_gap: int = 3,
        max_gaps_for_recommendations: int = 5,
    ) -> None:
        self._competency_source = competency_source
        self._recommend_trainings = recommend_trainings
        self._settings = settings
        self._compute_gaps = compute_gaps
        self._recommendations_per_gap = recommendations_per_gap
        self._max_gaps_for_recommendations = max_gaps_for_recommendations

    # Construit le libellé affichable d'un périmètre, ex. "Département GC".
    # Évite de doubler le préfixe si le libellé commence déjà par celui-ci.
    @staticmethod
    def _scope_label(prefix: str, libelle: str | None, fallback: str | None) -> str:
        value = (libelle or fallback or "").strip()
        if not value:
            return prefix
        lowered = value.lower().replace("é", "e").replace("è", "e")
        if lowered.startswith(prefix.lower().replace("é", "e").replace("è", "e")):
            return value
        return f"{prefix} {value}"

    # Détermine le périmètre d'analyse de l'enseignant : DEPARTMENT si un
    # département est connu, sinon UP, sinon GLOBAL (seulement sans rattachement).
    @staticmethod
    def _scope_info(teacher: Teacher) -> ScopeInfo:
        if teacher.dept_id:
            label = AnalyzeTeacherScope._scope_label("Département", teacher.dept_libelle, teacher.dept_id)
            return ScopeInfo(type="DEPARTMENT", is_global=False, label=label)
        if teacher.up_id:
            up_libelle = teacher.up_libelle or teacher.up_id
            label = up_libelle if up_libelle.lower().startswith(("up ", "unité")) else f"Unité pédagogique {up_libelle}"
            return ScopeInfo(type="UP", is_global=False, label=label)
        return ScopeInfo(type="GLOBAL", is_global=True, label="Périmètre global")

    # Analyse complète du périmètre d'un enseignant : gaps issus de la source
    # unique (ComputeGaps : ML d'abord, heuristique sur le périmètre sinon),
    # restreints au périmètre déclaré, triés par score décroissant, avec des
    # recommandations de formations sur les gaps les plus critiques.
    def execute(self, teacher: Teacher) -> TeacherScopeAnalysis:
        all_competencies = self._competency_source.list_competencies()
        scoped_competencies = self._competency_source.list_competencies_for_scope(
            teacher.up_id, teacher.dept_id, teacher.specialite
        )

        scope = self._scope_info(teacher)
        if not scoped_competencies and (teacher.dept_id or teacher.up_id):
            scoped_competencies = all_competencies
            scope = ScopeInfo(
                type=scope.type,
                is_global=False,
                label=scope.label,
                fallback=True,
                fallback_reason=self.FALLBACK_REASON,
            )
        scoped_ids = {c.id for c in scoped_competencies}

        computed_gaps, _, _ = self._compute_gaps.execute(teacher.id)
        gaps = sorted(
            (g for g in computed_gaps if g.competence_id in scoped_ids),
            key=lambda g: g.gap_score,
            reverse=True,
        )
        recommendations = self._recommendations_for_top_gaps(teacher.id, gaps)

        return TeacherScopeAnalysis(
            teacher=teacher,
            scoped_competence_ids=scoped_ids,
            gaps=gaps,
            recommendations=recommendations,
            total_competencies=len(all_competencies),
            scoped_competencies_count=len(scoped_competencies),
            scope=scope,
        )

    # Génère des recommandations pour les N gaps les plus critiques
    # (max_gaps_for_recommendations), en dédupliquant par formation
    # (on garde la recommandation au meilleur score).
    def _recommendations_for_top_gaps(self, teacher_id: str, gaps: list[SkillGap]) -> list[Recommendation]:
        top_gaps = [g for g in gaps if g.gap_score > 0][: self._max_gaps_for_recommendations]
        merged: dict[int, Recommendation] = {}
        for gap in top_gaps:
            for rec in self._recommend_trainings.execute(
                teacher_id, gap.competence_id, self._recommendations_per_gap
            ):
                existing = merged.get(rec.formation_id)
                if existing is None or rec.rank_score > existing.rank_score:
                    merged[rec.formation_id] = rec
        return sorted(merged.values(), key=lambda r: r.rank_score, reverse=True)
