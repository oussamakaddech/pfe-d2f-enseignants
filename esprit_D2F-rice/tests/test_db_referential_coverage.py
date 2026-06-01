"""Focused coverage tests for rice.db and rice.referential helpers."""

from __future__ import annotations

import json
import os
import sys
from pathlib import Path
from unittest.mock import MagicMock

sys.path.insert(0, os.path.dirname(os.path.dirname(__file__)))

os.environ.setdefault("DB_NAME", "test")
os.environ.setdefault("DB_USER", "test")
os.environ.setdefault("DB_PASS", "test")
os.environ.setdefault("DB_HOST", "localhost")
os.environ.setdefault("DB_PORT", "5432")

import rice.db as db
import rice.referential as ref


def test_fetch_all_enseignants_info_secondary_query_failure(monkeypatch):
    db._ENS_INFO_CACHE.clear()

    cur = MagicMock()
    cur.fetchall.side_effect = [
        [("E001", "Benali", "Ahmed")],
        RuntimeError("missing table"),
    ]
    conn = MagicMock()
    conn.cursor.return_value = cur

    monkeypatch.setattr(db, "_get_db_connection", lambda: conn)
    monkeypatch.setattr(db, "_put_db_connection", lambda c: None)

    out = db._fetch_all_enseignants_info()
    assert set(out.keys()) == {"E001"}
    assert out["E001"].modules == []


def test_fetch_all_enseignants_info_cache_hit(monkeypatch):
    db._ENS_INFO_CACHE.clear()
    cached = {"E001": db.EnseignantInfo(id="E001", nom="Benali", prenom="Ahmed", modules=["SQL"])}
    db._ENS_INFO_CACHE.set("all", cached)

    called = {"count": 0}

    def fake_conn():
        called["count"] += 1
        raise AssertionError("DB should not be called on cache hit")

    monkeypatch.setattr(db, "_get_db_connection", fake_conn)

    out = db._fetch_all_enseignants_info()
    assert out == cached
    assert called["count"] == 0


def test_fetch_savoirs_from_db_with_string_keywords_and_without_dept_column():
    cur = MagicMock()
    cur.fetchone.return_value = None
    cur.fetchall.return_value = [
        ("S1", "Mecanique", "Alpha, Beta"),
        ("S2", "", ["Gamma"]),
    ]

    out = ref._fetch_savoirs_from_db(cur, "gc")
    assert out["S1"] == ["alpha", "beta", "mecanique"]
    assert out["S2"] == ["Gamma"]


def test_fetch_competences_and_domaines_db_success(monkeypatch):
    cur = MagicMock()
    cur.fetchone.side_effect = [(True,), (True,)]
    cur.fetchall.side_effect = [
        [("C1", "Comp 1", "kw1, kw2")],
        [("D1", "Dom 1")],
    ]

    comps = ref._fetch_competences_from_db(cur, "gc")
    doms = ref._fetch_domaines_from_db(cur, "gc")

    assert comps == {"C1": {"nom": "Comp 1", "keywords": ["kw1", "kw2"]}}
    assert doms == {"D1": "Dom 1"}


def test_fetch_niveaux_from_db_success(monkeypatch):
    cur = MagicMock()
    cur.fetchone.return_value = (True,)
    cur.fetchall.return_value = [("S1", "N2_ELEMENTAIRE"), ("S2", "N5_EXPERT")]
    conn = MagicMock()
    conn.cursor.return_value = cur

    monkeypatch.setattr(ref, "_get_db_connection", lambda: conn)
    monkeypatch.setattr(ref, "_put_db_connection", lambda c: None)

    assert ref._fetch_niveaux_from_db("gc") == {"S1": "N2_ELEMENTAIRE", "S2": "N5_EXPERT"}


