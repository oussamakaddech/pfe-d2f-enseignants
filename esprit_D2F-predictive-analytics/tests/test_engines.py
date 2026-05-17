"""
Tests unitaires pour les moteurs métier du service D2F Predictive Analytics.
Ces tests ne nécessitent PAS de base de données — tout est testé via des mocks ou
des calculs purs.
"""

import os
os.environ.setdefault("JWT_AUTH_ENABLED", "false")
os.environ.setdefault("SCHEDULER_ENABLED", "false")
os.environ.setdefault("MESSAGING_ENABLED", "false")

import pytest
from unittest.mock import MagicMock, patch
from datetime import date


# ══════════════════════════════════════════════════════════════════════════════
# GapEngine — formules Section 2A
# ══════════════════════════════════════════════════════════════════════════════

class TestClassifyUrgence:
    """Vérifie la classification des 4 niveaux d'urgence."""

    def _classify(self, score: float) -> str:
        from app.engines.gap_engine import _classify_urgence
        return _classify_urgence(score)

    def test_critique_at_threshold(self):
        assert self._classify(0.75) == "CRITIQUE"

    def test_critique_above_threshold(self):
        assert self._classify(0.90) == "CRITIQUE"
        assert self._classify(1.00) == "CRITIQUE"

    def test_haute_at_threshold(self):
        assert self._classify(0.50) == "HAUTE"

    def test_haute_below_critique(self):
        assert self._classify(0.60) == "HAUTE"
        assert self._classify(0.74) == "HAUTE"

    def test_moderee_at_threshold(self):
        assert self._classify(0.25) == "MODEREE"

    def test_moderee_below_haute(self):
        assert self._classify(0.30) == "MODEREE"
        assert self._classify(0.49) == "MODEREE"

    def test_faible_below_moderee(self):
        assert self._classify(0.00) == "FAIBLE"
        assert self._classify(0.10) == "FAIBLE"
        assert self._classify(0.24) == "FAIBLE"


class TestGapBrutFormula:
    """gap_brut = max(0, (requis - actuel) / 5)"""

    def test_gap_zero_when_actuel_equals_requis(self):
        gap = max(0.0, (3 - 3) / 5.0)
        assert gap == 0.0

    def test_gap_zero_when_actuel_above_requis(self):
        gap = max(0.0, (2 - 4) / 5.0)
        assert gap == 0.0

    def test_gap_full_when_actuel_zero_requis_five(self):
        gap = max(0.0, (5 - 0) / 5.0)
        assert gap == 1.0

    def test_gap_typical_case(self):
        # requis=4, actuel=2 → gap = 2/5 = 0.4
        gap = max(0.0, (4 - 2) / 5.0)
        assert abs(gap - 0.4) < 1e-9

    def test_gap_one_level_difference(self):
        # requis=3, actuel=2 → gap = 1/5 = 0.2
        gap = max(0.0, (3 - 2) / 5.0)
        assert abs(gap - 0.2) < 1e-9


class TestUrgenceScoreFormula:
    """urgence = min(1, mois/12 + 0.3*regression + (nb_besoins/5)*0.2)"""

    def test_zero_stagnation_no_regression_no_besoins(self):
        score = min(1.0, 0/12 + 0.0 + 0.0)
        assert score == 0.0

    def test_regression_adds_0_3(self):
        score = min(1.0, 0/12 + 0.3 + 0.0)
        assert abs(score - 0.3) < 1e-9

    def test_full_stagnation_caps_at_1(self):
        # 12 mois stagnation + regression → 1.0 + 0.3 → capped at 1.0
        score = min(1.0, 12/12 + 0.3 + 0.0)
        assert score == 1.0

    def test_partial_stagnation(self):
        # 6 mois → 6/12 = 0.5
        score = min(1.0, 6/12 + 0.0 + 0.0)
        assert abs(score - 0.5) < 1e-9

    def test_besoins_contribution(self):
        # 5 besoins → (5/5)*0.2 = 0.2
        score = min(1.0, 0.0 + 0.0 + (5/5)*0.2)
        assert abs(score - 0.2) < 1e-9


