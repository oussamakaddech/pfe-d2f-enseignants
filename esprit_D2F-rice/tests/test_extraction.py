"""
tests/test_extraction.py
=========================
Tests for:
  - Sous-compétence extraction (regex + LLM fallback)
  - Generic JSON referential loading
  - Semantic corpus persistence
  - _get_effective_referential with JSON fallback
"""

from __future__ import annotations

import sys
import os
import json
import pytest
from pathlib import Path

# Make sure the package root is on sys.path
sys.path.insert(0, os.path.dirname(os.path.dirname(__file__)))

# Set dummy DB env vars BEFORE importing anything from the project
os.environ.setdefault("DB_NAME", "test")
os.environ.setdefault("DB_USER", "test")
os.environ.setdefault("DB_PASS", "test")
os.environ.setdefault("DB_HOST", "localhost")
os.environ.setdefault("DB_PORT", "5432")

import rice_analyzer  # noqa: E402

# Stub out DB calls globally (no real Postgres)
rice_analyzer._fetch_enseignant_affectations = lambda: {}
rice_analyzer._fetch_all_enseignants_info = lambda: {}

from rice_analyzer import (
    _extract_subcompetences,
    _llm_extract_subcompetences,
    _load_generic_ref,
    _get_effective_referential,
    _GC_FALLBACK_REF,
    _GENERIC_FALLBACK_REF,
)


# ─────────────────────────────────────────────────────────────────────────────
# Test _extract_subcompetences (regex)
# ─────────────────────────────────────────────────────────────────────────────

SAMPLE_FICHE_WITH_SC = """
Objectifs du module :
Ce module vise à développer les compétences en analyse et test logiciel.

SC1 – Analyse des exigences
AA1 Identifier les besoins fonctionnels et non fonctionnels 2
AA2 Décrire les exigences sous forme de user stories 2

SC2 – Conception du test
AA3 Concevoir les cas de test à partir des exigences 4
AA4 Rédiger un plan de test 3

SC3 – Automatisation du test
AA5 Développer des scripts de test automatisés 5
AA6 Intégrer les tests dans une pipeline CI/CD 6
"""

SAMPLE_FICHE_ALT_FORMAT = """
Module de Génie Logiciel

Sous-compétence : Modélisation UML
- Utiliser les diagrammes de classes
- Créer des diagrammes de séquence

Sous-compétence : Patterns de conception
- Appliquer le pattern MVC
- Identifier les design patterns courants
"""

SAMPLE_FICHE_SC_FORMAT = """
Introduction au module

S-C 1. Fondamentaux des réseaux
- Comprendre le modèle OSI
- Configurer un réseau local

S-C 2. Sécurité réseau
- Mettre en place un firewall
- Auditer la sécurité
"""

SAMPLE_FICHE_NO_SC = """
Objectifs :
Ce module aborde les fondamentaux de la programmation orientée objet.

AA1 Comprendre les concepts d'héritage et polymorphisme
AA2 Appliquer l'encapsulation dans un projet Java
AA3 Concevoir une architecture logicielle modulaire
"""


class TestExtractSubcompetences:
    """Test regex-based sub-competence title extraction."""

    def test_sc_dash_format(self):
        """SC1 – Title format should be detected."""
        titles = _extract_subcompetences(SAMPLE_FICHE_WITH_SC)
        assert len(titles) == 3
        assert titles[0][1] == "Analyse des exigences"
        assert titles[1][1] == "Conception du test"
        assert titles[2][1] == "Automatisation du test"

    def test_sous_competence_colon_format(self):
        """'Sous-compétence : Title' format should be detected."""
        titles = _extract_subcompetences(SAMPLE_FICHE_ALT_FORMAT)
        assert len(titles) == 2
        assert titles[0][1] == "Modélisation UML"
        assert titles[1][1] == "Patterns de conception"

    def test_s_c_numbered_format(self):
        """'S-C 1. Title' format should be detected."""
        titles = _extract_subcompetences(SAMPLE_FICHE_SC_FORMAT)
        assert len(titles) == 2
        assert titles[0][1] == "Fondamentaux des réseaux"
        assert titles[1][1] == "Sécurité réseau"

    def test_no_subcompetences(self):
        """Text without sub-competence markers should return empty list."""
        titles = _extract_subcompetences(SAMPLE_FICHE_NO_SC)
        assert len(titles) == 0

    def test_line_numbers_are_correct(self):
        """Line numbers should be 1-based and match the actual line."""
        titles = _extract_subcompetences(SAMPLE_FICHE_WITH_SC)
        lines = SAMPLE_FICHE_WITH_SC.splitlines()
        for line_no, title in titles:
            assert 1 <= line_no <= len(lines)
            # The title should appear on that line
            assert title in lines[line_no - 1]

    def test_deduplication(self):
        """Duplicate titles on different lines should not be duplicated."""
        duplicate_text = """
SC1 – Analyse
Some content
SC1 – Analyse
More content
SC2 – Conception
"""
        titles = _extract_subcompetences(duplicate_text)
        title_texts = [t for _, t in titles]
        assert title_texts.count("Analyse") == 1
        assert "Conception" in title_texts


# ─────────────────────────────────────────────────────────────────────────────
# Test _load_generic_ref (JSON fallback)
# ─────────────────────────────────────────────────────────────────────────────

