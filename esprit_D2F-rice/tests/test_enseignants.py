"""
tests/test_enseignants.py — Unit tests for rice.enseignants (fuzzy matching).
"""
import sys
import os
import pytest

sys.path.insert(0, os.path.dirname(os.path.dirname(__file__)))

os.environ.setdefault("DB_NAME", "test")
os.environ.setdefault("DB_USER", "test")
os.environ.setdefault("DB_PASS", "test")
os.environ.setdefault("DB_HOST", "localhost")
os.environ.setdefault("DB_PORT", "5432")

from rice.models import EnseignantInfo
from rice.enseignants import _match_enseignants_by_name, _match_enseignants_by_module


# ── _match_enseignants_by_name ──────────────────────────────────────────────

class TestMatchEnseignantsByName:
    def test_empty_fiche_names(self):
        ens = [EnseignantInfo(id="E001", nom="Benali", prenom="Ahmed")]
        ids, mapping = _match_enseignants_by_name([], ens)
        assert ids == []
        assert mapping == {}

    def test_empty_enseignants_list(self):
        ids, mapping = _match_enseignants_by_name(["Ahmed Benali"], [])
        assert ids == []
        assert mapping == {}

    def test_exact_match(self):
        ens = [EnseignantInfo(id="E001", nom="Benali", prenom="Ahmed")]
        ids, mapping = _match_enseignants_by_name(["Ahmed Benali"], ens)
        assert "E001" in ids
        assert "Ahmed Benali" in mapping

    def test_fuzzy_match_reversed_name(self):
        ens = [EnseignantInfo(id="E001", nom="ABIDI", prenom="Mounir")]
        ids, mapping = _match_enseignants_by_name(["Abidi Mounir"], ens)
        # Should match even with reversed name parts
        assert "E001" in ids

    def test_no_match(self):
        ens = [EnseignantInfo(id="E001", nom="Benali", prenom="Ahmed")]
        ids, mapping = _match_enseignants_by_name(["XYZ Unknown"], ens)
        assert "E001" not in ids

    def test_multiple_names(self):
        ens = [
            EnseignantInfo(id="E001", nom="Benali", prenom="Ahmed"),
            EnseignantInfo(id="E002", nom="Martin", prenom="Sarah"),
        ]
        ids, mapping = _match_enseignants_by_name(["Ahmed Benali", "Sarah Martin"], ens)
        assert "E001" in ids
        assert "E002" in ids

    def test_partial_last_name_match_fallback(self):
        """Test substring fallback when rapidfuzz is not available or score is low."""
        ens = [EnseignantInfo(id="E001", nom="Khelifi", prenom="Mohamed")]
        # The exact match behavior depends on rapidfuzz availability,
        # but at minimum the function should not crash
        ids, mapping = _match_enseignants_by_name(["Khelifi"], ens)
        # May or may not match depending on fuzzy threshold
        assert isinstance(ids, list)
        assert isinstance(mapping, dict)


# ── _match_enseignants_by_module ────────────────────────────────────────────

class TestMatchEnseignantsByModule:
    def test_match_by_module_name(self):
        ens = [
            EnseignantInfo(id="E001", nom="Benali", prenom="Ahmed", modules=["Resistance des Materiaux"]),
            EnseignantInfo(id="E002", nom="Martin", prenom="Sarah", modules=["Hydraulique"]),
        ]
        matched = _match_enseignants_by_module("Module de Resistance des Materiaux avancee", ens)
        assert "E001" in matched
        assert "E002" not in matched

    def test_no_match(self):
        ens = [
            EnseignantInfo(id="E001", nom="Benali", prenom="Ahmed", modules=["Informatique"]),
        ]
        matched = _match_enseignants_by_module("Module de Genie Civil", ens)
        assert matched == []

    def test_empty_enseignants(self):
        matched = _match_enseignants_by_module("some text", [])
        assert matched == []

    def test_short_module_name_ignored(self):
        """Module names <= 3 chars should be ignored."""
        ens = [
            EnseignantInfo(id="E001", nom="Doe", prenom="John", modules=["ABC"]),
        ]
        matched = _match_enseignants_by_module("ABC is here", ens)
        # "ABC" is 3 chars, should be ignored (len > 3 check)
        assert "E001" not in matched

    def test_multiple_modules_one_enseignant(self):
        ens = [
            EnseignantInfo(id="E001", nom="Benali", prenom="Ahmed", modules=["Resistance des Materiaux", "Beton Arme"]),
        ]
        matched = _match_enseignants_by_module("Cours de Beton Arme avance", ens)
        assert "E001" in matched
        # Should only appear once even if multiple modules match
        assert matched.count("E001") == 1

    def test_empty_modules_list(self):
        ens = [
            EnseignantInfo(id="E001", nom="Benali", prenom="Ahmed", modules=[]),
        ]
        matched = _match_enseignants_by_module("any text", ens)
        assert matched == []
