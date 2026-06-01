"""Extra unit tests for rice.referential helper functions."""
import sys
import os

sys.path.insert(0, os.path.dirname(os.path.dirname(__file__)))

os.environ.setdefault("DB_NAME", "test")
os.environ.setdefault("DB_USER", "test")
os.environ.setdefault("DB_PASS", "test")
os.environ.setdefault("DB_HOST", "localhost")
os.environ.setdefault("DB_PORT", "5432")

from rice import referential as ref


def test_contains_any_true_and_false():
    assert ref._contains_any("ABC-INFO-2026", ["-INFO-", "-GC-"]) is True
    assert ref._contains_any("ABC-INFO-2026", ["-GC-", "-MECA-"]) is False


def test_detect_by_filename_all_departments():
    assert ref._detect_by_filename("FICHE-GC-TEST.PDF") == "gc"
    assert ref._detect_by_filename("MODULE_INFO_DEVOPS.DOCX") == "info"
    assert ref._detect_by_filename("TRONC_GE_ELECTR.PDF") == "ge"
    assert ref._detect_by_filename("MECA_PROJET_MECANIQUE.PDF") == "meca"
    assert ref._detect_by_filename("UE_TELECOMMUN_01.PDF") == "telecom"
    assert ref._detect_by_filename("RANDOM_FILE.PDF") is None


def test_detect_by_up_code_variants():
    assert ref._detect_by_up_code("Unite pedagogique: UP-GL") == "info"
    assert ref._detect_by_up_code("UP: UP_GC") == "gc"
    assert ref._detect_by_up_code("no up code") is None


def test_detect_by_ue_code_and_module_code():
    assert ref._detect_by_ue_code("UE: INF101") == "info"
    assert ref._detect_by_ue_code("UE : GCI205") == "gc"
    assert ref._detect_by_ue_code("UE : GEE300") == "ge"
    assert ref._detect_by_ue_code("UE : XX999") is None

    assert ref._detect_by_module_code("Code module: INF-101") == "info"
    assert ref._detect_by_module_code("module: GC-01") == "gc"
    assert ref._detect_by_module_code("code ue: AUT120") == "ge"
    assert ref._detect_by_module_code("module: ROB22") == "meca"
    assert ref._detect_by_module_code("code module: TEL12") == "telecom"
    assert ref._detect_by_module_code("unknown") is None


def test_detect_by_keywords_bias_info_mt():
    text = "mt-34 web sparql rdf"
    assert ref._detect_by_keywords(text) == "info"


def test_build_combined_text_ignores_decode_errors():
    combined = ref._build_combined_text(["a.pdf"], [b"Hello", b"\xff\xfe\xfa"])
    assert "a.pdf" in combined
    assert "hello" in combined


def test_detect_departement_priority_chain():
    # filename wins first
    d1 = ref._detect_departement(["fiche_GC_module.pdf"], [b"UP: UPIL"])
    assert d1 == "gc"

    # then UP code when filename has no signal
    d2 = ref._detect_departement(["fiche_unknown.pdf"], ["UP: UPIL".encode("utf-8")])
    assert d2 == "info"

    # then module code fallback
    d3 = ref._detect_departement(["fiche_unknown.pdf"], ["Code module: TEL-12".encode("utf-8")])
    assert d3 == "telecom"
