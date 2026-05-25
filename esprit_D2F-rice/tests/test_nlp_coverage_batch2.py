"""Coverage-focused tests for rice.nlp helper branches."""
import sys
import os

sys.path.insert(0, os.path.dirname(os.path.dirname(__file__)))

os.environ.setdefault("DB_NAME", "test")
os.environ.setdefault("DB_USER", "test")
os.environ.setdefault("DB_PASS", "test")
os.environ.setdefault("DB_HOST", "localhost")
os.environ.setdefault("DB_PORT", "5432")

from rice import nlp


def test_extract_llm_text_and_names_and_roles():
    assert nlp._extract_llm_text("  abc ", min_len=2) == "abc"
    assert nlp._extract_llm_text("ab", min_len=3) is None
    assert nlp._extract_llm_text("abc", uppercase=True) == "ABC"
    assert nlp._extract_llm_text(123) is None

    names = nlp._extract_llm_names(["Ahmed Ben Ali", None, "Module"])
    assert any("Ahmed" in n for n in names)

    roles = nlp._extract_llm_roles({"Ahmed Ben Ali": "enseignant", "X": "invalid"})
    assert roles.get("Ahmed Ben Ali") == "enseignant"
    assert "X" not in roles


def test_sanitize_llm_metadata_happy_path():
    payload = {
        "code_module": " mt-34 ",
        "nom_module": "Resistance des materiaux",
        "unite_pedagogique": "Genie civil",
        "responsable": "Dr. Ahmed Ben Ali",
        "enseignants_noms": ["Ahmed Ben Ali", "Sarah Martin"],
        "enseignants_roles": {"Ahmed Ben Ali": "responsable", "Sarah Martin": "enseignant"},
        "prerequis": "Mecanique",
        "objectif": "Concevoir une structure",
    }
    out = nlp._sanitize_llm_metadata(payload)
    assert out["code_module"] == "MT-34"
    assert out["nom_module"].startswith("Resistance")
    assert out["responsable"] == "Ahmed Ben Ali"
    assert "enseignants_noms" in out and len(out["enseignants_noms"]) >= 1


def test_llm_extract_metadata_invalid_json(monkeypatch):
    monkeypatch.setattr(nlp, "_llm_chat", lambda *a, **k: "{bad json")
    out = nlp._llm_extract_metadata("Fiche test")
    assert out == {}


def test_scan_tables_for_meta_and_cell_helpers():
    meta = {}
    tables = [
        [
            ["Responsable", "Ahmed Ben Ali"],
            ["Code", "MT-34"],
            ["Prerequis", "Maths"],
        ]
    ]
    nlp._scan_tables_for_meta(tables, meta)
    # at least one of these should be extracted through handlers
    assert meta.get("responsable") or meta.get("code_module") or meta.get("prerequis")


def test_collect_segment_trailing_and_previous_updates():
    parsed = [
        {"type": "marker", "aa": 1, "rest": "texte 2"},
        {"type": "text", "content": "3 et 4"},
        {"type": "text", "content": "suite"},
    ]
    trailing_none = nlp._collect_segment_trailing(parsed, 0, False)
    assert trailing_none == ([], None)

    trailing = nlp._collect_segment_trailing(parsed, 0, True)
    assert isinstance(trailing[0], list)

    segments = [{"bloom": 0, "post": []}]
    nlp._apply_previous_segment_updates(segments, 4, ["x"])
    assert segments[0]["bloom"] == 4
    assert segments[0]["post"] == ["x"]


def test_collect_segment_context():
    parsed = [
        {"type": "text", "content": "intro"},
        {"type": "marker", "aa": 2, "rest": "AA text 3"},
        {"type": "text", "content": "5"},
    ]
    marker_indices = [1]
    aa_num, bloom, rest, text_between, bloom_standalone, marker_index = nlp._collect_segment_context(parsed, marker_indices, 0)
    assert aa_num == 2
    assert marker_index == 1
    assert isinstance(text_between, list)
