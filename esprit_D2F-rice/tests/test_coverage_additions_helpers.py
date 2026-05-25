from __future__ import annotations

import os
import sys
from types import SimpleNamespace
import csv
import io
from unittest.mock import AsyncMock, MagicMock

import pytest

sys.path.insert(0, os.path.dirname(os.path.dirname(__file__)))

os.environ.setdefault("DB_NAME", "test")
os.environ.setdefault("DB_USER", "test")
os.environ.setdefault("DB_PASS", "test")
os.environ.setdefault("DB_HOST", "localhost")
os.environ.setdefault("DB_PORT", "5432")
os.environ.setdefault("RICE_AUTH_ENABLED", "false")

from rice import nlp, routes, validate_helpers as vh


def _mk_upload(filename: str, content: bytes):
    file_obj = AsyncMock()
    file_obj.filename = filename
    file_obj.read = AsyncMock(return_value=content)
    return file_obj


def _mk_savoir(tmp_id="s1", code="S1", ens=None):
    return SimpleNamespace(
        tmpId=tmp_id,
        code=code,
        nom="Savoir",
        description="desc",
        type="THEORIQUE",
        niveau="N2",
        enseignantsSuggeres=ens if ens is not None else ["E1"],
        refCodes=["R1"],
    )


def _mk_validate_tree():
    savoir = _mk_savoir()
    sous_comp = SimpleNamespace(code="SC1", nom="Sub", description="d", savoirs=[savoir])
    competence = SimpleNamespace(code="C1", nom="Comp", description="d", ordre=1, savoirs=[savoir], sousCompetences=[sous_comp])
    domaine = SimpleNamespace(code="D1", nom="Dom", description="d", competences=[competence])
    return domaine, competence, sous_comp, savoir


def test_extract_aa_block_trims_at_section_boundary():
    text = "Intro\nAcquis d'apprentissage\nAA 1 foo\nPlan du cours\nrest"
    block = nlp._extract_aa_block(text)
    assert block == "AA 1 foo\n"


@pytest.mark.asyncio
async def test_prepare_analyze_inputs_success_and_auto_detection(monkeypatch):
    monkeypatch.setattr("rice.upload_security.sanitize_filename", lambda name, i: f"{i}-{name}")
    monkeypatch.setattr("rice.upload_security.validate_uploads_batch", lambda filenames, contents: None)
    monkeypatch.setattr(routes, "_detect_departement", lambda filenames, contents: "info")

    files = [_mk_upload("a.pdf", b"alpha"), _mk_upload("b.pdf", b"beta")]
    filenames, contents, ens_list, departement = await routes._prepare_analyze_inputs(files, "[]", "auto")

    assert filenames == ["0-a.pdf", "1-b.pdf"]
    assert contents == [b"alpha", b"beta"]
    assert ens_list == []
    assert departement == "info"


@pytest.mark.asyncio
async def test_prepare_analyze_inputs_error_paths(monkeypatch):
    with pytest.raises(routes.HTTPException):
        await routes._prepare_analyze_inputs([], "[]", "gc")

    files = [_mk_upload("a.pdf", b"alpha")]
    with pytest.raises(routes.HTTPException):
        await routes._prepare_analyze_inputs(files, "not-json", "gc")

    monkeypatch.setattr("rice.upload_security.sanitize_filename", lambda name, i: name)
    monkeypatch.setattr("rice.upload_security.validate_uploads_batch", lambda filenames, contents: "bad upload")
    with pytest.raises(routes.HTTPException):
        await routes._prepare_analyze_inputs(files, "[]", "gc")


@pytest.mark.asyncio
async def test_routes_export_and_referential_helpers(monkeypatch):
    sav = _mk_savoir(ens=["E1", "E2"])
    sc = SimpleNamespace(code="SC1", nom="Sub", savoirs=[sav])
    comp = SimpleNamespace(code="C1", nom="Comp", savoirs=[sav], sousCompetences=[sc])
    dom = SimpleNamespace(code="D1", nom="Dom", competences=[comp])
    result = SimpleNamespace(propositions=[dom])

    assert routes._csv_header()[0] == "domaine_code"
    row = routes._build_export_row("D", "Dom", "C", "Comp", sav, "SC", "Sub")
    assert row[0] == "D"
    assert row[10] == "E1; E2"

    rows = list(routes._iter_export_rows(result))
    assert len(rows) == 2
    assert rows[0][6] == "S1"
    assert rows[1][4] == "SC1"

    monkeypatch.setattr(routes, "_get_effective_referential", lambda departement: {"ref": departement})
    monkeypatch.setattr(routes, "_fetch_enseignant_affectations", lambda: {"E1": ["C1"]})
    referential = routes.get_referential("gc")
    assert referential["departement"] == "gc"
    assert referential["ref"] == "gc"

    monkeypatch.setattr(routes._AFFECTATIONS_CACHE, "clear", MagicMock())
    monkeypatch.setattr(routes._REF_DB_CACHE, "clear", MagicMock())
    monkeypatch.setattr(routes, "_fetch_enseignant_affectations", lambda: {"E1": ["C1"]})
    cache_result = routes.refresh_cache()
    assert cache_result["status"] == "ok"

    monkeypatch.setattr(routes, "_match_gc_savoir", lambda text, departement="gc": ["S1", "S2"])
    monkeypatch.setattr(routes, "_match_gc_competence", lambda text, departement="gc": "C1")
    monkeypatch.setattr(routes, "_suggest_gc_enseignants", lambda codes: ["E1"])
    match_result = await routes.match_text("hello", "gc")
    assert match_result["matched_savoirs"] == ["S1", "S2"]
    assert match_result["matched_competence"] == "C1"


