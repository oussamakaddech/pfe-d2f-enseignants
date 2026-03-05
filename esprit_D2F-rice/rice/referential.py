"""Referential data, DB loading, keyword/semantic matching, and DepartmentReferentialManager."""

from __future__ import annotations

import json as _json_local
import logging
import re
import threading as _threading
from pathlib import Path
from typing import Any, Dict, List, Optional, Tuple

from rice.cache import _ThreadSafeCache
from rice.db import (
    _get_db_connection,
    _put_db_connection,
    _fetch_enseignant_affectations,
)
from rice.nlp import _normalize, _codes_match, _detect_type

logger = logging.getLogger("rice_analyzer")

# ── Optional imports ─────────────────────────────────────────────────────────
try:
    from sentence_transformers import SentenceTransformer as _SentenceTransformer
    import numpy as _np
    _SEMANTIC_OK = True
except ImportError:
    _SEMANTIC_OK = False
    _SentenceTransformer = None  # type: ignore[assignment,misc]
    _np = None  # type: ignore[assignment]


# ─────────────────────────────────────────────────────────────────────────────
# GC built-in fallback referential
# ─────────────────────────────────────────────────────────────────────────────

_GC_FALLBACK_REF: Dict[str, Any] = {
    # ── Domaines ────────────────────────────────────────────────────────────
    "domaines": {
        "GC-RDI":  "RDI – Recherche, Développement et Innovation",
        "GC-PERS": "Personnel et Relationnel",
        "GC-COM":  "Communication et Culture",
        "GC-PED":  "Pédagogie",
        "GC-TECH": "Technique / Métier Génie Civil",
    },

    # ── Compétences (6 compétences techniques) ──────────────────────────────
    "competences": {
        "GC-TECH-S": {
            "nom": "Compétences dans le domaine des sols (S)",
            "keywords": [
                "sol", "geologie", "geotechnique", "coupe geologique",
                "fondation", "soutenement", "pente", "sismique",
                "instabilite hydraulique", "renard", "boulance",
            ],
        },
        "GC-TECH-C": {
            "nom": "Compétences dans le domaine de la construction (C)",
            "keywords": [
                "beton arme", "ouvrage art", "pont", "viaduc",
                "infrastructure routiere", "route", "chaussee",
                "rehabilitation", "mode constructif", "prefabrique",
            ],
        },
        "GC-TECH-P": {
            "nom": "Compétences en physique du bâtiment (P)",
            "keywords": [
                "thermique", "acoustique", "aeraulique", "isolation",
                "physique batiment", "performance energetique",
                "equipement technique", "cvc", "ventilation",
            ],
        },
        "GC-TECH-E": {
            "nom": "Compétences dans le domaine de l'eau (E)",
            "keywords": [
                "hydraulique", "hydrologie", "bassin versant", "debit",
                "crue", "assainissement", "reseau eau", "diagnostic eau",
            ],
        },
        "GC-TECH-U": {
            "nom": "Compétences en urbanisme (U)",
            "keywords": [
                "urbanisme", "amenagement urbain", "diagnostic urbain",
                "situation urbaine", "ville", "territoire", "paysage",
            ],
        },
        "GC-TECH-T": {
            "nom": "Compétences transversales en génie civil (T)",
            "keywords": [
                "pluridisciplinaire", "organisation chantier", "securite chantier",
                "construction durable", "developpement durable",
                "maintenance ouvrage", "assurance qualite", "plan qualite",
            ],
        },
    },

    # ── Savoirs : code → [mots-clés de matching] ───────────────────────────
    "savoirs": {
        # ── S – Sols ──────────────────────────────────────────────────────
        "S1a": ["coupe geologique", "effectuer coupe", "coupe lithologique"],
        "S1b": ["interpreter coupe geologique", "coupe geologique interpreter",
                "interpretation geologique"],
        "S1c": ["teledetection", "carte geologique", "interpreter carte",
                "resultat teledetection"],
        "S1d": ["horizon geologique", "identifier horizon", "identification couche"],
        "S2a": ["essai geotechnique laboratoire", "essai classification",
                "comportement sol laboratoire", "realiser essai geotechnique"],
        "S2b": ["interpreter essai geotechnique", "resultat essai geotechnique",
                "interpretation laboratoire"],
        "S3":  ["rupture pente", "stabilite pente", "glissement terrain",
                "risque pente", "sollicitation pente"],
        "S4":  ["instabilite hydraulique sol", "risque hydraulique sol",
                "renard", "boulance", "soulevement hydraulique"],
        "S5":  ["risque geotechnique sismique", "sollicitation sismique",
                "risque sismique geotechnique", "seisme sol"],
        "S6a": ["concevoir fondation", "concevoir soutenement",
                "systeme fondation conception", "paroi soutenement conception"],
        "S6b": ["dimensionner fondation", "dimensionner soutenement",
                "calcul fondation", "pieu calcul", "semelle dimensionner"],
        "S6c": ["controler fondation", "controler soutenement",
                "verification fondation", "reception fondation"],
        # ── C – Construction ──────────────────────────────────────────────
        "C1a": ["concevoir structure beton", "beton arme concevoir",
                "structure batiment conception", "conception batiment beton"],
        "C1b": ["dimensionner beton arme", "calcul structure beton",
                "bael", "eurocode 2", "dimensionnement beton"],
        "C1c": ["controler beton arme", "verification beton arme",
                "conformite structurale", "inspection beton"],
        "C2a": ["concevoir ouvrage art", "pont conception", "viaduc conception",
                "ouvrage art concevoir"],
        "C2b": ["dimensionner ouvrage art", "calcul pont", "dimensionner pont",
                "calcul viaduc"],
        "C2c": ["controler ouvrage art", "verification pont", "reception pont",
                "inspection ouvrage art"],
        "C3a": ["concevoir infrastructure routiere", "trace routier",
                "route conception", "conception route"],
        "C3b": ["dimensionner infrastructure routiere", "chaussee dimensionner",
                "terrassement", "dimensionner route"],
        "C3c": ["controler infrastructure routiere", "chantier routier",
                "reception chaussee", "supervision route"],
        "C4":  ["gestion projet infrastructure", "management projet infrastructure",
                "pilotage projet", "chef projet infrastructure"],
        "C5":  ["etude impact infrastructure", "impact environnement infrastructure",
                "etude impact"],
        "C6":  ["mode constructif", "methode construction", "prefabrique",
                "coffrage", "choisir mode constructif"],
        "C7":  ["etat sante structurel", "sante structurel", "diagnostic structure",
                "pathologie batiment", "actions necessaires structure"],
        "C8":  ["rehabilitation ouvrage art", "actions rehabilitation",
                "reparation ouvrage art", "refection ouvrage"],
        # ── P – Physique du bâtiment ──────────────────────────────────────
        "P1a": ["concevoir solution thermique", "concevoir solution acoustique",
                "aeraulique conception", "physique batiment conception"],
        "P1b": ["dimensionner solution thermique", "dimensionner solution acoustique",
                "calcul thermique batiment", "aeraulique dimensionner"],
        "P1c": ["controler solution thermique", "controler solution acoustique",
                "performance thermique verification", "verification acoustique"],
        "P2":  ["diagnostic thermique batiment", "performance thermique evaluation",
                "acoustique evaluation", "bilan thermique batiment", "etat sante thermique"],
        "P3":  ["dimensionner equipement technique", "choisir equipement technique",
                "cvc", "plomberie", "ventilation dimensionner"],
        # ── E – Eau ───────────────────────────────────────────────────────
        "E1a": ["concevoir reseau hydraulique", "concevoir ouvrage hydraulique",
                "hydraulique urbain conception", "hydrologie reseau conception"],
        "E1b": ["dimensionner reseau hydraulique", "dimensionner ouvrage hydraulique",
                "calcul hydraulique", "dimensionner reseau assainissement"],
        "E2":  ["diagnostic hydrologie quantitative", "gestion reseau hydraulique",
                "diagnostic reseau hydraulique", "hydrologie gestion"],
        "E3":  ["diagnostic environnemental eau", "systeme gestion eaux",
                "traitement eaux", "gestion dechets eau", "assainissement diagnostic"],
        # ── U – Urbanisme ─────────────────────────────────────────────────
        "U1":  ["analyser situation urbaine", "analyse urbaine", "diagnostic urbain",
                "situation technique urbaine", "echelle urbaine"],
        "U2":  ["realiser diagnostic urbain", "etude urbaine", "diagnostic urbain"],
        "U3a": ["concevoir amenagement urbain", "projet amenagement urbain",
                "plan amenagement", "design urbain"],
        "U3b": ["conduire projet amenagement urbain", "piloter amenagement",
                "mise en oeuvre amenagement", "gestion projet urbain"],
        # ── T – Transversales ─────────────────────────────────────────────
        "T1":  ["conception pluridisciplinaire", "pluridisciplinaire batiment",
                "interaction architecture sol", "integration disciplines"],
        "T2":  ["organisation chantier", "procedes construction",
                "securite chantier", "maitrise delais", "chef chantier"],
        "T3":  ["construction durable", "amenagement durable",
                "developpement durable construction", "hqe", "eco construction"],
        "T4":  ["gestion ouvrage existant", "maintenance ouvrage",
                "evaluer ouvrage", "maintenir ouvrage", "patrimoine ouvrage"],
        "T5":  ["assurance qualite", "plan qualite", "aqp",
                "management qualite", "normes qualite"],
    },

    # ── Niveaux officiels par savoir (N1=débutant … N5=expert) ────────────
    "niveaux": {
        # Sols
        "S2a": "N1_DEBUTANT",
        "S1a": "N2_ELEMENTAIRE",
        "S2b": "N2_ELEMENTAIRE",
        "S1b": "N3_INTERMEDIAIRE",
        "S1c": "N3_INTERMEDIAIRE",
        "S6b": "N3_INTERMEDIAIRE",
        "S1d": "N4_AVANCE",
        "S6a": "N4_AVANCE",
        "S3":  "N5_EXPERT",
        "S4":  "N5_EXPERT",
        "S5":  "N5_EXPERT",
        "S6c": "N5_EXPERT",
        # Construction
        "C1b": "N3_INTERMEDIAIRE",
        "C2b": "N3_INTERMEDIAIRE",
        "C3b": "N3_INTERMEDIAIRE",
        "C4":  "N4_AVANCE",
        "C1c": "N4_AVANCE",
        "C1a": "N4_AVANCE",
        "C2c": "N4_AVANCE",
        "C3a": "N4_AVANCE",
        "C3c": "N4_AVANCE",
        "C2a": "N4_AVANCE",
        "C5":  "N5_EXPERT",
        "C6":  "N5_EXPERT",
        "C7":  "N5_EXPERT",
        "C8":  "N5_EXPERT",
        # Physique du bâtiment
        "P1b": "N3_INTERMEDIAIRE",
        "P2":  "N3_INTERMEDIAIRE",
        "P3":  "N4_AVANCE",
        "P1c": "N4_AVANCE",
        "P1a": "N5_EXPERT",
        # Eau
        "E1b": "N4_AVANCE",
        "E1a": "N5_EXPERT",
        "E2":  "N5_EXPERT",
        "E3":  "N5_EXPERT",
        # Urbanisme
        "U1":  "N3_INTERMEDIAIRE",
        "U2":  "N3_INTERMEDIAIRE",
        "U3a": "N5_EXPERT",
        "U3b": "N5_EXPERT",
        # Transversales
        "T2":  "N4_AVANCE",
        "T1":  "N5_EXPERT",
        "T3":  "N5_EXPERT",
        "T4":  "N5_EXPERT",
        "T5":  "N5_EXPERT",
    },
}

