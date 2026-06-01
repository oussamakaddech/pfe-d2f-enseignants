"""Comprehensive coverage tests for rice modules: db, referential, nlp, enseignants, routes, llm."""

from __future__ import annotations

import json
import os
import sys
import time
from pathlib import Path
from unittest.mock import MagicMock, patch

import pytest

sys.path.insert(0, os.path.dirname(os.path.dirname(__file__)))

os.environ.setdefault("DB_NAME", "test")
os.environ.setdefault("DB_USER", "test")
os.environ.setdefault("DB_PASS", "test")
os.environ.setdefault("DB_HOST", "localhost")
os.environ.setdefault("DB_PORT", "5432")
os.environ.setdefault("RICE_AUTH_ENABLED", "false")
os.environ.setdefault("APP_ENV", "development")

import rice.db as db
import rice.referential as ref
import rice.enseignants as ens_mod
import rice.llm as llm
import rice.models as models


# ======================================================================
# rice/db.py  (51.9%)
# ======================================================================

class TestDbPool:
    def test_get_db_pool_creates_pool(self, monkeypatch):
        db._DB_POOL = None
        dummy_pool = MagicMock()
        DummyPgPool = MagicMock()
        DummyPgPool.ThreadedConnectionPool.return_value = dummy_pool
        monkeypatch.setitem(sys.modules, "psycopg2.pool", DummyPgPool)
        pool = db._get_db_pool()
        assert pool is dummy_pool
        pool2 = db._get_db_pool()
        assert pool2 is dummy_pool

    def test_get_db_connection_calls_getconn(self, monkeypatch):
        mock_pool = MagicMock()
        mock_conn = MagicMock()
        mock_pool.getconn.return_value = mock_conn
        monkeypatch.setattr(db, "_get_db_pool", lambda: mock_pool)
        conn = db._get_db_connection()
        assert conn is mock_conn

    def test_put_db_connection_success(self, monkeypatch):
        mock_pool = MagicMock()
        conn = MagicMock()
        monkeypatch.setattr(db, "_get_db_pool", lambda: mock_pool)
        db._put_db_connection(conn)
        mock_pool.putconn.assert_called_once_with(conn)


class TestFetchAffectationsSuccess:
    def setup_method(self):
        db._AFFECTATIONS_CACHE.clear()

    def test_db_success_path(self, monkeypatch):
        cur = MagicMock()
        cur.fetchall.return_value = [("E001", ["S1a", "S2a"]), ("E002", ["C1b"])]
        conn = MagicMock()
        conn.cursor.return_value = cur
        monkeypatch.setattr(db, "_get_db_connection", lambda: conn)
        monkeypatch.setattr(db, "_put_db_connection", lambda c: None)
        result = db._fetch_enseignant_affectations()
        assert result == {"E001": ["S1a", "S2a"], "E002": ["C1b"]}

    def test_db_success_null_codes(self, monkeypatch):
        cur = MagicMock()
        cur.fetchall.return_value = [("E003", None)]
        conn = MagicMock()
        conn.cursor.return_value = cur
        monkeypatch.setattr(db, "_get_db_connection", lambda: conn)
        monkeypatch.setattr(db, "_put_db_connection", lambda c: None)
        result = db._fetch_enseignant_affectations()
        assert result == {"E003": []}

    def test_cache_hit_skips_db(self, monkeypatch):
        db._AFFECTATIONS_CACHE.set("all", {"E001": ["S1a"]})
        called = {"n": 0}
        def fake_conn():
            called["n"] += 1
            raise AssertionError("should not be called")
        monkeypatch.setattr(db, "_get_db_connection", fake_conn)
        result = db._fetch_enseignant_affectations()
        assert result == {"E001": ["S1a"]}
        assert called["n"] == 0


