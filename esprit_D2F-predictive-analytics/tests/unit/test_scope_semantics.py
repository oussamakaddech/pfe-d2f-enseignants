"""Sémantique du périmètre (scope) de l'analyse contextuelle.

Exigences :
- type explicite GLOBAL / DEPARTMENT / UP + is_global + label affichable ;
- GLOBAL uniquement si l'enseignant n'a ni département ni UP (jamais comme
  fallback silencieux) ;
- un enseignant du Département Technologie Web ne voit jamais les compétences
  de Génie Civil (filtrage strict par périmètre).
"""
from datetime import date

from app.application.use_cases.analyze_teacher_scope import AnalyzeTeacherScope
from app.application.use_cases.recommend_trainings import RecommendTrainings
from app.core.config import Settings
from app.domain.entities.competency import Competency, Savoir
from app.domain.entities.teacher import Teacher
from tests.fakes import (
    FakeAnalysisRepository,
    FakeFormationSource,
    build_settings,
)


class WebOnlyCompetencySource:
    """Source simulée : référentiel = [Génie Civil, Développement Web] ;
    le périmètre 'Département Technologie Web' ne couvre que le Web."""

    def __init__(self) -> None:
        self._gc = Competency(
            id=1, code="GC.STRUCT", nom="Structures et Béton Armé",
            domaine_id=6, domaine_nom="Génie Civil",
            savoirs=(Savoir(id=1, code="S1", nom="Béton", knowledge_difficulty_level=3),),
        )
        self._web = Competency(
            id=2, code="DEV.FRONT", nom="Développement Frontend",
            domaine_id=1, domaine_nom="Développement Logiciel",
            savoirs=(Savoir(id=2, code="S2", nom="React", knowledge_difficulty_level=3),),
        )
        self._levels: dict[str, dict[int, int]] = {}

    def list_competencies(self) -> list[Competency]:
        return [self._gc, self._web]

    def list_competencies_for_scope(self, up_id, dept_id, specialite) -> list[Competency]:
        if not (up_id or dept_id or specialite):
            return self.list_competencies()
        if dept_id == "DEPT_TECH_WEB" or up_id == "UP_TECH_WEB":
            return [self._web]
        return []

    def get_teacher_savoir_levels(self, teacher_id: str) -> dict[int, int]:
        return dict(self._levels.get(teacher_id, {}))

    def get_teacher_savoir_levels_history(self, teacher_id: str) -> dict[int, list[tuple[str, int]]]:
        return {}


def _analyzer(source) -> AnalyzeTeacherScope:
    settings: Settings = build_settings()
    reco = RecommendTrainings(source, FakeFormationSource(), FakeAnalysisRepository())
    return AnalyzeTeacherScope(source, reco, settings)


def _teacher(id: str, nom: str, prenom: str, **kwargs) -> Teacher:
    defaults = dict(up_id=None, dept_id=None, user_id=None, date_recrutement=None)
    defaults.update(kwargs)
    return Teacher(id=id, nom=nom, prenom=prenom, mail=f"{id.lower()}@esprit.tn", **defaults)


def test_global_scope_only_without_affiliation():
    teacher = _teacher("T999", "Sans", "Affectation")
    analysis = _analyzer(WebOnlyCompetencySource()).execute(teacher)
    assert analysis.scope.type == "GLOBAL"
    assert analysis.scope.is_global is True
    assert analysis.scope.label == "Périmètre global"
    assert analysis.scoped_competencies_count == analysis.total_competencies == 2


def test_department_scope_explicit():
    teacher = _teacher("T001", "Web", "Dev",
                       dept_id="DEPT_TECH_WEB", dept_libelle="Technologie Web",
                       up_id="UP_TECH_WEB", up_libelle="UP Web")
    analysis = _analyzer(WebOnlyCompetencySource()).execute(teacher)
    assert analysis.scope.type == "DEPARTMENT"
    assert analysis.scope.is_global is False
    assert analysis.scope.label == "Département Technologie Web"
    assert analysis.scoped_competence_ids == {2}


def test_up_scope_when_no_department():
    teacher = _teacher("T002", "Up", "Only",
                       up_id="UP_TECH_WEB", up_libelle="UP Web")
    analysis = _analyzer(WebOnlyCompetencySource()).execute(teacher)
    assert analysis.scope.type == "UP"
    assert analysis.scope.is_global is False
    assert analysis.scope.label == "UP Web"
    assert analysis.scoped_competence_ids == {2}


def test_no_gc_competencies_for_tech_web_teacher():
    """Marwa (Technologie Web) : les compétences Génie Civil ne doivent jamais
    apparaître dans son analyse (gaps et recommandations inclus)."""
    source = WebOnlyCompetencySource()
    teacher = _teacher("ENS036", "BEN ROMDHANE", "Marwa",
                       dept_id="DEPT_TECH_WEB", dept_libelle="Technologie Web",
                       up_id="UP_TECH_WEB", specialite="Technologies Web")
    analysis = _analyzer(source).execute(teacher)
    assert analysis.scope.type == "DEPARTMENT"
    assert analysis.scope.is_global is False
    gc_ids = {c.id for c in source.list_competencies() if "Génie Civil" in (c.domaine_nom or "")}
    assert gc_ids == {1}
    assert analysis.scoped_competence_ids & gc_ids == set()
    for gap in analysis.gaps:
        assert "Génie Civil" not in (gap.competence_nom or "")
        assert gap.competence_id not in gc_ids


def test_global_referentiel_contains_gc_but_scope_filters_it():
    """Sans scope déclaré, le référentiel global contient bien le Génie Civil —
    c'est le scope qui le filtre pour un enseignant du département Web."""
    source = WebOnlyCompetencySource()
    assert any("Génie Civil" in (c.domaine_nom or "") for c in source.list_competencies())
    teacher_global = _teacher("T999", "G", "I")
    global_ids = _analyzer(source).execute(teacher_global).scoped_competence_ids
    assert 1 in global_ids


def test_declared_scope_without_match_is_empty_not_global():
    """Périmètre déclaré sans domaine correspondant -> liste vide (0 compétence),
    jamais un repli silencieux sur le référentiel global."""
    source = WebOnlyCompetencySource()
    teacher = _teacher("T003", "Vide", "Scope",
                       dept_id="DEPT_INCONNU", dept_libelle="Inconnu")
    analysis = _analyzer(source).execute(teacher)
    assert analysis.scope.type == "DEPARTMENT"
    assert analysis.scope.is_global is False
    assert analysis.scoped_competencies_count == 0
    assert analysis.gaps == []
    assert analysis.scope.label == "Département Inconnu"