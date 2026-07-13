"""Tests unitaires — ActionCenter (alertes intelligentes & recommandations)."""

import os
os.environ.setdefault("JWT_AUTH_ENABLED", "false")
os.environ.setdefault("SCHEDULER_ENABLED", "false")
os.environ.setdefault("MESSAGING_ENABLED", "false")

from types import SimpleNamespace

import pytest

from app.engines.action_center import ActionCenter
from app.engines.alert_engine import compute_alert_priorite


# ── Score de priorité d'alerte (helper additif) ──────────────

class TestAlertPriorite:
    def test_critical_outranks_warning(self):
        assert compute_alert_priorite("CRITICAL", "GAP_CRITIQUE") > compute_alert_priorite("WARNING", "STAGNATION")

    def test_bounded_in_unit_interval(self):
        assert 0.0 <= compute_alert_priorite("CRITICAL", "GAP_CRITIQUE") <= 1.0

    def test_unknown_defaults(self):
        assert compute_alert_priorite(None, None) == pytest.approx(0.24)  # 0.3 * 0.8


# ── Synthèse des alertes ─────────────────────────────────────

class TestAlertSummary:
    def test_empty_db_neutral_shape(self, mock_db):
        result = ActionCenter(mock_db).alert_summary()
        assert result["total"] == 0
        assert result["nouvelles"] == 0
        assert result["by_type"] == []
        assert result["trend_30j"] == []


# ── Triage de masse ──────────────────────────────────────────

class TestBulkUpdate:
    def test_invalid_statut_raises(self, mock_db):
        with pytest.raises(ValueError):
            ActionCenter(mock_db).bulk_update([1, 2], "BOGUS")

    def test_empty_ids_noop(self, mock_db):
        result = ActionCenter(mock_db).bulk_update([], "TRAITEE")
        assert result["nb_demande"] == 0
        assert result["nb_modifie"] == 0

    def test_updates_found_and_reports_missing(self, mock_db):
        a1 = SimpleNamespace(id=1, statut="NOUVELLE", traite_par=None, commentaire_traitement=None)
        mock_db.query.return_value.filter.return_value.all.return_value = [a1]
        result = ActionCenter(mock_db).bulk_update([1, 99], "TRAITEE", traite_par="admin")
        assert a1.statut == "TRAITEE"
        assert a1.traite_par == "admin"
        assert result["nb_modifie"] == 1
        assert result["introuvables"] == [99]


# ── File d'actions priorisée ─────────────────────────────────

class TestPriorityActions:
    def test_empty_db_returns_empty(self, mock_db):
        assert ActionCenter(mock_db).priority_actions() == []

    def test_builds_action_from_risk_profile(self, mock_db):
        risk = SimpleNamespace(
            enseignant_id="t1", score_risque=0.8, niveau_risque="CRITIQUE",
            tendance="REGRESSION", nb_gaps_critiques=3,
            precedent_score_risque=None, taux_completion_formations=0.0,
            nb_mois_stagnation_max=0, computed_at=None,
        )
        mock_db.query.return_value.order_by.return_value.limit.return_value.all.return_value = [risk]
        actions = ActionCenter(mock_db).priority_actions(limit=5)
        assert len(actions) == 1
        act = actions[0]
        assert act["enseignant_id"] == "t1"
        # gap & alertes absents (mock) → score = 0.6 * risque.
        assert act["score_action"] == pytest.approx(0.48)
        assert "entretien" in act["action_recommandee"].lower()


class TestActionText:
    def test_levels(self):
        f = ActionCenter._action_text
        assert "entretien" in f("CRITIQUE", False).lower()
        assert "prioritaire" in f("ELEVE", False).lower()
        assert "progression" in f("MODERE", False).lower()
        assert "aucune" in f("FAIBLE", False).lower()

    def test_reco_suffix_only_for_high_risk(self):
        assert "recommandée" in ActionCenter._action_text("CRITIQUE", True)
        assert "recommandée" not in ActionCenter._action_text("FAIBLE", True)


# ── Recommandations agrégées (cohorte) ───────────────────────

class TestBatchRecommendations:
    def test_explicit_empty_cohort(self, mock_db):
        # teacher_ids fourni mais aucune recommandation persistée.
        result = ActionCenter(mock_db).batch_recommendations(teacher_ids=["a"], top_n=5)
        assert result["recommendations"] == []

    def test_aggregates_by_formation(self, mock_db):
        recos = [
            SimpleNamespace(enseignant_id="a", formation_id=7, formation_titre="Docker",
                            formation_type="INTERNE", probabilite_reussite=0.8,
                            score_global=0.7, competence_id=42, statut="PROPOSEE"),
            SimpleNamespace(enseignant_id="b", formation_id=7, formation_titre="Docker",
                            formation_type="INTERNE", probabilite_reussite=0.6,
                            score_global=0.5, competence_id=42, statut="PROPOSEE"),
        ]
        mock_db.query.return_value.filter.return_value.filter.return_value.all.return_value = recos
        result = ActionCenter(mock_db).batch_recommendations(teacher_ids=["a", "b"], top_n=10)
        assert result["nb_enseignants"] == 2
        assert len(result["recommendations"]) == 1
        agg = result["recommendations"][0]
        assert agg["formation_id"] == 7
        assert agg["nb_enseignants_concernes"] == 2
        assert agg["probabilite_reussite_moyenne"] == pytest.approx(0.7)
        assert agg["competences_ciblees"] == [42]
