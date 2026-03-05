"""
tests/test_rice_universal.py
══════════════════════════════
Universal multi-department test suite for the RICE engine.

Tests:
  - _UniversalPatterns  : department-aware PRATIQUE/THEORIQUE scoring
  - _detect_type        : type classification for each department
  - _detect_departement : automatic department detection from filenames/text
  - _DepartmentReferentialManager : facade API
  - _match_gc_savoir    : savoir keyword matching per department
  - _match_gc_competence: competence matching
  - analyze_files       : full pipeline (in-memory, no DB required)

No real database required: DB functions are patched in setUp.
"""
from __future__ import annotations

import os
import sys
import io
import json
import types
import unittest
from unittest.mock import patch, MagicMock
from typing import List, Dict, Any

# ── Path setup: run from repo root or from tests/ ──────────────────────────
sys.path.insert(0, os.path.dirname(os.path.dirname(__file__)))

# ── Patch DB dependencies before importing rice_analyzer ───────────────────
os.environ.setdefault("DB_NAME",  "test_db")
os.environ.setdefault("DB_USER",  "test_user")
os.environ.setdefault("DB_PASS",  "test_pass")
os.environ.setdefault("DB_HOST",  "localhost")
os.environ.setdefault("DB_PORT",  "7432")

import rice_analyzer as ra

# Patch DB calls globally: no real DB needed for unit tests
ra._fetch_enseignant_affectations = lambda: {}
ra._fetch_all_enseignants_info    = lambda: {}
ra._load_ref_from_db              = lambda dept="gc": None  # force fallback path


# ─────────────────────────────────────────────────────────────────────────────
# Helpers
# ─────────────────────────────────────────────────────────────────────────────

def _make_pdf_bytes(text: str) -> bytes:
    """Wrap plain text as a trivial in-memory 'PDF' the test can pass to analyze_files."""
    return text.encode("utf-8")


def _make_ens(eid: str, nom: str, prenom: str, modules: List[str] = None) -> ra.EnseignantInfo:
    return ra.EnseignantInfo(id=eid, nom=nom, prenom=prenom, modules=modules or [])


# ─────────────────────────────────────────────────────────────────────────────
# 1. Tests _UniversalPatterns
# ─────────────────────────────────────────────────────────────────────────────

class TestUniversalPatterns(unittest.TestCase):
    """Verify that _UniversalPatterns.score() returns sensible scores."""

    def _scores(self, text: str, dept: str):
        return ra._UniversalPatterns.score(text, dept)

    # ── All departments should score PRATIQUE for obvious lab terms ─────────

    def test_gc_chantier_pratique(self):
        p, t = self._scores("réaliser un coffrage et betonnage sur le chantier", "gc")
        self.assertGreater(p, t, "chantier/coffrage should be PRATIQUE for GC")

    def test_gc_cours_theorique(self):
        p, t = self._scores("comprendre les principes fondamentaux de la résistance des matériaux", "gc")
        self.assertGreater(t, p, "cours/principes should be THEORIQUE for GC")

    def test_info_tp_pratique(self):
        p, t = self._scores("développer et déployer une API REST avec Docker", "info")
        self.assertGreater(p, t, "developer/deployer should be PRATIQUE for INFO")

    def test_info_algo_theorique(self):
        p, t = self._scores("introduction à la complexité algorithmique et aux automates finis", "info")
        self.assertGreater(t, p, "introduction/complexite should be THEORIQUE for INFO")

    def test_telecom_tp_pratique(self):
        p, t = self._scores("tp routeur configure un réseau avec wireshark", "telecom")
        self.assertGreater(p, t, "TP/routeur/wireshark should be PRATIQUE for TELECOM")

    def test_telecom_theorie(self):
        p, t = self._scores("cours sur la théorie de Shannon et la modulation numérique", "telecom")
        self.assertGreater(t, p, "theorie/Shannon should be THEORIQUE for TELECOM")

    def test_ge_tp_pratique(self):
        p, t = self._scores("montage circuit oscilloscope banc de test fpga arduino", "ge")
        self.assertGreater(p, t, "montage/circuit/oscilloscope should be PRATIQUE for GE")

    def test_ge_cours_theorique(self):
        p, t = self._scores("cours théorie des circuits et loi de Kirchhoff", "ge")
        self.assertGreater(t, p, "cours/loi should be THEORIQUE for GE")

    def test_meca_atelier_pratique(self):
        p, t = self._scores("atelier usinage fraisage assemblage catia solidworks", "meca")
        self.assertGreater(p, t, "atelier/usinage should be PRATIQUE for MECA")

    def test_meca_cours_theorique(self):
        p, t = self._scores("cours de thermodynamique et cinématique théorique", "meca")
        self.assertGreater(t, p, "cours thermodynamique should be THEORIQUE for MECA")

    def test_unknown_dept_falls_back_gracefully(self):
        """Unknown department should fall back to base patterns without raising."""
        p, t = self._scores("TP laboratoire pratique", "xyz_unknown")
        # Just check it returns integers without error
        self.assertIsInstance(p, int)
        self.assertIsInstance(t, int)


