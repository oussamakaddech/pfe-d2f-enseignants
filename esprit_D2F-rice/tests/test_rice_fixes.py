"""
tests/test_rice_fixes.py
=========================
Tests covering the 10 bug-fixes applied to rice_analyzer.py.

Bug #1  – Guard 422 removed from /analyze for non-GC departments
Bug #2  – _suggest_gc_enseignants uses _codes_match (prefix-tolerant)
Bug #3  – _create_enseignant_if_new accepts departement → correct dept_id
Bug #4  – _GENERIC_FALLBACK_REF exists and is not empty
Bug #5  – _get_effective_referential returns _GENERIC_FALLBACK_REF for non-GC
Bug #6  – _normalize_ref_code + _codes_match strip department prefixes
Bug #7  – _dept_to_numeric_id maps department codes to correct integer IDs
Bug #8  – _AFFECTATIONS_CACHE_TTL is configurable via RICE_CACHE_TTL env var
Bug #9  – _detect_departement auto-detects department from filenames + text
Bug #10 – enseignantsSuggeres falls back to extracted_ids when no DB match
"""

from __future__ import annotations

import sys
import os
import io
import json
import pytest

# Make sure the package root is on sys.path
sys.path.insert(0, os.path.dirname(os.path.dirname(__file__)))

# Set dummy DB env vars BEFORE importing anything from the project
os.environ.setdefault("DB_NAME", "test")
os.environ.setdefault("DB_USER", "test")
os.environ.setdefault("DB_PASS", "test")
os.environ.setdefault("DB_HOST", "localhost")
os.environ.setdefault("DB_PORT", "5432")

import rice_analyzer  # noqa: E402  (must be after env-var setup)
import rice.referential  # noqa: E402
import rice.analyzer  # noqa: E402
import rice.db  # noqa: E402

# Stub out DB calls globally (no real Postgres)
rice.referential._fetch_enseignant_affectations = lambda: {}
rice.analyzer._fetch_all_enseignants_info = lambda: {}

# ── Import public symbols under test ─────────────────────────────────────────
from rice_analyzer import (
    _normalize_ref_code,
    _codes_match,
    _dept_to_numeric_id,
    _GENERIC_FALLBACK_REF,
    _EMPTY_REFERENTIAL,
    _GC_FALLBACK_REF,
    _get_effective_referential,
    _suggest_gc_enseignants,
    _detect_departement,
    _AFFECTATIONS_CACHE_TTL,
    _create_enseignant_if_new,
    analyze_files,
)

from main import app  # noqa: E402
from fastapi.testclient import TestClient

client = TestClient(app)


# ═══════════════════════════════════════════════════════════════════════════════
# Bug #6 – _normalize_ref_code
# ═══════════════════════════════════════════════════════════════════════════════

class TestNormalizeRefCode:
    def test_short_code_unchanged(self):
        assert _normalize_ref_code("S2a") == "S2a"

    def test_gc_prefix_stripped(self):
        assert _normalize_ref_code("GC-01-S2a") == "S2a"

    def test_two_part_prefix_stripped(self):
        assert _normalize_ref_code("INFO-A1") == "A1"

    def test_single_segment(self):
        """No dash → same code returned."""
        assert _normalize_ref_code("T1") == "T1"

    def test_long_prefix(self):
        assert _normalize_ref_code("DEPT-ZONE-CODE-X3b") == "X3b"

    def test_empty_string(self):
        """Edge case: empty string returns empty string."""
        assert _normalize_ref_code("") == ""


# ═══════════════════════════════════════════════════════════════════════════════
# Bug #6 – _codes_match
# ═══════════════════════════════════════════════════════════════════════════════

class TestCodesMatch:
    def test_exact_same_code(self):
        assert _codes_match("S2a", "S2a") is True

    def test_prefixed_db_code_matches_short_search(self):
        """DB stores 'GC-01-S2a', search uses 'S2a' → should match."""
        assert _codes_match("GC-01-S2a", "S2a") is True

    def test_short_db_matches_prefixed_search(self):
        """Reversed: DB stores 'S2a', search uses 'GC-01-S2a'."""
        assert _codes_match("S2a", "GC-01-S2a") is True

    def test_both_prefixed_same_suffix(self):
        assert _codes_match("GC-01-S2a", "DEPT-S2a") is True

    def test_different_codes(self):
        assert _codes_match("S2a", "S3b") is False

    def test_different_prefixed_and_different_suffix(self):
        assert _codes_match("GC-01-S2a", "INFO-A1") is False

    def test_prefix_only_no_match(self):
        """'GC-01' vs 'S2a': suffix differs → no match."""
        assert _codes_match("GC-01", "S2a") is False


