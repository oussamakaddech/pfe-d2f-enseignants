"""Coverage boost part 2: enseignants, routes, llm tests."""

from __future__ import annotations

import os
import sys
from unittest.mock import MagicMock, patch

import pytest

sys.path.insert(0, os.path.dirname(os.path.dirname(__file__)))

os.environ.setdefault("DB_NAME", "test")
os.environ.setdefault("DB_USER", "test")
os.environ.setdefault("DB_PASS", "test")
os.environ.setdefault("DB_HOST", "localhost")
os.environ.setdefault("DB_PORT", "5432")
os.environ.setdefault("RICE_AUTH_ENABLED", "false")
os.environ.setdefault("APP_ENV", "development")

import rice.enseignants as ens_mod
import rice.llm as llm
import rice.models as models


# ======================================================================
# rice/enseignants.py  (76.6%)
# ======================================================================


class TestEnseignantsSubstringMatch:
    def test_substring_match_name_direct(self):
        lookup = [("E001", "Ahmed Benali", "ahmed benali")]
        result = ens_mod._substring_match_name("ahmed benali", lookup)
        assert result == ("E001", "Ahmed Benali")

    def test_substring_match_name_reversed(self):
        lookup = [("E001", "Ahmed Benali", "ahmed benali")]
        result = ens_mod._substring_match_name("benali ahmed", lookup)
        assert result == ("E001", "Ahmed Benali")

    def test_substring_match_name_last_name(self):
        lookup = [("E001", "Ahmed Benali", "ahmed benali")]
        result = ens_mod._substring_match_name("prof benali teaches", lookup)
        assert result == ("E001", "Ahmed Benali")

    def test_substring_match_name_short_last_name(self):
        lookup = [("E001", "Li Wu", "li wu")]
        result = ens_mod._substring_match_name("some wu text", lookup)
        assert result is None

    def test_substring_match_no_match(self):
        lookup = [("E001", "Ahmed Benali", "ahmed benali")]
        result = ens_mod._substring_match_name("completely different", lookup)
        assert result is None


class TestNormalizeMatchName:
    def test_strips_intervenant(self):
        result = ens_mod._normalize_match_name("Benali, intervenant")
        assert result == "Benali"

    def test_strips_enseignante(self):
        result = ens_mod._normalize_match_name("Benali, enseignante")
        assert result == "Benali"

    def test_strips_responsable(self):
        result = ens_mod._normalize_match_name("Benali, responsable")
        assert result == "Benali"

    def test_no_label(self):
        result = ens_mod._normalize_match_name("Benali Ahmed")
        assert result == "Benali Ahmed"


class TestMatchEnseignantsByName:
    def test_empty_enseignants(self):
        ids, mapping = ens_mod._match_enseignants_by_name(["Benali"], [])
        assert ids == []
        assert mapping == {}

    def test_no_fuzzy_substring_match(self, monkeypatch):
        monkeypatch.setattr(ens_mod, "_FUZZY_OK", False)
        teachers = [models.EnseignantInfo(id="E001", nom="Benali", prenom="Ahmed")]
        ids, mapping = ens_mod._match_enseignants_by_name(["Benali Ahmed"], teachers)
        assert "E001" in ids

    def test_no_match_at_all(self, monkeypatch):
        monkeypatch.setattr(ens_mod, "_FUZZY_OK", False)
        teachers = [models.EnseignantInfo(id="E001", nom="Benali", prenom="Ahmed")]
        ids, mapping = ens_mod._match_enseignants_by_name(["Unknown Person"], teachers)
        assert ids == []


class TestMatchEnseignantsByModule:
    def test_match_by_module(self):
        teachers = [models.EnseignantInfo(id="E001", nom="Test", prenom="User", modules=["Beton Arme"])]
        result = ens_mod._match_enseignants_by_module("cours de beton arme avance", teachers)
        assert "E001" in result

    def test_no_match(self):
        teachers = [models.EnseignantInfo(id="E001", nom="Test", prenom="User", modules=["Hydraulique"])]
        result = ens_mod._match_enseignants_by_module("cours de beton arme", teachers)
        assert result == []

    def test_short_module_ignored(self):
        teachers = [models.EnseignantInfo(id="E001", nom="Test", prenom="User", modules=["ABC"])]
        result = ens_mod._match_enseignants_by_module("cours ABC avance", teachers)
        assert result == []


# ======================================================================
# rice/routes.py  (82.7%)
# ======================================================================


