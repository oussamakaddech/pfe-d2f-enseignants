"""Stable coverage tests for rice.db and rice.analyzer pure helper branches."""

from __future__ import annotations

import importlib
import os
import sys
import time
from types import SimpleNamespace
from unittest.mock import MagicMock

sys.path.insert(0, os.path.dirname(os.path.dirname(__file__)))

os.environ.setdefault("DB_NAME", "test")
os.environ.setdefault("DB_USER", "test")
os.environ.setdefault("DB_PASS", "test")
os.environ.setdefault("DB_HOST", "localhost")
os.environ.setdefault("DB_PORT", "5432")
os.environ.setdefault("RICE_AUTH_ENABLED", "false")

import rice.db as db
import rice.analyzer as analyzer
import rice.referential as ref
from rice.models import (
    CompetenceProposition,
    DomaineProposition,
    EnseignantInfo,
    FicheEnseignantExtrait,
    SavoirProposition,
)


def test_db_pool_and_put_connection_error(monkeypatch):
    db._DB_POOL = None
    dummy_pool = MagicMock()
    dummy_conn = MagicMock()
    dummy_pool.getconn.return_value = dummy_conn
    dummy_pool.putconn.side_effect = Exception("pool down")

    fake_pg_pool = SimpleNamespace(ThreadedConnectionPool=MagicMock(return_value=dummy_pool))
    monkeypatch.setitem(sys.modules, "psycopg2.pool", fake_pg_pool)

    pool = db._get_db_pool()
    assert pool is dummy_pool
    assert db._get_db_connection() is dummy_conn

    db._put_db_connection(dummy_conn)
    dummy_conn.close.assert_called_once()


def test_db_fetch_affectations_and_dept_mapping(monkeypatch):
    fresh_db = importlib.reload(db)
    fresh_db._AFFECTATIONS_CACHE = fresh_db._ThreadSafeCache()

    cur = MagicMock()
    cur.fetchall.return_value = [("E001", ["S1a", "S2a"]), ("E002", None)]
    conn = MagicMock()
    conn.cursor.return_value = cur

    monkeypatch.setattr(fresh_db, "_get_db_connection", lambda: conn)
    monkeypatch.setattr(fresh_db, "_put_db_connection", lambda c: None)

    result = fresh_db._fetch_enseignant_affectations()
    assert result == {"E001": ["S1a", "S2a"], "E002": []}

    fresh_db._AFFECTATIONS_CACHE.clear()
    fresh_db._AFFECTATIONS_CACHE.set("all", {"E999": ["S9"]})
    monkeypatch.setattr(fresh_db, "_get_db_connection", lambda: (_ for _ in ()).throw(Exception("db error")))
    assert fresh_db._fetch_enseignant_affectations() == {"E999": ["S9"]}

    assert fresh_db._dept_to_numeric_id("gc") == 1
    assert fresh_db._dept_to_numeric_id("genie-electrique") == 3
    assert fresh_db._dept_to_numeric_id("telecom") == 5
    assert fresh_db._dept_to_numeric_id("unknown") == 1


def test_db_create_enseignant_if_new(monkeypatch):
    cur = MagicMock()
    conn = MagicMock()
    conn.cursor.return_value = cur

    monkeypatch.setattr(db, "_get_db_connection", lambda: conn)
    monkeypatch.setattr(db, "_put_db_connection", lambda c: None)

    new_id, display = db._create_enseignant_if_new("Ben Ali Mohamed Amine", "ge")
    assert new_id.startswith("EX-")
    assert display == "Ali Mohamed Amine BEN"
    cur.execute.assert_called_once()

    monkeypatch.setattr(db, "_get_db_connection", lambda: (_ for _ in ()).throw(Exception("fail")))
    new_id2, display2 = db._create_enseignant_if_new("", "gc")
    assert new_id2.startswith("EX-")
    assert display2 == "INCONNU"