@pytest.mark.asyncio
async def test_rice_analyze_and_write_competence_rows(monkeypatch):
    files = [_mk_upload("cours.pdf", b"%PDF-1.4")]
    payload = {
        "propositions": [{"tmpId": "d1", "code": "D1", "nom": "Dom", "competences": []}],
        "stats": {"totalDomaines": 1, "totalCompetences": 0, "totalSavoirs": 0},
        "extractedEnseignants": [],
        "foundEnseignants": [],
    }

    async def fake_prepare(files_arg, enseignants, departement):
        return [f.filename for f in files_arg], [b"%PDF-1.4"], [], departement

    async def fake_run_in_threadpool(func, *args, **kwargs):
        return func(*args, **kwargs)

    monkeypatch.setattr(routes, "_prepare_analyze_inputs", fake_prepare)
    monkeypatch.setattr(routes, "run_in_threadpool", fake_run_in_threadpool)
    monkeypatch.setattr(routes, "analyze_files", lambda *args: routes.RiceAnalysisResult(**payload))

    result = await routes.rice_analyze(files=files, enseignants="[]", departement="gc")
    assert result.propositions[0].code == "D1"

    savoir = _mk_savoir(ens=["E1"])
    savoir.refCodes = ["R1"]
    comp = SimpleNamespace(code="C1", nom="Comp", savoirs=[savoir], sousCompetences=[])
    buf = io.StringIO()
    writer = csv.writer(buf)

    routes._write_competence_csv_rows(writer, "D1", "Dom", comp)

    rows = list(csv.reader(io.StringIO(buf.getvalue())))
    assert len(rows) == 1
    assert rows[0][0] == "D1"
    assert rows[0][6] == "S1"

    sub_savoir = _mk_savoir(tmp_id="s2", code="S2")
    sub_savoir.refCodes = ["R2"]
    comp_with_sub = SimpleNamespace(
        code="C2",
        nom="Comp2",
        savoirs=[],
        sousCompetences=[SimpleNamespace(code="SC1", nom="Sub", savoirs=[sub_savoir])],
    )
    buf2 = io.StringIO()
    writer2 = csv.writer(buf2)
    routes._write_competence_csv_rows(writer2, "D2", "Dom2", comp_with_sub)
    rows2 = list(csv.reader(io.StringIO(buf2.getvalue())))
    assert len(rows2) == 1
    assert rows2[0][4] == "SC1"
    assert rows2[0][6] == "S2"


def test_routes_validate_connection_and_transaction(monkeypatch):
    conn = MagicMock()
    cur = MagicMock()
    conn.cursor.return_value = cur

    db_mod = pytest.importorskip("rice.db")
    monkeypatch.setattr(db_mod, "_get_db_connection", lambda: conn)
    monkeypatch.setattr(db_mod, "_put_db_connection", lambda c: None)

    opened_conn, opened_cur = routes._open_validate_connection()
    assert opened_conn is conn
    assert opened_cur is cur

    routes._close_validate_connection(conn, cur)
    cur.close.assert_called_once()

    monkeypatch.setattr(routes, "_process_validate_propositions", lambda cur, request, errors, conn: {"upserted_domaines": 1})
    request = SimpleNamespace(propositions=[1], overwrite=False)
    counts = routes._run_validate_transaction(request, [], conn, cur)
    assert counts["upserted_domaines"] == 1


def test_routes_close_validate_connection_exception(monkeypatch):
    conn = MagicMock()
    cur = MagicMock()
    cur.close.side_effect = Exception("close failed")

    db_mod = pytest.importorskip("rice.db")
    put_calls = {"count": 0}

    def fake_put(_conn):
        put_calls["count"] += 1

    monkeypatch.setattr(db_mod, "_put_db_connection", fake_put)

    routes._close_validate_connection(conn, cur)
    assert put_calls["count"] == 0


