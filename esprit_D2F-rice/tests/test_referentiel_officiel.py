"""Référentiel officiel (schéma competence) et matching sémantique local.

Couvre les correctifs de l'audit RICE (2026-09-23) :
* le référentiel est lu dans le schéma `competence` (codes réels), plus dans
  des tables `public.ref_*` qui n'existent pas ;
* le cache d'embeddings est invalidé par empreinte (modèle + textes), pas par
  le seul nombre de lignes ;
* un corpus par département (plus d'écrasement entre départements) ;
* seuil d'abstention sur la similarité brute, classement sur la similarité
  centrée (neutralise les savoirs « hubs »).
"""
from unittest.mock import MagicMock

import numpy as np
import pytest
from fastapi.testclient import TestClient

import rice.referential as ref

_ROWS = [
    # code, nom, description, sous-compétence, comp code, comp nom, dom code, dom nom, niveau
    ("S.ML.SKLEARN", "Scikit-learn", "Pipeline ML, validation croisée", "Machine Learning",
     "AI.ML", "Apprentissage automatique", "AI", "Intelligence Artificielle", "N3_INTERMEDIAIRE"),
    ("S.DL.TF", "TensorFlow / Keras", None, "Deep Learning",
     "AI.ML", "Apprentissage automatique", "AI", "Intelligence Artificielle", None),
]


@pytest.fixture(autouse=True)
def _isolation(monkeypatch):
    ref._REF_DB_CACHE.clear()
    monkeypatch.setattr(ref, "_SEMANTIC_CORPORA", {})
    yield
    ref._REF_DB_CACHE.clear()


# ── Construction du référentiel ─────────────────────────────────────────────

def test_referentiel_from_rows_structure():
    r = ref._referentiel_from_rows(_ROWS)
    assert r["source"] == "competence-db"
    assert r["savoirs"]["S.ML.SKLEARN"] == ["scikit-learn", "pipeline ml, validation croisée"]
    assert r["savoirs"]["S.DL.TF"] == ["tensorflow / keras"]
    assert r["savoir_textes"]["S.ML.SKLEARN"] == "Scikit-learn. Pipeline ML, validation croisée. Machine Learning"
    # _match_gc_competence reçoit des codes de savoirs joints : ils doivent
    # désigner leur compétence.
    assert {"s.ml.sklearn", "s.dl.tf"} <= set(r["competences"]["AI.ML"]["keywords"])
    assert r["domaines"] == {"AI": "Intelligence Artificielle"}
    assert r["niveaux"] == {"S.ML.SKLEARN": "N3_INTERMEDIAIRE"}


def test_match_competence_from_joined_savoir_codes(monkeypatch):
    monkeypatch.setattr(ref, "_get_effective_referential", lambda d: ref._referentiel_from_rows(_ROWS))
    assert ref._match_gc_competence("S.ML.SKLEARN S.DL.TF", "info") == "AI.ML"


def _conn_returning(rows):
    cur = MagicMock()
    cur.fetchall.return_value = rows
    conn = MagicMock()
    conn.cursor.return_value = cur
    return conn, cur


def test_official_schema_is_preferred_and_cached(monkeypatch):
    conn, cur = _conn_returning(list(_ROWS))
    calls = []
    monkeypatch.setattr(ref, "_get_db_connection", lambda: calls.append(1) or conn)
    monkeypatch.setattr(ref, "_put_db_connection", lambda c: None)

    loaded = ref._load_ref_from_db("info")

    assert loaded["source"] == "competence-db"
    sql, params = cur.execute.call_args[0]
    assert "competence.savoirs" in sql
    assert params == (["DEPT_INFO", "DEPT_GL", "DEPT_IA", "DEPT_WEB"],)
    assert ref._load_ref_from_db("info") is loaded
    assert len(calls) == 1, "le second appel doit être servi par le cache"


def test_unmapped_department_does_not_query_official_schema(monkeypatch):
    monkeypatch.setattr(ref, "_get_db_connection", lambda: pytest.fail("aucune requête attendue"))
    assert ref._load_ref_from_competence_schema("meca") is None