# Legacy alias
_GC_REFERENTIAL = _GC_FALLBACK_REF

# ─────────────────────────────────────────────────────────────────────────────
# DB-backed referential (multi-department, merges DB + per-dept fallback)
# ─────────────────────────────────────────────────────────────────────────────

_REF_DB_CACHE = _ThreadSafeCache()
_REF_DB_TTL: float = 600.0  # 10 minutes

_EMPTY_REFERENTIAL: Dict = {"domaines": {}, "competences": {}, "savoirs": {}, "niveaux": {}}

_GENERIC_FALLBACK_REF: Dict = {
    "domaines":    {"GEN": "Compétences Générales"},
    "competences": {},
    "savoirs":     {},
    "niveaux": {
        "N1_DEBUTANT":      {"label": "Débutant",      "score": 1},
        "N2_ELEMENTAIRE":   {"label": "Élémentaire",   "score": 2},
        "N3_INTERMEDIAIRE": {"label": "Intermédiaire", "score": 3},
        "N4_AVANCE":        {"label": "Avancé",        "score": 4},
        "N5_EXPERT":        {"label": "Expert",        "score": 5},
    },
}


def _load_ref_from_db(departement: str = "gc") -> Optional[Dict]:
    """Load the full department referential from DB: savoirs + competences + domaines.

    Tables queried (all optional – graceful degradation when absent):
    * ``ref_savoirs``    – savoir keywords, filtered by ``departement`` column when present
    * ``ref_competences``– competence keywords per department (created by migrate script)
    * ``ref_domaines``   – domain names per department (created by migrate script)

    Behaviour:
    * Génie Civil (``departement='gc'``): DB rows are merged **on top of** the
      built-in ``_GC_FALLBACK_REF`` so that the in-memory dictionary acts as a
      safety net when the DB table is empty or absent.
    * Any other department: only DB rows are used.  Populate the tables via
      ``seed_autres_departements.py`` (or the migration SQL script).

    Returns the merged referential dict, or ``None`` on DB error / table absent.
    """
    global _SEMANTIC_CORPUS_BUILT
    dept_key = departement.lower().strip()
    cached = _REF_DB_CACHE.get(dept_key, ttl=_REF_DB_TTL)
    if cached is not None:
        return cached
    try:
        conn = _get_db_connection()
        cur = conn.cursor()

        # ── 1. Check ref_savoirs table existence ──────────────────────────
        cur.execute("""
            SELECT EXISTS (
                SELECT 1 FROM information_schema.tables
                WHERE table_schema = 'public' AND table_name = 'ref_savoirs'
            )
        """)
        if not cur.fetchone()[0]:
            cur.close(); _put_db_connection(conn)
            return None

        # ── 2. Load savoirs (filter by departement column when present) ────
        cur.execute("""
            SELECT column_name FROM information_schema.columns
            WHERE table_schema = 'public' AND table_name = 'ref_savoirs'
              AND column_name = 'departement'
        """)
        has_dept_col = cur.fetchone() is not None
        if has_dept_col:
            cur.execute("SELECT code, nom, keywords FROM ref_savoirs WHERE departement = %s",
                        (dept_key,))
        else:
            cur.execute("SELECT code, nom, keywords FROM ref_savoirs")
        override: Dict[str, List] = {}
        for code, nom, keywords in cur.fetchall():
            if isinstance(keywords, list):
                kws = list(keywords)
            elif isinstance(keywords, str):
                kws = [k.strip().lower() for k in keywords.split(',') if k.strip()]
            else:
                kws = []
            if nom:
                kws_norm = [_normalize(k) for k in kws]
                nom_norm = _normalize(nom)
                if nom_norm not in kws_norm:
                    kws.append(nom.lower())
            override[code] = kws

        # ── 3. Load competences from ref_competences (if table exists) ─────
        db_competences: Dict[str, Any] = {}
        try:
            cur.execute("""
                SELECT EXISTS (
                    SELECT 1 FROM information_schema.tables
                    WHERE table_schema = 'public' AND table_name = 'ref_competences'
                )
            """)
            if cur.fetchone()[0]:
                cur.execute("""
                    SELECT code, nom, keywords
                    FROM ref_competences
                    WHERE departement = %s
                """, (dept_key,))
                for comp_code, comp_nom, comp_kws in cur.fetchall():
                    kws = comp_kws if isinstance(comp_kws, list) else (
                        [k.strip().lower() for k in (comp_kws or "").split(",") if k.strip()]
                    )
                    db_competences[comp_code] = {
                        "nom": comp_nom or comp_code,
                        "keywords": kws,
                    }
        except Exception as comp_exc:
            logger.debug(f"Cannot load ref_competences for [{dept_key}]: {comp_exc}")

        # ── 4. Load domaines from ref_domaines (if table exists) ───────────
        db_domaines: Dict[str, str] = {}
        try:
            cur.execute("""
                SELECT EXISTS (
                    SELECT 1 FROM information_schema.tables
                    WHERE table_schema = 'public' AND table_name = 'ref_domaines'
                )
            """)
            if cur.fetchone()[0]:
                cur.execute("""
                    SELECT code, nom FROM ref_domaines WHERE departement = %s
                """, (dept_key,))
                for dom_code, dom_nom in cur.fetchall():
                    db_domaines[dom_code] = dom_nom or dom_code
        except Exception as dom_exc:
            logger.debug(f"Cannot load ref_domaines for [{dept_key}]: {dom_exc}")

        cur.close(); _put_db_connection(conn)

        if override or db_competences or db_domaines:
            if dept_key in ("gc", "genie_civil", "genie-civil"):
                base = _GC_FALLBACK_REF
                merged: Dict = {
                    **base,
                    "savoirs":     {**base["savoirs"],    **override},
                    "competences": {**base["competences"], **db_competences} if db_competences else base["competences"],
                    "domaines":    {**base["domaines"],    **db_domaines}    if db_domaines    else base["domaines"],
                }
            else:
                merged = {
                    **_EMPTY_REFERENTIAL,
                    "savoirs":     override,
                    "competences": db_competences,
                    "domaines":    db_domaines,
                    "niveaux":     {},
                }
                try:
                    conn2 = _get_db_connection()
                    cur2 = conn2.cursor()
                    cur2.execute("""
                        SELECT column_name FROM information_schema.columns
                        WHERE table_schema = 'public' AND table_name = 'ref_savoirs'
                          AND column_name = 'niveau'
                    """)
                    if cur2.fetchone():
                        cur2.execute("""
                            SELECT code, niveau FROM ref_savoirs
                            WHERE departement = %s AND niveau IS NOT NULL
                        """, (dept_key,))
                        for sav_code, sav_niveau in cur2.fetchall():
                            merged["niveaux"][sav_code] = sav_niveau
                    cur2.close(); _put_db_connection(conn2)
                except Exception:
                    pass

            _REF_DB_CACHE.set(dept_key, merged)
            logger.info(
                f"Referential loaded from DB [{dept_key}]: "
                f"{len(override)} savoirs, {len(db_competences)} compétences, "
                f"{len(db_domaines)} domaines"
            )
            _SEMANTIC_CORPUS_BUILT = False
            return merged
    except Exception as exc:
        logger.debug(f"Cannot load referential from DB for [{dept_key}] (ok if absent): {exc}")
    return None


