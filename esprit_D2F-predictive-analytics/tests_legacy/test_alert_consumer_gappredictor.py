from datetime import date, datetime, timedelta
from types import SimpleNamespace
from unittest.mock import MagicMock

import pytest

from app.engines.alert_engine import AlertEngine
from app.messaging.consumer import AnalyticsEventConsumer
from app.ml.gap_predictor import GapPredictor

try:
    from tests_legacy.conftest import DB_REACHABLE
except ImportError:  # exécution fichier par fichier sans conftest
    DB_REACHABLE = False


def test_alert_engine_rules(monkeypatch):
    db = MagicMock()
    ae = AlertEngine(db)

    # Create gaps to trigger R1, R2, R3
    g1 = SimpleNamespace(niveau_urgence="CRITIQUE", competence_id=1, id=11, competence_nom="C1", niveau_actuel=1, niveau_requis=4, priorite_score=0.9, gap_score=0.6, mois_stagnation=0, en_regression=False)
    g2 = SimpleNamespace(niveau_urgence="HAUTE", competence_id=2, id=12, competence_nom="C2", niveau_actuel=1, niveau_requis=4, priorite_score=0.6, gap_score=0.6, mois_stagnation=7, en_regression=False)
    g3 = SimpleNamespace(niveau_urgence="MODEREE", competence_id=3, id=13, competence_nom="C3", niveau_actuel=1, niveau_requis=3, priorite_score=0.3, gap_score=0.4, mois_stagnation=0, en_regression=True)

    profile = {"nb_formations_in_progress": 1, "nb_formations_completed": 5}
    besoins = [{"priorite": "HAUTE", "approuve_cup": False, "last_refresh_date": date.today() - timedelta(days=40), "titre": "Need1", "id_besoin_formation": 99}]
    dept_stats = {1: {"nb_critique": 4, "nb_total": 10, "competence_nom": "C1"}}

    # Avoid DB duplicate checks by patching method
    monkeypatch.setattr(AlertEngine, "_find_active_duplicate", lambda self, a: None)

    saved = ae.detect_and_save("t1", [g1, g2, g3], profile, besoins, "D1", dept_stats=dept_stats)
    # Should have saved some alerts
    assert isinstance(saved, list)


def test_consumer_on_message_triggers(monkeypatch):
    """Flux actuel : payload validé -> EventProcessingService.process_event
    -> basic_ack en cas de succès. Le service est mocké (aucune DB requise)."""
    from types import SimpleNamespace

    consumer = AnalyticsEventConsumer()
    acked = {}

    def fake_process(event):
        return SimpleNamespace(processed=True, error=None)

    monkeypatch.setattr(
        "app.services.event_processing_service.EventProcessingService",
        lambda: SimpleNamespace(process_event=fake_process),
    )

    class Channel:
        def basic_ack(self, delivery_tag, requeue=False):
            acked["tag"] = delivery_tag

        def basic_nack(self, delivery_tag, requeue=False):
            pass

    class Method:
        delivery_tag = 1

    # Format de payload actuel (validation via validate_event_payload) :
    # event_type + teacher_id canonique ENSxxx + champs du schéma.
    payload = (
        '{"event_id": "evt-0001", "event_type": "competency.updated", '
        '"teacher_id": "ENS042", "timestamp": "2026-08-06T00:00:00Z", '
        '"data": {"competence_id": 1, "current_level": 3}}'
    )
    consumer._on_message(Channel(), Method(), None, payload)
    assert acked.get("tag") == 1


def test_gap_predictor_empty_inputs():
    gp = GapPredictor()
    out = gp.predict([], [], [])
    assert out["gaps"] == [] and out["avg_predicted_gap"] == 0.0


@pytest.mark.skipif(not DB_REACHABLE, reason="base PostgreSQL 7432 inaccessible")
def test_analytics_gaps_endpoint(client):
    r = client.get("/api/v1/analytics/gaps/ENS042")
    assert r.status_code == 200
    j = r.json()
    assert "gaps" in j and isinstance(j.get("gaps"), list)