def test_empty_official_result_falls_back(monkeypatch):
    conn, _ = _conn_returning([])
    monkeypatch.setattr(ref, "_get_db_connection", lambda: conn)
    monkeypatch.setattr(ref, "_put_db_connection", lambda c: None)
    assert ref._load_ref_from_competence_schema("gc") is None


def test_unreadable_official_schema_falls_back_to_json(monkeypatch):
    def _denied():
        raise RuntimeError("permission denied for schema competence")
    monkeypatch.setattr(ref, "_get_db_connection", _denied)
    effective = ref._get_effective_referential("info")
    assert effective.get("source") != "competence-db"
    assert effective["savoirs"], "le référentiel JSON de secours doit être servi"


# ── Matching sémantique ─────────────────────────────────────────────────────

class _FakeModel:
    """Encode chaque texte selon une table ; compte les encodages."""

    def __init__(self, table):
        self.table = table
        self.encoded = 0

    def encode(self, texts, convert_to_numpy=True, normalize_embeddings=True):
        self.encoded += len(texts)
        m = np.array([self.table[t] for t in texts], dtype=float)
        return m / np.linalg.norm(m, axis=1, keepdims=True)


@pytest.fixture
def semantic(monkeypatch, tmp_path):
    monkeypatch.setattr(ref, "_np", np)
    monkeypatch.setattr(ref, "_SEMANTIC_OK", True)
    monkeypatch.setattr(ref, "_SEMANTIC_MODEL_REF", "fake-model")
    monkeypatch.setattr(ref, "_SEMANTIC_CACHE_DIR", tmp_path)
    monkeypatch.setattr(ref, "_SEMANTIC_QUERY_PREFIX", "")
    monkeypatch.setattr(ref, "_SEMANTIC_PASSAGE_PREFIX", "")

    def _install(table, refs):
        model = _FakeModel(table)
        monkeypatch.setattr(ref, "_SEMANTIC_MODEL", model)
        monkeypatch.setattr(ref, "_get_effective_referential", lambda d: refs[d.lower()])
        return model

    return _install


def _ref_with(textes):
    return {"savoirs": {c: [t.lower()] for c, t in textes.items()}, "savoir_textes": dict(textes),
            "competences": {}, "domaines": {}, "niveaux": {}}


def test_corpus_rebuilt_when_text_changes_with_same_size(semantic):
    table = {"A": [1, 0, 0], "B": [0, 1, 0], "B2": [0, 0, 1]}
    refs = {"gc": _ref_with({"S1": "A", "S2": "B"})}
    model = semantic(table, refs)

    ref._build_semantic_corpus("gc")
    first = ref._SEMANTIC_CORPORA["gc"]["fingerprint"]
    ref._build_semantic_corpus("gc")
    assert model.encoded == 2, "corpus à jour : aucun ré-encodage"

    refs["gc"] = _ref_with({"S1": "A", "S2": "B2"})  # même taille, texte différent
    ref._build_semantic_corpus("gc")
    assert ref._SEMANTIC_CORPORA["gc"]["fingerprint"] != first
    assert model.encoded == 4


def test_disk_cache_is_keyed_by_fingerprint(semantic, tmp_path):
    table = {"A": [1, 0], "B": [0, 1]}
    model = semantic(table, {"gc": _ref_with({"S1": "A", "S2": "B"})})
    ref._build_semantic_corpus("gc")
    assert len(list(tmp_path.glob("gc-*.npy"))) == 1

    ref._SEMANTIC_CORPORA.clear()
    ref._build_semantic_corpus("gc")
    assert model.encoded == 2, "le second chargement doit lire le cache disque"


def test_departments_keep_separate_corpora(semantic):
    table = {"A": [1, 0], "B": [0, 1], "q": [1, 0.1]}
    semantic(table, {"gc": _ref_with({"GC1": "A", "GC2": "B"}),
                     "info": _ref_with({"IN1": "A", "IN2": "B"})})
    assert ref._match_gc_savoir_semantic("q", departement="gc", threshold=0.5)[0] == "GC1"
    assert ref._match_gc_savoir_semantic("q", departement="info", threshold=0.5)[0] == "IN1"
    # Retour sur gc : le corpus info ne l'a pas écrasé.
    assert ref._match_gc_savoir_semantic("q", departement="gc", threshold=0.5)[0] == "GC1"