class TestFetchAllEnseignantsInfoExtra:
    def setup_method(self):
        db._ENS_INFO_CACHE.clear()

    def test_null_nom_prenom(self, monkeypatch):
        cur = MagicMock()
        cur.fetchall.side_effect = [
            [("E001", None, None), ("E002", "Martin", None)],
            [],
        ]
        conn = MagicMock()
        conn.cursor.return_value = cur
        monkeypatch.setattr(db, "_get_db_connection", lambda: conn)
        monkeypatch.setattr(db, "_put_db_connection", lambda c: None)
        out = db._fetch_all_enseignants_info()
        assert out["E001"].nom == ""
        assert out["E001"].prenom == ""
        assert out["E002"].prenom == ""

    def test_savoir_names_with_null_snom(self, monkeypatch):
        cur = MagicMock()
        cur.fetchall.side_effect = [
            [("E001", "Test", "User")],
            [("E001", None), ("E001", "Beton Arme")],
        ]
        conn = MagicMock()
        conn.cursor.return_value = cur
        monkeypatch.setattr(db, "_get_db_connection", lambda: conn)
        monkeypatch.setattr(db, "_put_db_connection", lambda c: None)
        out = db._fetch_all_enseignants_info()
        assert "Beton Arme" in out["E001"].modules

    def test_stale_cache_on_db_failure(self, monkeypatch):
        cached = {"E001": models.EnseignantInfo(id="E001", nom="X", prenom="Y")}
        db._ENS_INFO_CACHE.set("all", cached)
        db._ENS_INFO_CACHE._ts["all"] = time.time() - 1000
        monkeypatch.setattr(db, "_get_db_connection", lambda: (_ for _ in ()).throw(Exception("down")))
        out = db._fetch_all_enseignants_info()
        assert "E001" in out


class TestCreateEnseignantIfNewExtra:
    def test_complex_name(self, monkeypatch):
        cur = MagicMock()
        conn = MagicMock()
        conn.cursor.return_value = cur
        monkeypatch.setattr(db, "_get_db_connection", lambda: conn)
        monkeypatch.setattr(db, "_put_db_connection", lambda c: None)
        new_id, display = db._create_enseignant_if_new("Ben Ali Mohamed Amine")
        assert "BEN-ALI" in new_id
        assert "Mohamed Amine" in display

    def test_db_failure_returns_id(self, monkeypatch):
        monkeypatch.setattr(db, "_get_db_connection", lambda: (_ for _ in ()).throw(Exception("fail")))
        new_id, display = db._create_enseignant_if_new("Test User")
        assert isinstance(new_id, str)
        assert len(new_id) > 0


# ======================================================================
# rice/referential.py  (64.8%)
# ======================================================================

