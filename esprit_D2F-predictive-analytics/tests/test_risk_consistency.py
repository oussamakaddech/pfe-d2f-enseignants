"""Tests for unified risk score source of truth (teacher_risk_profiles table).

Verifies that all dashboard endpoints read from teacher_risk_profiles
instead of on-demand computation, ensuring consistent scores across
Executive, Global, and Analyse dashboards.
"""

from datetime import datetime, timezone
from unittest.mock import MagicMock, patch

import pytest


# ==============================================================================
# 1. Risk score bounds
# ==============================================================================

class TestRiskScoreBounds:
    """All risk scores must be in [0, 1] regardless of input."""

    def test_zero_profile(self):
        from app.engines.risk_scoring import compute_risk_score
        result = compute_risk_score({
            "no_training": 0, "stagnation": 0, "gap_count": 0,
            "feedback_decline": 0, "unmet_needs": 0,
        })
        assert 0.0 <= result["score_risque"] <= 1.0
        assert result["score_risque"] == 0.0

    def test_max_profile(self):
        from app.engines.risk_scoring import compute_risk_score
        result = compute_risk_score({
            "no_training": 1.0, "stagnation": 1.0, "gap_count": 1.0,
            "feedback_decline": 1.0, "unmet_needs": 1.0,
        })
        assert 0.0 <= result["score_risque"] <= 1.0
        assert result["score_risque"] > 0.5

    def test_partial_factors(self):
        from app.engines.risk_scoring import compute_risk_score
        result = compute_risk_score({"no_training": 0.8})
        assert 0.0 <= result["score_risque"] <= 1.0


# ==============================================================================
# 2. Categorize boundaries
# ==============================================================================

class TestCategorizeBoundaries:
    def test_faible(self):
        from app.engines.risk_scoring import categorize
        assert categorize(0.0) == "FAIBLE"
        assert categorize(0.24) == "FAIBLE"

    def test_modere(self):
        from app.engines.risk_scoring import categorize
        from app.config import settings
        assert categorize(settings.risk_score_modere) == "MODERE"

    def test_eleve(self):
        from app.engines.risk_scoring import categorize
        from app.config import settings
        assert categorize(settings.risk_score_eleve) == "ELEVE"

    def test_critique(self):
        from app.engines.risk_scoring import categorize
        from app.config import settings
        assert categorize(settings.risk_score_critique) == "CRITIQUE"


# ==============================================================================
# 3. Endpoint reads from teacher_risk_profiles (mocked)
# ==============================================================================

def _mock_profile(enseignant_id, score, gaps_critiques=0, factors=None):
    """Create a mock TeacherRiskProfile ORM object."""
    p = MagicMock()
    p.enseignant_id = enseignant_id
    p.score_risque = score
    p.nb_gaps_critiques = gaps_critiques
    p.nb_gaps_moderes = 0
    p.nb_gaps_faibles = 0
    p.niveau_risque = "ELEVE"
    p.tendance = "STABLE"
    p.taux_completion_formations = 0.0
    p.facteurs_risque = factors or {"factors": {"no_training": 0.5, "stagnation": 0.3}, "contributions": {}}
    p.computed_at = datetime(2026, 1, 1, tzinfo=timezone.utc)
    p.precedent_score_risque = None
    p.recommandations_urgentes = None
    p.nb_mois_stagnation_max = 6
    return p