# ── JSON-file-based generic referentials (fallback when DB is absent) ──────────

_GENERIC_REF_DIR = Path(__file__).resolve().parent.parent / "refs"
_GENERIC_REF_MAPPING_PATH = _GENERIC_REF_DIR / "generic_ref.json"


def _load_generic_ref(departement: str) -> Dict:
    """Load a department referential from the JSON files in ``refs/``.

    Falls back to ``_GENERIC_FALLBACK_REF`` if the file is missing or corrupt.
    """
    try:
        mapping = _json_local.loads(_GENERIC_REF_MAPPING_PATH.read_text(encoding="utf-8"))
        rel_path = mapping.get(departement.lower().strip())
        if not rel_path:
            logger.info(f"No generic ref mapping entry for '{departement}'")
            return _GENERIC_FALLBACK_REF
        ref_file = _GENERIC_REF_DIR / Path(rel_path).name
        if not ref_file.is_file():
            ref_file = Path(__file__).resolve().parent.parent / rel_path
        if not ref_file.is_file():
            logger.info(f"Generic ref file not found for '{departement}': {ref_file}")
            return _GENERIC_FALLBACK_REF
        data = _json_local.loads(ref_file.read_text(encoding="utf-8"))
        for key in ("domaines", "competences", "savoirs", "niveaux"):
            if key not in data:
                data[key] = {}
        logger.info(f"Generic ref loaded from JSON for '{departement}': "
                    f"{len(data.get('savoirs', {}))} savoirs")
        return data
    except Exception as exc:
        logger.warning(f"Impossible de charger le référentiel générique pour '{departement}': {exc}")
        return _GENERIC_FALLBACK_REF