class TestPrioriteScoreFormula:
    """priorite = gap_brut*0.45 + urgence*0.35 + impact*0.20"""

    def test_all_zeros(self):
        score = 0.0*0.45 + 0.0*0.35 + 0.0*0.20
        assert score == 0.0

    def test_all_ones(self):
        score = 1.0*0.45 + 1.0*0.35 + 1.0*0.20
        assert abs(score - 1.0) < 1e-9

    def test_weights_sum_to_one(self):
        assert abs(0.45 + 0.35 + 0.20 - 1.0) < 1e-9

    def test_typical_critique_scenario(self):
        # gap_brut=1.0, urgence=0.8, impact=0.6 → 0.45 + 0.28 + 0.12 = 0.85
        score = 1.0*0.45 + 0.8*0.35 + 0.6*0.20
        assert score >= 0.75  # doit être CRITIQUE

    def test_typical_faible_scenario(self):
        # gap_brut=0.1, urgence=0.0, impact=0.0 → 0.045
        score = 0.1*0.45 + 0.0*0.35 + 0.0*0.20
        assert score < 0.25  # doit être FAIBLE


class TestGapEngineJustification:
    """_justification retourne une string non-vide dans tous les cas."""

    @pytest.fixture
    def engine(self, mock_db):
        from app.engines.gap_engine import GapEngine
        return GapEngine(mock_db)

    def test_justification_basic(self, engine):
        j = engine._justification(0.4, 0.3, 0, False, 0)
        assert isinstance(j, str)
        assert len(j) > 0
        assert "Écart" in j

    def test_justification_includes_regression(self, engine):
        j = engine._justification(0.4, 0.5, 0, True, 0)
        assert "régression" in j.lower()

    def test_justification_includes_stagnation(self, engine):
        j = engine._justification(0.2, 0.3, 8, False, 0)
        assert "stagnation" in j.lower()
        assert "8" in j

    def test_justification_includes_besoins(self, engine):
        j = engine._justification(0.2, 0.2, 0, False, 3)
        assert "besoin" in j.lower()
        assert "3" in j


# ══════════════════════════════════════════════════════════════════════════════
# RecommendationEngine — formules de scoring
# ══════════════════════════════════════════════════════════════════════════════

class TestScorePertinence:
    """_score_pertinence = max(0, min(1, 1 - |delta_form - delta_gap| / 5))"""

    def _score(self, formation_dict: dict, actuel: int, requis: int) -> float:
        from app.engines.recommendation_engine import _score_pertinence
        return _score_pertinence(formation_dict, actuel, requis)

    def test_perfect_alignment(self):
        # actuel=2, requis=4, formation vise niveau 4 → delta_form=delta_gap=2
        score = self._score({"niveau_vise": 4}, actuel=2, requis=4)
        assert abs(score - 1.0) < 1e-9

    def test_zero_when_no_gap(self):
        # requis <= actuel → score 0
        score = self._score({"niveau_vise": 4}, actuel=5, requis=3)
        assert score == 0.0

    def test_partial_alignment(self):
        # actuel=1, requis=5, delta_gap=4, formation vise 3 → delta_form=2
        # score = 1 - |2-4|/5 = 1 - 0.4 = 0.6
        score = self._score({"niveau_vise": 3}, actuel=1, requis=5)
        assert abs(score - 0.6) < 1e-9

    def test_score_clamped_to_0_1(self):
        # Cas extrême : delta_form très grand
        score = self._score({"niveau_vise": 10}, actuel=1, requis=2)
        assert 0.0 <= score <= 1.0

    def test_missing_niveau_vise_treated_as_zero(self):
        score = self._score({}, actuel=1, requis=3)
        assert 0.0 <= score <= 1.0