def test_routes_validate_helper_continue_branch(monkeypatch):
    counts = routes._empty_validate_counts()
    errors = []
    domaine = SimpleNamespace(
        code="D1",
        nom="Dom",
        description="d",
        competences=[
            SimpleNamespace(code="C1", nom="Comp1", description="d", savoirs=[], sousCompetences=[]),
            SimpleNamespace(code="C2", nom="Comp2", description="d", savoirs=[], sousCompetences=[]),
        ],
    )

    monkeypatch.setattr(routes, "_upsert_domaine", lambda cur, dom, errors, conn: True)
    monkeypatch.setattr(routes, "_upsert_competence", lambda cur, comp, domaine_code, errors, conn: comp.code != "C1")
    monkeypatch.setattr(routes, "_process_competence_savoirs", lambda *args, **kwargs: None)
    monkeypatch.setattr(routes, "_process_competence_subcompetences", lambda *args, **kwargs: None)

    routes._process_validate_domaine(MagicMock(), domaine, False, counts, errors, MagicMock())
    assert counts["upserted_domaines"] == 1
    assert counts["upserted_competences"] == 1


@pytest.mark.asyncio
async def test_rice_validate_happy_and_error_paths(monkeypatch):
    request = routes.ValidateRequest(
        propositions=[{
            "tmpId": "d1",
            "code": "D1",
            "nom": "Dom",
            "description": "d",
            "competences": [],
        }],
        overwrite=False,
    )

    with pytest.raises(routes.HTTPException) as exc_info:
        await routes.rice_validate(routes.ValidateRequest(propositions=[], overwrite=False))
    assert exc_info.value.status_code == 400

    monkeypatch.setattr(routes, "_open_validate_connection", lambda: (_ for _ in ()).throw(Exception("db down")))
    with pytest.raises(routes.HTTPException) as exc_info:
        await routes.rice_validate(request)
    assert exc_info.value.status_code == 503

    conn = MagicMock()
    cur = MagicMock()
    monkeypatch.setattr(routes, "_open_validate_connection", lambda: (conn, cur))
    monkeypatch.setattr(routes, "_run_validate_transaction", lambda request, errors, conn, cur: {"upserted_domaines": 1, "upserted_competences": 0, "upserted_sous_competences": 0, "inserted_savoirs": 0, "updated_savoirs": 0, "inserted_links": 0})
    monkeypatch.setattr(routes, "_close_validate_connection", lambda conn, cur: None)

    summary = await routes.rice_validate(request)
    assert summary.status == "ok"
    assert summary.upserted_domaines == 1

    rollback_conn = MagicMock()
    rollback_cur = MagicMock()
    monkeypatch.setattr(routes, "_open_validate_connection", lambda: (rollback_conn, rollback_cur))
    monkeypatch.setattr(routes, "_run_validate_transaction", lambda request, errors, conn, cur: (_ for _ in ()).throw(Exception("tx fail")))
    monkeypatch.setattr(routes, "_close_validate_connection", lambda conn, cur: None)

    with pytest.raises(routes.HTTPException) as exc_info:
        await routes.rice_validate(request)
    assert exc_info.value.status_code == 500
    rollback_conn.rollback.assert_called_once()


def test_validate_helpers_branches_and_summary():
    cur = MagicMock()
    conn = MagicMock()
    errors = []

    domaine, competence, sous_comp, savoir = _mk_validate_tree()

    assert vh._upsert_domaine(cur, domaine, errors, conn) is True
    cur.execute.side_effect = Exception("dom fail")
    assert vh._upsert_domaine(cur, domaine, errors, conn) is False

    cur.reset_mock()
    cur.execute.side_effect = None
    assert vh._upsert_competence(cur, competence, domaine.code, errors, conn) is True
    cur.execute.side_effect = Exception("comp fail")
    assert vh._upsert_competence(cur, competence, domaine.code, errors, conn) is False

    cur.reset_mock()
    cur.execute.side_effect = None
    assert vh._upsert_sous_competence(cur, sous_comp, competence.code, errors, conn) is True

    cur.reset_mock()
    cur.fetchone.return_value = (True,)
    assert vh._insert_savoir_links(cur, savoir, savoir.tmpId, errors, conn) == len(savoir.enseignantsSuggeres)

    cur.reset_mock()
    cur.fetchone.return_value = (True,)
    inserted = vh._upsert_savoir_row(cur, savoir, competence.code, False, errors, conn)
    assert inserted[0] == 1

    counts = {
        "upserted_domaines": 1,
        "upserted_competences": 2,
        "upserted_sous_competences": 3,
        "inserted_savoirs": 4,
        "updated_savoirs": 5,
        "inserted_links": 6,
    }
    summary = vh._build_validate_summary(counts, errors, routes.logger)
    assert summary.status == "ok"
    assert summary.upserted_competences == 2