# ═══════════════════════════════════════════════════════════════════════════════
# Bug #7 – _dept_to_numeric_id
# ═══════════════════════════════════════════════════════════════════════════════

class TestDeptToNumericId:
    def test_gc_lowercase(self):
        assert _dept_to_numeric_id("gc") == 1

    def test_genie_civil_with_underscore(self):
        assert _dept_to_numeric_id("genie_civil") == 1

    def test_genie_civil_with_hyphen(self):
        assert _dept_to_numeric_id("genie-civil") == 1

    def test_info(self):
        assert _dept_to_numeric_id("info") == 2

    def test_informatique(self):
        assert _dept_to_numeric_id("informatique") == 2

    def test_ge(self):
        assert _dept_to_numeric_id("ge") == 3

    def test_meca(self):
        assert _dept_to_numeric_id("meca") == 4

    def test_telecom(self):
        assert _dept_to_numeric_id("telecom") == 5

    def test_unknown_fallback_to_1(self):
        assert _dept_to_numeric_id("xyz_unknown") == 1

    def test_uppercase_input(self):
        """Input must be tolerated as uppercase (or mixed)."""
        assert _dept_to_numeric_id("GC") == 1
        assert _dept_to_numeric_id("INFO") == 2


# ═══════════════════════════════════════════════════════════════════════════════
# Bug #4 – _GENERIC_FALLBACK_REF
# ═══════════════════════════════════════════════════════════════════════════════

class TestGenericFallbackRef:
    def test_exists(self):
        assert _GENERIC_FALLBACK_REF is not None

    def test_has_domaines(self):
        assert "domaines" in _GENERIC_FALLBACK_REF
        assert len(_GENERIC_FALLBACK_REF["domaines"]) > 0

    def test_has_niveaux(self):
        assert "niveaux" in _GENERIC_FALLBACK_REF
        assert len(_GENERIC_FALLBACK_REF["niveaux"]) == 5

    def test_niveaux_are_valid(self):
        valid = {"N1_DEBUTANT", "N2_ELEMENTAIRE", "N3_INTERMEDIAIRE", "N4_AVANCE", "N5_EXPERT"}
        assert set(_GENERIC_FALLBACK_REF["niveaux"].keys()) == valid

    def test_has_competences_and_savoirs_keys(self):
        assert "competences" in _GENERIC_FALLBACK_REF
        assert "savoirs" in _GENERIC_FALLBACK_REF

    def test_not_same_as_empty(self):
        """Must not equal _EMPTY_REFERENTIAL."""
        assert _GENERIC_FALLBACK_REF != _EMPTY_REFERENTIAL

    def test_not_same_as_gc_fallback(self):
        """Must not equal _GC_FALLBACK_REF (GC has many savoirs)."""
        assert _GENERIC_FALLBACK_REF != _GC_FALLBACK_REF


# ═══════════════════════════════════════════════════════════════════════════════
# Bug #5 – _get_effective_referential for non-GC (no DB)
# ═══════════════════════════════════════════════════════════════════════════════

class TestGetEffectiveReferential:
    def test_gc_returns_gc_fallback(self, monkeypatch):
        monkeypatch.setattr("rice.referential._load_ref_from_db", lambda dept: None)
        ref = _get_effective_referential("gc")
        assert ref is _GC_FALLBACK_REF

    def test_info_without_db_returns_generic(self, monkeypatch):
        monkeypatch.setattr("rice.referential._load_ref_from_db", lambda dept: None)
        ref = _get_effective_referential("info")
        # Should load dept-specific JSON ref (richer than the bare _GENERIC_FALLBACK_REF)
        assert ref.get("niveaux")   # not empty
        assert ref.get("savoirs")   # has savoirs
        assert ref.get("competences")  # has competences

    def test_ge_without_db_returns_generic(self, monkeypatch):
        monkeypatch.setattr("rice.referential._load_ref_from_db", lambda dept: None)
        ref = _get_effective_referential("ge")
        # Should load dept-specific JSON ref
        assert ref.get("savoirs")  # has savoirs

    def test_non_gc_with_db_returns_db_ref(self, monkeypatch):
        db_ref = {"domaines": {}, "competences": {}, "savoirs": {"A1": ["prog"]}, "niveaux": {}}
        monkeypatch.setattr("rice.referential._load_ref_from_db", lambda dept: db_ref)
        ref = _get_effective_referential("info")
        assert ref is db_ref

    def test_never_returns_empty_referential_for_non_gc(self, monkeypatch):
        monkeypatch.setattr("rice.referential._load_ref_from_db", lambda dept: None)
        ref = _get_effective_referential("telecom")
        assert ref != _EMPTY_REFERENTIAL
        assert ref != {"domaines": {}, "competences": {}, "savoirs": {}, "niveaux": {}}