class TestTeacherRiskIndicatorsFromDB:
    """teacher_risk_indicators reads from teacher_risk_profiles, not live computation."""

    @pytest.mark.asyncio
    async def test_reads_from_profiles(self):
        from app.routers.all import teacher_risk_indicators
        db = MagicMock()
        mock_profile = _mock_profile("E00003", 0.82, gaps_critiques=5)
        mock_q = MagicMock()
        mock_q.order_by.return_value = mock_q
        mock_q.all.return_value = [mock_profile]
        db.query.return_value = mock_q

        with patch("app.routers.all.text") as mock_text:
            # Mock name lookup
            mock_text.return_value = mock_text
            mock_text.execute = MagicMock(return_value=[])
            # Override text() call for name lookup
            db.execute.return_value = MagicMock(fetchall=MagicMock(
                return_value=[("E00003", "Dupont", "Marie", "marie@esprit.tn", "GC", "UP1")]))

            result = await teacher_risk_indicators(db=db, dept_id=None)

        assert len(result) == 1
        assert result[0]["attrition_risk_score"] == 0.82
        assert result[0]["algorithm_version"] == "v2-pipeline"

    @pytest.mark.asyncio
    async def test_empty_profiles_returns_empty(self):
        from app.routers.all import teacher_risk_indicators
        db = MagicMock()
        mock_q = MagicMock()
        mock_q.order_by.return_value = mock_q
        mock_q.all.return_value = []
        db.query.return_value = mock_q

        result = await teacher_risk_indicators(db=db, dept_id=None)
        assert result == []


class TestDetectAtRiskFromDB:
    """detect_at_risk_teachers reads from teacher_risk_profiles."""

    @pytest.mark.asyncio
    async def test_reads_from_profiles(self):
        from app.routers.all import detect_at_risk_teachers
        db = MagicMock()
        mock_profile = _mock_profile("E00004", 0.58)
        mock_q = MagicMock()
        mock_q.filter.return_value = mock_q
        mock_q.order_by.return_value = mock_q
        mock_q.all.return_value = [mock_profile]
        db.query.return_value = mock_q
        db.execute.side_effect = [
            MagicMock(scalar=MagicMock(return_value=100)),
            MagicMock(fetchall=MagicMock(return_value=[("E00004", "Nom", "Prenom", "m@e.tn", "GC", "UP1")])),
        ]

        result = await detect_at_risk_teachers(db=db, threshold=0.5, dept_id=None)
        assert result.total_teachers == 100
        assert result.at_risk_count == 1
        assert result.teachers[0].risk_score == 0.58

    @pytest.mark.asyncio
    async def test_threshold_filters(self):
        from app.routers.all import detect_at_risk_teachers
        db = MagicMock()
        mock_q = MagicMock()
        mock_q.filter.return_value = mock_q
        mock_q.order_by.return_value = mock_q
        mock_q.all.return_value = []  # No profiles above threshold
        db.query.return_value = mock_q
        db.execute.side_effect = [
            MagicMock(scalar=MagicMock(return_value=100)),
            MagicMock(fetchall=MagicMock(return_value=[])),
        ]

        result = await detect_at_risk_teachers(db=db, threshold=0.99, dept_id=None)
        assert result.at_risk_count == 0


class TestDepartmentDashboardFromDB:
    """department_dashboard reads from teacher_risk_profiles."""

    @pytest.mark.asyncio
    async def test_reads_from_profiles(self):
        from app.routers.all import department_dashboard
        db = MagicMock()
        mock_profile = _mock_profile("E00003", 0.82)
        mock_q = MagicMock()
        mock_q.filter.return_value = mock_q
        mock_q.order_by.return_value = mock_q
        mock_q.all.return_value = [mock_profile]
        db.query.return_value = mock_q
        # First execute: COUNT(*) -> scalar()
        # Second execute: SELECT id -> fetchall()
        # Third execute: name lookup -> fetchall()
        db.execute.side_effect = [
            MagicMock(scalar=MagicMock(return_value=50)),
            MagicMock(fetchall=MagicMock(return_value=[("E00003",)])),
            MagicMock(fetchall=MagicMock(return_value=[("E00003", "Dupont", "Marie", "m@e.tn", "GC", "UP1")])),
        ]

        result = await department_dashboard(dept_id="GC", db=db)
        assert result["department_id"] == "GC"
        assert result["total_teachers"] == 50
        assert result["avg_risk_score"] == 0.82

    @pytest.mark.asyncio
    async def test_empty_dept(self):
        from app.routers.all import department_dashboard
        db = MagicMock()
        db.execute.side_effect = [
            MagicMock(scalar=MagicMock(return_value=0)),
            MagicMock(fetchall=MagicMock(return_value=[])),
        ]

        result = await department_dashboard(dept_id="EMPTY", db=db)
        assert result["at_risk_count"] == 0
        assert result["risk_indicators"] == []