def _get_effective_referential(departement: str = "gc") -> Dict:
    """Return the active referential for the given department.

    Priority:
      1. DB-backed referential (cached, merged with fallback for GC).
      2. JSON-file generic referential from ``refs/``.
      3. Built-in ``_GC_FALLBACK_REF`` for GC, or ``_GENERIC_FALLBACK_REF``.
    """
    dept_key = departement.lower().strip()
    db_ref = _load_ref_from_db(dept_key)
    if db_ref is not None:
        return db_ref
    if dept_key in ("gc", "genie_civil", "genie-civil"):
        return _GC_FALLBACK_REF
    logger.info(f"Chargement du référentiel générique pour le département '{dept_key}'")
    return _load_generic_ref(dept_key)


def _get_effective_gc_referential() -> Dict:
    return _get_effective_referential("gc")


# ─────────────────────────────────────────────────────────────────────────────
# Keyword matching
# ─────────────────────────────────────────────────────────────────────────────

def _match_gc_savoir(text: str, departement: str = "gc") -> List[str]:
    """
    Match text against the department referential to find matching savoir codes.

    Strategy:
      1. **Semantic matching** (primary) — sentence-transformer embeddings.
      2. **Keyword matching** (high-confidence override) — exact keyword hits.

    Returns a deduplicated list of savoir codes sorted by relevance.
    """
    ref = _get_effective_referential(departement)
    norm = _normalize(text)

    semantic_codes: List[str] = []
    if _SEMANTIC_OK:
        semantic_codes = _match_gc_savoir_semantic(text, departement=departement)
        if semantic_codes:
            logger.debug(f"Semantic [{departement}]: '{text[:60]}' → {semantic_codes}")

    matches = []
    for code, keywords in ref["savoirs"].items():
        score = sum(1 for kw in keywords if kw in norm)
        if score > 0:
            matches.append((code, score))
    matches.sort(key=lambda x: x[1], reverse=True)
    keyword_codes = [code for code, _ in matches]

    if keyword_codes:
        seen = set(keyword_codes)
        return keyword_codes + [c for c in semantic_codes if c not in seen]
    return semantic_codes


