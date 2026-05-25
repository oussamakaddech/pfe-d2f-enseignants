"""Extra tests for rice.routes validate helper functions."""
import sys
import os
from unittest.mock import MagicMock

sys.path.insert(0, os.path.dirname(os.path.dirname(__file__)))

os.environ.setdefault("DB_NAME", "test")
os.environ.setdefault("DB_USER", "test")
os.environ.setdefault("DB_PASS", "test")
os.environ.setdefault("DB_HOST", "localhost")
os.environ.setdefault("DB_PORT", "5432")
os.environ.setdefault("RICE_AUTH_ENABLED", "false")

from rice.models import ValidateRequest
from rice import routes


def _mk_domain(code="D1", comp_code="C1"):
    return {
        "tmpId": "d1",
        "code": code,
        "nom": "Domain",
        "description": "desc",
        "competences": [
            {
                "tmpId": "c1",
                "code": comp_code,
                "nom": "Comp",
                "description": "desc",
                "ordre": 1,
                "savoirs": [],
                "sousCompetences": [],
            }
        ],
    }


def test_empty_validate_counts_and_accumulate():
    counts = routes._empty_validate_counts()
    assert counts["upserted_domaines"] == 0
    routes._accumulate_savoir_counts(counts, 2, 1, 3)
    assert counts["inserted_savoirs"] == 2
    assert counts["updated_savoirs"] == 1
    assert counts["inserted_links"] == 3


def test_upsert_domaine_success_and_failure():
    cur = MagicMock()
    conn = MagicMock()
    errors = []
    dom = type("D", (), {"code": "DOM", "nom": "Nom", "description": "Desc"})

    assert routes._upsert_domaine(cur, dom, errors, conn) is True
    assert errors == []

    cur.execute.side_effect = Exception("boom")
    assert routes._upsert_domaine(cur, dom, errors, conn) is False
    assert errors and "domaine DOM" in errors[-1]


def test_upsert_competence_success_and_failure():
    cur = MagicMock()
    conn = MagicMock()
    errors = []
    comp = type("C", (), {"code": "C1", "nom": "Comp", "description": "Desc", "ordre": 1})

    assert routes._upsert_competence(cur, comp, "D1", errors, conn) is True

    cur.execute.side_effect = Exception("boom")
    assert routes._upsert_competence(cur, comp, "D1", errors, conn) is False
    assert errors and "competence C1" in errors[-1]


def test_process_validate_propositions_aggregates(monkeypatch):
    req = ValidateRequest(propositions=[_mk_domain(), _mk_domain(code="D2", comp_code="C2")], overwrite=False)

    monkeypatch.setattr(routes, "_upsert_domaine", lambda cur, dom, errors, conn: dom.code != "D2")
    monkeypatch.setattr(routes, "_upsert_competence", lambda cur, comp, domaine_code, errors, conn: True)
    monkeypatch.setattr(routes, "_process_competence_savoirs", lambda *args, **kwargs: None)
    monkeypatch.setattr(routes, "_process_competence_subcompetences", lambda *args, **kwargs: None)

    counts = routes._process_validate_propositions(MagicMock(), req, [], MagicMock())
    # D2 is skipped by mocked _upsert_domaine
    assert counts["upserted_domaines"] == 1
    assert counts["upserted_competences"] == 1


def test_process_competence_savoirs_and_subcompetences(monkeypatch):
    counts = routes._empty_validate_counts()
    errors = []

    sav = type("S", (), {"tmpId": "s1", "code": "S1", "nom": "Sav", "description": "", "type": "THEORIQUE", "niveau": "N2", "enseignantsSuggeres": []})
    sc = type("SC", (), {"code": "SC1", "nom": "sub", "description": "", "savoirs": [sav]})
    comp = type("Comp", (), {"code": "C1", "savoirs": [sav], "sousCompetences": [sc]})

    monkeypatch.setattr(routes, "_upsert_savoir", lambda *a, **k: (1, 0, 2))
    monkeypatch.setattr(routes, "_upsert_sous_competence", lambda *a, **k: (1, 2, 1, 3))

    routes._process_competence_savoirs(MagicMock(), comp, False, errors, MagicMock(), counts)
    routes._process_competence_subcompetences(MagicMock(), comp, False, errors, MagicMock(), counts)

    assert counts["inserted_savoirs"] == 3
    assert counts["updated_savoirs"] == 1
    assert counts["inserted_links"] == 5
    assert counts["upserted_sous_competences"] == 1