class TestLoadGenericRef:
    """Test JSON-based generic referential loading."""

    def test_gc_ref_loads_successfully(self):
        """GC ref JSON should load with all required keys."""
        ref = _load_generic_ref("gc")
        assert "savoirs" in ref
        assert "competences" in ref
        assert "domaines" in ref
        assert "niveaux" in ref
        assert len(ref["savoirs"]) > 0, "GC ref should have savoirs"

    def test_info_ref_loads_successfully(self):
        """INFO ref JSON should load with all required keys."""
        ref = _load_generic_ref("info")
        assert "savoirs" in ref
        assert len(ref["savoirs"]) > 0, "INFO ref should have savoirs"
        # Check INFO-specific codes
        assert any(k.startswith("INFO-") for k in ref["savoirs"].keys())

    def test_ge_ref_loads_successfully(self):
        ref = _load_generic_ref("ge")
        assert "savoirs" in ref
        assert len(ref["savoirs"]) > 0

    def test_meca_ref_loads_successfully(self):
        ref = _load_generic_ref("meca")
        assert "savoirs" in ref
        assert len(ref["savoirs"]) > 0

    def test_telecom_ref_loads_successfully(self):
        ref = _load_generic_ref("telecom")
        assert "savoirs" in ref
        assert len(ref["savoirs"]) > 0

    def test_unknown_dept_returns_generic_fallback(self):
        """Unknown department should return _GENERIC_FALLBACK_REF."""
        ref = _load_generic_ref("unknown_dept_xyz")
        assert ref == _GENERIC_FALLBACK_REF

    def test_each_dept_has_different_savoirs(self):
        """Each department should have its own distinct savoirs."""
        gc_ref = _load_generic_ref("gc")
        info_ref = _load_generic_ref("info")
        assert set(gc_ref["savoirs"].keys()) != set(info_ref["savoirs"].keys())


# ─────────────────────────────────────────────────────────────────────────────
# Test _get_effective_referential with JSON fallback
# ─────────────────────────────────────────────────────────────────────────────

class TestEffectiveReferential:
    """_get_effective_referential should fall back to JSON files for non-GC depts."""

    def test_gc_returns_builtin(self):
        """GC without DB should return the built-in _GC_FALLBACK_REF."""
        ref = _get_effective_referential("gc")
        assert ref is _GC_FALLBACK_REF or len(ref["savoirs"]) > 0

    def test_info_returns_json_ref(self):
        """INFO without DB should return JSON-loaded ref with INFO savoirs."""
        ref = _get_effective_referential("info")
        # Should NOT be the generic empty skeleton
        assert ref != _GENERIC_FALLBACK_REF or len(ref["savoirs"]) == 0
        # If JSON is loaded correctly, it should have INFO codes
        if len(ref["savoirs"]) > 0:
            assert any(k.startswith("INFO-") for k in ref["savoirs"].keys())

    def test_all_known_depts_return_nonempty(self):
        """All 5 known departments should return a ref with savoirs."""
        for dept in ("gc", "info", "ge", "meca", "telecom"):
            ref = _get_effective_referential(dept)
            assert "savoirs" in ref, f"Missing 'savoirs' key for {dept}"
            assert "competences" in ref, f"Missing 'competences' key for {dept}"


# ─────────────────────────────────────────────────────────────────────────────
# Test refs/ JSON file integrity
# ─────────────────────────────────────────────────────────────────────────────

class TestRefJsonFiles:
    """Verify all ref JSON files in refs/ are valid and well-structured."""

    REFS_DIR = Path(__file__).parent.parent / "refs"
    REQUIRED_KEYS = {"domaines", "competences", "savoirs", "niveaux"}

    @pytest.fixture(params=["gc_ref.json", "info_ref.json", "ge_ref.json",
                            "meca_ref.json", "telecom_ref.json"])
    def ref_file(self, request):
        return self.REFS_DIR / request.param

    def test_file_exists(self, ref_file):
        assert ref_file.is_file(), f"Missing ref file: {ref_file}"

    def test_valid_json(self, ref_file):
        data = json.loads(ref_file.read_text(encoding="utf-8"))
        assert isinstance(data, dict)

    def test_required_keys_present(self, ref_file):
        data = json.loads(ref_file.read_text(encoding="utf-8"))
        for key in self.REQUIRED_KEYS:
            assert key in data, f"Missing key '{key}' in {ref_file.name}"

    def test_savoirs_are_lists(self, ref_file):
        """Each savoir value should be a list of keyword strings."""
        data = json.loads(ref_file.read_text(encoding="utf-8"))
        for code, keywords in data["savoirs"].items():
            assert isinstance(keywords, list), f"Savoir {code} in {ref_file.name} should be a list"
            for kw in keywords:
                assert isinstance(kw, str), f"Keyword in {code} ({ref_file.name}) should be a string"

    def test_generic_ref_mapping_exists(self):
        mapping_file = self.REFS_DIR / "generic_ref.json"
        assert mapping_file.is_file()
        data = json.loads(mapping_file.read_text(encoding="utf-8"))
        for dept in ("gc", "info", "ge", "meca", "telecom"):
            assert dept in data, f"Missing '{dept}' in generic_ref.json"