def _gc_ref_niveau(gc_codes: List[str], departement: str = "gc") -> Optional[str]:
    niveaux_map = _get_effective_referential(departement).get("niveaux", {})
    for code in gc_codes:
        if code in niveaux_map:
            return niveaux_map[code]
    return None


def _match_gc_competence(text: str, departement: str = "gc") -> Optional[str]:
    ref = _get_effective_referential(departement)
    norm = _normalize(text)
    best_code = None
    best_score = 0
    for code, info in ref["competences"].items():
        score = sum(1 for kw in info["keywords"] if kw in norm)
        if score > best_score:
            best_score = score
            best_code = code
    return best_code if best_score > 0 else None


def _suggest_gc_enseignants(savoir_codes: List[str]) -> List[str]:
    affectations = _fetch_enseignant_affectations()
    suggested = set()
    for ens_id, codes in affectations.items():
        if any(_codes_match(ec, sc) for ec in codes for sc in savoir_codes):
            suggested.add(ens_id)
    return list(suggested)


# ─────────────────────────────────────────────────────────────────────────────
# _DepartmentReferentialManager
# ─────────────────────────────────────────────────────────────────────────────

class _DepartmentReferentialManager:
    """High-level façade for accessing per-department referentials."""

    KNOWN_DEPARTMENTS: List[str] = ["gc", "info", "ge", "meca", "telecom"]

    def get_referential(self, department: str) -> Dict:
        return _get_effective_referential(department)

    def match_savoir(self, text: str, department: str) -> List[str]:
        return _match_gc_savoir(text, departement=department)

    def match_competence(self, text: str, department: str) -> Optional[str]:
        return _match_gc_competence(text, departement=department)

    def get_niveau(self, savoir_codes: List[str], department: str) -> Optional[str]:
        return _gc_ref_niveau(savoir_codes, departement=department)

    def suggest_teachers(self, savoir_codes: List[str]) -> List[str]:
        return _suggest_gc_enseignants(savoir_codes)

    def detect_type(self, text: str, department: str) -> str:
        return _detect_type(text, departement=department)

    def invalidate(self, department: str) -> None:
        dept_key = department.lower().strip()
        _REF_DB_CACHE.pop(dept_key)
        logger.info("Referential cache invalidated for [%s]", dept_key)

    def invalidate_all(self) -> None:
        global _SEMANTIC_CORPUS_BUILT
        _REF_DB_CACHE.clear()
        _SEMANTIC_CORPUS_BUILT = False
        logger.info("All referential caches invalidated")

    def list_departments(self) -> List[str]:
        return list(self.KNOWN_DEPARTMENTS)

    def stats(self, department: str) -> Dict[str, int]:
        ref = self.get_referential(department)
        return {
            "savoirs":     len(ref.get("savoirs", {})),
            "competences": len(ref.get("competences", {})),
            "domaines":    len(ref.get("domaines", {})),
            "niveaux":     len(ref.get("niveaux", {})),
        }