# ─────────────────────────────────────────────────────────────────────────────
# 2. Tests _detect_type
# ─────────────────────────────────────────────────────────────────────────────

class TestDetectType(unittest.TestCase):
    """Verify the public _detect_type(text, departement) returns correct types."""

    def test_gc_pratique(self):
        self.assertEqual(ra._detect_type("réaliser un essai géotechnique sur site", "gc"), "PRATIQUE")

    def test_gc_theorique(self):
        self.assertEqual(ra._detect_type("définir les principes du béton armé", "gc"), "THEORIQUE")

    def test_info_pratique(self):
        self.assertEqual(ra._detect_type("coder et déployer une application docker", "info"), "PRATIQUE")

    def test_info_theorique(self):
        self.assertEqual(ra._detect_type("comprendre l'algorithmique et les structures de données", "info"), "THEORIQUE")

    def test_telecom_pratique(self):
        self.assertEqual(ra._detect_type("tp wireshark configurer un routeur", "telecom"), "PRATIQUE")

    def test_ge_pratique(self):
        self.assertEqual(ra._detect_type("TP montage circuit oscilloscope arduino", "ge"), "PRATIQUE")

    def test_meca_pratique(self):
        self.assertEqual(ra._detect_type("atelier usinage fraisage sur machine outil", "meca"), "PRATIQUE")

    def test_default_dept_is_gc(self):
        """Calling _detect_type without dept should default to 'gc' without error."""
        result = ra._detect_type("chantier terrassement fondation")
        self.assertIn(result, {"PRATIQUE", "THEORIQUE"})


# ─────────────────────────────────────────────────────────────────────────────
# 3. Tests _detect_departement
# ─────────────────────────────────────────────────────────────────────────────

class TestDetectDepartement(unittest.TestCase):
    """Auto-detect department from filenames and content snippets."""

    def _detect(self, fnames: List[str], snippets: List[str]) -> str:
        contents = [s.encode("utf-8") for s in snippets]
        return ra._detect_departement(fnames, contents)

    def test_gc_from_filename(self):
        self.assertEqual(self._detect(["fiche_gc_beton.pdf"], [""]), "gc")

    def test_gc_from_content(self):
        dept = self._detect(["module.pdf"], ["géotechnique beton armé fondation ouvrage"])
        self.assertEqual(dept, "gc")

    def test_info_from_content(self):
        dept = self._detect(["module.pdf"], ["algorithmique programmation base de donnee logiciel"])
        self.assertEqual(dept, "info")

    def test_telecom_from_content(self):
        dept = self._detect(["module.pdf"], ["telecommunication signal numerique radiocommunication"])
        self.assertEqual(dept, "telecom")

    def test_ge_from_content(self):
        dept = self._detect(["module.pdf"], ["electronique automatique genie electrique"])
        self.assertEqual(dept, "ge")

    def test_meca_from_content(self):
        dept = self._detect(["module.pdf"], ["genie mecanique thermodynamique usinage fabrication"])
        self.assertEqual(dept, "meca")

    def test_unknown_defaults_to_gc(self):
        """Content with no department signals should fall back to GC."""
        dept = self._detect(["module.pdf"], ["lorem ipsum dolor sit amet consectetur"])
        self.assertEqual(dept, "gc")


# ─────────────────────────────────────────────────────────────────────────────
# 4. Tests _DepartmentReferentialManager
# ─────────────────────────────────────────────────────────────────────────────

