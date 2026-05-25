"""
tests/test_db.py — Unit tests for rice.db (DB helpers, dept mapping, cache fallback).
"""
import sys
import os
import pytest
from unittest.mock import patch, MagicMock

sys.path.insert(0, os.path.dirname(os.path.dirname(__file__)))

os.environ.setdefault("DB_NAME", "test")
os.environ.setdefault("DB_USER", "test")
os.environ.setdefault("DB_PASS", "test")
os.environ.setdefault("DB_HOST", "localhost")
os.environ.setdefault("DB_PORT", "5432")

from rice.db import (
    _dept_to_numeric_id,
    _create_enseignant_if_new,
    _fetch_enseignant_affectations,
    _fetch_all_enseignants_info,
    _AFFECTATIONS_CACHE,
    _ENS_INFO_CACHE,
)


# ── _dept_to_numeric_id ─────────────────────────────────────────────────────

class TestDeptToNumericId:
    def test_gc(self):
        assert _dept_to_numeric_id("gc") == 1

    def test_genie_civil(self):
        assert _dept_to_numeric_id("genie_civil") == 1

    def test_genie_civil_hyphen(self):
        assert _dept_to_numeric_id("genie-civil") == 1

    def test_info(self):
        assert _dept_to_numeric_id("info") == 2

    def test_informatique(self):
        assert _dept_to_numeric_id("informatique") == 2

    def test_ge(self):
        assert _dept_to_numeric_id("ge") == 3

    def test_genie_electrique(self):
        assert _dept_to_numeric_id("genie_electrique") == 3

    def test_genie_electrique_hyphen(self):
        assert _dept_to_numeric_id("genie-electrique") == 3

    def test_meca(self):
        assert _dept_to_numeric_id("meca") == 4

    def test_genie_mecanique(self):
        assert _dept_to_numeric_id("genie_mecanique") == 4

    def test_telecom(self):
        assert _dept_to_numeric_id("telecom") == 5

    def test_telecommunications(self):
        assert _dept_to_numeric_id("telecommunications") == 5

    def test_unknown_defaults_to_gc(self):
        assert _dept_to_numeric_id("unknown") == 1

    def test_case_insensitive(self):
        assert _dept_to_numeric_id("GC") == 1
        assert _dept_to_numeric_id("INFO") == 2
        assert _dept_to_numeric_id("Ge") == 3

    def test_whitespace_stripped(self):
        assert _dept_to_numeric_id("  gc  ") == 1


# ── _create_enseignant_if_new ───────────────────────────────────────────────

class TestCreateEnseignantIfNew:
    def test_basic_name(self):
        with patch("rice.db._get_db_connection") as mock_conn:
            mock_cur = MagicMock()
            mock_conn.return_value.cursor.return_value = mock_cur
            new_id, display = _create_enseignant_if_new("Benali Ahmed")
            assert "BENALI" in new_id
            assert "Ahmed" in display

    def test_single_name(self):
        with patch("rice.db._get_db_connection") as mock_conn:
            mock_cur = MagicMock()
            mock_conn.return_value.cursor.return_value = mock_cur
            new_id, display = _create_enseignant_if_new("Benali")
            assert "BENALI" in new_id
            assert "Benali" in display or "BENALI" in display

    def test_empty_name(self):
        with patch("rice.db._get_db_connection") as mock_conn:
            mock_cur = MagicMock()
            mock_conn.return_value.cursor.return_value = mock_cur
            new_id, display = _create_enseignant_if_new("")
            assert isinstance(new_id, str)
            assert isinstance(display, str)

    def test_whitespace_name(self):
        with patch("rice.db._get_db_connection") as mock_conn:
            mock_cur = MagicMock()
            mock_conn.return_value.cursor.return_value = mock_cur
            new_id, display = _create_enseignant_if_new("   ")
            assert isinstance(new_id, str)

    def test_db_error_returns_id_anyway(self):
        with patch("rice.db._get_db_connection") as mock_conn:
            mock_conn.side_effect = Exception("DB down")
            new_id, display = _create_enseignant_if_new("Benali Ahmed")
            # Should still return an ID even if DB insert fails
            assert isinstance(new_id, str)
            assert len(new_id) > 0

    def test_custom_departement(self):
        with patch("rice.db._get_db_connection") as mock_conn:
            mock_cur = MagicMock()
            mock_conn.return_value.cursor.return_value = mock_cur
            _create_enseignant_if_new("Martin Sarah", departement="info")
            # Verify the dept_id parameter passed to SQL
            call_args = mock_cur.execute.call_args
            assert call_args is not None  # execute was called


# ── _fetch_enseignant_affectations ──────────────────────────────────────────

class TestFetchEnseignantAffectations:
    def setup_method(self):
        _AFFECTATIONS_CACHE.clear()

    def test_returns_cached_data(self):
        _AFFECTATIONS_CACHE.set("all", {"E001": ["S1a", "S2b"]})
        # Also patch the routes module reference
        with patch("rice.routes._fetch_enseignant_affectations", return_value={"E001": ["S1a", "S2b"]}):
            result = _fetch_enseignant_affectations()
        assert result == {"E001": ["S1a", "S2b"]}

    def test_returns_empty_on_db_failure(self):
        with patch("rice.db._get_db_connection", side_effect=Exception("DB down")):
            result = _fetch_enseignant_affectations()
            assert result == {}

    def test_returns_stale_on_db_failure_with_cache(self):
        _AFFECTATIONS_CACHE.set("all", {"E001": ["S1a"]})
        import time
        _AFFECTATIONS_CACHE._ts["all"] = time.time() - 1000
        with patch("rice.db._get_db_connection", side_effect=Exception("DB down")):
            result = _fetch_enseignant_affectations()
            assert result == {"E001": ["S1a"]}


# ── _fetch_all_enseignants_info ─────────────────────────────────────────────

class TestFetchAllEnseignantsInfo:
    def setup_method(self):
        _ENS_INFO_CACHE.clear()

    def test_returns_cached_data(self):
        from rice.models import EnseignantInfo
        cached = {"E001": EnseignantInfo(id="E001", nom="Benali", prenom="Ahmed")}
        _ENS_INFO_CACHE.set("all", cached)
        with patch("rice.analyzer._fetch_all_enseignants_info", return_value=cached):
            result = _fetch_all_enseignants_info()
        assert "E001" in result

    def test_returns_empty_on_db_failure(self):
        with patch("rice.db._get_db_connection", side_effect=Exception("DB down")):
            result = _fetch_all_enseignants_info()
            assert result == {}

    def test_returns_stale_on_db_failure_with_cache(self):
        from rice.models import EnseignantInfo
        cached = {"E001": EnseignantInfo(id="E001", nom="Test", prenom="User")}
        _ENS_INFO_CACHE.set("all", cached)
        import time
        _ENS_INFO_CACHE._ts["all"] = time.time() - 1000
        with patch("rice.db._get_db_connection", side_effect=Exception("DB down")):
            result = _fetch_all_enseignants_info()
            assert "E001" in result