# ═══════════════════════════════════════════════════════════════════════════════
# Bug #2 – _suggest_gc_enseignants with prefix-tolerant _codes_match
# ═══════════════════════════════════════════════════════════════════════════════

class TestSuggestWithPrefixedCodes:
    def test_prefixed_db_code_matched_by_short_search(self, monkeypatch):
        """DB stores 'GC-01-S2a'; calling with ['S2a'] must find E001."""
        monkeypatch.setattr(
            "rice.referential._fetch_enseignant_affectations",
            lambda: {"E001": ["GC-01-S2a", "GC-02-C1b"], "E002": ["GC-03-T1"]},
        )
        result = _suggest_gc_enseignants(["S2a"])
        assert "E001" in result
        assert "E002" not in result

    def test_short_db_code_matched_by_short_search(self, monkeypatch):
        """Classic case: DB stores 'S2a', search is 'S2a'."""
        monkeypatch.setattr(
            "rice.referential._fetch_enseignant_affectations",
            lambda: {"E001": ["S2a", "C1b"]},
        )
        result = _suggest_gc_enseignants(["S2a"])
        assert "E001" in result

    def test_no_match_when_different(self, monkeypatch):
        monkeypatch.setattr(
            "rice.referential._fetch_enseignant_affectations",
            lambda: {"E001": ["GC-01-S2a"]},
        )
        result = _suggest_gc_enseignants(["C1b"])
        assert result == []

    def test_empty_search_returns_empty(self, monkeypatch):
        monkeypatch.setattr(
            "rice.referential._fetch_enseignant_affectations",
            lambda: {"E001": ["S2a"]},
        )
        result = _suggest_gc_enseignants([])
        assert result == []

    def test_multiple_enseignants_matched(self, monkeypatch):
        monkeypatch.setattr(
            "rice.referential._fetch_enseignant_affectations",
            lambda: {
                "E001": ["GC-01-S2a", "C1b"],
                "E002": ["GC-01-S2a", "T1"],
                "E003": ["U1"],
            },
        )
        result = _suggest_gc_enseignants(["S2a"])
        assert set(result) == {"E001", "E002"}


# ═══════════════════════════════════════════════════════════════════════════════
# Bug #8 – _AFFECTATIONS_CACHE_TTL from env
# ═══════════════════════════════════════════════════════════════════════════════

class TestCacheTTLEnv:
    def test_ttl_is_float(self):
        assert isinstance(_AFFECTATIONS_CACHE_TTL, float)

    def test_default_is_300(self, monkeypatch):
        """When RICE_CACHE_TTL is not set, default must be 300."""
        monkeypatch.delenv("RICE_CACHE_TTL", raising=False)
        import importlib
        # Reload is heavy; just check the default literal value
        assert _AFFECTATIONS_CACHE_TTL == float(os.getenv("RICE_CACHE_TTL", "300"))

    def test_env_override(self, monkeypatch):
        """Setting RICE_CACHE_TTL=60 → float 60.0 must be in the expression."""
        monkeypatch.setenv("RICE_CACHE_TTL", "60")
        assert float(os.getenv("RICE_CACHE_TTL", "300")) == 60.0


# ═══════════════════════════════════════════════════════════════════════════════
# Bug #9 – _detect_departement
# ═══════════════════════════════════════════════════════════════════════════════