_dept_ref_manager = _DepartmentReferentialManager()


# ─────────────────────────────────────────────────────────────────────────────
# Semantic matching (sentence-transformers, optional)
# ─────────────────────────────────────────────────────────────────────────────

_SEMANTIC_MODEL = None
_SEMANTIC_CORPUS: List[Tuple[str, Any]] = []
_SEMANTIC_CORPUS_BUILT: bool = False
_SEMANTIC_CORPUS_DEPT: str = ""
_SEMANTIC_CORPUS_LOCK = _threading.Lock()


def _get_semantic_model():
    global _SEMANTIC_MODEL
    if _SEMANTIC_MODEL is None and _SEMANTIC_OK:
        try:
            _SEMANTIC_MODEL = _SentenceTransformer('all-MiniLM-L6-v2')
            logger.info("Semantic model loaded: all-MiniLM-L6-v2")
        except Exception as exc:
            logger.warning(f"Cannot load semantic model: {exc}")
    return _SEMANTIC_MODEL


_SEMANTIC_CACHE_DIR = Path(__file__).resolve().parent.parent / "_semantic_cache"


def _build_semantic_corpus(departement: str = "gc") -> None:
    """Pre-compute embeddings for every savoir description for the given department."""
    global _SEMANTIC_CORPUS, _SEMANTIC_CORPUS_BUILT, _SEMANTIC_CORPUS_DEPT
    with _SEMANTIC_CORPUS_LOCK:
        dept_key = departement.lower().strip()
        if _SEMANTIC_CORPUS_BUILT and _SEMANTIC_CORPUS_DEPT == dept_key:
            return
        model = _get_semantic_model()
        if not model:
            return
        ref = _get_effective_referential(departement)
        codes = list(ref["savoirs"].keys())
        descriptions = [" ".join(kws) for kws in ref["savoirs"].values()]
        if not codes:
            return

        cache_file = _SEMANTIC_CACHE_DIR / f"{dept_key}.npy"
        if _SEMANTIC_OK and cache_file.is_file():
            try:
                cached_embeddings = _np.load(str(cache_file))
                if cached_embeddings.shape[0] == len(codes):
                    _SEMANTIC_CORPUS = list(zip(codes, cached_embeddings))
                    _SEMANTIC_CORPUS_BUILT = True
                    _SEMANTIC_CORPUS_DEPT = dept_key
                    logger.info(f"Embeddings sémantiques chargés depuis le disque pour [{dept_key}] "
                                f"({len(codes)} vecteurs)")
                    return
                else:
                    logger.info(f"Cache embeddings size mismatch for [{dept_key}], rebuilding")
            except Exception as exc:
                logger.warning(f"Erreur lecture cache embeddings [{dept_key}]: {exc}")

        try:
            embeddings = model.encode(descriptions, convert_to_numpy=True)
            _SEMANTIC_CORPUS = list(zip(codes, embeddings))
            _SEMANTIC_CORPUS_BUILT = True
            _SEMANTIC_CORPUS_DEPT = dept_key
            logger.info(f"Semantic corpus built [{departement}]: {len(_SEMANTIC_CORPUS)} savoir embeddings")
            try:
                _SEMANTIC_CACHE_DIR.mkdir(parents=True, exist_ok=True)
                _np.save(str(cache_file), embeddings)
                logger.info(f"Embeddings sémantiques persistés sur disque ({len(embeddings)} vecteurs) [{dept_key}]")
            except Exception as save_exc:
                logger.warning(f"Impossible de persister le corpus sémantique [{dept_key}]: {save_exc}")
        except Exception as exc:
            logger.warning(f"Cannot build semantic corpus: {exc}")


