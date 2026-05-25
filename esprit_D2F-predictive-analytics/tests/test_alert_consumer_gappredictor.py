from datetime import date, datetime, timedelta
from types import SimpleNamespace
from unittest.mock import MagicMock

from app.engines.alert_engine import AlertEngine
from app.messaging.consumer import AnalyticsEventConsumer
from app.ml.gap_predictor import GapPredictor


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
    consumer = AnalyticsEventConsumer()
    called = {}

    def fake_trigger(eid):
        called["eid"] = eid

    monkeypatch.setattr(consumer, "_trigger_individual_analysis", fake_trigger)

    class Frame:
        def __init__(self, body):
            self.body = body

    payload = '{"event":"EVALUATION_SUBMITTED","enseignantId":"t42"}'
    consumer.on_message(Frame(payload))
    assert called.get("eid") == "t42"


def test_gap_predictor_empty_inputs():
    gp = GapPredictor()
    out = gp.predict([], [], [])
    assert out["gaps"] == [] and out["overall_risk_score"] == 0.0


def test_analytics_gaps_endpoint(client):
    r = client.get("/api/v1/analytics/gaps/someid")
    assert r.status_code == 200
    j = r.json()
    assert "gaps" in j and isinstance(j.get("gaps"), list)