class TestDeptRefManager(unittest.TestCase):
    """Test the _DepartmentReferentialManager OOP facade."""

    def setUp(self):
        self.mgr = ra._DepartmentReferentialManager()

    def test_list_departments(self):
        depts = self.mgr.list_departments()
        self.assertIn("gc", depts)
        self.assertIn("info", depts)
        self.assertIn("telecom", depts)
        self.assertIn("ge", depts)
        self.assertIn("meca", depts)

    def test_get_referential_gc_not_empty(self):
        ref = self.mgr.get_referential("gc")
        self.assertGreater(len(ref.get("savoirs", {})), 0, "GC referential should have savoirs")

    def test_stats_gc(self):
        stats = self.mgr.stats("gc")
        self.assertIn("savoirs", stats)
        self.assertIn("competences", stats)
        self.assertGreater(stats["savoirs"], 0)
        self.assertGreater(stats["competences"], 0)

    def test_detect_type_gc(self):
        result = self.mgr.detect_type("concevoir une fondation sur sol compressible", "gc")
        self.assertIn(result, {"PRATIQUE", "THEORIQUE"})

    def test_match_savoir_gc(self):
        codes = self.mgr.match_savoir("fondation sol dimensionner", "gc")
        self.assertIsInstance(codes, list)
        # At least one GC savoir should match
        self.assertGreater(len(codes), 0)

    def test_match_competence_gc(self):
        code = self.mgr.match_competence("sol fondation geotechnique", "gc")
        self.assertIsNotNone(code)
        self.assertTrue(code.startswith("GC-TECH-S"))

    def test_invalidate_clears_cache(self):
        """Invalidating a department clears its cache entry."""
        # Force a cache entry
        ra._REF_DB_CACHE["test_dept"] = {"savoirs": {}}
        self.mgr.invalidate("test_dept")
        self.assertNotIn("test_dept", ra._REF_DB_CACHE)

    def test_invalidate_all(self):
        ra._REF_DB_CACHE["gc"]   = {"savoirs": {"X": []}}
        ra._REF_DB_CACHE["info"] = {"savoirs": {"Y": []}}
        self.mgr.invalidate_all()
        self.assertEqual(len(ra._REF_DB_CACHE), 0)


# ─────────────────────────────────────────────────────────────────────────────
# 5. Tests keyword matching per department
# ─────────────────────────────────────────────────────────────────────────────

class TestSavoirMatchingAllDepts(unittest.TestCase):
    """Verify keyword matching against GC built-in referential (no DB needed)."""

    def test_gc_fondation_match(self):
        codes = ra._match_gc_savoir("dimensionner fondation superficielle calcul semelle", "gc")
        self.assertGreater(len(codes), 0)
        self.assertIn("S6b", codes)

    def test_gc_beton_match(self):
        codes = ra._match_gc_savoir("structure beton arme dimensionner bael eurocode", "gc")
        self.assertGreater(len(codes), 0)
        self.assertIn("C1b", codes)

    def test_gc_route_match(self):
        codes = ra._match_gc_savoir("conception infrastructure routiere trace routier chaussee", "gc")
        self.assertGreater(len(codes), 0)

    def test_gc_hydraulique_match(self):
        codes = ra._match_gc_savoir("hydrologie debit crue assainissement reseau eau", "gc")
        self.assertGreater(len(codes), 0)

    def test_gc_urbanisme_match(self):
        codes = ra._match_gc_savoir("diagnostic urbain amenagement urbain analyse urbaine", "gc")
        self.assertGreater(len(codes), 0)

    def test_empty_text_returns_list(self):
        """Empty or whitespace text should not raise and should return a list."""
        codes = ra._match_gc_savoir("   ", "gc")
        self.assertIsInstance(codes, list)

    def test_gc_niveaux_returned(self):
        niveau = ra._gc_ref_niveau(["S6b"], "gc")
        self.assertEqual(niveau, "N3_INTERMEDIAIRE")

    def test_gc_niveaux_none_for_unknown(self):
        niveau = ra._gc_ref_niveau(["ZZZ_UNKNOWN"], "gc")
        self.assertIsNone(niveau)


# ─────────────────────────────────────────────────────────────────────────────
# 6. Tests _match_gc_competence
# ─────────────────────────────────────────────────────────────────────────────

class TestCompetenceMatching(unittest.TestCase):

    def test_gc_sol_competence(self):
        code = ra._match_gc_competence("sol geotechnique fondation sismique", "gc")
        self.assertEqual(code, "GC-TECH-S")

    def test_gc_construction_competence(self):
        code = ra._match_gc_competence("beton arme pont ouvrage art", "gc")
        self.assertEqual(code, "GC-TECH-C")

    def test_gc_eau_competence(self):
        code = ra._match_gc_competence("hydraulique hydrologie assainissement reseau eau", "gc")
        self.assertEqual(code, "GC-TECH-E")

    def test_gc_urbanisme_competence(self):
        code = ra._match_gc_competence("urbanisme amenagement urbain territoire", "gc")
        self.assertEqual(code, "GC-TECH-U")

    def test_gc_no_match_returns_none(self):
        code = ra._match_gc_competence("lorem ipsum dolor sit amet", "gc")
        self.assertIsNone(code)