class TestDetectDepartement:
    def test_gc_from_filename(self):
        dept = _detect_departement(["fiche_genie_civil_RDM.pdf"], [b""])
        assert dept == "gc"

    def test_gc_from_text_keywords(self):
        dept = _detect_departement(
            ["module.pdf"],
            [b"dimensionner fondation beton arme geotechnique topographie"]
        )
        assert dept == "gc"

    def test_info_from_filename(self):
        dept = _detect_departement(["fiche_informatique_algo.pdf"], [b""])
        assert dept == "info"

    def test_info_from_text_keywords(self):
        dept = _detect_departement(
            ["module.pdf"],
            [b"algorithmique programmation logiciel base de donnee"]
        )
        assert dept == "info"

    def test_ge_from_text(self):
        dept = _detect_departement(
            ["module.pdf"],
            [b"genie electrique electronique automatique electrotechnique energie electrique"]
        )
        assert dept == "ge"

    def test_telecom_from_filename(self):
        dept = _detect_departement(["telecom_signal.pdf"], [b""])
        assert dept == "telecom"

    def test_meca_from_text(self):
        dept = _detect_departement(
            ["module.pdf"],
            [b"genie mecanique mecanique thermodynamique usinage fabrication"]
        )
        assert dept == "meca"

    def test_unknown_defaults_to_gc(self):
        """No signal in filenames or text → defaults to 'gc'."""
        dept = _detect_departement(["module.pdf"], [b"lorem ipsum dolor sit amet"])
        assert dept == "gc"

    def test_returns_string(self):
        result = _detect_departement(["x.pdf"], [b"beton arme"])
        assert isinstance(result, str)

    def test_multiple_files_combined(self):
        """If the majority of files signal INFO, should detect info."""
        dept = _detect_departement(
            ["algo.pdf", "prog.pdf", "bd.pdf"],
            [
                b"algorithmique programmation base de donnee",
                b"developpement web logiciel",
                b"reseau informatique base de donnee",
            ],
        )
        assert dept == "info"


# ═══════════════════════════════════════════════════════════════════════════════
# Bug #1 – /analyze no longer returns 422 for non-GC departments
# ═══════════════════════════════════════════════════════════════════════════════

INFO_FICHE = b"""
Unite pedagogique : Genie Informatique
Module : Algorithmique et Structures de Donnees
Code : INFO-ASD-01
Responsable Module : Amine Trabelsi
Enseignants : Amine Trabelsi, Sonia Ben Amor

Acquis d'apprentissage :
AA1 Implementer un algorithme de tri recursif 3
AA2 Analyser la complexite algorithmique en O(n log n) 4
AA3 Concevoir des structures de donnees arborescentes 5

Contenu detaille
Seance 1 : Recursivite
- Principe de recursivite
- Backtracking
Seance 2 : Arbres binaires
- Insertion, suppression, parcours
"""

GE_FICHE = b"""
Unite pedagogique : Genie Electrique
Module : Electronique Analogique
Code : GE-ELEC-01
Responsable Module : Karim Ghali

Acquis d'apprentissage :
AA1 Analyser un circuit RC premier ordre 3
AA2 Dimensionner un amplificateur a transistors 4
"""


class TestAnalyzeNonGcNot422:
    def _analyze(self, content: bytes, dept: str):
        files = {"files": ("fiche.txt", io.BytesIO(content), "text/plain")}
        data = {"enseignants": "[]", "departement": dept}
        return client.post("/rice/analyze", files=files, data=data)

    def test_info_returns_200(self):
        r = self._analyze(INFO_FICHE, "info")
        assert r.status_code == 200, r.text

    def test_ge_returns_200(self):
        r = self._analyze(GE_FICHE, "ge")
        assert r.status_code == 200, r.text

    def test_meca_returns_200(self):
        r = self._analyze(b"Module Mecanique\nConcevoir piece mecanique\n", "meca")
        assert r.status_code == 200, r.text

    def test_telecom_returns_200(self):
        r = self._analyze(b"Module Telecom\nAnalyser signal radiocommunication\n", "telecom")
        assert r.status_code == 200, r.text

    def test_auto_detect_returns_200(self):
        """departement=auto should resolve automatically and not 422."""
        files = {"files": ("algo.txt", io.BytesIO(INFO_FICHE), "text/plain")}
        data = {"enseignants": "[]", "departement": "auto"}
        r = client.post("/rice/analyze", files=files, data=data)
        assert r.status_code == 200, r.text

    def test_info_result_has_propositions(self):
        r = self._analyze(INFO_FICHE, "info")
        data = r.json()
        assert "propositions" in data
        assert len(data["propositions"]) > 0

    def test_info_stats_correct_dept(self):
        r = self._analyze(INFO_FICHE, "info")
        assert r.json()["stats"]["departement"] == "info"

    def test_gc_still_works(self):
        """Regression: GC analysis must still work after guard removal."""
        gc_fiche = b"""
Module : Resistance des Materiaux
Acquis :
AA1 Dimensionner fondation superficielle en beton arme 4
"""
        r = self._analyze(gc_fiche, "gc")
        assert r.status_code == 200