class TestRoutesHelpers:
    def test_csv_header(self):
        from rice.routes import _csv_header
        header = _csv_header()
        assert "domaine_code" in header
        assert "savoir_code" in header
        assert "enseignants_suggeres" in header

    def test_build_export_row(self):
        from rice.routes import _build_export_row
        from rice.models import SavoirProposition
        sav = SavoirProposition(
            tmpId="sav-1", code="S1", nom="Test Savoir", type="savoir",
            niveau="N3", enseignantsSuggeres=["E001", "E002"], refCodes=["R1"]
        )
        row = _build_export_row("DOM1", "Domaine", "C1", "Comp", sav, "SC1", "Sous-Comp")
        assert row[0] == "DOM1"
        assert row[6] == "S1"
        assert "E001; E002" in row[10]

    def test_empty_validate_counts(self):
        from rice.routes import _empty_validate_counts
        counts = _empty_validate_counts()
        assert counts["upserted_domaines"] == 0
        assert counts["inserted_savoirs"] == 0
        assert counts["inserted_links"] == 0

    def test_accumulate_savoir_counts(self):
        from rice.routes import _accumulate_savoir_counts
        counts = {"inserted_savoirs": 0, "updated_savoirs": 0, "inserted_links": 0}
        _accumulate_savoir_counts(counts, 2, 1, 3)
        assert counts["inserted_savoirs"] == 2
        assert counts["updated_savoirs"] == 1
        assert counts["inserted_links"] == 3

    def test_get_current_user_auth_disabled(self, monkeypatch):
        from rice.routes import _get_current_user
        import rice.routes as routes_mod
        monkeypatch.setattr(routes_mod, "_AUTH_ENABLED", False)
        request = MagicMock()
        result = _get_current_user(request)
        assert result is None

    def test_get_current_user_auth_enabled_with_user(self, monkeypatch):
        from rice.routes import _get_current_user
        import rice.routes as routes_mod
        monkeypatch.setattr(routes_mod, "_AUTH_ENABLED", True)
        request = MagicMock()
        request.state.user_id = "user123"
        request.state.user_email = "user@test.com"
        request.state.user_role = "admin"
        result = _get_current_user(request)
        assert result["id"] == "user123"
        assert result["username"] == "user@test.com"
        assert result["role"] == "admin"

    def test_get_current_user_auth_enabled_no_user(self, monkeypatch):
        from rice.routes import _get_current_user
        from fastapi import HTTPException
        import rice.routes as routes_mod
        monkeypatch.setattr(routes_mod, "_AUTH_ENABLED", True)
        request = MagicMock()
        request.state.user_id = None
        with pytest.raises(HTTPException) as exc_info:
            _get_current_user(request)
        assert exc_info.value.status_code == 401


class TestIterExportRows:
    def test_iter_export_rows_with_sous_competences(self):
        from rice.routes import _iter_export_rows
        from rice.models import (
            RiceAnalysisResult, DomaineProposition, CompetenceProposition,
            SousCompetenceProposition, SavoirProposition,
        )
        sav1 = SavoirProposition(tmpId="s1", code="S1", nom="Savoir 1", type="savoir", niveau="N3")
        sav2 = SavoirProposition(tmpId="s2", code="S2", nom="Savoir 2", type="savoir", niveau="N4")
        sc = SousCompetenceProposition(code="SC1", nom="Sous-Comp 1", savoirs=[sav2])
        comp = CompetenceProposition(code="C1", nom="Comp 1", savoirs=[sav1], sousCompetences=[sc])
        dom = DomaineProposition(code="D1", nom="Dom 1", competences=[comp])
        result = RiceAnalysisResult(propositions=[dom])
        rows = list(_iter_export_rows(result))
        assert len(rows) == 2
        assert rows[0][6] == "S1"
        assert rows[1][4] == "SC1"

    def test_iter_export_rows_savoirs_none(self):
        from rice.routes import _iter_export_rows
        from rice.models import (
            RiceAnalysisResult, DomaineProposition, CompetenceProposition,
        )
        comp = CompetenceProposition(code="C1", nom="Comp 1", savoirs=None, sousCompetences=[])
        dom = DomaineProposition(code="D1", nom="Dom 1", competences=[comp])
        result = RiceAnalysisResult(propositions=[dom])
        rows = list(_iter_export_rows(result))
        assert rows == []


