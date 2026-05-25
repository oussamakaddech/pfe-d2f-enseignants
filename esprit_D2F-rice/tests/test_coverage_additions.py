import re
from rice import nlp, referential


def test_extract_responsable_and_enseignants():
    text = "Jean Dupont\nResponsable Module"
    assert nlp._extract_regex_responsable(text) == "Jean Dupont"

    text2 = "Enseignants: Alice Martin; Bob Dupont"
    names = nlp._extract_regex_enseignants(text2)
    assert any("Alice" in n for n in names) and any("Bob" in n for n in names)


def test_extract_prerequis_and_objectif_and_code():
    prereq = "Prérequis: avoir fait X"
    assert nlp._extract_regex_prerequis(prereq) == "avoir fait X"

    obj = "Objectifs: Apprendre à coder"
    assert nlp._extract_regex_objectif(obj) == "Apprendre à coder"

    code_line = "Code: INF101"
    assert nlp._extract_regex_code_module(code_line) == "INF101"

    # table style code followed by hours
    table_text = "INF101 10h"
    assert nlp._extract_regex_code_module(table_text) == "INF101"


def test_detect_by_module_code_various():
    assert referential._detect_by_module_code("Code: INF101") == "info"
    assert referential._detect_by_module_code("module: GC204") == "gc"
    assert referential._detect_by_module_code("Some random text") is None
