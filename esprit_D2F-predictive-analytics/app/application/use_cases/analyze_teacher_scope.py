from dataclasses import dataclass
from datetime import date

from app.application.ports import CompetencySource, FormationSource
from app.application.use_cases.recommend_trainings import RecommendTrainings
from app.core.config import Settings
from app.domain.entities.competency import Competency
from app.domain.entities.recommendation import Recommendation
from app.domain.entities.skill_gap import SkillGap
from app.domain.entities.teacher import Teacher
from app.domain.services.gap_calculator import compute_gap, trend_from_levels
from app.domain.value_objects.enums import DEFAULT_TARGET_LEVEL


@dataclass(frozen=True)
class ScopeInfo:
    """Périmètre de l'analyse contextuelle, rendu explicite.

    - ``type`` : GLOBAL (aucun rattachement département/UP), DEPARTMENT
      (département de l'enseignant), UP (unité pédagogique).
    - ``is_global`` : vrai uniquement si le périmètre global est utilisé par
      choix (enseignant sans rattachement), jamais comme fallback silencieux.
    - ``label`` : libellé affichable ("Périmètre global", "Département ...",
      "Unité pédagogique ...").
    """

    type: str
    is_global: bool
    label: str


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
    """Analyse les affectations/competences d'un enseignant et produit les
    gaps + recommandations filtres par sa specialite, son UP et son
    departement.

    Regle de filtrage : les domaines de competences rattaches au departement
    ou a l'UP de l'enseignant (ou dont le nom matche sa specialite) sont
    analyses en priorite. Le périmètre est TOUJOURS explicite :
    - GLOBAL uniquement si l'enseignant n'a ni departement ni UP ;
    - DEPARTMENT / UP sinon — même si aucun domaine ne correspond (liste de
      compétences vide), jamais de fallback silencieux sur le global.
    """

    def __init__(
        self,
        competency_source: CompetencySource,
        recommend_trainings: RecommendTrainings,
        settings: Settings,
        recommendations_per_gap: int = 3,
        max_gaps_for_recommendations: int = 5,
    ) -> None:
        self._competency_source = competency_source
        self._recommend_trainings = recommend_trainings
        self._settings = settings
        self._recommendations_per_gap = recommendations_per_gap
        self._max_gaps_for_recommendations = max_gaps_for_recommendations

    @staticmethod
    def _scope_label(prefix: str, libelle: str | None, fallback: str | None) -> str:
        value = (libelle or fallback or "").strip()
        if not value:
            return prefix
        lowered = value.lower().replace("é", "e").replace("è", "e")
        if lowered.startswith(prefix.lower().replace("é", "e").replace("è", "e")):
            return value
        return f"{prefix} {value}"

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

    def execute(self, teacher: Teacher) -> TeacherScopeAnalysis:
        all_competencies = self._competency_source.list_competencies()
        scoped_competencies = self._competency_source.list_competencies_for_scope(
            teacher.up_id, teacher.dept_id, teacher.specialite
        )

        scope = self._scope_info(teacher)
        scoped_ids = {c.id for c in scoped_competencies}

        levels = self._competency_source.get_teacher_savoir_levels(teacher.id)
        history = self._competency_source.get_teacher_savoir_levels_history(teacher.id)
        previous_levels = {sid: events[0][1] for sid, events in history.items() if events}
        today = date.today()

        gaps: list[SkillGap] = []
        for competency in scoped_competencies:
            gaps.append(self._compute_gap(teacher.id, competency, levels, previous_levels, today))

        gaps.sort(key=lambda g: g.gap_score, reverse=True)
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

    def _compute_gap(
        self,
        teacher_id: str,
        competency: Competency,
        levels: dict[int, int],
        previous_levels: dict[int, int],
        today: date,
    ) -> SkillGap:
        current_level = self._average_level(competency, levels)
        previous_level = self._average_level(competency, previous_levels) if previous_levels else None
        gap_score, severity = compute_gap(
            current_level,
            float(competency.target_level),
            self._settings.seuil_gap_critique,
            self._settings.seuil_gap_haute,
            self._settings.seuil_gap_moyenne,
        )
        return SkillGap(
            teacher_id=teacher_id,
            competence_id=competency.id,
            competence_code=competency.code,
            competence_nom=competency.nom,
            observed_result=current_level,
            knowledge_difficulty_level=float(competency.target_level),
            gap_score=gap_score,
            severity=severity,
            trend=trend_from_levels(current_level, previous_level),
            as_of=today,
        )

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

    @staticmethod
    def _average_level(competency: Competency, savoir_levels: dict[int, int]) -> float:
        ids = competency.savoir_ids()
        if not ids:
            return float(DEFAULT_TARGET_LEVEL)
        values = [savoir_levels.get(sid, 0) for sid in ids]
        if not any(values):
            return 0.0
        return sum(values) / len(ids)
