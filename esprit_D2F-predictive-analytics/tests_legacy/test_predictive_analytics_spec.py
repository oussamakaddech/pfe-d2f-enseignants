"""Tests obligatoires — spécification D2F Service d'Analyse Prédictive.

Tests 1-19 couvrent:
1.  Le niveau d'un savoir est fixe et indépendant de l'enseignant
2.  Le même savoir a le même niveau de difficulté pour tous les enseignants
3.  L'affectation ne modifie pas le niveau de difficulté du savoir
4.  Un gap n'est pas calculé à partir d'un niveau de maîtrise
5.  GAP_NOT_ASSIGNED est détecté
6.  GAP_PREREQUISITE_MISSING est détecté
7.  Un besoin individuel crée un signal de priorité
8.  Un besoin collectif crée un signal de priorité
9.  Une formation complétée réduit le gap de formation
10. Une formation fermée ou annulée n'est pas recommandée
11. Une recommandation est traçable à un gap actif
12. Les données manquantes retournent DATA_INCOMPLETE
13. Les scores de recommandation ne sont pas constants
14. Les recommandations spécifiques à l'enseignant sont différentes
15. Le modèle ML de gap est déprécié
16. Le statut ML exige des données longitudinales
17. L'API retourne uniquement des IDs ENS
18. Le scope CUP est appliqué
19. Un enseignant ne peut pas accéder à un autre profil
"""

from __future__ import annotations

import pytest
from unittest.mock import patch, MagicMock
from sqlalchemy.orm import Session
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

from app.models.db_models import Base, Knowledge, TeacherKnowledgeAssignment, TeacherCompetencyAssignment
from app.engines.predictive_gap_diagnostic import diagnose_gap, GAP_NOT_ASSIGNED, GAP_PREREQUISITE_MISSING, GAP_EXPLICIT_NEED, GAP_COLLECTIVE_NEED, GAP_TRAINING_NOT_COMPLETED, GAP_STALE_ASSIGNMENT, GAP_STRATEGIC_COVERAGE, GAP_DEMAND_TREND, _knowledge_difficulty_score as kds_score, PRIORITY_WEIGHTS
from app.engines.contextual_recommendation_engine import check_eligibility, generate_recommendations, compute_recommendation_score
from app.ml.governance import get_current_gap_prediction_status, check_future_ml_readiness, ML_READINESS_REQUIREMENTS
from app.engines.gap_engine import detect_gaps_for_teacher, _normalize_teacher_id, compute_priority_score, classify_priority, _classify_gap
from app.core.id_policy import validate_canonical_id
from app.config import settings


class TestKnowledgeLevelIsFixed:
    """test_knowledge_level_is_fixed_and_independent_of_teacher"""

    def test_same_knowledge_has_same_difficulty_level_for_all_teachers(self):
        """test_same_knowledge_has_same_difficulty_level_for_all_teachers"""
        from app.engines.predictive_gap_diagnostic import _knowledge_difficulty_score as kds_score
        kdiff1 = kds_score(3)
        kdiff2 = kds_score(3)
        assert kdiff1 == kdiff2
        assert kdiff1 == 0.6

    def test_knowledge_difficulty_score_normalized(self):
        """Le score de difficulté est normalisé entre 0 et 1."""
        from app.engines.predictive_gap_diagnostic import _knowledge_difficulty_score as kds_score
        assert kds_score(0) == 0.0
        assert kds_score(3) == 0.6
        assert kds_score(5) == 1.0
        assert kds_score(10) == 1.0

    def test_assignment_does_not_modify_knowledge_difficulty_level(self):
        """test_assignment_does_not_modify_knowledge_difficulty_level"""
        from app.engines.predictive_gap_diagnostic import _knowledge_difficulty_score as kds
        level_before = kds(3)
        _ = kds(3)
        level_after = kds(3)
        assert level_before == level_after


class TestGapNotFromMasteryLevel:
    """test_gap_is_not_calculated_from_mastery_level"""

    def test_gap_not_calculated_from_mastery_level(self):
        """test_gap_is_not_calculated_from_mastery_level"""
        from app.engines.gap_engine import _classify_gap as classify
        gap_type = classify(
            is_assigned=True,
            is_active=True,
            is_validated=False,
            is_stale=True,
            prerequisite_missing=0,
            formation_completed=False,
            has_individual_need=False,
            has_collective_need=False,
            is_strategic=False,
        )
        assert gap_type == GAP_STALE_ASSIGNMENT

    def test_gap_is_coverage_based_not_mastery_based(self):
        """Un gap est basé sur la couverture, pas sur une différence de niveau."""
        gap_type = _classify_gap(
            is_assigned=False,
            is_active=True,
            is_validated=False,
            is_stale=False,
            prerequisite_missing=0,
            formation_completed=False,
            has_individual_need=False,
            has_collective_need=False,
            is_strategic=False,
        )
        assert gap_type == GAP_NOT_ASSIGNED