def test_analyzer_niveau_and_domain_helpers(monkeypatch):
    monkeypatch.setattr(
        ref,
        "_get_effective_referential",
        lambda dept: {"niveaux": {"S1a": "N2_ELEMENTAIRE", "S1b": "N3_INTERMEDIAIRE", "S6": "N4_AVANCE"}},
    )
    monkeypatch.setattr(analyzer, "_detect_bloom_level", lambda text: 5 if "concevoir" in text else 2)
    monkeypatch.setattr(analyzer, "_bloom_to_niveau", lambda level: f"BLOOM_{level}")

    assert analyzer._get_niveau_from_referentiel("S1a", "gc") == "N2_ELEMENTAIRE"
    assert analyzer._get_niveau_from_referentiel("S6", "gc") == "N4_AVANCE"
    assert analyzer._get_niveau_from_referentiel("", "gc", fallback_text="concevoir une solution") == "BLOOM_5"

    assert analyzer._is_bad_domain_candidate(None)
    assert analyzer._is_bad_domain_candidate("abc")
    assert analyzer._is_bad_domain_candidate("A1 - intro")
    assert not analyzer._is_bad_domain_candidate("Resistance des materiaux")

    good_meta = {"nom_module": "Resistance des materiaux", "code_module": "RDM01"}
    assert analyzer._resolve_domain(good_meta, "fiche_rdm.txt") == (
        "Resistance des materiaux",
        "Resistance des materiaux",
        "RDM01",
        "RDM01",
    )

    monkeypatch.setattr(analyzer, "_build_domain_name_from_file", lambda filename: "Domaine Test")
    fallback_meta = {"nom_module": "a", "unite_enseignement": "b", "unite_pedagogique": "c"}
    domain_name, module_name, module_code, domain_code = analyzer._resolve_domain(fallback_meta, "fiche_rdm.txt")
    assert domain_name == "Domaine Test"
    assert module_name == "a"
    assert module_code
    assert domain_code


def test_analyzer_extracted_enseignant_and_ref_matching_helpers(monkeypatch):
    extracted = analyzer._build_extracted_ens(
        ["Alice Dupont", "Bob Martin"],
        {"Alice Dupont": "responsable"},
        {"Alice Dupont": ("E001", "Alice Dupont")},
        "fiche.txt",
    )
    assert extracted[0].role == "responsable"
    assert extracted[0].matched_id == "E001"
    assert extracted[1].role == "enseignant"

    all_extracted = list(extracted)
    all_ens_by_id = {"E002": EnseignantInfo(id="E002", nom="Martin", prenom="Bob", modules=[])}
    analyzer._add_ref_matched_ens(["E002", "E001"], all_extracted, all_ens_by_id, "fiche.txt")
    assert any(item.matched_id == "E002" for item in all_extracted)

    savoirs = list(analyzer._iter_comp_savoirs(
        CompetenceProposition(
            tmpId="1",
            code="C1",
            nom="Comp",
            savoirs=[SavoirProposition(
                tmpId="s1",
                code="S1",
                nom="A",
                type="THEORIQUE",
                niveau="N1_DEBUTANT",
                enseignantsSuggeres=[],
                refCodes=["S1a"],
            )],
            sousCompetences=[],
        )
    ))
    assert savoirs[0].code == "S1"