class TestDetectDepartement:
    def test_detect_by_filename_gc(self):
        assert ref._detect_by_filename("FICHE GC MODULE") == "gc"

    def test_detect_by_filename_gc_hyphen(self):
        assert ref._detect_by_filename("FICHE-GC-MODULE") == "gc"

    def test_detect_by_filename_gc_underscore(self):
        assert ref._detect_by_filename("FICHE_GC_MODULE") == "gc"

    def test_detect_by_filename_genie_civil(self):
        assert ref._detect_by_filename("GENIE CIVIL MODULE") == "gc"

    def test_detect_by_filename_info(self):
        assert ref._detect_by_filename("MODULE INFO") == "info"

    def test_detect_by_filename_informatiq(self):
        assert ref._detect_by_filename("INFORMATIQ MODULE") == "info"

    def test_detect_by_filename_pidev(self):
        assert ref._detect_by_filename("PIDEV MODULE") == "info"

    def test_detect_by_filename_twin(self):
        assert ref._detect_by_filename("-TWIN- MODULE") == "info"

    def test_detect_by_filename_ge(self):
        assert ref._detect_by_filename("MODULE GE") == "ge"

    def test_detect_by_filename_electr(self):
        assert ref._detect_by_filename("ELECTR MODULE") == "ge"

    def test_detect_by_filename_meca(self):
        assert ref._detect_by_filename("-MECA- MODULE") == "meca"

    def test_detect_by_filename_mecanique(self):
        assert ref._detect_by_filename("MECANIQUE MODULE") == "meca"

    def test_detect_by_filename_telecom(self):
        assert ref._detect_by_filename("TELECOM MODULE") == "telecom"

    def test_detect_by_filename_telecommun(self):
        assert ref._detect_by_filename("TELECOMMUN MODULE") == "telecom"

    def test_detect_by_filename_unknown(self):
        assert ref._detect_by_filename("RANDOM FILE") is None

    def test_detect_by_up_code_info(self):
        assert ref._detect_by_up_code("unite pedagogique UPGL") == "info"

    def test_detect_by_up_code_gc(self):
        assert ref._detect_by_up_code("UP: UPGC") == "gc"

    def test_detect_by_up_code_ge(self):
        assert ref._detect_by_up_code("UP-UPGE") == "ge"

    def test_detect_by_up_code_meca(self):
        assert ref._detect_by_up_code("UP UPMEMECA") == "meca"

    def test_detect_by_up_code_telecom(self):
        assert ref._detect_by_up_code("UP UPTELECOM") == "telecom"

    def test_detect_by_up_code_no_match(self):
        assert ref._detect_by_up_code("some random text") is None

    def test_detect_by_ue_code_info(self):
        assert ref._detect_by_ue_code("UE INF101") == "info"

    def test_detect_by_ue_code_dev(self):
        assert ref._detect_by_ue_code("UE DEV201") == "info"

    def test_detect_by_ue_code_web(self):
        assert ref._detect_by_ue_code("UE WEB101") == "info"

    def test_detect_by_ue_code_sim(self):
        assert ref._detect_by_ue_code("UE SIM300") == "info"

    def test_detect_by_ue_code_gc(self):
        assert ref._detect_by_ue_code("UE GC101") == "gc"

    def test_detect_by_ue_code_ge(self):
        assert ref._detect_by_ue_code("UE GE200") == "ge"

    def test_detect_by_ue_code_no_match(self):
        assert ref._detect_by_ue_code("UE XYZ999") is None

    def test_detect_by_ue_code_no_text(self):
        assert ref._detect_by_ue_code("random text") is None

    def test_detect_by_module_code_info(self):
        assert ref._detect_by_module_code("code module INF-101") == "info"

    def test_detect_by_module_code_gc(self):
        assert ref._detect_by_module_code("code GC_200") == "gc"

    def test_detect_by_module_code_ge(self):
        assert ref._detect_by_module_code("module GE-300") == "ge"

    def test_detect_by_module_code_meca(self):
        assert ref._detect_by_module_code("code ME-100") == "meca"

    def test_detect_by_module_code_telecom(self):
        assert ref._detect_by_module_code("code TEL-200") == "telecom"

    def test_detect_by_module_code_no_match(self):
        assert ref._detect_by_module_code("code XYZ-999") is None

    def test_detect_by_module_code_no_text(self):
        assert ref._detect_by_module_code("random text") is None

    def test_detect_by_keywords_info(self):
        result = ref._detect_by_keywords("django flask python javascript")
        assert result == "info"

    def test_detect_by_keywords_gc(self):
        result = ref._detect_by_keywords("beton fondation geotechnique")
        assert result == "gc"

    def test_detect_by_keywords_ge(self):
        result = ref._detect_by_keywords("genie electrique electrotechnique")
        assert result == "ge"

    def test_detect_by_keywords_meca(self):
        result = ref._detect_by_keywords("genie mecanique thermodynamique")
        assert result == "meca"

    def test_detect_by_keywords_telecom(self):
        result = ref._detect_by_keywords("telecom telecommunication")
        assert result == "telecom"

    def test_detect_by_keywords_default_gc(self):
        result = ref._detect_by_keywords("random words nothing specific")
        assert result == "gc"

    def test_detect_by_keywords_info_mt_boost(self):
        result = ref._detect_by_keywords("mt- web sparql rdf informatique")
        assert result == "info"

    def test_build_combined_text(self):
        result = ref._build_combined_text(["file1.pdf", "file2.pdf"], [b"hello world", b"test content"])
        assert "file1.pdf" in result
        assert "hello world" in result

    def test_build_combined_text_empty(self):
        result = ref._build_combined_text([], [])
        assert result == ""

    def test_detect_departement_filename_priority(self):
        result = ref._detect_departement(["FICHE-GC-MODULE.pdf"], [])
        assert result == "gc"

    def test_detect_departement_up_code(self):
        result = ref._detect_departement(["doc.pdf"], [b"unite pedagogique UPGL"])
        assert result == "info"

    def test_detect_departement_ue_code(self):
        result = ref._detect_departement(["doc.pdf"], [b"UE INF101 module"])
        assert result == "info"

    def test_detect_departement_module_code(self):
        result = ref._detect_departement(["doc.pdf"], [b"code module GC-101"])
        assert result == "gc"

    def test_detect_departement_keyword_fallback(self):
        result = ref._detect_departement(["doc.pdf"], [b"beton fondation geotechnique"])
        assert result == "gc"


