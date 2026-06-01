import logging
from types import SimpleNamespace

import pytest

from rice import nlp, llm, db, validate_helpers
from rice.models import ValidateSummary


def test_normalize_and_slug_and_secure():
    assert nlp._normalize("Électricité Génie") == "electricite genie"
    # slug uses uppercase short tokens, fallback 'ITEM' when no words
    assert nlp._slug("") == "ITEM"
    s = nlp._secure_filename("..\\..\\secret\x00file.docx")
    # secure filename should remove directory traversal and control chars
    assert "\x00" not in s
    assert ".." not in s and "/" not in s and "\\\\" not in s
    assert s


def test_codes_match_and_normalize_ref():
    assert nlp._codes_match('GC-01-S2a', 'S2a') is True
    assert nlp._codes_match('S2a', 'GC-01-S2a') is True
    assert nlp._codes_match('S3b', 'S2a') is False


def test_classify_serialize_tables_and_get_cell_value():
    table = [["Header1", "Header2"], ["a", "b"], ["c", ""]]
    header, data_rows, has_header = nlp._classify_table(table)
    assert has_header is True
    lines = []
    nlp._serialize_table_header(header, data_rows, lines)
    assert any("Header1:" in l for l in lines)

    kv_table = [["key", "value"], ["only", ""], []]
    lines2 = []
    nlp._serialize_table_kv(kv_table, lines2)
    assert any(":" in l or " | " in l for l in lines2)

    cells = ["a", "b"]
    table2 = [["a", "b"], ["x", "y"]]
    assert nlp._get_cell_value(cells, table2, 0, 0) in {"b", "y"}


def test_extract_subcompetences_and_find_meta_key():
    txt = "SC1 - Analyse des exigences\nSous-compétence : Conception du test\n"
    titles = nlp._extract_subcompetences(txt)
    assert any("Analyse" in t for _, t in titles)
    assert nlp._find_meta_key_for_cell("Responsable") == "responsable"


def test_clean_and_split_names_and_valid_enseignant():
    assert nlp._clean_name("Pr. John Doe (cours)") == "John Doe"
    names = nlp._split_names("Doe, John; Smith Alan et Martin Paul")
    assert isinstance(names, list)
    assert all(isinstance(n, str) for n in names)
    assert nlp._is_valid_enseignant_value("Abidi Mounir") is True
    assert nlp._is_valid_enseignant_value("") is False


def test_llm_stubs():
    assert llm._escape_prompt("hello") == "hello"
    with pytest.raises(RuntimeError):
        llm._llm_chat([{"role": "user", "content": "x"}])


def test_validate_helpers_insert_and_upsert_row_error_and_summary():
    class FakeCur:
        def __init__(self, fail=False):
            self.calls = []
            self._fail = fail

        def execute(self, *args, **kwargs):
            if self._fail:
                raise Exception("db error")
            self.calls.append((args, kwargs))

        def fetchone(self):
            return (True,)

        def close(self):
            pass

    class FakeConn:
        def rollback(self):
            self.rolled = True

        def commit(self):
            self.committed = True

    # test insert links counting
    savoir = SimpleNamespace(enseignantsSuggeres=["E1", "E2"], niveau="N2", code="S1")
    cur = FakeCur()
    errors = []
    lnk = validate_helpers._insert_savoir_links(cur, savoir, "sav1", errors, FakeConn())
    assert lnk == 2

    # test upsert row error path
    cur_fail = FakeCur(fail=True)
    conn = FakeConn()
    errors2 = []
    sav = SimpleNamespace(tmpId="tmp1", code="C1", nom="n", description=None, type="T", niveau="N1")
    res = validate_helpers._upsert_savoir_row(cur_fail, sav, "parent", False, errors2, conn)
    assert res == (0, 0, 0)
    assert errors2 and isinstance(errors2[0], str)

    # test summary builder
    counts = {"upserted_domaines": 1, "upserted_competences": 2, "upserted_sous_competences": 3,
              "inserted_savoirs": 4, "updated_savoirs": 5, "inserted_links": 6}
    errs = ["err1", "err2"]
    summary = validate_helpers._build_validate_summary(counts, errs, logging.getLogger())
    assert isinstance(summary, ValidateSummary)
    assert summary.inserted_savoirs == 4


def test_db_dept_to_numeric():
    assert db._dept_to_numeric_id("gc") == 1
    assert db._dept_to_numeric_id("info") == 2
    assert db._dept_to_numeric_id("unknown") == 1
