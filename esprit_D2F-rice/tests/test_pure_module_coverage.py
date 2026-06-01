"""Focused coverage tests for pure rice modules."""

from __future__ import annotations

import json
import os
import sys
from pathlib import Path
from types import SimpleNamespace
from unittest.mock import MagicMock

import pytest

sys.path.insert(0, os.path.dirname(os.path.dirname(__file__)))

os.environ.setdefault("DB_NAME", "test")
os.environ.setdefault("DB_USER", "test")
os.environ.setdefault("DB_PASS", "test")
os.environ.setdefault("DB_HOST", "localhost")
os.environ.setdefault("DB_PORT", "5432")
os.environ.setdefault("RICE_AUTH_ENABLED", "false")
os.environ.setdefault("APP_ENV", "development")

import rice.enseignants as ens
import rice.referential as ref


class TestEnseignantsPureHelpers:
    def test_normalize_match_name_strips_roles(self):
        assert ens._normalize_match_name("Benali, intervenant") == "Benali"
        assert ens._normalize_match_name("Benali, responsable pédagogique") == "Benali"

    def test_match_by_name_substring_branch(self, monkeypatch):
        monkeypatch.setattr(ens, "_FUZZY_OK", False)
        teachers = [
            SimpleNamespace(id="E001", nom="Benali", prenom="Ahmed", modules=[]),
            SimpleNamespace(id="E002", nom="Martin", prenom="Sarah", modules=[]),
        ]
        ids, mapping = ens._match_enseignants_by_name(["prof benali enseigne"], teachers)
        assert ids == ["E001"]
        assert mapping["prof benali enseigne"][0] == "E001"

    def test_match_by_module_ignores_short_modules(self):
        teachers = [SimpleNamespace(id="E001", nom="X", prenom="Y", modules=["ABC", "Beton Arme"])]
        matched = ens._match_enseignants_by_module("cours de beton arme", teachers)
        assert matched == ["E001"]


class _CursorStub:
    def __init__(self, fetchone_results=None, fetchall_results=None):
        self.fetchone_results = list(fetchone_results or [])
        self.fetchall_results = list(fetchall_results or [])
        self.executed = []
        self.closed = False

    def execute(self, sql, params=None):
        self.executed.append((sql, params))

    def fetchone(self):
        return self.fetchone_results.pop(0) if self.fetchone_results else None

    def fetchall(self):
        return self.fetchall_results.pop(0) if self.fetchall_results else []

    def close(self):
        self.closed = True


class _ConnStub:
    def __init__(self, cursor):
        self._cursor = cursor
        self.rollback_calls = 0
        self.commit_calls = 0
        self.cursor_calls = 0

    def cursor(self):
        self.cursor_calls += 1
        return self._cursor

    def rollback(self):
        self.rollback_calls += 1

    def commit(self):
        self.commit_calls += 1


class _CacheStub:
    def __init__(self, value=None):
        self.value = value if value is not None else {}

    def get(self, dept, ttl=None):
        return self.value.get(dept)

    def set(self, dept, value):
        self.value[dept] = value