class TestReferentialManager:
    def test_list_departments(self):
        mgr = ref._dept_ref_manager
        depts = mgr.list_departments()
        assert "gc" in depts
        assert "info" in depts

    def test_invalidate_all(self, monkeypatch):
        ref._REF_DB_CACHE.set("gc", {"savoirs": {}, "competences": {}, "domaines": {}, "niveaux": {}})
        ref._SEMANTIC_CORPUS_BUILT = True
        mgr = ref._dept_ref_manager
        mgr.invalidate_all()
        assert ref._REF_DB_CACHE.get("gc") is None
        assert ref._SEMANTIC_CORPUS_BUILT is False

    def test_stats(self, monkeypatch):
        monkeypatch.setattr(ref, "_get_effective_referential", lambda d: {
            "savoirs": {"S1": [], "S2": []},
            "competences": {"C1": {"keywords": []}},
            "domaines": {"D1": "Dom"},
            "niveaux": {"S1": "N1"},
        })
        mgr = ref._dept_ref_manager
        s = mgr.stats("gc")
        assert s["savoirs"] == 2
        assert s["competences"] == 1
        assert s["domaines"] == 1
        assert s["niveaux"] == 1


class TestLoadRefFromDbNonGC:
    def test_load_ref_from_db_non_gc(self, monkeypatch):
        ref._REF_DB_CACHE.clear()
        cur = MagicMock()
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
        # Mock _fetch_niveaux_from_db
        monkeypatch.setattr(ref, "_fetch_niveaux_from_db", lambda d: {"S1": "N3_INTERMEDIAIRE"})
        merged = ref._load_ref_from_db("info")
        assert merged is not None
        assert merged["savoirs"]["S1"] == ["kw1", "savoir 1"]
        assert merged["niveaux"]["S1"] == "N3_INTERMEDIAIRE"

    def test_load_ref_from_db_empty_result(self, monkeypatch):
        ref._REF_DB_CACHE.clear()
        cur = MagicMock()
        cur.fetchone.side_effect = [(True,), (True,), (True,), (True,)]
        cur.fetchall.side_effect = [[], [], []]
        conn = MagicMock()
        conn.cursor.return_value = cur
        monkeypatch.setattr(ref, "_get_db_connection", lambda: conn)
        monkeypatch.setattr(ref, "_put_db_connection", lambda c: None)
        result = ref._load_ref_from_db("info")
        assert result is None

    def test_load_ref_from_db_exception(self, monkeypatch):
        ref._REF_DB_CACHE.clear()
        monkeypatch.setattr(ref, "_get_db_connection", lambda: (_ for _ in ()).throw(Exception("db error")))
        result = ref._load_ref_from_db("gc")
        assert result is None


