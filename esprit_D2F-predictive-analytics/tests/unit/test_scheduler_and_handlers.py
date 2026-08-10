"""Couverture des modules scheduler/jobs, messaging/event_handlers et schemas/dashboards."""
from types import SimpleNamespace

import pytest

from app.infrastructure.scheduler import jobs as jobs_mod
from app.infrastructure.messaging.event_handlers import build_event_handlers
from app.schemas.dashboards import DashboardOut
from tests.fakes import build_fake_container


@pytest.fixture
def container():
    return build_fake_container()


def test_dashboard_out_serializes_data():
    model = DashboardOut(data={"kpi": 1, "nested": [1, 2]})
    assert model.data["kpi"] == 1
    assert DashboardOut.model_config.get("protected_namespaces") == ()


def test_lancer_batch_analyses_all_teachers(container):
    result = jobs_mod.lancer_batch(container)
    assert result["status"] == "ok"
    assert result["analysed"] == 2
    assert result["total"] == 2


def test_lancer_batch_skips_failing_teacher(container):
    def broken(_teacher_id):
        raise RuntimeError("boom")

    container.compute_gaps.execute = broken
    result = jobs_mod.lancer_batch(container)
    assert result["analysed"] == 0
    assert result["total"] == 2


def test_calculer_toutes_alertes(container):
    result = jobs_mod.calculer_toutes_alertes(container)
    assert result["status"] == "ok"
    assert result["alerts"] >= 0


def test_detecter_besoins(container):
    result = jobs_mod.detecter_besoins(container)
    assert result["status"] == "ok"
    assert result["needs"] >= 0


def test_construire_dashboards(container):
    result = jobs_mod.construire_dashboards(container)
    assert result["status"] == "ok"
    assert result["departements"] >= 0


def test_build_event_handlers_maps_types():
    handlers = build_event_handlers(SimpleNamespace())
    assert set(handlers) == {
        "analyse.requested",
        "enseignant.created",
        "besoin.formation",
        "besoin.approuve",
    }


def test_event_analysis_requested_missing_teacher_id_raises():
    container = SimpleNamespace()
    handlers = build_event_handlers(container)
    with pytest.raises(ValueError):
        handlers["analyse.requested"]({"no_id": True})


def test_event_handlers_execute_use_cases():
    executed = []

    class FakeContainer:
        def __init__(self):
            self.compute_gaps = SimpleNamespace(execute=lambda tid: executed.append(("gaps", tid)))
            self.compute_risk = SimpleNamespace(execute=lambda tid: executed.append(("risk", tid)))

    handlers = build_event_handlers(FakeContainer())
    assert handlers["analyse.requested"]({"teacher_id": "T1"})["status"] == "analysed"
    assert handlers["enseignant.created"]({"teacher_id": "T2"})["status"] == "initialised"
    assert handlers["besoin.formation"]({"teacher_id": "T3"})["status"] == "risk_recomputed"
    assert handlers["besoin.formation"]({})["status"] == "risk_recomputed"
    assert executed == [("gaps", "T1"), ("risk", "T1"), ("gaps", "T2"), ("risk", "T2"), ("risk", "T3")]


def test_event_teacher_created_without_id_returns_none():
    container = SimpleNamespace()
    handlers = build_event_handlers(container)
    result = handlers["enseignant.created"]({})
    assert result["teacher_id"] is None
    assert result["status"] == "initialised"