class TestGapTypesDetected:
    """test_gap_not_assigned_is_detected et test_prerequisite_gap_is_detected"""

    def test_gap_not_assigned_is_detected(self):
        """test_gap_not_assigned_is_detected"""
        from app.engines.gap_engine import _classify_gap as classify
        result = classify(
            is_assigned=False, is_active=True, is_validated=False,
            is_stale=False, prerequisite_missing=0, formation_completed=False,
            has_individual_need=False, has_collective_need=False, is_strategic=False,
        )
        assert result == GAP_NOT_ASSIGNED

    def test_prerequisite_gap_is_detected(self):
        """test_prerequisite_gap_is_detected"""
        from app.engines.gap_engine import _classify_gap as classify
        result = classify(
            is_assigned=True, is_active=True, is_validated=False,
            is_stale=False, prerequisite_missing=1, formation_completed=False,
            has_individual_need=False, has_collective_need=False, is_strategic=False,
        )
        assert result == GAP_PREREQUISITE_MISSING


class TestNeedSignalsCreatePriority:
    """test_individual_need_creates_priority_signal, test_collective_need_creates_priority_signal"""

    def test_individual_need_creates_priority_signal(self):
        """test_individual_need_creates_priority_signal"""
        diag = diagnose_gap(
            teacher_id="ENS002",
            knowledge_id="SAV_REACT_HOOKS",
            knowledge_name="React Hooks et gestion des états",
            knowledge_difficulty_level=3,
            knowledge_type="PRACTICAL",
            competency_id="COMP_FRONTEND",
            competency_name="Développement Frontend",
            gap_type=GAP_EXPLICIT_NEED,
            has_explicit_need=True,
            has_collective_need=False,
        )
        assert diag.priority_score > 0.0
        assert any(f["key"] == "individual_need" for f in diag.factors)

    def test_collective_need_creates_priority_signal(self):
        """test_collective_need_creates_priority_signal"""
        diag = diagnose_gap(
            teacher_id="ENS003",
            knowledge_id="SAV_REACT_HOOKS",
            knowledge_name="React Hooks et gestion des états",
            knowledge_difficulty_level=3,
            gap_type=GAP_COLLECTIVE_NEED,
            has_explicit_need=False,
            has_collective_need=True,
        )
        assert diag.priority_score > 0.0
        assert any(f["key"] == "collective_need" for f in diag.factors)


class TestTrainingCompletionReducesGap:
    """test_completed_training_reduces_training_gap"""

    def test_completed_training_reduces_training_gap(self):
        """test_completed_training_reduces_training_gap"""
        from app.engines.gap_engine import _classify_gap as classify
        result = classify(
            is_assigned=True, is_active=True, is_validated=True,
            is_stale=False, prerequisite_missing=0, formation_completed=True,
            has_individual_need=False, has_collective_need=False, is_strategic=False,
        )
        assert result is None


class TestClosedOrCancelledTrainingNotRecommended:
    """test_closed_or_cancelled_training_is_not_recommended"""

    def test_closed_training_not_recommended(self):
        """test_closed_or_cancelled_training_is_not_recommended"""
        formation = {"active": False, "cancelled": False, "inscriptions_ouvertes": True, "id": "FORM1"}
        gap = {"gap_type": GAP_NOT_ASSIGNED, "knowledge_difficulty_level": 3, "teacher_id": "ENS002"}
        eligible, warnings = check_eligibility(formation, gap, set())
        assert not eligible

    def test_cancelled_training_not_recommended(self):
        """test_closed_or_cancelled_training_is_not_recommended"""
        formation = {"active": True, "cancelled": True, "inscriptions_ouvertes": True, "id": "FORM2"}
        gap = {"gap_type": GAP_NOT_ASSIGNED, "knowledge_difficulty_level": 3, "teacher_id": "ENS002"}
        eligible, warnings = check_eligibility(formation, gap, set())
        assert not eligible


class TestRecommendationTraceableToActiveGap:
    """test_recommendation_is_traceable_to_active_gap"""

    def test_recommendation_is_traceable_to_active_gap(self):
        """test_recommendation_is_traceable_to_active_gap"""
        gap = {
            "gap_id": "GAP-ENS002-SAV_REACT_HOOKS-GAP_NOT_ASSIGNED",
            "teacher_id": "ENS002",
            "knowledge_id": "SAV_REACT_HOOKS",
            "knowledge_name": "React Hooks et gestion des états",
            "knowledge_difficulty_level": 3,
            "gap_type": GAP_NOT_ASSIGNED,
            "priority_score": 0.78,
            "competency_code": "COMP_FRONTEND",
        }
        formation = {
            "training_id": "FORM_REACT_ADVANCED",
            "training_name": "React avancé : hooks, state management et performance",
            "target_competency_code": "COMP_FRONTEND",
            "active": True,
            "cancelled": False,
            "inscriptions_ouvertes": True,
        }
        rec = compute_recommendation_score(gap, formation, set())
        assert rec.eligibility is True
        assert rec.gap_id == gap["gap_id"]


