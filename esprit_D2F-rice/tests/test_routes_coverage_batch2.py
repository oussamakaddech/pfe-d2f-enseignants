"""Coverage-focused tests for rice.routes helper internals."""
import sys
import os
from types import SimpleNamespace
from unittest.mock import MagicMock

sys.path.insert(0, os.path.dirname(os.path.dirname(__file__)))

os.environ.setdefault("DB_NAME", "test")
os.environ.setdefault("DB_USER", "test")
os.environ.setdefault("DB_PASS", "test")
os.environ.setdefault("DB_HOST", "localhost")
os.environ.setdefault("DB_PORT", "5432")
os.environ.setdefault("RICE_AUTH_ENABLED", "false")

from rice import routes
from rice.models import RiceAnalysisResult


def _mk_savoir(tmp_id="S1", code="S1a", ens=None, refs=None):
    return SimpleNamespace(
        tmpId=tmp_id,
        code=code,
        nom="Savoir",
        description="desc",
        type="THEORIQUE",
        niveau="N2_ELEMENTAIRE",
        enseignantsSuggeres=ens if ens is not None else ["E1", "E2"],
        refCodes=refs if refs is not None else ["S1a"],
    )


def test_csv_header_and_build_export_row():
    header = routes._csv_header()
    assert header[0] == "domaine_code"
    assert header[-1] == "ref_codes"

    row = routes._build_export_row("D", "Dom", "C", "Comp", _mk_savoir(), "SC1", "Sub")
    assert row[0] == "D"
    assert row[4] == "SC1"
    assert row[10] == "E1; E2"


def test_iter_export_rows_direct_and_sous_comp():
    payload = {
        "propositions": [{
            "tmpId": "d1", "code": "D1", "nom": "Dom",
            "competences": [{
                "tmpId": "c1", "code": "C1", "nom": "Comp",
                "savoirs": [{
                    "tmpId": "s1", "code": "S1", "nom": "Sav", "type": "THEORIQUE", "niveau": "N2_ELEMENTAIRE",
                    "enseignantsSuggeres": ["E1"], "refCodes": ["S1"],
                }],
                "sousCompetences": [{
                    "tmpId": "sc1", "code": "SC1", "nom": "Sub",
                    "savoirs": [{
                        "tmpId": "s2", "code": "S2", "nom": "Sav2", "type": "PRATIQUE", "niveau": "N3_INTERMEDIAIRE",
                        "enseignantsSuggeres": [], "refCodes": [],
                    }],
                }],
            }],
        }],
        "stats": {"totalDomaines": 1, "totalCompetences": 1, "totalSavoirs": 2},
        "extractedEnseignants": [],
        "foundEnseignants": [],
    }
    result = RiceAnalysisResult(**payload)
    rows = list(routes._iter_export_rows(result))
    assert len(rows) == 2
    assert rows[0][6] == "S1"
    assert rows[1][4] == "SC1"


def test_upsert_savoir_insert_and_update_paths():
    cur = MagicMock()
    conn = MagicMock()
    errors = []
    savoir = _mk_savoir(tmp_id="tmp-1", code="S1")

    cur.fetchone.return_value = (True,)
    ins, upd, lnk = routes._upsert_savoir(cur, savoir, "C1", overwrite=False, errors=errors, conn=conn)
    assert (ins, upd, lnk) == (1, 0, 2)

    cur.fetchone.return_value = (False,)
    savoir2 = _mk_savoir(tmp_id="tmp-2", code="S2", ens=[])
    ins2, upd2, lnk2 = routes._upsert_savoir(cur, savoir2, "C1", overwrite=False, errors=errors, conn=conn)
    assert (ins2, upd2, lnk2) == (0, 1, 0)


def test_upsert_savoir_error_and_link_error_paths():
    conn = MagicMock()
    errors = []
    savoir = _mk_savoir(tmp_id="tmp-err", code="SERR")

    cur_fail_insert = MagicMock()
    cur_fail_insert.execute.side_effect = Exception("insert_fail")
    out = routes._upsert_savoir(cur_fail_insert, savoir, "C1", overwrite=False, errors=errors, conn=conn)
    assert out == (0, 0, 0)
    assert any("savoir SERR" in e for e in errors)

    errors.clear()
    calls = {"n": 0}

    def _exec(sql, params=None):
        calls["n"] += 1
        if "INSERT INTO enseignant_competences" in sql and calls["n"] >= 2:
            raise Exception("link_fail")

    cur_link = MagicMock()
    cur_link.execute.side_effect = _exec
    cur_link.fetchone.return_value = (True,)
    ins, upd, lnk = routes._upsert_savoir(cur_link, savoir, "C1", overwrite=True, errors=errors, conn=conn)
    assert ins == 1 and upd == 0
    assert lnk >= 0
    assert any("link" in e for e in errors)


def test_upsert_savoir_sous_comp_and_sous_comp_aggregate():
    conn = MagicMock()
    errors = []

    cur = MagicMock()
    cur.fetchone.return_value = (True,)
    savoir = _mk_savoir(tmp_id="tmp-sc", code="SC-S1", ens=["E1"])
    ins, upd, lnk = routes._upsert_savoir_sous_competence(cur, savoir, "SC1", overwrite=False, errors=errors, conn=conn)
    assert (ins, upd, lnk) == (1, 0, 1)

    sc = SimpleNamespace(code="SC1", nom="Sub", description="d", savoirs=[savoir, savoir])
    cur2 = MagicMock()
    out = routes._upsert_sous_competence(cur2, sc, "C1", overwrite=False, errors=errors, conn=conn)
    # structure: (upserted_sc, ins_sum, upd_sum, lnk_sum)
    assert out[0] in (0, 1)


def test_upsert_sous_competence_failure():
    conn = MagicMock()
    errors = []
    sc = SimpleNamespace(code="SCX", nom="Sub", description="d", savoirs=[])
    cur = MagicMock()
    cur.execute.side_effect = Exception("sc_fail")
    out = routes._upsert_sous_competence(cur, sc, "C1", overwrite=False, errors=errors, conn=conn)
    assert out == (0, 0, 0, 0)
    assert any("sous_competence SCX" in e for e in errors)