class TestRoutesValidateHelpers:
    def test_upsert_domaine_success(self, monkeypatch):
        from rice.routes import _upsert_domaine
        from rice.models import DomaineProposition
        cur = MagicMock()
        conn = MagicMock()
        dom = DomaineProposition(code="D1", nom="Domaine 1", description="Desc")
        result = _upsert_domaine(cur, dom, [], conn)
        assert result is True

    def test_upsert_domaine_failure(self, monkeypatch):
        from rice.routes import _upsert_domaine
        from rice.models import DomaineProposition
        cur = MagicMock()
        cur.execute.side_effect = Exception("db error")
        conn = MagicMock()
        dom = DomaineProposition(code="D1", nom="Domaine 1")
        errors = []
        result = _upsert_domaine(cur, dom, errors, conn)
        assert result is False
        assert len(errors) > 0

    def test_upsert_competence_success(self, monkeypatch):
        from rice.routes import _upsert_competence
        from rice.models import CompetenceProposition
        cur = MagicMock()
        conn = MagicMock()
        comp = CompetenceProposition(code="C1", nom="Comp 1", description="Desc", ordre=1)
        result = _upsert_competence(cur, comp, "D1", [], conn)
        assert result is True

    def test_upsert_competence_failure(self, monkeypatch):
        from rice.routes import _upsert_competence
        from rice.models import CompetenceProposition
        cur = MagicMock()
        cur.execute.side_effect = Exception("db error")
        conn = MagicMock()
        comp = CompetenceProposition(code="C1", nom="Comp 1")
        errors = []
        result = _upsert_competence(cur, comp, "D1", errors, conn)
        assert result is False
        assert len(errors) > 0

    def test_upsert_savoir_insert(self, monkeypatch):
        from rice.routes import _upsert_savoir
        from rice.models import SavoirProposition
        cur = MagicMock()
        cur.fetchone.return_value = (True,)
        conn = MagicMock()
        sav = SavoirProposition(tmpId="sav-1", code="S1", nom="Savoir", type="savoir", niveau="N3")
        ins, upd, lnk = _upsert_savoir(cur, sav, "C1", False, [], conn)
        assert ins == 1
        assert upd == 0

    def test_upsert_savoir_update(self, monkeypatch):
        from rice.routes import _upsert_savoir
        from rice.models import SavoirProposition
        cur = MagicMock()
        cur.fetchone.return_value = (False,)
        conn = MagicMock()
        sav = SavoirProposition(tmpId="sav-1", code="S1", nom="Savoir", type="savoir", niveau="N3")
        ins, upd, lnk = _upsert_savoir(cur, sav, "C1", False, [], conn)
        assert ins == 0
        assert upd == 1

    def test_upsert_savoir_error(self, monkeypatch):
        from rice.routes import _upsert_savoir
        from rice.models import SavoirProposition
        cur = MagicMock()
        cur.execute.side_effect = [Exception("db error")]
        conn = MagicMock()
        sav = SavoirProposition(tmpId="sav-1", code="S1", nom="Savoir", type="savoir", niveau="N3")
        errors = []
        ins, upd, lnk = _upsert_savoir(cur, sav, "C1", False, errors, conn)
        assert ins == 0
        assert len(errors) > 0

    def test_upsert_savoir_with_overwrite_and_links(self, monkeypatch):
        from rice.routes import _upsert_savoir
        from rice.models import SavoirProposition
        cur = MagicMock()
        cur.fetchone.return_value = (True,)
        conn = MagicMock()
        sav = SavoirProposition(
            tmpId="sav-1", code="S1", nom="Savoir", type="savoir", niveau="N3",
            enseignantsSuggeres=["E001", "E002"]
        )
        ins, upd, lnk = _upsert_savoir(cur, sav, "C1", True, [], conn)
        assert ins == 1
        assert lnk == 2

    def test_upsert_savoir_link_error(self, monkeypatch):
        from rice.routes import _upsert_savoir
        from rice.models import SavoirProposition
        cur = MagicMock()
        cur.fetchone.return_value = (True,)
        # First execute is the INSERT, second is DELETE (overwrite), third+ are links
        cur.execute.side_effect = [None, None, Exception("link error")]
        conn = MagicMock()
        sav = SavoirProposition(
            tmpId="sav-1", code="S1", nom="Savoir", type="savoir", niveau="N3",
            enseignantsSuggeres=["E001"]
        )
        errors = []
        ins, upd, lnk = _upsert_savoir(cur, sav, "C1", True, errors, conn)
        assert len(errors) > 0

    def test_process_competence_savoirs(self, monkeypatch):
        from rice.routes import _process_competence_savoirs
        from rice.models import CompetenceProposition, SavoirProposition
        cur = MagicMock()
        cur.fetchone.return_value = (True,)
        conn = MagicMock()
        sav = SavoirProposition(tmpId="s1", code="S1", nom="S1", type="savoir", niveau="N3")
        comp = CompetenceProposition(code="C1", nom="C1", savoirs=[sav], sousCompetences=[])
        counts = {"inserted_savoirs": 0, "updated_savoirs": 0, "inserted_links": 0}
        _process_competence_savoirs(cur, comp, False, [], conn, counts)
        assert counts["inserted_savoirs"] == 1

    def test_process_competence_subcompetences(self, monkeypatch):
        from rice.routes import _process_competence_subcompetences
        from rice.models import CompetenceProposition, SousCompetenceProposition, SavoirProposition
        cur = MagicMock()
        cur.fetchone.return_value = (True,)
        conn = MagicMock()
        sav = SavoirProposition(tmpId="s1", code="S1", nom="S1", type="savoir", niveau="N3")
        sc = SousCompetenceProposition(code="SC1", nom="SC1", savoirs=[sav])
        comp = CompetenceProposition(code="C1", nom="C1", savoirs=[], sousCompetences=[sc])
        counts = {"upserted_sous_competences": 0, "inserted_savoirs": 0, "updated_savoirs": 0, "inserted_links": 0}
        _process_competence_subcompetences(cur, comp, False, [], conn, counts)
        assert counts["upserted_sous_competences"] == 1

    def test_process_validate_propositions(self, monkeypatch):
        from rice.routes import _process_validate_propositions
        from rice.models import ValidateRequest, DomaineProposition, CompetenceProposition
        cur = MagicMock()
        cur.fetchone.return_value = (True,)
        conn = MagicMock()
        comp = CompetenceProposition(code="C1", nom="C1", savoirs=[], sousCompetences=[])
        dom = DomaineProposition(code="D1", nom="D1", competences=[comp])
        req = ValidateRequest(propositions=[dom], overwrite=False)
        errors = []
        counts = _process_validate_propositions(cur, req, errors, conn)
        assert counts["upserted_domaines"] == 1
        assert counts["upserted_competences"] == 1

    def test_open_validate_connection_success(self, monkeypatch):
        from rice.routes import _open_validate_connection
        import rice.db as db_mod
        mock_conn = MagicMock()
        mock_conn.cursor.return_value = MagicMock()
        monkeypatch.setattr(db_mod, "_get_db_connection", lambda: mock_conn)
        conn, cur = _open_validate_connection()
        assert conn is mock_conn

    def test_close_validate_connection(self, monkeypatch):
        from rice.routes import _close_validate_connection
        import rice.db as db_mod
        conn = MagicMock()
        cur = MagicMock()
        monkeypatch.setattr(db_mod, "_put_db_connection", lambda c: None)
        _close_validate_connection(conn, cur)
        cur.close.assert_called_once()

    def test_close_validate_connection_error(self, monkeypatch):
        from rice.routes import _close_validate_connection
        conn = MagicMock()
        cur = MagicMock()
        cur.close.side_effect = Exception("close error")
        # Should not raise
        _close_validate_connection(conn, cur)

    def test_run_validate_transaction(self, monkeypatch):
        from rice.routes import _run_validate_transaction
        from rice.models import ValidateRequest, DomaineProposition
        cur = MagicMock()
        cur.fetchone.return_value = (True,)
        conn = MagicMock()
        dom = DomaineProposition(code="D1", nom="D1", competences=[])
        req = ValidateRequest(propositions=[dom], overwrite=False)
        errors = []
        counts = _run_validate_transaction(req, errors, conn, cur)
        conn.commit.assert_called_once()
        assert counts["upserted_domaines"] == 1


# ======================================================================
# rice/llm.py  (87.5%)
# ======================================================================


class TestLlm:
    def test_llm_ok_is_false(self):
        assert llm._LLM_OK is False

    def test_escape_prompt_noop(self):
        result = llm._escape_prompt("test prompt")
        assert result == "test prompt"

    def test_llm_chat_raises(self):
        with pytest.raises(RuntimeError, match="LLM integration is disabled"):
            llm._llm_chat([{"role": "user", "content": "hello"}])

    def test_llm_sync_chat_raises(self):
        with pytest.raises(RuntimeError, match="LLM integration is disabled"):
            llm._llm_sync_chat([{"role": "user", "content": "hello"}])

    def test_llm_chat_with_params(self):
        with pytest.raises(RuntimeError):
            llm._llm_chat(
                [{"role": "user", "content": "hello"}],
                model="test-model",
                timeout=10,
                temperature=0.5,
            )

    def test_llm_model_default(self):
        assert isinstance(llm._LLM_MODEL, str)

    def test_llm_timeout_default(self):
        assert isinstance(llm._LLM_TIMEOUT, int)
        assert llm._LLM_TIMEOUT > 0