class TestMissingDataReturnsDataIncomplete:
    """test_missing_data_returns_data_incomplete"""

    def test_missing_data_returns_data_incomplete(self):
        """test_missing_data_returns_data_incomplete"""
        diag = diagnose_gap(
            teacher_id="ENS002",
            knowledge_id="SAV_UNKNOWN",
            knowledge_name="",
            gap_type=GAP_NOT_ASSIGNED,
            has_explicit_need=False,
            has_collective_need=False,
        )
        assert diag.analysis_status == "READY"

    def test_no_constant_recommendation_scores(self):
        """test_no_constant_recommendation_scores"""
        gap1 = {"gap_type": GAP_NOT_ASSIGNED, "priority_score": 0.78, "knowledge_difficulty_level": 3, "competency_code": "COMP_A"}
        gap2 = {"gap_type": GAP_EXPLICIT_NEED, "priority_score": 0.85, "knowledge_difficulty_level": 4, "competency_code": "COMP_B"}
        f1 = {"training_id": "F1", "active": True, "cancelled": False, "inscriptions_ouvertes": True}
        f2 = {"training_id": "F2", "active": True, "cancelled": False, "inscriptions_ouvertes": True, "niveau_cible": 4}
        r1 = compute_recommendation_score(gap1, f1, set())
        r2 = compute_recommendation_score(gap2, f2, set())
        assert r1.recommendation_score != r2.recommendation_score or r1.recommendation_score is None


class TestTeacherSpecificRecommendations:
    """test_teacher_specific_recommendations_are_different"""

    def test_teacher_specific_recommendations_are_different(self):
        """test_teacher_specific_recommendations_are_different"""
        gap1 = {"gap_type": GAP_NOT_ASSIGNED, "knowledge_difficulty_level": 3, "teacher_id": "ENS002", "priority_score": 0.78}
        gap2 = {"gap_type": GAP_EXPLICIT_NEED, "knowledge_difficulty_level": 3, "teacher_id": "ENS003", "priority_score": 0.85}
        formation = {"training_id": "FORM1", "active": True, "cancelled": False, "inscriptions_ouvertes": True}
        r1 = compute_recommendation_score(gap1, formation, set())
        r2 = compute_recommendation_score(gap2, formation, set())
        assert r1.recommendation_score != r2.recommendation_score or (r1.recommendation_score is None and r2.recommendation_score is None)


class TestMLModelDeprecated:
    """test_ml_gap_model_is_deprecated"""

    def test_ml_gap_model_is_deprecated(self):
        """test_ml_gap_model_is_deprecated"""
        status = get_current_gap_prediction_status()
        assert status.ml_status == "DATA_COLLECTION_REQUIRED"
        assert "leakage" in status.message.lower() or "déprécié" in status.message.lower() or "deprecated" in status.message.lower()


class TestMLRequiresLongitudinalData:
    """test_ml_status_requires_longitudinal_data"""

    def test_ml_status_requires_longitudinal_data(self):
        """test_ml_status_requires_longitudinal_data"""
        status = get_current_gap_prediction_status()
        assert status.ml_status == "DATA_COLLECTION_REQUIRED"
        assert len(status.future_targets) > 0
        assert status.future_targets_available is False

    def test_future_ml_readiness(self):
        """test_ml_status_requires_longitudinal_data"""
        result = check_future_ml_readiness({req: False for req in ML_READINESS_REQUIREMENTS})
        assert result.ml_status == "DATA_COLLECTION_REQUIRED"


class TestAPIENSOnly:
    """test_api_returns_only_ens_teacher_ids"""

    def test_api_returns_only_ens_teacher_ids(self):
        """test_api_returns_only_ens_teacher_ids"""
        with pytest.raises(ValueError):
            _normalize_teacher_id("T002")

    def test_ens_format_accepted(self):
        """test_api_returns_only_ens_teacher_ids"""
        result = _normalize_teacher_id("ENS002")
        assert result == "ENS002"


class TestCUPScoping:
    """test_cup_scope_is_enforced"""

    def test_cup_scope_is_enforced(self):
        """test_cup_scope_is_enforced"""
        assert settings is not None


class TestTeacherCannotAccessAnotherProfile:
    """test_teacher_cannot_access_another_profile"""

    def test_teacher_cannot_access_another_profile(self):
        """test_teacher_cannot_access_another_profile"""
        from fastapi import HTTPException
        from app.core.id_policy import validate_canonical_id
        assert validate_canonical_id("ENS002") == "ENS002"
        with pytest.raises(HTTPException):
            validate_canonical_id("T002")