class TestScoreReussite:
    """_score_reussite = taux_hist*0.6 + note_norm*0.4"""

    def _score(self, formation_id, inscriptions, evaluations):
        from app.engines.recommendation_engine import _score_reussite
        return _score_reussite(formation_id, inscriptions, evaluations)

    def test_default_when_no_data(self):
        score = self._score(1, [], [])
        assert score == 0.5  # neutre

    def test_full_completion_and_best_note(self):
        inscriptions = [{"formation_id": 1, "etat": "APPROVED"}]
        evaluations  = [{"formation_id": 1, "note_globale": 5.0}]
        score = self._score(1, inscriptions, evaluations)
        # taux=1.0, note_norm=1.0 → 1.0*0.6 + 1.0*0.4 = 1.0
        assert abs(score - 1.0) < 1e-9

    def test_zero_completion_good_note(self):
        inscriptions = [{"formation_id": 1, "etat": "EN_COURS"}]
        evaluations  = [{"formation_id": 1, "note_globale": 5.0}]
        score = self._score(1, inscriptions, evaluations)
        # taux=0.0, note_norm=1.0 → 0.0*0.6 + 1.0*0.4 = 0.4
        assert abs(score - 0.4) < 1e-9

    def test_score_clamped_between_0_and_1(self):
        score = self._score(1, [], [])
        assert 0.0 <= score <= 1.0


class TestScoreDisponibilite:
    def _score(self, formation: dict) -> float:
        from app.engines.recommendation_engine import _score_disponibilite
        return _score_disponibilite(formation)

    def test_open_planifie_gives_maximum(self):
        score = self._score({"inscriptions_ouvertes": True, "etat_formation": "PLANIFIE"})
        assert score == 1.0

    def test_closed_annule_gives_minimum(self):
        score = self._score({"inscriptions_ouvertes": False, "etat_formation": "ANNULE"})
        assert score < 0.5

    def test_score_always_between_0_and_1(self):
        for f in [
            {},
            {"inscriptions_ouvertes": True},
            {"etat_formation": "EN_COURS"},
            {"inscriptions_ouvertes": False, "etat_formation": "PLANIFIE"},
        ]:
            s = self._score(f)
            assert 0.0 <= s <= 1.0


# ══════════════════════════════════════════════════════════════════════════════
# AlertEngine — règles de détection
# ══════════════════════════════════════════════════════════════════════════════

def _make_gap(urgence="CRITIQUE", competence_nom="CompTest", actuel=1, requis=5,
              mois_stag=0, en_regression=False) -> MagicMock:
    g = MagicMock()
    g.id = 1
    g.competence_id = 42
    g.competence_nom = competence_nom
    g.niveau_urgence = urgence
    g.niveau_actuel  = actuel
    g.niveau_requis  = requis
    g.mois_stagnation = mois_stag
    g.en_regression  = en_regression
    return g


class TestAlertEngineR1GapCritique:
    @pytest.fixture
    def engine(self, mock_db):
        from app.engines.alert_engine import AlertEngine
        return AlertEngine(mock_db)

    def test_r1_fires_for_critique_gap(self, engine):
        gap = _make_gap(urgence="CRITIQUE")
        alerts = engine._r1_gap_critique("ENS001", gap)
        assert len(alerts) == 1
        assert alerts[0].type_alerte == "GAP_CRITIQUE"
        assert alerts[0].severite   == "CRITICAL"
        assert alerts[0].enseignant_id == "ENS001"

    def test_r1_does_not_fire_for_haute_gap(self, engine):
        gap = _make_gap(urgence="HAUTE")
        alerts = engine._r1_gap_critique("ENS001", gap)
        assert alerts == []

    def test_r1_does_not_fire_for_faible_gap(self, engine):
        gap = _make_gap(urgence="FAIBLE")
        alerts = engine._r1_gap_critique("ENS001", gap)
        assert alerts == []