class TestLoadGenericRefExtra:
    def test_corrupt_json_file(self, tmp_path, monkeypatch):
        mapping_path = tmp_path / "generic_ref.json"
        mapping_path.write_text("NOT VALID JSON", encoding="utf-8")
        monkeypatch.setattr(ref, "_GENERIC_REF_MAPPING_PATH", mapping_path)
        monkeypatch.setattr(ref, "_GENERIC_REF_DIR", tmp_path)
        result = ref._load_generic_ref("info")
        assert result is ref._GENERIC_FALLBACK_REF

    def test_missing_keys_in_data(self, tmp_path, monkeypatch):
        mapping_path = tmp_path / "generic_ref.json"
        ref_file = tmp_path / "info.json"
        mapping_path.write_text(json.dumps({"info": "info.json"}), encoding="utf-8")
        ref_file.write_text(json.dumps({"domaines": {"I1": "Info"}}), encoding="utf-8")
        monkeypatch.setattr(ref, "_GENERIC_REF_MAPPING_PATH", mapping_path)
        monkeypatch.setattr(ref, "_GENERIC_REF_DIR", tmp_path)
        result = ref._load_generic_ref("info")
        assert result["domaines"] == {"I1": "Info"}
        assert "competences" in result
        assert "savoirs" in result
        assert "niveaux" in result


class TestMatchSavoirSemanticOnly:
    def test_no_keyword_match_semantic_only(self, monkeypatch):
        monkeypatch.setattr(ref, "_get_effective_referential", lambda d: {
            "savoirs": {"S1": ["beton arme"], "S2": ["hydraulique"]},
            "competences": {},
            "domaines": {},
            "niveaux": {},
        })
        monkeypatch.setattr(ref, "_SEMANTIC_OK", True)
        monkeypatch.setattr(ref, "_match_gc_savoir_semantic", lambda text, departement="gc", threshold=0.35, top_k=5: ["S2"])
        result = ref._match_gc_savoir("some unrelated text")
        assert result == ["S2"]

    def test_no_keyword_no_semantic(self, monkeypatch):
        monkeypatch.setattr(ref, "_get_effective_referential", lambda d: {
            "savoirs": {"S1": ["beton arme"]},
            "competences": {},
            "domaines": {},
            "niveaux": {},
        })
        monkeypatch.setattr(ref, "_SEMANTIC_OK", False)
        result = ref._match_gc_savoir("some unrelated text")
        assert result == []


class TestContainsAny:
    def test_contains_any_true(self):
        assert ref._contains_any("hello world", ["hello", "xyz"]) is True

    def test_contains_any_false(self):
        assert ref._contains_any("hello world", ["abc", "xyz"]) is False


class TestMergeNonGCRef:
    def test_merge_non_gc_with_niveaux(self, monkeypatch):
        monkeypatch.setattr(ref, "_fetch_niveaux_from_db", lambda d: {"S1": "N3_INTERMEDIAIRE"})
        result = ref._merge_non_gc_ref({"S1": ["kw1"]}, {"C1": {"nom": "C1", "keywords": []}}, {"D1": "Dom1"}, "info")
        assert result["niveaux"]["S1"] == "N3_INTERMEDIAIRE"

    def test_merge_non_gc_without_niveaux(self, monkeypatch):
        monkeypatch.setattr(ref, "_fetch_niveaux_from_db", lambda d: {})
        result = ref._merge_non_gc_ref({"S1": ["kw1"]}, {}, {}, "info")
        assert result["niveaux"] == {}


class TestGetEffectiveReferentialAliases:
    def test_get_effective_gc_referential(self, monkeypatch):
        monkeypatch.setattr(ref, "_load_ref_from_db", lambda d: None)
        result = ref._get_effective_gc_referential()
        assert result is ref._GC_FALLBACK_REF