def test_load_ref_from_db_gc_and_cache(monkeypatch):
    ref._REF_DB_CACHE.clear()

    cur = MagicMock()
    # 4 fetchone calls: ref_savoirs exists, dept col, ref_competences, ref_domaines
    cur.fetchone.side_effect = [(True,), (True,), (True,), (True,)]
    cur.fetchall.side_effect = [
        [("S1", "Savoir 1", ["kw1"])],
        [("C1", "Comp 1", ["ckw1"])],
        [("D1", "Dom 1")],
    ]
    conn = MagicMock()
    conn.cursor.return_value = cur

    monkeypatch.setattr(ref, "_get_db_connection", lambda: conn)
    monkeypatch.setattr(ref, "_put_db_connection", lambda c: None)

    merged = ref._load_ref_from_db("gc")
    assert merged["savoirs"]["S1"] == ["kw1", "savoir 1"]
    assert merged["competences"]["C1"]["nom"] == "Comp 1"
    assert merged["domaines"]["D1"] == "Dom 1"

    # Verify cache hit: replace connection with one that raises to prove DB is not called
    def _raising_conn():
        raise AssertionError("cache miss — DB should not be called on cache hit")
    monkeypatch.setattr(ref, "_get_db_connection", _raising_conn)
    cached = ref._load_ref_from_db("gc")
    assert cached == merged

    # Clean up cache to avoid polluting subsequent tests
    ref._REF_DB_CACHE.clear()


def test_load_ref_from_db_missing_table_returns_none(monkeypatch):
    ref._REF_DB_CACHE.clear()

    cur = MagicMock()
    cur.fetchone.return_value = (False,)
    conn = MagicMock()
    conn.cursor.return_value = cur

    monkeypatch.setattr(ref, "_get_db_connection", lambda: conn)
    monkeypatch.setattr(ref, "_put_db_connection", lambda c: None)

    assert ref._load_ref_from_db("gc") is None


def test_load_generic_ref_success_and_fallbacks(tmp_path, monkeypatch):
    mapping_path = tmp_path / "generic_ref.json"
    ref_file = tmp_path / "info.json"

    mapping_path.write_text(json.dumps({"info": "refs/info.json", "ghost": "refs/missing.json"}), encoding="utf-8")
    ref_file.write_text(json.dumps({"domaines": {"I1": "Info"}, "competences": {}, "savoirs": {"S1": []}}), encoding="utf-8")

    monkeypatch.setattr(ref, "_GENERIC_REF_MAPPING_PATH", mapping_path)
    monkeypatch.setattr(ref, "_GENERIC_REF_DIR", tmp_path)

    loaded = ref._load_generic_ref("info")
    assert loaded["domaines"] == {"I1": "Info"}
    assert "niveaux" in loaded

    fallback = ref._load_generic_ref("ghost")
    assert fallback is ref._GENERIC_FALLBACK_REF


def test_effective_referential_and_helpers(monkeypatch):
    monkeypatch.setattr(ref, "_load_ref_from_db", lambda department: None)
    monkeypatch.setattr(ref, "_load_generic_ref", lambda department: {"domaines": {"G": "Generic"}, "competences": {}, "savoirs": {}, "niveaux": {}})
    assert ref._get_effective_referential("gc") is ref._GC_FALLBACK_REF
    generic = ref._get_effective_referential("info")
    assert generic["domaines"] == {"G": "Generic"}

    ref._REF_DB_CACHE.clear()
    manager = ref._dept_ref_manager
    ref._REF_DB_CACHE.set("info", {"savoirs": {}, "competences": {}, "domaines": {}, "niveaux": {}})
    manager.invalidate("info")
    assert ref._REF_DB_CACHE.get("info") is None


def test_match_savoir_competence_and_suggestion(monkeypatch):
    monkeypatch.setattr(ref, "_get_effective_referential", lambda department: {
        "savoirs": {"S1": ["beton arme", "ouvrage art"], "S2": ["hydraulique"]},
        "competences": {"C1": {"keywords": ["beton arme", "structure"]}},
        "domaines": {},
        "niveaux": {"S1": "N1_DEBUTANT"},
    })
    monkeypatch.setattr(ref, "_SEMANTIC_OK", True)
    monkeypatch.setattr(ref, "_match_gc_savoir_semantic", lambda text, departement="gc", threshold=0.35, top_k=5: ["S2", "S1"])
    monkeypatch.setattr(ref, "_fetch_enseignant_affectations", lambda: {"E1": ["S1a", "X"], "E2": ["T9"]})
    monkeypatch.setattr("rice.referential._codes_match", lambda ec, sc: ec[:2] == sc[:2])

    assert ref._match_gc_savoir("beton arme et hydraulique") == ["S1", "S2"]
    assert ref._gc_ref_niveau(["S2", "S1"], "gc") == "N1_DEBUTANT"
    assert ref._match_gc_competence("beton arme structure") == "C1"
    assert ref._suggest_gc_enseignants(["S1b"]) == ["E1"]
