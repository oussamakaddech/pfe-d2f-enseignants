"""Second round of coverage tests for rice — covering missed branches in llm, routes, nlp, db."""

from __future__ import annotations

import os
import sys
from unittest.mock import MagicMock

sys.path.insert(0, os.path.dirname(os.path.dirname(__file__)))

os.environ.setdefault("DB_NAME", "test")
os.environ.setdefault("DB_USER", "test")
os.environ.setdefault("DB_PASS", "test")
os.environ.setdefault("DB_HOST", "localhost")
os.environ.setdefault("DB_PORT", "5432")
os.environ.setdefault("RICE_AUTH_ENABLED", "false")

import rice.llm as llm


# ── llm: cover except branch ────────────────────────────────────────────────

def test_llm_timeout_except_branch(monkeypatch):
    monkeypatch.setenv("LLM_TIMEOUT", "not-a-number")
    import importlib
    importlib.reload(llm)
    assert llm._LLM_TIMEOUT == 5


# ── db: cover _put_db_connection pool-close-except path ─────────────────────

def test_db_put_connection_double_failure(monkeypatch):
    import rice.db as db
    pool = MagicMock()
    pool.putconn.side_effect = RuntimeError("putconn failed")
    monkeypatch.setattr(db, "_get_db_pool", lambda: pool)
    conn = MagicMock()
    conn.close.side_effect = RuntimeError("close also failed")
    # should not raise
    db._put_db_connection(conn)
    conn.close.assert_called_once()


# ── routes: cover _open_validate_connection failure ─────────────────────────

def test_routes_open_validate_connection_failure(monkeypatch):
    from rice import routes
    import rice.db as db
    monkeypatch.setattr(db, "_get_db_connection", lambda: (_ for _ in ()).throw(RuntimeError("db unreachable")))
    try:
        routes._open_validate_connection()
        assert False, "should have raised"
    except Exception as exc:
        assert "Database unreachable" in str(exc)


def test_routes_close_validate_connection(monkeypatch):
    from rice import routes
    import rice.db as db
    conn = MagicMock()
    cur = MagicMock()
    monkeypatch.setattr(db, "_put_db_connection", lambda c: None)
    routes._close_validate_connection(conn, cur)
    cur.close.assert_called_once()


# ── nlp: cover _is_aa_skip branches and helpers ─────────────────────────────

def test_nlp_is_aa_skip():
    from rice.nlp import _is_aa_skip, _deduplicate_names

    # Empty string → True
    assert _is_aa_skip("") is True
    # AA_SKIP match
    assert _is_aa_skip("AA Acquis") is True
    assert _is_aa_skip("Niveau 1") is True
    assert _is_aa_skip("* Item") is True
    assert _is_aa_skip("(1 test") is True
    assert _is_aa_skip(": something") is True
    # AA_SKIP2 match
    assert _is_aa_skip("acquis d'appre") is True
    # AA_SKIP3 match
    assert _is_aa_skip("d'approfondissement") is True
    # Valid line
    assert _is_aa_skip("AA1 Understand calculus 3") is False

    # _deduplicate_names — noop when key absent
    m: dict = {}
    _deduplicate_names(m)

    # Dedup logic
    m2 = {"enseignants_noms": ["Ahmed Benali", "ahmed benali", "", "   ", "ab"]}
    _deduplicate_names(m2)
    assert len(m2["enseignants_noms"]) == 1
    assert m2["enseignants_noms"][0] == "Ahmed Benali"


def test_nlp_extract_regex_nom_module_with_trailing_trash():
    from rice.nlp import _extract_regex_nom_module
    assert _extract_regex_nom_module("random text") is None


def test_nlp_extract_regex_unite_pedagogique():
    from rice.nlp import _extract_regex_unite_pedagogique
    result = _extract_regex_unite_pedagogique("Unité pédagogique: UP-GL")
    assert result == "UP-GL"
    result_rev = _extract_regex_unite_pedagogique("Some description\nUnité pédagogique")
    assert result_rev == "Some description"


def test_nlp_merge_pattern_enseignants_no_match():
    from rice.nlp import _merge_pattern_enseignants
    meta: dict = {}
    _merge_pattern_enseignants("random text without patterns", meta)
    assert "enseignants_noms" not in meta


def test_nlp_extract_metadata_empty_text():
    from rice.nlp import _extract_metadata
    meta = _extract_metadata("")
    assert isinstance(meta, dict)


# ── nlp helper coverage: _get_cell_value, handlers, etc ────────────────────

def test_nlp_table_helpers():
    from rice.nlp import (
        _get_cell_value,
        _handle_table_responsable,
        _handle_table_coordinateur,
        _ensure_responsable_presence,
        _is_valid_enseignant_value,
    )

    # _get_cell_value: right-cell exists
    row = ["label", "value"]
    table = [["a", "b", "c"], row]
    assert _get_cell_value(row, table, 0, 0) == "value"
    # fallback to next row same column
    assert _get_cell_value(["only"], table, 0, 0) == "label"

    # _handle_table_responsable
    m = {}
    _handle_table_responsable("Ahmed Benali", m)
    assert m.get("responsable") == "Ahmed Benali"

    # _handle_table_coordinateur
    m2 = {}
    _handle_table_coordinateur("Sarah Martin", m2)
    assert m2.get("coordinateur") == "Sarah Martin"
    assert "Sarah Martin" in m2.get("enseignants_noms", [])
    assert m2.get("enseignants_roles", {}).get("Sarah Martin") == "coordinateur"

    # _ensure_responsable_presence — noop when responsable absent
    m3 = {}
    _ensure_responsable_presence(m3)
    assert "enseignants_noms" not in m3

    # _is_valid_enseignant_value — various edge cases
    assert _is_valid_enseignant_value("") is False
    assert _is_valid_enseignant_value("   ") is False
    assert _is_valid_enseignant_value("abc") is False  # no uppercase
    assert _is_valid_enseignant_value("Ahmed Benali") is True
    assert _is_valid_enseignant_value("module: test") is False
    assert _is_valid_enseignant_value("a:b:c:d") is False