# ─────────────────────────────────────────────────────────────────────────────
# 7. Tests analyze_files (full pipeline, text fallback)
# ─────────────────────────────────────────────────────────────────────────────

class TestAnalyseFilesPipeline(unittest.TestCase):
    """End-to-end pipeline tests using plain text files (no PDF library needed)."""

    # Minimal GC fiche text
    GC_FICHE = b"""
Module: Geotechnique et Fondations
Unite pedagogique: Genie Civil
Responsable: Mohsen Zouari
Enseignants: Sami Mansouri

Acquis d'apprentissage :
AA1 Realiser des essais geotechniques de laboratoire 3
AA2 Dimensionner une fondation superficielle sur sol 4
AA3 Concevoir un systeme de soutenement 5

Contenu detaille:
Seance 1: Introduction - Rappels de mecanique des sols
Seance 2: Essais geotechniques laboratoire
Seance 3: Dimensionnement fondation semelle beton arme
Seance 4: Fondation profonde pieu calcul
"""

    INFO_FICHE = b"""
Module: Programmation Orientee Objet
Unite pedagogique: Informatique
Responsable: Amine Ben Mohamed

Acquis d'apprentissage :
AA1 Comprendre les concepts de la programmation orientee objet 2
AA2 Implementer des structures de donnees en Java 3
AA3 Deployer une application avec Docker 3

Contenu detaille:
Seance 1: Introduction - Algorithmique et structures de donnees
Seance 2: TP programmation Java classes et objets
Seance 3: Base de donnees SQL requetes
Seance 4: Developpement API REST Spring Boot
"""

    def _make_enseignants(self) -> List[ra.EnseignantInfo]:
        return [
            _make_ens("GC01", "Zouari",    "Mohsen",  ["Geotechnique"]),
            _make_ens("GC02", "Mansouri",  "Sami",    ["Fondations"]),
            _make_ens("INFO01","Ben",       "Amine",   ["Programmation"]),
        ]

    def _patch_extract_text(self, content: bytes):
        """Patch _extract_text to return content directly (skip PDF parsing)."""
        def fake_extract(filename, data):
            return data.decode("utf-8", errors="ignore"), []
        return fake_extract

    def test_gc_pipeline_produces_result(self):
        ens = self._make_enseignants()
        with patch.object(ra, "_extract_text", self._patch_extract_text(self.GC_FICHE)):
            result = ra.analyze_files(["fiche_gc.txt"], [self.GC_FICHE], ens, "gc")
        self.assertIsInstance(result, ra.RiceAnalysisResult)
        self.assertGreater(result.stats["totalSavoirs"], 0)
        self.assertEqual(result.stats["departement"], "gc")
        self.assertGreater(result.stats["totalDomaines"], 0)

    def test_info_pipeline_produces_result(self):
        ens = self._make_enseignants()
        with patch.object(ra, "_extract_text", self._patch_extract_text(self.INFO_FICHE)):
            result = ra.analyze_files(["fiche_info.txt"], [self.INFO_FICHE], ens, "info")
        self.assertIsInstance(result, ra.RiceAnalysisResult)
        self.assertGreater(result.stats["totalSavoirs"], 0)
        self.assertEqual(result.stats["departement"], "info")

    def test_multiple_files_deduped_domains(self):
        """Two files with the same domain code should get distinct domain codes."""
        ens = self._make_enseignants()
        with patch.object(ra, "_extract_text", self._patch_extract_text(self.GC_FICHE)):
            result = ra.analyze_files(
                ["fiche1.txt", "fiche2.txt"],
                [self.GC_FICHE, self.GC_FICHE],
                ens, "gc",
            )
        codes = [d.code for d in result.propositions]
        self.assertEqual(len(codes), len(set(codes)), "Duplicate domain codes should be deduplicated")

    def test_auto_dept_detection(self):
        """analyze_files does NOT auto-detect; that is handled in the endpoint.
        Ensure specifying 'gc' explicitly works."""
        ens = self._make_enseignants()
        with patch.object(ra, "_extract_text", self._patch_extract_text(self.GC_FICHE)):
            result = ra.analyze_files(["module.txt"], [self.GC_FICHE], ens, "gc")
        self.assertEqual(result.stats["departement"], "gc")

    def test_stats_structure(self):
        ens = self._make_enseignants()
        with patch.object(ra, "_extract_text", self._patch_extract_text(self.GC_FICHE)):
            result = ra.analyze_files(["fiche_gc.txt"], [self.GC_FICHE], ens, "gc")
        stats = result.stats
        for key in ("departement", "totalDomaines", "totalCompetences",
                    "totalSousCompetences", "totalSavoirs",
                    "enseignantsCovered", "tauxCouverture"):
            self.assertIn(key, stats, f"Stats missing key: {key}")