class TestReferentialPureHelpers:
    def test_fetch_savoirs_from_db_variants(self):
        cur = _CursorStub(
            fetchone_results=[(True,)],
            fetchall_results=[
                [
                    ("S1", "Nom S1", ["kw1", "kw2"]),
                    ("S2", "Nom S2", "kw3, kw4"),
                    ("S3", "Nom S3", None),
                ]
            ],
        )
        override = ref._fetch_savoirs_from_db(cur, "gc")
        assert override["S1"] == ["kw1", "kw2", "nom s1"]
        assert "nom s1" in [k.lower() for k in override["S1"]]
        assert override["S2"] == ["kw3", "kw4", "nom s2"]
        assert override["S3"] == ["nom s3"]

    def test_fetch_savoirs_from_db_without_dept_column(self):
        cur = _CursorStub(
            fetchone_results=[None],
            fetchall_results=[[("S1", "Nom", "kw1, kw2")]],
        )
        override = ref._fetch_savoirs_from_db(cur, "gc")
        assert override["S1"] == ["kw1", "kw2", "nom"]

    def test_fetch_competences_and_domaines_from_db(self):
        cur = _CursorStub(
            fetchone_results=[(True,), (True,)],
            fetchall_results=[
                [("C1", "Comp 1", "kw1, kw2")],
                [("D1", "Dom 1")],
            ],
        )
        competences = ref._fetch_competences_from_db(cur, "gc")
        domaines = ref._fetch_domaines_from_db(cur, "gc")
        assert competences["C1"]["nom"] == "Comp 1"
        assert domaines["D1"] == "Dom 1"

    def test_fetch_helpers_table_missing_and_error(self):
        cur_missing = _CursorStub(fetchone_results=[(False,)])
        assert ref._fetch_competences_from_db(cur_missing, "gc") == {}
        assert ref._fetch_domaines_from_db(cur_missing, "gc") == {}

        cur_error = _CursorStub()
        cur_error.execute = lambda *args, **kwargs: (_ for _ in ()).throw(Exception("boom"))
        assert ref._fetch_competences_from_db(cur_error, "gc") == {}
        assert ref._fetch_domaines_from_db(cur_error, "gc") == {}

    def test_fetch_niveaux_from_db_success_and_exception(self, monkeypatch):
        cursor = _CursorStub(
            fetchone_results=[(True,)],
            fetchall_results=[[("S1", "N2_ELEMENTAIRE"), ("S2", "N5_EXPERT")]],
        )
        conn = _ConnStub(cursor)
        monkeypatch.setattr(ref, "_get_db_connection", lambda: conn)
        monkeypatch.setattr(ref, "_put_db_connection", lambda c: None)
        out = ref._fetch_niveaux_from_db("gc")
        assert out == {"S1": "N2_ELEMENTAIRE", "S2": "N5_EXPERT"}

        monkeypatch.setattr(ref, "_get_db_connection", lambda: (_ for _ in ()).throw(Exception("down")))
        assert ref._fetch_niveaux_from_db("gc") == {}

    def test_merge_helpers(self):
        merged_gc = ref._merge_gc_ref(
            {"savoirs": {"S1": ["a"]}, "competences": {"C1": {}}, "domaines": {"D1": "Dom"}},
            {"S2": ["b"]},
            {"C2": {"nom": "Comp" , "keywords": ["x"]}},
            {"D2": "Dom2"},
        )
        assert "S1" in merged_gc["savoirs"] and "S2" in merged_gc["savoirs"]
        assert "C2" in merged_gc["competences"]
        assert "D2" in merged_gc["domaines"]

        monkeypatch = pytest.MonkeyPatch()
        monkeypatch.setattr(ref, "_fetch_niveaux_from_db", lambda dept: {"S1": "N3_INTERMEDIAIRE"})
        merged_non_gc = ref._merge_non_gc_ref({"S1": ["a"]}, {"C1": {}}, {"D1": "Dom"}, "info")
        assert merged_non_gc["niveaux"]["S1"] == "N3_INTERMEDIAIRE"
        monkeypatch.undo()

    def test_load_ref_from_db_cache_and_no_table(self, monkeypatch):
        cached = {"cached": True}
        monkeypatch.setattr(ref, "_REF_DB_CACHE", _CacheStub({"gc": cached}))
        assert ref._load_ref_from_db("gc") is cached

        cursor = _CursorStub(fetchone_results=[(False,)])
        conn = _ConnStub(cursor)
        monkeypatch.setattr(ref, "_REF_DB_CACHE", _CacheStub(None))
        monkeypatch.setattr(ref, "_get_db_connection", lambda: conn)
        monkeypatch.setattr(ref, "_put_db_connection", lambda c: None)
        assert ref._load_ref_from_db("gc") is None
        assert cursor.closed is True

    def test_load_ref_from_db_gc_and_non_gc_merges(self, monkeypatch):
        cursor = _CursorStub(fetchone_results=[(True,)])
        conn = _ConnStub(cursor)
        monkeypatch.setattr(ref, "_REF_DB_CACHE", _CacheStub(None))
        monkeypatch.setattr(ref, "_get_db_connection", lambda: conn)
        monkeypatch.setattr(ref, "_put_db_connection", lambda c: None)
        monkeypatch.setattr(ref, "_fetch_savoirs_from_db", lambda cur, dept: {"S1": ["kw"]})
        monkeypatch.setattr(ref, "_fetch_competences_from_db", lambda cur, dept: {"C1": {"nom": "Comp", "keywords": ["kw"]}})
        monkeypatch.setattr(ref, "_fetch_domaines_from_db", lambda cur, dept: {"D1": "Dom"})

        gc_ref = ref._load_ref_from_db("gc")
        assert gc_ref["savoirs"]["S1"] == ["kw"]
        assert gc_ref["competences"]["C1"]["nom"] == "Comp"
        assert gc_ref["domaines"]["D1"] == "Dom"

        cursor2 = _CursorStub(fetchone_results=[(True,)])
        conn2 = _ConnStub(cursor2)
        monkeypatch.setattr(ref, "_get_db_connection", lambda: conn2)
        monkeypatch.setattr(ref, "_fetch_niveaux_from_db", lambda dept: {"S1": "N4_AVANCE"})
        non_gc_ref = ref._load_ref_from_db("info")
        assert non_gc_ref["niveaux"]["S1"] == "N4_AVANCE"

    def test_load_ref_from_db_exception(self, monkeypatch):
        monkeypatch.setattr(ref._REF_DB_CACHE, "get", lambda dept, ttl=None: None)
        monkeypatch.setattr(ref, "_get_db_connection", lambda: (_ for _ in ()).throw(Exception("db down")))
        assert ref._load_ref_from_db("gc") is None

    def test_load_generic_ref_paths(self, tmp_path, monkeypatch):
        gen_dir = tmp_path / "refs"
        gen_dir.mkdir()
        mapping_path = gen_dir / "generic_ref.json"
        mapping_path.write_text(json.dumps({"info": "generic_info.json"}), encoding="utf-8")
        ref_path = gen_dir / "generic_info.json"
        ref_path.write_text(json.dumps({"domaines": {"D1": "Dom"}}), encoding="utf-8")
        monkeypatch.setattr(ref, "_GENERIC_REF_DIR", gen_dir)
        monkeypatch.setattr(ref, "_GENERIC_REF_MAPPING_PATH", mapping_path)

        loaded = ref._load_generic_ref("info")
        assert loaded["domaines"]["D1"] == "Dom"
        assert "competences" in loaded and "savoirs" in loaded and "niveaux" in loaded

        fallback = ref._load_generic_ref("unknown")
        assert fallback is ref._GENERIC_FALLBACK_REF

    def test_effective_referential_priority_chain(self, monkeypatch):
        monkeypatch.setattr(ref, "_load_ref_from_db", lambda dept: {"db": dept})
        assert ref._get_effective_referential("gc") == {"db": "gc"}

        monkeypatch.setattr(ref, "_load_ref_from_db", lambda dept: None)
        assert ref._get_effective_referential("gc") is ref._GC_FALLBACK_REF

        monkeypatch.setattr(ref, "_load_ref_from_db", lambda dept: None)
        monkeypatch.setattr(ref, "_load_generic_ref", lambda dept: {"generic": dept})
        assert ref._get_effective_referential("info") == {"generic": "info"}

    def test_manager_methods_and_cache_invalidation(self, monkeypatch):
        mgr = ref._dept_ref_manager
        monkeypatch.setattr(ref, "_get_effective_referential", lambda dept: {"savoirs": {}, "competences": {}, "domaines": {}, "niveaux": {}})
        monkeypatch.setattr(ref, "_match_gc_savoir", lambda text, departement="gc": ["S1"])
        monkeypatch.setattr(ref, "_match_gc_competence", lambda text, departement="gc": "C1")
        monkeypatch.setattr(ref, "_gc_ref_niveau", lambda codes, departement="gc": "N3")
        monkeypatch.setattr(ref, "_suggest_gc_enseignants", lambda codes: ["E1"])
        monkeypatch.setattr(ref, "_detect_type", lambda text, departement="gc": "TYPE")
        assert mgr.get_referential("gc") == {"savoirs": {}, "competences": {}, "domaines": {}, "niveaux": {}}
        assert mgr.match_savoir("x", "gc") == ["S1"]
        assert mgr.match_competence("x", "gc") == "C1"
        assert mgr.get_niveau(["S1"], "gc") == "N3"
        assert mgr.suggest_teachers(["S1"]) == ["E1"]
        assert mgr.detect_type("x", "gc") == "TYPE"
        assert mgr.list_departments() == ["gc", "info", "ge", "meca", "telecom"]
        stats = mgr.stats("gc")
        assert stats == {"savoirs": 0, "competences": 0, "domaines": 0, "niveaux": 0}

    def test_detect_by_keywords_and_departement(self):
        assert ref._detect_by_keywords("mt-34 web sparql rdf") == "info"
        combined = ref._build_combined_text(["a.pdf"], [b"Hello", b"\xff\xfe"])
        assert "a.pdf" in combined and "hello" in combined
        assert ref._detect_departement(["fiche_GC_module.pdf"], [b"UP: UPIL"]) == "gc"