def _match_gc_savoir_semantic(text: str, threshold: float = 0.35, top_k: int = 5,
                               departement: str = "gc") -> List[str]:
    if not _SEMANTIC_OK:
        return []
    if not _SEMANTIC_CORPUS_BUILT or _SEMANTIC_CORPUS_DEPT != departement.lower().strip():
        _build_semantic_corpus(departement)
    if not _SEMANTIC_CORPUS:
        return []
    model = _get_semantic_model()
    if not model:
        return []
    try:
        q_emb = model.encode([text], convert_to_numpy=True)[0]
        scores: List[Tuple[str, float]] = []
        for code, emb in _SEMANTIC_CORPUS:
            norm_val = float(_np.linalg.norm(q_emb) * _np.linalg.norm(emb))
            sim = float(_np.dot(q_emb, emb)) / (norm_val + 1e-8)
            if sim >= threshold:
                scores.append((code, sim))
        scores.sort(key=lambda x: x[1], reverse=True)
        return [c for c, _ in scores[:top_k]]
    except Exception as exc:
        logger.warning(f"Semantic matching error: {exc}")
        return []


def _detect_departement(filenames: List[str], contents: List[bytes]) -> str:
    """Heuristically infer the ESPRIT department code from filenames and file text."""
    combined = " ".join(filenames).lower()
    for data in contents:
        try:
            combined += " " + data[:4096].decode("utf-8", errors="ignore").lower()
        except Exception:
            pass

    _DEPT_SIGNALS = [
        ("gc",     ["genie civil", "beton", "fondation", "structure portante",
                    "hydraulique", "topographie", "geotechnique", "ouvrage"]),
        ("info",   ["informatique", "algorithmique", "programmation", "logiciel",
                    "base de donnee", "reseau informatique", "developpement web",
                    "test logiciel", "validation logiciel", "genie logiciel",
                    "up-il", "up_il", "pidev", "devops", "architecture logiciel",
                    "integration continue", "qualite logiciel", "framework",
                    "java", "python", "javascript", "angular", "spring",
                    "microservice", "api rest", "cloud", "intelligence artificielle",
                    "machine learning", "deep learning", "big data",
                    "infdev", "infsec", "infweb"]),
        ("ge",     ["genie electrique", "electronique", "electrotechnique",
                    "automatique", "energie electrique"]),
        ("meca",   ["genie mecanique", "mecanique", "thermodynamique",
                    "fabrication", "usinage"]),
        ("telecom", ["telecom", "telecommunication", "signal numerique",
                     "radiocommunication"]),
    ]

    # Also detect department from UP (Unité Pédagogique) or UE codes
    up_match = re.search(r'(?:unit[eé]\s+p[eé]dagogique|UP)\s*[:\-]?\s*(UP[\-_]?[A-Z]{2,6})', combined, re.IGNORECASE)
    if up_match:
        up_code = up_match.group(1).upper().replace('-', '').replace('_', '')
        _UP_TO_DEPT = {
            'UPIL': 'info', 'UPGL': 'info', 'UPSIM': 'info', 'UPGC': 'gc',
            'UPGE': 'ge', 'UPMECA': 'meca', 'UPTELECOM': 'telecom',
        }
        up_dept = _UP_TO_DEPT.get(up_code)
        if up_dept:
            logger.info(f"Auto-detected department from UP code '{up_code}': '{up_dept}'")
            return up_dept

    ue_match = re.search(r'(?:unit[eé]\s+d[\x27\u2019]enseignement|UE)\s*[:\-]?\s*([A-Z]{3,6}\w{2,10})', combined, re.IGNORECASE)
    if ue_match:
        ue_code = ue_match.group(1).upper()
        if ue_code.startswith(('INF', 'DEV', 'WEB', 'SIM')):
            logger.info(f"Auto-detected department from UE code '{ue_code}': 'info'")
            return 'info'
        elif ue_code.startswith('GC'):
            logger.info(f"Auto-detected department from UE code '{ue_code}': 'gc'")
            return 'gc'
        elif ue_code.startswith('GE'):
            logger.info(f"Auto-detected department from UE code '{ue_code}': 'ge'")
            return 'ge'
    best_dept, best_score = "gc", 0
    for dept_code, keywords in _DEPT_SIGNALS:
        score = sum(1 for kw in keywords if kw in combined)
        if score > best_score:
            best_score = score
            best_dept = dept_code
    logger.info(f"Auto-detected department: '{best_dept}' (score={best_score})")
    return best_dept