# ─────────────────────────────────────────────────────────────────────────────
# 8. Tests _detect_departement with realistic ESPRIT content
# ─────────────────────────────────────────────────────────────────────────────

class TestDetectDeptRealistic(unittest.TestCase):

    def _detect(self, fname: str, content: str) -> str:
        return ra._detect_departement([fname], [content.encode("utf-8")])

    def test_gc_beton_fiche(self):
        content = "beton arme fondation soutenement structure portante geotechnique ouvrage"
        self.assertEqual(self._detect("module.pdf", content), "gc")

    def test_info_laravel_fiche(self):
        content = "developpement web laravel php base de donnees programmation logiciel"
        self.assertEqual(self._detect("fiche_info_laravel.pdf", content), "info")

    def test_telecom_5g_fiche(self):
        content = "telecommunication 5g signal numerique radiocommunication protocoles"
        self.assertEqual(self._detect("fiche_telecom5g.pdf", content), "telecom")

    def test_ge_elec_fiche(self):
        content = "electronique automatique genie electrique energie electrique"
        self.assertEqual(self._detect("fiche_ge.pdf", content), "ge")

    def test_meca_fab_fiche(self):
        content = "genie mecanique fabrication usinage thermodynamique mecanique"
        self.assertEqual(self._detect("fiche_meca.pdf", content), "meca")


# ─────────────────────────────────────────────────────────────────────────────
# 9. Tests _normalize and _bloom_to_niveau utilities
# ─────────────────────────────────────────────────────────────────────────────

class TestNLPUtilities(unittest.TestCase):

    def test_normalize_strips_accents(self):
        self.assertEqual(ra._normalize("Géotechnique"), "geotechnique")
        self.assertEqual(ra._normalize("Évaluer"), "evaluer")
        self.assertEqual(ra._normalize("béton"), "beton")

    def test_bloom_level_create(self):
        level = ra._detect_bloom_level("concevoir un système de fondation")
        self.assertGreaterEqual(level, 5)  # concevoir → niveau 6

    def test_bloom_level_apply(self):
        level = ra._detect_bloom_level("appliquer la méthode de calcul")
        self.assertGreaterEqual(level, 3)

    def test_bloom_level_default_comprendre(self):
        level = ra._detect_bloom_level("lorem ipsum paragraph")
        self.assertEqual(level, 2)  # default

    def test_bloom_to_niveau_mapping(self):
        self.assertEqual(ra._bloom_to_niveau(6), "N5_EXPERT")
        self.assertEqual(ra._bloom_to_niveau(1), "N1_DEBUTANT")
        self.assertEqual(ra._bloom_to_niveau(3), "N3_INTERMEDIAIRE")


# ─────────────────────────────────────────────────────────────────────────────
# 10. Tests _match_enseignants_by_name (fuzzy matching)
# ─────────────────────────────────────────────────────────────────────────────

class TestEnseignantFuzzyMatch(unittest.TestCase):

    def _ens_list(self):
        return [
            _make_ens("GC01", "Zouari",   "Mohsen"),
            _make_ens("GC02", "Mansouri", "Sami"),
            _make_ens("INFO1", "Ben",     "Amine"),
        ]

    def test_exact_match(self):
        ids, mapping = ra._match_enseignants_by_name(["Mohsen Zouari"], self._ens_list())
        self.assertIn("GC01", ids)

    def test_reversed_name_match(self):
        ids, mapping = ra._match_enseignants_by_name(["Zouari Mohsen"], self._ens_list())
        self.assertIn("GC01", ids)

    def test_no_match_returns_empty(self):
        ids, mapping = ra._match_enseignants_by_name(["Inconnu Personne"], self._ens_list())
        self.assertEqual(ids, [])

    def test_empty_list_ok(self):
        ids, mapping = ra._match_enseignants_by_name([], self._ens_list())
        self.assertEqual(ids, [])

    def test_partial_name_match(self):
        ids, _ = ra._match_enseignants_by_name(["Sami Mansouri"], self._ens_list())
        self.assertIn("GC02", ids)


# ─────────────────────────────────────────────────────────────────────────────
# Main
# ─────────────────────────────────────────────────────────────────────────────

if __name__ == "__main__":
    unittest.main(verbosity=2)