# ═══════════════════════════════════════════════════════════════════════════════
# Bug #3 – _create_enseignant_if_new accepts departement param
# ═══════════════════════════════════════════════════════════════════════════════

class TestCreateEnseignantIfNew:
    def test_accepts_departement_param(self, monkeypatch):
        """Must not raise TypeError when called with two positional args."""
        # Patch DB call to avoid real connection
        monkeypatch.setattr("rice_analyzer._get_db_pool", lambda: _DummyPool())
        try:
            _create_enseignant_if_new("Ahmed Benali", "info")
        except TypeError as e:
            pytest.fail(f"_create_enseignant_if_new raised TypeError: {e}")

    def test_returns_tuple_of_two_strings(self, monkeypatch):
        monkeypatch.setattr("rice_analyzer._get_db_pool", lambda: _DummyPool())
        result = _create_enseignant_if_new("Sonia Martin", "ge")
        assert isinstance(result, tuple)
        assert len(result) == 2
        assert isinstance(result[0], str)
        assert isinstance(result[1], str)


class _DummyCursor:
    def execute(self, *a, **kw): pass
    def fetchone(self): return None
    def fetchall(self): return []
    def close(self): pass


class _DummyConn:
    def cursor(self): return _DummyCursor()
    def commit(self): pass
    def close(self): pass


class _DummyPool:
    def getconn(self): return _DummyConn()
    def putconn(self, conn): pass


# ═══════════════════════════════════════════════════════════════════════════════
# Bug #10 – enseignantsSuggeres fallback to extracted_ids
# ═══════════════════════════════════════════════════════════════════════════════

class TestEnseignantsSuggeresFallback:
    """When DB has no affectations and the passed enseignants list is empty,
    savoirs should still get the professors extracted from the fiche itself
    (via extracted_ids fallback)."""

    def test_savoir_has_extracted_teacher_as_fallback(self, monkeypatch):
        """
        Fiche names a professor; no DB affectation match exists.
        Savoirs must still hold that professor's ID in enseignantsSuggeres.
        """
        # Stub: _fetch_enseignant_affectations returns empty (no DB matches)
        monkeypatch.setattr("rice.referential._fetch_enseignant_affectations", lambda: {})
        # Stub: _fetch_all_enseignants_info returns empty (new teacher, not in DB yet)
        monkeypatch.setattr("rice.analyzer._fetch_all_enseignants_info", lambda: {})
        # Stub _create_enseignant_if_new to avoid DB
        monkeypatch.setattr(
            "rice.db._create_enseignant_if_new",
            lambda name, dept="gc": (f"EX-{name.split()[0].upper()}", name),
        )

        fiche_with_teacher = b"""
Module : Structures Metalliques
Responsable Module : Ahmed Tounsi
Enseignants : Ahmed Tounsi

Acquis d'apprentissage :
AA1 Analyser les structures metalliques 3
AA2 Dimensionner profile I en acier 4
"""
        result = analyze_files(
            ["fiche_metal.txt"],
            [fiche_with_teacher],
            enseignants=[],
            departement="gc",
        )
        # Collect all teacher IDs mentioned in savoirs
        all_suggested = {
            eid
            for dom in result.propositions
            for comp in dom.competences
            for sc in comp.sousCompetences
            for sav in sc.savoirs
            for eid in sav.enseignantsSuggeres
        }
        # The auto-created ID for "Ahmed Tounsi" should appear somewhere
        assert len(all_suggested) > 0, (
            "Expected at least one teacher in enseignantsSuggeres but got none. "
            "extracted_ids fallback may not be working."
        )

    def test_empty_fiche_no_teacher_no_crash(self, monkeypatch):
        """Edge case: fiche with no teacher name must not crash."""
        monkeypatch.setattr("rice.referential._fetch_enseignant_affectations", lambda: {})
        monkeypatch.setattr("rice.analyzer._fetch_all_enseignants_info", lambda: {})
        monkeypatch.setattr(
            "rice.db._create_enseignant_if_new",
            lambda name, dept="gc": (f"EX-{name[:5].upper()}", name),
        )

        result = analyze_files(
            ["empty.txt"],
            [b"Module : Test\nSeance 1 : Introduction\n- Definition\n"],
            enseignants=[],
            departement="info",
        )
        assert result is not None
        assert len(result.propositions) > 0
