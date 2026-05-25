import os
import uuid

from types import SimpleNamespace

import pytest

from rice import analyzer
from rice.models import EnseignantInfo


def test_is_bad_domain_candidate_and_resolve_domain():
    assert analyzer._is_bad_domain_candidate(None) is True
    assert analyzer._is_bad_domain_candidate("Ab") is True
    meta = {}
    dn, mn, mc, dc = analyzer._resolve_domain(meta, "fiche_module_test.pdf")
    assert isinstance(dn, str) and dn
    assert isinstance(mc, str)


def test_build_savoir_and_competence_from_aa():
    aa = {"id": 1, "text": "Appliquer une méthode de test", "bloom_level": 3}
    comp_code = "MOD-C1"
    domain_code = "MOD"
    matched_by_name = []
    matched_by_module = []
    all_matched = []
    extracted_ids = []
    s = analyzer._build_savoir_from_aa(aa, comp_code, domain_code, "gc", matched_by_name, matched_by_module, all_matched, extracted_ids, 0)
    assert s.code.startswith(comp_code)
    assert s.niveau is not None

    compet = analyzer._build_competence_from_acquis([aa], [], "Some text", "MOD", "Module Name", "MOD", 0, "gc", [], [], [], [], {})
    assert compet.code.startswith("MOD-C1")
    assert isinstance(compet.savoirs, list)


def test_fallback_extraction_and_analyze_files(monkeypatch, tmp_path):
    # ensure analyzer doesn't call DB for enseignants info
    monkeypatch.setattr(analyzer, "_fetch_all_enseignants_info", lambda: {})

    text = "- Appliquer une méthode\n- Concevoir un prototype\n"
    comps = analyzer._fallback_extraction(text, "MOD", "Module Name", ["E1"], departement="gc")
    assert isinstance(comps, list) and comps

    # analyze_files end-to-end with a simple input
    fnames = ["fiche1.txt"]
    contents = [b"Acquis d'apprentissage\nAA1 Realiser un test 3\n"]
    res = analyzer.analyze_files(fnames, contents, enseignants=[], departement="gc")
    assert res.propositions and isinstance(res.propositions[0].code, str)
