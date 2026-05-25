"""
tests/test_models.py — Unit tests for rice.models (Pydantic schemas).
"""
import sys
import os
import pytest

sys.path.insert(0, os.path.dirname(os.path.dirname(__file__)))

os.environ.setdefault("DB_NAME", "test")
os.environ.setdefault("DB_USER", "test")
os.environ.setdefault("DB_PASS", "test")
os.environ.setdefault("DB_HOST", "localhost")
os.environ.setdefault("DB_PORT", "5432")

from rice.models import (
    EnseignantInfo,
    SavoirProposition,
    SousCompetenceProposition,
    CompetenceProposition,
    DomaineProposition,
    FicheEnseignantExtrait,
    RiceAnalysisResult,
    ValidateRequest,
    ValidateSummary,
)


# ── EnseignantInfo ──────────────────────────────────────────────────────────

class TestEnseignantInfo:
    def test_basic_creation(self):
        e = EnseignantInfo(id="E001", nom="Benali", prenom="Ahmed")
        assert e.id == "E001"
        assert e.nom == "Benali"
        assert e.prenom == "Ahmed"
        assert e.modules == []

    def test_with_modules(self):
        e = EnseignantInfo(id="E002", nom="Martin", prenom="Sarah", modules=["RDM", "Beton"])
        assert e.modules == ["RDM", "Beton"]

    def test_empty_modules_default(self):
        e = EnseignantInfo(id="E003", nom="Doe", prenom="John")
        assert e.modules == []


# ── SavoirProposition ───────────────────────────────────────────────────────

class TestSavoirProposition:
    def test_basic_creation(self):
        s = SavoirProposition(tmpId="S1", code="S1a", nom="Calcul", type="THEORIQUE", niveau="N3_INTERMEDIAIRE")
        assert s.tmpId == "S1"
        assert s.code == "S1a"
        assert s.type == "THEORIQUE"
        assert s.niveau == "N3_INTERMEDIAIRE"
        assert s.enseignantsSuggeres == []
        assert s.refCodes == []
        assert s.description is None
        assert s.competence_code is None
        assert s.domaine_code is None
        assert s.directToCompetence is False

    def test_with_all_fields(self):
        s = SavoirProposition(
            tmpId="S2", code="S2b", nom="Essai", description="Essai de traction",
            type="PRATIQUE", niveau="N4_AVANCE",
            enseignantsSuggeres=["E001", "E002"],
            refCodes=["C1b", "INFO-A1"],
            competence_code="COMP-01",
            domaine_code="DOM-01",
            directToCompetence=True,
        )
        assert s.description == "Essai de traction"
        assert s.enseignantsSuggeres == ["E001", "E002"]
        assert s.refCodes == ["C1b", "INFO-A1"]
        assert s.competence_code == "COMP-01"
        assert s.domaine_code == "DOM-01"
        assert s.directToCompetence is True


# ── SousCompetenceProposition ───────────────────────────────────────────────

class TestSousCompetenceProposition:
    def test_basic_creation(self):
        sc = SousCompetenceProposition(tmpId="SC1", code="SC1a", nom="Analyse")
        assert sc.savoirs == []
        assert sc.refCodes == []
        assert sc.description is None

    def test_with_savoirs(self):
        s = SavoirProposition(tmpId="S1", code="S1a", nom="Calcul", type="THEORIQUE", niveau="N1_DEBUTANT")
        sc = SousCompetenceProposition(tmpId="SC1", code="SC1a", nom="Analyse", savoirs=[s])
        assert len(sc.savoirs) == 1
        assert sc.savoirs[0].code == "S1a"


# ── CompetenceProposition ───────────────────────────────────────────────────

class TestCompetenceProposition:
    def test_basic_creation(self):
        c = CompetenceProposition(tmpId="C1", code="C1a", nom="Conception")
        assert c.ordre == 1
        assert c.savoirs == []
        assert c.sousCompetences == []
        assert c.refCodes == []
        assert c.refDomaine is None

    def test_with_sous_competences(self):
        sc = SousCompetenceProposition(tmpId="SC1", code="SC1a", nom="Analyse")
        c = CompetenceProposition(
            tmpId="C1", code="C1a", nom="Conception",
            ordre=2, sousCompetences=[sc], refDomaine="GC-TECH-S",
        )
        assert c.ordre == 2
        assert len(c.sousCompetences) == 1
        assert c.refDomaine == "GC-TECH-S"


# ── DomaineProposition ──────────────────────────────────────────────────────

class TestDomaineProposition:
    def test_basic_creation(self):
        d = DomaineProposition(tmpId="D1", code="DOM1", nom="Génie Civil")
        assert d.competences == []
        assert d.refCodes == []
        assert d.refDomaine is None

    def test_with_competences(self):
        c = CompetenceProposition(tmpId="C1", code="C1a", nom="Conception")
        d = DomaineProposition(tmpId="D1", code="DOM1", nom="Génie Civil", competences=[c])
        assert len(d.competences) == 1


# ── FicheEnseignantExtrait ──────────────────────────────────────────────────

class TestFicheEnseignantExtrait:
    def test_basic_creation(self):
        f = FicheEnseignantExtrait(fichier="fiche.pdf", nom_complet="Ahmed Benali")
        assert f.fichier == "fiche.pdf"
        assert f.nom_complet == "Ahmed Benali"
        assert f.role == "enseignant"
        assert f.matched_id is None
        assert f.matched_nom is None

    def test_with_all_fields(self):
        f = FicheEnseignantExtrait(
            fichier="fiche.pdf", nom_complet="Ahmed Benali",
            role="responsable", matched_id="E001", matched_nom="Ahmed BENALI",
        )
        assert f.role == "responsable"
        assert f.matched_id == "E001"
        assert f.matched_nom == "Ahmed BENALI"


# ── RiceAnalysisResult ──────────────────────────────────────────────────────

class TestRiceAnalysisResult:
    def test_basic_creation(self):
        r = RiceAnalysisResult(propositions=[], stats={"totalDomaines": 0})
        assert r.propositions == []
        assert r.extractedEnseignants == []
        assert r.foundEnseignants == []

    def test_with_propositions(self):
        d = DomaineProposition(tmpId="D1", code="DOM1", nom="GC")
        r = RiceAnalysisResult(
            propositions=[d],
            stats={"totalDomaines": 1, "totalCompetences": 0, "totalSavoirs": 0},
        )
        assert len(r.propositions) == 1


# ── ValidateRequest ─────────────────────────────────────────────────────────

class TestValidateRequest:
    def test_basic_creation(self):
        v = ValidateRequest(propositions=[])
        assert v.propositions == []
        assert v.overwrite is False

    def test_overwrite_true(self):
        v = ValidateRequest(propositions=[], overwrite=True)
        assert v.overwrite is True


# ── ValidateSummary ─────────────────────────────────────────────────────────

class TestValidateSummary:
    def test_basic_creation(self):
        v = ValidateSummary(
            status="ok",
            inserted_savoirs=5,
            updated_savoirs=2,
            inserted_enseignant_links=3,
        )
        assert v.status == "ok"
        assert v.upserted_domaines == 0
        assert v.upserted_competences == 0
        assert v.upserted_sous_competences == 0
        assert v.inserted_savoirs == 5
        assert v.updated_savoirs == 2
        assert v.inserted_enseignant_links == 3
        assert v.errors == []

    def test_with_errors(self):
        v = ValidateSummary(
            status="partial",
            inserted_savoirs=0,
            updated_savoirs=0,
            inserted_enseignant_links=0,
            errors=["domaine D1: duplicate key"],
        )
        assert len(v.errors) == 1