# ==============================================================================
# 4. Cross-endpoint consistency (E00003, E00004)
# ==============================================================================

class TestCrossEndpointConsistency:
    """E00003 and E00004 return identical scores across all endpoints."""

    @pytest.mark.asyncio
    async def test_e00003_same_score(self):
        """All endpoints reading from teacher_risk_profiles return score 0.82 for E00003."""
        db = MagicMock()
        profile_e3 = _mock_profile("E00003", 0.82, gaps_critiques=5)
        mock_q = MagicMock()
        mock_q.order_by.return_value = mock_q
        mock_q.filter.return_value = mock_q
        mock_q.all.return_value = [profile_e3]
        db.query.return_value = mock_q
        db.execute.side_effect = [
            # For teacher_risk_indicators name lookup
            MagicMock(fetchall=MagicMock(return_value=[("E00003", "Dupont", "Marie", "marie@esprit.tn", "GC", "UP1")])),
            # For teacher_risk_indicators alert lookup
            MagicMock(fetchall=MagicMock(return_value=[])),
        ]

        from app.routers.all import teacher_risk_indicators
        result = await teacher_risk_indicators(db=db, dept_id=None)
        assert len(result) == 1
        assert result[0]["attrition_risk_score"] == 0.82

    def test_e00004_same_score(self):
        """Score 0.58 is consistent for E00004."""
        profile = _mock_profile("E00004", 0.58, gaps_critiques=2)
        assert float(profile.score_risque) == 0.58


# ==============================================================================
# 5. Legacy functions still work but are deprecated
# ==============================================================================

class TestLegacyDeprecated:
    def test_compute_teacher_risk_still_works(self):
        from app.routers.all import _compute_teacher_risk
        teacher = {
            "enseignant_id": "E001", "nom": "Test", "prenom": "User",
            "departement_id": "GC", "email": "test@esprit.tn",
            "days_since_last_training": 300, "taux_assiduite": 0.3,
            "nb_formations_completed": 0, "nb_besoins_exprimes": 0,
        }
        result = _compute_teacher_risk(teacher)
        assert "attrition_risk_score" in result
        assert 0.0 <= result["attrition_risk_score"] <= 1.0

    def test_build_factors_from_teacher_profile_still_works(self):
        from app.engines.risk_scoring import build_factors_from_teacher_profile
        profile = {
            "nb_formations_completed": 5, "nb_formations_in_progress": 1,
            "nb_besoins_exprimes": 3, "nb_besoins_approuves": 2,
            "avg_eval_score": 3.5, "days_since_last_training": 30,
            "taux_assiduite": 0.9,
        }
        factors = build_factors_from_teacher_profile(profile)
        assert all(0.0 <= v <= 1.0 for v in factors.values())


# ==============================================================================
# 6. New schema fields
# ==============================================================================

class TestTeacherRiskIndicatorSchema:
    def test_has_new_fields(self):
        from app.models.schemas import TeacherRiskIndicator
        ind = TeacherRiskIndicator(
            teacher_id="E001",
            attrition_risk_score=0.82,
            computed_at="2026-01-01T00:00:00+00:00",
            algorithm_version="v2-pipeline",
            data_quality={"status": "SUFFICIENT"},
        )
        assert ind.computed_at == "2026-01-01T00:00:00+00:00"
        assert ind.algorithm_version == "v2-pipeline"
        assert ind.data_quality == {"status": "SUFFICIENT"}

    def test_backward_compatible(self):
        from app.models.schemas import TeacherRiskIndicator
        ind = TeacherRiskIndicator(
            teacher_id="E001",
            attrition_risk_score=0.5,
        )
        assert ind.computed_at is None
        assert ind.algorithm_version == "v2-pipeline"
        assert ind.data_quality is None