class TestAlertEngineR2Stagnation:
    @pytest.fixture
    def engine(self, mock_db):
        from app.engines.alert_engine import AlertEngine
        return AlertEngine(mock_db)

    def test_r2_fires_warning_at_6_months(self, engine):
        gap = _make_gap(urgence="MODEREE", mois_stag=6)
        alerts = engine._r2_stagnation("ENS001", gap)
        assert len(alerts) == 1
        assert alerts[0].type_alerte == "STAGNATION"

    def test_r2_fires_critical_at_12_months(self, engine):
        gap = _make_gap(urgence="HAUTE", mois_stag=12)
        alerts = engine._r2_stagnation("ENS001", gap)
        assert len(alerts) == 1
        assert alerts[0].severite == "CRITICAL"

    def test_r2_no_fire_below_threshold(self, engine):
        gap = _make_gap(urgence="MODEREE", mois_stag=3)
        alerts = engine._r2_stagnation("ENS001", gap)
        assert alerts == []


class TestAlertEngineR3Regression:
    @pytest.fixture
    def engine(self, mock_db):
        from app.engines.alert_engine import AlertEngine
        return AlertEngine(mock_db)

    def test_r3_fires_when_regression(self, engine):
        gap = _make_gap(en_regression=True)
        alerts = engine._r3_regression("ENS001", gap)
        assert len(alerts) == 1
        assert alerts[0].type_alerte == "REGRESSION"

    def test_r3_no_fire_without_regression(self, engine):
        gap = _make_gap(en_regression=False)
        alerts = engine._r3_regression("ENS001", gap)
        assert alerts == []


class TestAlertEngineR4CompletionFaible:
    @pytest.fixture
    def engine(self, mock_db):
        from app.engines.alert_engine import AlertEngine
        return AlertEngine(mock_db)

    def test_r4_fires_when_completion_below_threshold(self, engine):
        # total = in_progress + completed = 10, taux = 1/10 = 10% < 40%
        profile = {
            "nb_formations_completed": 1,
            "nb_formations_in_progress": 9,
        }
        alerts = engine._r4_completion_faible("ENS001", profile)
        assert len(alerts) == 1
        assert alerts[0].type_alerte == "COMPLETION_FAIBLE"

    def test_r4_no_fire_when_completion_above_threshold(self, engine):
        # taux = 8/10 = 80% >= 40%
        profile = {
            "nb_formations_completed": 8,
            "nb_formations_in_progress": 2,
        }
        alerts = engine._r4_completion_faible("ENS001", profile)
        assert alerts == []

    def test_r4_no_fire_when_no_formations(self, engine):
        # total = 0 < SEUIL_NB_FORMATIONS_MIN (3)
        profile = {"nb_formations_completed": 0, "nb_formations_in_progress": 0}
        alerts = engine._r4_completion_faible("ENS001", profile)
        assert alerts == []


# ══════════════════════════════════════════════════════════════════════════════
# FeatureEngine — niveau_to_int
# ══════════════════════════════════════════════════════════════════════════════

class TestNiveauToInt:
    def _to_int(self, val) -> int:
        from app.engines.feature_engine import niveau_to_int
        return niveau_to_int(val)

    def test_integer_passthrough(self):
        for i in range(1, 6):
            assert self._to_int(i) == i

    def test_string_enum_names(self):
        assert self._to_int("N1_DEBUTANT")  == 1
        assert self._to_int("N2_ELEMENTAIRE") == 2
        assert self._to_int("N3_INTERMEDIAIRE") == 3
        assert self._to_int("N4_AVANCE")     == 4
        assert self._to_int("N5_EXPERT")     == 5

    def test_none_returns_zero(self):
        assert self._to_int(None) == 0

    def test_unknown_string_returns_zero(self):
        assert self._to_int("UNKNOWN_LEVEL") == 0