def test_analyzer_builders_and_match_all_enseignants(monkeypatch):
    monkeypatch.setattr(analyzer, "_match_gc_savoir", lambda text, departement="gc": ["S1a"] if text else [])
    monkeypatch.setattr(analyzer, "_suggest_gc_enseignants", lambda codes: ["E999"] if codes else [])
    monkeypatch.setattr(analyzer, "_detect_type", lambda text, departement: "THEORIQUE")
    monkeypatch.setattr(analyzer, "_gc_ref_niveau", lambda codes, departement="gc": "N3_INTERMEDIAIRE")
    monkeypatch.setattr(analyzer, "_match_gc_competence", lambda text, departement="gc": "GC-TECH")
    monkeypatch.setattr(analyzer, "_match_enseignants_by_name", lambda names, enseignants: (["E001"], {names[0]: ("E001", names[0])}))
    monkeypatch.setattr(analyzer, "_match_enseignants_by_module", lambda text, enseignants: ["E002"])
    monkeypatch.setattr(analyzer, "_fetch_all_enseignants_info", lambda: {"E003": EnseignantInfo(id="E003", nom="T", prenom="U", modules=[])})

    ref_item = {"code": "S1a", "text": "Analyser les donnees", "domaine_code": "D1", "domaine_nom": "Domaine 1"}
    savoir_ref = analyzer._build_savoir_from_ref_item(ref_item, "C1", "D0", "gc", ["E1"], ["E2"], ["E3"], ["E4"])
    assert savoir_ref.directToCompetence is True
    assert savoir_ref.refCodes == ["S1a"]

    savoir_aa = analyzer._build_savoir_from_aa_direct(
        {"id": 2, "text": "Appliquer une methode", "bloom_level": 4},
        "C1",
        "D0",
        "gc",
        ["E1"],
        ["E2"],
        ["E3"],
        ["E4"],
        0,
    )
    assert savoir_aa.code == "C1-AA2"
    assert savoir_aa.enseignantsSuggeres

    competences, next_idx = analyzer._build_competences_from_referentiel(
        [
            {"code": "S1a", "text": "Analyser les donnees", "domaine_code": "D1", "domaine_nom": "Domaine 1"},
            {"code": "S2a", "text": "Concevoir une solution", "domaine_code": "D1", "domaine_nom": "Domaine 1"},
            {"code": "S3a", "text": "Tester le systeme", "domaine_code": "D2", "domaine_nom": "Domaine 2"},
        ],
        0,
        "D0",
        "gc",
        ["E1"],
        ["E2"],
        ["E3"],
        ["E4"],
    )
    assert len(competences) == 2
    assert next_idx == 2

    fiche_names = ["Alice Dupont"]
    roles_map = {"Alice Dupont": "enseignant"}
    extracted_ens, matched_by_name, matched_by_module, all_matched, extracted_ids = analyzer._match_all_enseignants(
        fiche_names,
        roles_map,
        "cours sur le calcul de structure",
        [EnseignantInfo(id="E001", nom="Dupont", prenom="Alice", modules=["Structure"])],
        "gc",
        "fiche.txt",
        {"responsable": "Alice Dupont"},
    )
    assert extracted_ens
    assert matched_by_name == ["E001"]
    assert "E002" in matched_by_module
    assert "E999" in all_matched
    assert extracted_ids == ["E001"]


def test_analyzer_single_fiche_and_analyze_files(monkeypatch):
    fake_domain = DomaineProposition(
        tmpId="d1",
        code="D1",
        nom="Domaine 1",
        competences=[
            CompetenceProposition(
                tmpId="c1",
                code="C1",
                nom="Comp 1",
                refCodes=["S1a"],
                savoirs=[],
                sousCompetences=[],
            )
        ],
    )
    fake_extracted = [FicheEnseignantExtrait(fichier="fiche.txt", nom_complet="Alice Dupont")]

    monkeypatch.setattr(analyzer, "_extract_metadata", lambda text, raw_tables=None: {"nom_module": "RDM", "enseignants_noms": [], "enseignants_roles": {}})
    monkeypatch.setattr(analyzer, "_resolve_domain", lambda meta, filename: ("RDM", "RDM", "RDM01", "RDM01"))
    monkeypatch.setattr(analyzer, "_match_all_enseignants", lambda *args, **kwargs: (fake_extracted, ["E001"], ["E002"], ["E001", "E002"], ["E001"]))
    monkeypatch.setattr(analyzer, "_extract_acquis_apprentissage", lambda text: [{"id": 1, "text": "Identifier les contraintes", "bloom_level": 3}])
    monkeypatch.setattr(analyzer, "_extract_seances", lambda text: [])
    monkeypatch.setattr(analyzer, "_extract_referentiel_competences", lambda text: [])
    monkeypatch.setattr(analyzer, "_build_competence_from_acquis", lambda *args, **kwargs: fake_domain.competences[0])
    monkeypatch.setattr(analyzer, "_fallback_extraction", lambda *args, **kwargs: [fake_domain.competences[0]])
    monkeypatch.setattr(analyzer, "_match_gc_competence", lambda text, departement="gc": "GC-TECH")

    domaine, extracted_ens = analyzer._analyze_single_fiche("fiche.txt", "text", [], "gc")
    assert domaine.code == "RDM01"
    assert extracted_ens == fake_extracted

    monkeypatch.setattr(analyzer, "_extract_text", lambda filename, data: ("text", None))
    monkeypatch.setattr(analyzer, "_analyze_single_fiche", lambda filename, text, enseignants, departement="gc", raw_tables=None: (DomaineProposition(tmpId="1", code="D1", nom="Dom", competences=[fake_domain.competences[0]]), fake_extracted))

    result = analyzer.analyze_files(["f1.txt", "f2.txt"], [b"a", b"b"], [], "gc")
    assert result.stats["totalDomaines"] == 2
    assert result.stats["totalCompetences"] == 2
    assert result.extractedEnseignants