def test_threshold_rejects_offtopic_text(semantic):
    table = {"A": [1, 0, 0], "B": [0, 1, 0], "hors-sujet": [0, 0, 1]}
    semantic(table, {"gc": _ref_with({"S1": "A", "S2": "B"})})
    assert ref._match_gc_savoir_semantic("hors-sujet", departement="gc", threshold=0.4) == []


def test_centered_ranking_demotes_hub_savoir(semantic):
    # HUB est proche de tout le référentiel (libellé générique) ; la requête vise
    # SPEC. En cosinus brut HUB passe devant ; après centrage SPEC est premier.
    table = {
        "hub": [1.0, 1.0, 1.0, 1.0],
        "spec": [0.2, 1.0, 0.0, 0.0],
        "o1": [1.0, 0.0, 1.0, 0.0],
        "o2": [1.0, 0.0, 0.0, 1.0],
        "q": [0.9, 1.0, 0.5, 0.5],
    }
    semantic(table, {"gc": _ref_with({"HUB": "hub", "SPEC": "spec", "O1": "o1", "O2": "o2"})})

    scores = ref._semantic_scores("q", "gc")
    raw_best = max(scores, key=lambda s: s[1])[0]
    assert raw_best == "HUB"
    assert ref._match_gc_savoir_semantic("q", departement="gc", threshold=0.4)[0] == "SPEC"


# ── /health : état réel du moteur ───────────────────────────────────────────

def test_health_reports_real_ia_state(monkeypatch):
    from main import app

    monkeypatch.setattr(ref, "_SEMANTIC_MODEL", None)
    body = TestClient(app).get("/health").json()
    assert body["llm"] == "aucun"
    assert body["semantic_model_loaded"] is False
    assert body["ia_locale"] is False

    monkeypatch.setattr(ref, "_SEMANTIC_MODEL", object())
    monkeypatch.setenv("HF_HUB_OFFLINE", "1")
    body = TestClient(app).get("/health").json()
    assert body["ia_locale"] is True


# ── Pool DB : jamais d'attente illimitée ────────────────────────────────────

def test_db_pool_has_connect_timeout(monkeypatch):
    import types

    import rice.db as db

    captured = {}

    class _Pool:
        def __init__(self, *args, **kwargs):
            captured.update(kwargs)

    monkeypatch.setattr(db, "_DB_POOL", None)
    monkeypatch.setattr(db, "_import_module", lambda name: types.SimpleNamespace(ThreadedConnectionPool=_Pool))
    monkeypatch.setenv("RICE_DB_CONNECT_TIMEOUT", "7")
    db._get_db_pool()
    assert captured["connect_timeout"] == 7


# ── Métadonnées : typographie française « Libellé : valeur » ────────────────

_FICHE_FR = """Fiche Module
Module : Géotechnique et Fondations
Unité pédagogique : UP Génie Civil
Responsable Module : Sihem Mroueh
Enseignants : Karim Bougherara
"""


def test_inline_responsable_wins_over_previous_line():
    from rice.nlp import _extract_metadata

    meta = _extract_metadata(_FICHE_FR)
    assert meta["responsable"] == "Sihem Mroueh"
    assert meta["enseignants_roles"]["Sihem Mroueh"] == "responsable"
    assert not any(":" in n for n in meta["enseignants_roles"])


def test_reversed_table_format_still_supported_but_never_takes_a_label_line():
    from rice.nlp import _extract_regex_responsable

    assert _extract_regex_responsable("Ahmed Benali\nResponsable Module") == "Ahmed Benali"
    assert _extract_regex_responsable("Unité pédagogique : UP GC\nResponsable Module") is None


def test_module_name_without_leading_colon():
    from rice.nlp import _extract_regex_nom_module

    assert _extract_regex_nom_module("Module : Géotechnique et Fondations") == "Géotechnique et Fondations"
