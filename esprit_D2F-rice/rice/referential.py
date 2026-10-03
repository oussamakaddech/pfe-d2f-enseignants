"""Referential data, DB loading, keyword/semantic matching, and DepartmentReferentialManager."""

from __future__ import annotations

import hashlib
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


def _sanitize_log(value: Any) -> str:
    """Neutralise une valeur contrôlée par l'utilisateur avant de la logger.

    Échappe les caractères de contrôle (injection de logs) et borne la longueur.
    """
    text = str(value)
    cleaned = re.sub(r"[\x00-\x1f\x7f]", "", text)
    return cleaned[:256]

_KW_DIAGNOSTIC_URBAIN = "diagnostic urbain"

# ── Optional imports ─────────────────────────────────────────────────────────
import os as _os
_SEMANTIC_DISABLED_BY_ENV = _os.environ.get("RICE_DISABLE_SEMANTIC", "").lower() in ("1", "true", "yes")

try:
    if _SEMANTIC_DISABLED_BY_ENV:
        raise ImportError("Semantic model disabled via RICE_DISABLE_SEMANTIC env var")
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
                "urbanisme", "amenagement urbain", _KW_DIAGNOSTIC_URBAIN,
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
                "hydraulique urbain conception", "hydrologie reseau conception",
                "conception hydraulique"],
        "E1b": ["dimensionner reseau hydraulique", "dimensionner ouvrage hydraulique",
                "calcul hydraulique", "dimensionner reseau assainissement",
                "reseau assainissement", "debit crue", "crue debit"],
        "E2":  ["diagnostic hydrologie quantitative", "gestion reseau hydraulique",
                "diagnostic reseau hydraulique", "hydrologie gestion",
                "hydrologie", "debit", "crue", "bassin versant",
                "hydrologie quantitative"],
        "E3":  ["diagnostic environnemental eau", "systeme gestion eaux",
                "traitement eaux", "gestion dechets eau", "assainissement diagnostic",
                "assainissement", "reseau eau"],
        # ── U – Urbanisme ─────────────────────────────────────────────────
        "U1":  ["analyser situation urbaine", "analyse urbaine", _KW_DIAGNOSTIC_URBAIN,
                "situation technique urbaine", "echelle urbaine"],
        "U2":  ["realiser diagnostic urbain", "etude urbaine", _KW_DIAGNOSTIC_URBAIN],
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


# Charge les savoirs d'un département depuis ref_savoirs (code → mots-clés).
# Gère l'absence de colonne "departement" et ajoute le nom du savoir aux keywords.
def _fetch_savoirs_from_db(cur, dept_key: str) -> Dict[str, List]:
    cur.execute("""
        SELECT column_name FROM information_schema.columns
        WHERE table_schema = 'public' AND table_name = 'ref_savoirs'
          AND column_name = 'departement'
    """)
    has_dept_col = cur.fetchone() is not None
    if has_dept_col:
        cur.execute("SELECT code, nom, keywords FROM ref_savoirs WHERE departement = %s", (dept_key,))
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
            if _normalize(nom) not in kws_norm:
                kws.append(nom.lower())
        override[code] = kws
    return override


# Charge les compétences (code → {nom, keywords}) depuis ref_competences
# (silencieux si la table n'existe pas).
def _fetch_competences_from_db(cur, dept_key: str) -> Dict[str, Any]:
    db_competences: Dict[str, Any] = {}
    try:
        cur.execute("""
            SELECT EXISTS (
                SELECT 1 FROM information_schema.tables
                WHERE table_schema = 'public' AND table_name = 'ref_competences'
            )
        """)
        if not cur.fetchone()[0]:
            return db_competences
        cur.execute("SELECT code, nom, keywords FROM ref_competences WHERE departement = %s", (dept_key,))
        for comp_code, comp_nom, comp_kws in cur.fetchall():
            kws = comp_kws if isinstance(comp_kws, list) else (
                [k.strip().lower() for k in (comp_kws or "").split(",") if k.strip()]
            )
            db_competences[comp_code] = {"nom": comp_nom or comp_code, "keywords": kws}
    except Exception as comp_exc:
        logger.debug(f"Cannot load ref_competences for [{dept_key}]: {comp_exc}")
    return db_competences


# Charge les domaines (code → nom) depuis ref_domaines.
def _fetch_domaines_from_db(cur, dept_key: str) -> Dict[str, str]:
    db_domaines: Dict[str, str] = {}
    try:
        cur.execute("""
            SELECT EXISTS (
                SELECT 1 FROM information_schema.tables
                WHERE table_schema = 'public' AND table_name = 'ref_domaines'
            )
        """)
        if not cur.fetchone()[0]:
            return db_domaines
        cur.execute("SELECT code, nom FROM ref_domaines WHERE departement = %s", (dept_key,))
        for dom_code, dom_nom in cur.fetchall():
            db_domaines[dom_code] = dom_nom or dom_code
    except Exception as dom_exc:
        logger.debug(f"Cannot load ref_domaines for [{dept_key}]: {dom_exc}")
    return db_domaines


# Charge le mapping code savoir → niveau officiel (N1..N5) depuis ref_savoirs.
def _fetch_niveaux_from_db(dept_key: str) -> Dict[str, str]:
    db_niveaux: Dict[str, str] = {}
    try:
        conn2 = _get_db_connection()
        cur2 = conn2.cursor()
        cur2.execute("""
            SELECT column_name FROM information_schema.columns
            WHERE table_schema = 'public' AND table_name = 'ref_savoirs'
              AND column_name = 'niveau'
        """)
        if cur2.fetchone():
            cur2.execute("SELECT code, niveau FROM ref_savoirs WHERE departement = %s AND niveau IS NOT NULL", (dept_key,))
            for sav_code, sav_niveau in cur2.fetchall():
                db_niveaux[sav_code] = sav_niveau
        cur2.close(); _put_db_connection(conn2)
    except Exception:
        pass
    return db_niveaux


# Fusionne le fallback GC intégré avec les données DB (les overrides DB gagnent).
def _merge_gc_ref(base: Dict, override: Dict, db_competences: Dict, db_domaines: Dict) -> Dict:
    return {
        **base,
        "savoirs":     {**base["savoirs"],    **override},
        "competences": {**base["competences"], **db_competences} if db_competences else base["competences"],
        "domaines":    {**base["domaines"],    **db_domaines}    if db_domaines    else base["domaines"],
    }


# Construit le référentiel d'un département NON-GC à partir des données DB
# (savoirs + compétences + domaines + niveaux) — structure vide de base.
def _merge_non_gc_ref(override: Dict, db_competences: Dict, db_domaines: Dict, dept_key: str) -> Dict:
    merged = {
        **_EMPTY_REFERENTIAL,
        "savoirs":     override,
        "competences": db_competences,
        "domaines":    db_domaines,
        "niveaux":     {},
    }
    db_niveaux = _fetch_niveaux_from_db(dept_key)
    if db_niveaux:
        merged["niveaux"] = db_niveaux
    return merged


# ── Référentiel officiel (schéma `competence`, géré par le service compétence) ──
# Département RICE → départements du référentiel (`competence.domaines.departement_id`).
# « info » regroupe les départements informatiques (tronc commun, GL, IA, Web).
# ge / meca n'ont pas de contenu en base : ils restent sur leur JSON de `refs/`.
_DEPT_TO_REFERENTIEL: Dict[str, Tuple[str, ...]] = {
    "gc": ("DEPT_GC",),
    "genie_civil": ("DEPT_GC",),
    "genie-civil": ("DEPT_GC",),
    "info": ("DEPT_INFO", "DEPT_GL", "DEPT_IA", "DEPT_WEB"),
    "telecom": ("DEPT_RT",),
}

# Un savoir est rattaché à une sous-compétence (chemin canonique) ou, à défaut,
# directement à une compétence (`savoirs.competence_id` dénormalisée).
_SQL_REFERENTIEL = """
    SELECT s.code, s.nom, s.description, sc.nom,
           c.code, c.nom, d.code, d.nom,
           COALESCE(nsr.niveau, s.niveau)
    FROM competence.savoirs s
    LEFT JOIN competence.sous_competences sc ON sc.id = s.sous_competence_id
    JOIN competence.competences c ON c.id = COALESCE(sc.competence_id, s.competence_id)
    JOIN competence.domaines d ON d.id = c.domaine_id
    LEFT JOIN (
        SELECT savoir_id, MAX(niveau) AS niveau
        FROM competence.niveau_savoir_requis
        WHERE savoir_id IS NOT NULL
        GROUP BY savoir_id
    ) nsr ON nsr.savoir_id = s.id
    WHERE d.departement_id = ANY(%s) AND COALESCE(d.actif, TRUE)
    ORDER BY s.code
"""


def _referentiel_from_rows(rows: List[Tuple]) -> Dict[str, Any]:
    """Construit la structure référentiel RICE à partir des lignes du schéma competence.

    * ``savoirs``       : code → mots-clés (libellé + description, en minuscules)
    * ``savoir_textes`` : code → texte riche encodé par le modèle sémantique
    * ``competences``   : code → {nom, keywords} ; les mots-clés incluent les codes
      des savoirs rattachés (``_match_gc_competence`` reçoit des codes joints)
    * ``niveaux``       : code savoir → niveau requis officiel (N1…N5)
    """
    savoirs: Dict[str, List[str]] = {}
    textes: Dict[str, str] = {}
    competences: Dict[str, Dict[str, Any]] = {}
    domaines: Dict[str, str] = {}
    niveaux: Dict[str, str] = {}
    for code, nom, description, sc_nom, c_code, c_nom, d_code, d_nom, niveau in rows:
        if not code or not nom:
            continue
        savoirs[code] = [k.strip().lower() for k in (nom, description) if k and k.strip()]
        textes[code] = ". ".join(p.strip() for p in (nom, description, sc_nom) if p and p.strip())
        comp = competences.setdefault(c_code, {"nom": c_nom or c_code, "keywords": [(c_nom or "").lower()]})
        comp["keywords"].append(code.lower())
        domaines[d_code] = d_nom or d_code
        if niveau:
            niveaux[code] = niveau
    return {
        "domaines": domaines,
        "competences": competences,
        "savoirs": savoirs,
        "savoir_textes": textes,
        "niveaux": niveaux,
        "source": "competence-db",
    }


def _load_ref_from_competence_schema(dept_key: str) -> Optional[Dict]:
    """Lit le référentiel officiel du département (lecture seule). None si indisponible."""
    departements = _DEPT_TO_REFERENTIEL.get(dept_key)
    if not departements:
        return None
    conn = _get_db_connection()
    try:
        cur = conn.cursor()
        try:
            cur.execute(_SQL_REFERENTIEL, (list(departements),))
            rows = cur.fetchall()
        finally:
            cur.close()
    finally:
        _put_db_connection(conn)
    if not isinstance(rows, list) or not rows:
        return None
    ref = _referentiel_from_rows(rows)
    # Un référentiel sans savoir exploitable ne doit jamais masquer le repli.
    return ref if ref["savoirs"] else None


# Charge le référentiel d'un département depuis la base (cache 10 min).
# Source 1 : référentiel officiel (schéma competence) ; source 2 (historique) :
# tables public.ref_*. None si aucune n'est disponible.
def _load_ref_from_db(departement: str = "gc") -> Optional[Dict]:
    global _SEMANTIC_CORPUS_BUILT
    dept_key = departement.lower().strip()
    cached = _REF_DB_CACHE.get(dept_key, ttl=_REF_DB_TTL)
    if cached is not None:
        return cached
    try:
        official = _load_ref_from_competence_schema(dept_key)
    except Exception as exc:
        official = None
        logger.warning(
            "Référentiel officiel illisible pour [%s] (droits SELECT sur le schéma competence ?) : %s",
            _sanitize_log(dept_key), _sanitize_log(exc),
        )
    if official is not None:
        _REF_DB_CACHE.set(dept_key, official)
        logger.info(
            "Referential loaded from competence schema [%s]: %d savoirs, %d compétences",
            _sanitize_log(dept_key), len(official["savoirs"]), len(official["competences"]),
        )
        return official
    try:
        conn = _get_db_connection()
        cur = conn.cursor()
        cur.execute("""
            SELECT EXISTS (
                SELECT 1 FROM information_schema.tables
                WHERE table_schema = 'public' AND table_name = 'ref_savoirs'
            )
        """)
        if not cur.fetchone()[0]:
            cur.close(); _put_db_connection(conn)
            return None

        override = _fetch_savoirs_from_db(cur, dept_key)
        db_competences = _fetch_competences_from_db(cur, dept_key)
        db_domaines = _fetch_domaines_from_db(cur, dept_key)
        cur.close(); _put_db_connection(conn)

        if not override and not db_competences and not db_domaines:
            return None

        is_gc = dept_key in ("gc", "genie_civil", "genie-civil")
        merged = _merge_gc_ref(_GC_FALLBACK_REF, override, db_competences, db_domaines) if is_gc \
            else _merge_non_gc_ref(override, db_competences, db_domaines, dept_key)

        _REF_DB_CACHE.set(dept_key, merged)
        logger.info(
            f"Referential loaded from DB [{_sanitize_log(dept_key)}]: "
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
            logger.info(f"No generic ref mapping entry for '{_sanitize_log(departement)}'")
            return _GENERIC_FALLBACK_REF
        ref_file = _GENERIC_REF_DIR / Path(rel_path).name
        if not ref_file.is_file():
            ref_file = Path(__file__).resolve().parent.parent / rel_path
        if not ref_file.is_file():
            logger.info(f"Generic ref file not found for '{_sanitize_log(departement)}': {_sanitize_log(ref_file)}")
            return _GENERIC_FALLBACK_REF
        data = _json_local.loads(ref_file.read_text(encoding="utf-8"))
        for key in ("domaines", "competences", "savoirs", "niveaux"):
            if key not in data:
                data[key] = {}
        logger.info(f"Generic ref loaded from JSON for '{_sanitize_log(departement)}': "
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
    logger.info(f"Chargement du référentiel générique pour le département '{_sanitize_log(dept_key)}'")
    return _load_generic_ref(dept_key)


# Raccourci : référentiel effectif du GC uniquement.
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

    norm_words = set(norm.split())
    matches = [
        (code, _score_keywords(norm, norm_words, keywords))
        for code, keywords in ref["savoirs"].items()
    ]
    matches = [(code, score) for code, score in matches if score > 0]
    matches.sort(key=lambda x: x[1], reverse=True)
    keyword_codes = [code for code, _ in matches]

    if keyword_codes:
        seen = set(keyword_codes)
        return keyword_codes + [c for c in semantic_codes if c not in seen]
    return semantic_codes


# Renvoie le niveau officiel (N1..N5) du premier code de savoir trouvé dans
# le mapping "niveaux" du référentiel du département.
def _gc_ref_niveau(gc_codes: List[str], departement: str = "gc") -> Optional[str]:
    niveaux_map = _get_effective_referential(departement).get("niveaux", {})
    for code in gc_codes:
        if code in niveaux_map:
            return niveaux_map[code]
    return None


# Matche un texte contre les COMPÉTENCES du référentiel (scoring mots-clés)
# et renvoie le code de la meilleure compétence, ou None si score nul.
def _match_gc_competence(text: str, departement: str = "gc") -> Optional[str]:
    ref = _get_effective_referential(departement)
    norm = _normalize(text)
    norm_words = set(norm.split())
    best_code, best_score = None, 0
    for code, info in ref["competences"].items():
        score = _score_keywords(norm, norm_words, info["keywords"])
        if score > best_score:
            best_score = score
            best_code = code
    return best_code if best_score > 0 else None


# Suggère les enseignants de la base dont les savoirs affectés correspondent
# aux codes de savoir donnés (matching tolérant aux préfixes de département).
def _suggest_gc_enseignants(savoir_codes: List[str]) -> List[str]:
    affectations = _fetch_enseignant_affectations()
    suggested = set()
    for ens_id, codes in affectations.items():
        if any(_codes_match(ec, sc) for ec in codes for sc in savoir_codes):
            suggested.add(ens_id)
    return list(suggested)


def _score_keywords(norm_text: str, norm_words: set, keywords: List[str]) -> int:
    """Calculate keyword match score for given normalized text and keyword list."""
    score = 0
    for kw in keywords:
        norm_kw = _normalize(kw)
        kw_words = norm_kw.split()
        if norm_kw in norm_text:
            # Tier-1: full phrase match — high score (word count × 2)
            score += len(kw_words) * 2
        elif len(kw_words) > 1 and all(w in norm_words for w in kw_words):
            # Tier-2: all words present but not consecutive — lower score
            score += len(kw_words)
        elif len(kw_words) == 1 and kw_words[0] in norm_words:
            # Single-word keyword exact word match
            score += 1
    return score


# _DepartmentReferentialManager

class _DepartmentReferentialManager:
    """High-level façade for accessing per-department referentials."""

    KNOWN_DEPARTMENTS: List[str] = ["gc", "info", "ge", "meca", "telecom"]

    # Façade : référentiel effectif d'un département.
    def get_referential(self, department: str) -> Dict:
        return _get_effective_referential(department)

    # Façade : matching savoir (sémantique + mots-clés).
    def match_savoir(self, text: str, department: str) -> List[str]:
        return _match_gc_savoir(text, departement=department)

    # Façade : meilleure compétence correspondant à un texte.
    def match_competence(self, text: str, department: str) -> Optional[str]:
        return _match_gc_competence(text, departement=department)

    # Façade : niveau officiel de codes de savoir.
    def get_niveau(self, savoir_codes: List[str], department: str) -> Optional[str]:
        return _gc_ref_niveau(savoir_codes, departement=department)

    # Façade : enseignants suggérés pour des codes de savoir.
    def suggest_teachers(self, savoir_codes: List[str]) -> List[str]:
        return _suggest_gc_enseignants(savoir_codes)

    # Façade : classification PRATIQUE / THEORIQUE.
    def detect_type(self, text: str, department: str) -> str:
        return _detect_type(text, departement=department)

    # Invalide le cache du référentiel d'un seul département.
    def invalidate(self, department: str) -> None:
        dept_key = department.lower().strip()
        _REF_DB_CACHE.pop(dept_key)
        logger.info("Referential cache invalidated for [%s]", dept_key)

    # Invalide TOUS les caches référentiels + force la reconstruction du corpus sémantique.
    def invalidate_all(self) -> None:
        global _SEMANTIC_CORPUS_BUILT
        _REF_DB_CACHE.clear()
        _SEMANTIC_CORPUS_BUILT = False
        logger.info("All referential caches invalidated")

    # Liste les départements connus (gc, info, ge, meca, telecom).
    def list_departments(self) -> List[str]:
        return list(self.KNOWN_DEPARTMENTS)

    # Statistiques d'un référentiel : nombre de savoirs / compétences / domaines.
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
_SEMANTIC_MODEL_REF: str = ""
# Compatibilité : dernier corpus construit (liste (code, vecteur)).
_SEMANTIC_CORPUS: List[Tuple[str, Any]] = []
_SEMANTIC_CORPUS_BUILT: bool = False
_SEMANTIC_CORPUS_DEPT: str = ""
_SEMANTIC_CORPUS_LOCK = _threading.Lock()
# Un corpus par département : {dept: {"fingerprint", "codes", "matrix"}}.
# Deux requêtes sur des départements différents ne s'écrasent plus mutuellement.
_SEMANTIC_CORPORA: Dict[str, Dict[str, Any]] = {}

# Seuil de similarité cosinus (vecteurs normalisés) en dessous duquel aucun
# savoir n'est proposé. Surchargeable sans rebuild (RICE_SEMANTIC_THRESHOLD).
try:
    _SEMANTIC_THRESHOLD = float(_os.getenv("RICE_SEMANTIC_THRESHOLD", "0.40"))
except ValueError:
    _SEMANTIC_THRESHOLD = 0.40

# Préfixes attendus par certains modèles (famille e5 : "query: " / "passage: ").
# Vides par défaut (modèles sentence-transformers classiques).
_SEMANTIC_QUERY_PREFIX = _os.getenv("RICE_SEMANTIC_QUERY_PREFIX", "")
_SEMANTIC_PASSAGE_PREFIX = _os.getenv("RICE_SEMANTIC_PASSAGE_PREFIX", "")


# Charge (lazy, thread-safe) le modèle sentence-transformers ; révision
# épinglée via RICE_SEMANTIC_MODEL_REVISION. None si indisponible.
def _get_semantic_model():
    global _SEMANTIC_MODEL, _SEMANTIC_MODEL_REF
    if _SEMANTIC_MODEL is None and _SEMANTIC_OK:
        # DSI #9 — pas de téléchargement HuggingFace au runtime : en conteneur,
        # RICE_SEMANTIC_MODEL pointe sur un chemin LOCAL pré-téléchargé (révision
        # épinglée) ; en dev on retombe sur l'identifiant HF + révision épinglée.
        # Modèle multilingue (les fiches sont en français) : choisi sur banc
        # d'évaluation FR contre all-MiniLM-L6-v2 (anglais), cf. README.
        model_ref = _os.getenv("RICE_SEMANTIC_MODEL", "sentence-transformers/paraphrase-multilingual-MiniLM-L12-v2")
        try:
            if _os.path.isdir(model_ref):
                _SEMANTIC_MODEL = _SentenceTransformer(model_ref)
                # L'image écrit « dépôt@révision » à côté du modèle vendu : c'est
                # l'identité réelle (le chemin seul ne distingue pas deux modèles).
                id_file = Path(model_ref) / "MODEL_ID"
                if id_file.is_file():
                    model_ref = id_file.read_text(encoding="utf-8").strip() or model_ref
            else:
                _SEMANTIC_MODEL = _SentenceTransformer(
                    model_ref,
                    revision=_os.getenv(
                        "RICE_SEMANTIC_MODEL_REVISION",
                        "e8f8c211226b894fcb81acc59f3b34ba3efd5f42",
                    ),
                )
            _SEMANTIC_MODEL_REF = model_ref
            logger.info("Semantic model loaded: %s", model_ref)
        except Exception as exc:
            logger.warning(f"Cannot load semantic model: {exc}")
    return _SEMANTIC_MODEL


_SEMANTIC_CACHE_DIR = Path(
    _os.getenv("RICE_SEMANTIC_CACHE_DIR", str(Path(__file__).resolve().parent.parent / "_semantic_cache"))
)


# Textes encodés pour chaque savoir : texte riche du référentiel officiel
# (libellé + description + sous-compétence) sinon concaténation des mots-clés.
def _semantic_corpus_texts(ref: Dict) -> Tuple[List[str], List[str]]:
    textes = ref.get("savoir_textes") or {}
    codes = list(ref.get("savoirs", {}).keys())
    texts = [textes.get(c) or " ".join(ref["savoirs"][c]) for c in codes]
    return codes, texts


# Empreinte du corpus : change dès que le modèle, un code ou un texte change.
# Un cache disque ne peut donc plus servir des vecteurs périmés (l'ancien
# contrôle ne portait que sur le nombre de lignes).
def _corpus_fingerprint(model_ref: str, codes: List[str], texts: List[str]) -> str:
    h = hashlib.sha256(model_ref.encode("utf-8"))
    for code, text in zip(codes, texts):
        h.update(f"|{code}={text}".encode("utf-8"))
    return h.hexdigest()


def _load_or_encode(model, dept_key: str, fingerprint: str, texts: List[str]):
    cache_file = _SEMANTIC_CACHE_DIR / f"{dept_key}-{fingerprint[:16]}.npy"
    if cache_file.is_file():
        try:
            matrix = _np.load(str(cache_file))
            if matrix.shape[0] == len(texts):
                logger.info("Embeddings sémantiques chargés depuis le disque [%s] (%d vecteurs)",
                            dept_key, len(texts))
                return matrix
        except Exception as exc:
            logger.warning(f"Erreur lecture cache embeddings [{dept_key}]: {exc}")
    matrix = model.encode([_SEMANTIC_PASSAGE_PREFIX + t for t in texts],
                          convert_to_numpy=True, normalize_embeddings=True)
    try:
        _SEMANTIC_CACHE_DIR.mkdir(parents=True, exist_ok=True)
        _np.save(str(cache_file), matrix)
    except Exception as save_exc:
        logger.info("Cache embeddings non persisté [%s] (recalcul au démarrage) : %s", dept_key, save_exc)
    return matrix


def _build_semantic_corpus(departement: str = "gc") -> None:
    """Pré-calcule (ou recharge) les embeddings des savoirs d'un département.

    Idempotent et peu coûteux quand le corpus est à jour : seule l'empreinte
    (modèle + textes du référentiel courant) est recalculée.
    """
    global _SEMANTIC_CORPUS, _SEMANTIC_CORPUS_BUILT, _SEMANTIC_CORPUS_DEPT
    with _SEMANTIC_CORPUS_LOCK:
        dept_key = departement.lower().strip()
        model = _get_semantic_model()
        if not model:
            return
        codes, texts = _semantic_corpus_texts(_get_effective_referential(departement))
        if not codes:
            return
        fingerprint = _corpus_fingerprint(_SEMANTIC_MODEL_REF + "|" + _SEMANTIC_PASSAGE_PREFIX, codes, texts)
        entry = _SEMANTIC_CORPORA.get(dept_key)
        if entry is None or entry["fingerprint"] != fingerprint:
            try:
                matrix = _load_or_encode(model, dept_key, fingerprint, texts)
            except Exception as exc:
                logger.warning(f"Cannot build semantic corpus: {exc}")
                return
            mean = matrix.mean(axis=0) if len(codes) > 1 else _np.zeros_like(matrix[0])
            entry = {"fingerprint": fingerprint, "codes": codes, "matrix": matrix,
                     "mean": mean, "centered": _unit_rows(matrix - mean)}
            _SEMANTIC_CORPORA[dept_key] = entry
            logger.info(f"Semantic corpus built [{dept_key}]: {len(codes)} savoir embeddings")
        _SEMANTIC_CORPUS = list(zip(entry["codes"], entry["matrix"]))
        _SEMANTIC_CORPUS_BUILT = True
        _SEMANTIC_CORPUS_DEPT = dept_key


def _unit_rows(m):
    norms = _np.linalg.norm(m, axis=-1, keepdims=True)
    return m / _np.maximum(norms, 1e-8)


def _semantic_scores(text: str, departement: str = "gc") -> List[Tuple[str, float, float]]:
    """(code, similarité brute, similarité centrée) pour chaque savoir, par score centré décroissant.

    * brute   : cosinus texte/savoir — sert de SEUIL d'abstention (sépare bien
      le hors-sujet du pertinent) ;
    * centrée : cosinus après soustraction du vecteur moyen du référentiel — sert
      au CLASSEMENT. Neutralise les savoirs « hubs » au libellé générique qui
      remontaient en tête pour des textes sans rapport (mesuré : top-1 64 → 69 %).
    """
    if not _SEMANTIC_OK or not text or not text.strip():
        return []
    _build_semantic_corpus(departement)
    entry = _SEMANTIC_CORPORA.get(departement.lower().strip())
    model = _get_semantic_model()
    if not entry or not model:
        return []
    try:
        q_emb = model.encode([_SEMANTIC_QUERY_PREFIX + text], convert_to_numpy=True,
                             normalize_embeddings=True)[0]
        raw = entry["matrix"] @ q_emb
        centered = entry["centered"] @ _unit_rows(q_emb - entry["mean"])
        order = _np.argsort(-centered)
        return [(entry["codes"][i], float(raw[i]), float(centered[i])) for i in order]
    except Exception as exc:
        logger.warning(f"Semantic matching error: {exc}")
        return []


# Matching SÉMANTIQUE : parmi les savoirs dont la similarité brute dépasse le
# seuil, les top-k selon la similarité centrée.
def _match_gc_savoir_semantic(text: str, threshold: Optional[float] = None, top_k: int = 5,
                               departement: str = "gc") -> List[str]:
    seuil = _SEMANTIC_THRESHOLD if threshold is None else threshold
    return [c for c, raw, _ in _semantic_scores(text, departement) if raw >= seuil][:top_k]


_DEPT_SIGNALS_WEIGHTED = [
    (
        "info",
        [
            ("web semantique", 5), ("semantic web", 5), ("ontologie", 4),
            ("rdf", 4), ("owl", 3), ("sparql", 5), ("rdflib", 4),
            ("owlready", 4), ("protege", 4), ("linked data", 4),
            ("knowledge graph", 4), ("framework python", 3),
            ("django", 3), ("flask", 3), ("fastapi", 3),
            ("twin", 3), ("5twin", 3), ("up-web", 3), ("up-il", 3),
            ("up-gl", 3), ("infdev", 3), ("infsec", 3), ("infweb", 3),
            ("pidev", 3), ("base de donnees", 3), ("base de donnee", 3),
            ("sql", 2), ("nosql", 2), ("mongodb", 2),
            ("react", 2), ("angular", 2), ("vue", 2), ("spring", 2),
            ("microservice", 3), ("algorithmique", 3), ("programmation", 2),
            ("logiciel", 2), ("java", 3), ("python", 2),
            ("javascript", 3), ("framework", 2), ("informatique", 3),
            ("machine learning", 4), ("intelligence artificielle", 4),
        ],
    ),
    (
        "gc",
        [
            ("beton", 5), ("fondation", 4), ("geotechnique", 5),
            ("structure portante", 5), ("hydraulique", 3),
            ("ouvrage", 3), ("chaussee", 4), ("genie civil", 5),
            ("topographie", 4),
        ],
    ),
    ("ge", [("genie electrique", 5), ("electrotechnique", 4), ("automatique", 3), ("electronique", 4)]),
    ("meca", [("genie mecanique", 5), ("thermodynamique", 4), ("usinage", 4), ("fabrication", 3)]),
    ("telecom", [("telecom", 5), ("telecommunication", 5), ("signal numerique", 4), ("radiocommunication", 4)]),
]

_UP_TO_DEPT = {
    'UPIL': 'info', 'UPGL': 'info', 'UPSIM': 'info', 'UPGC': 'gc',
    'UPGE': 'ge', 'UPMECA': 'meca', 'UPMEMECA': 'meca', 'UPTELECOM': 'telecom',
}


# Teste si le texte contient au moins un des éléments cherchés.
def _contains_any(text: str, needles: List[str]) -> bool:
    return any(needle in text for needle in needles)


# Détection du département par le NOM de fichier (mots "GC", "INFO",
# "TELECOM", suffixes -GC-/-GL-…). None si aucun signal.
def _detect_by_filename(fname_upper: str) -> Optional[str]:
    if (
        " GC " in f" {fname_upper} "
        or _contains_any(fname_upper, ["-GC-", "_GC_", "GENIE CIVIL", "GENIE-CIVIL"])
    ):
        return "gc"
    if (
        " INFO " in f" {fname_upper} "
        or _contains_any(fname_upper, ["INFORMATIQ", "PIDEV", "DEVOPS", "-INFO-", "_INFO_", "-GL-", "_GL_", "-SIM-", "_SIM_", "-TWIN-", "_TWIN_", "-WEB-", "_WEB_"])
    ):
        return "info"
    if " GE " in f" {fname_upper} " or _contains_any(fname_upper, ["-GE-", "_GE_", "ELECTR"]):
        return "ge"
    if " MECA " in f" {fname_upper} " or _contains_any(fname_upper, ["-MECA-", "_MECA_", "MECANIQUE"]):
        return "meca"
    if " TELECOM " in f" {fname_upper} " or "TELECOMMUN" in fname_upper:
        return "telecom"
    return None


# Détection du département par le CODE de l'unité pédagogique dans le texte
# ("UPGC", "UPIL", "UPTELECOM"…) via la table _UP_TO_DEPT.
def _detect_by_up_code(combined: str) -> Optional[str]:
    up_match = re.search(
        r'^(?:unit[eé][ \t]+p[eé]dagogique|UP)[ \t]*+:?+[ \t]*+[-_]?+[ \t]*+([A-Z0-9_\-]{2,10})',
        combined, re.IGNORECASE | re.MULTILINE,
    )
    if not up_match:
        return None
    up_code = up_match.group(1).upper().replace('-', '').replace('_', '')
    return _UP_TO_DEPT.get(up_code)


# Détection du département par le préfixe du CODE d'UE ("INF…", "GC…", "GE…").
def _detect_by_ue_code(combined: str) -> Optional[str]:
    ue_match = re.search(
        r'^(?:unit[eé][ \t]+d[\x27\u2019]enseignement|UE)[ \t]*+:?+[ \t]*+([A-Z]{2,6}\w{2,10})',
        combined, re.IGNORECASE | re.MULTILINE,
    )
    if not ue_match:
        return None
    ue_code = ue_match.group(1).upper()
    if ue_code.startswith(('INF', 'DEV', 'WEB', 'SIM', 'GL')):
        return 'info'
    if ue_code.startswith('GC'):
        return 'gc'
    if ue_code.startswith(('GE', 'EL')):
        return 'ge'
    return None


# Détection du département par le préfixe du CODE de module ("Code: MT-34",
# "Module: GC05-F"…) via une table de préfixes par département.
def _detect_by_module_code(combined: str) -> Optional[str]:
    meta_code_match = None
    for pattern in (
        re.compile(
            r"^code(?:[ \t]+(?:module|ue))?+[ \t]*+:?+[ \t]*+([A-Z]{1,5}[-_]?\d{1,4}[A-Z]?)",
            re.IGNORECASE | re.MULTILINE,
        ),
        re.compile(
            r"^module[ \t]*+:?+[ \t]*+([A-Z]{1,5}[-_]?\d{1,4}[A-Z]?)",
            re.IGNORECASE | re.MULTILINE,
        ),
    ):
        meta_code_match = pattern.search(combined)
        if meta_code_match:
            break
    if not meta_code_match:
        return None
    meta_code = meta_code_match.group(1).upper().replace("_", "-")
    code_map = [
        (["INF", "DEV", "WEB", "SIM", "TV"], "info"),
        (["GC", "BTP", "CIV"], "gc"),
        (["GE", "ELC", "AUT"], "ge"),
        (["ME", "MEC", "ROB"], "meca"),
        (["TEL", "COM", "RES"], "telecom"),
    ]
    for prefixes, dept in code_map:
        if any(meta_code.startswith(p) for p in prefixes):
            return dept
    return None


# Dernier recours : scoring pondéré par mots-clés spécifiques à chaque
# département (voir _DEPT_SIGNALS_WEIGHTED). Renvoie toujours un département
# ("gc" par défaut).
def _detect_by_keywords(combined: str) -> str:
    best_dept, best_score = "gc", 0
    for dept_code, weighted_keywords in _DEPT_SIGNALS_WEIGHTED:
        score = sum(weight for kw, weight in weighted_keywords if kw in combined)
        if dept_code == "info" and "mt-" in combined and any(
            kw in combined for kw in ["web", "sparql", "rdf", "owl", "ontologie", "informatique"]
        ):
            score += 3
        if score > best_score:
            best_score = score
            best_dept = dept_code
    return best_dept


# Concatène noms de fichiers + premiers 4 Ko de chaque contenu en texte
# minuscule unique, matière brute de la détection automatique.
def _build_combined_text(filenames: List[str], contents: List[bytes]) -> str:
    combined = "\n".join(f.lower() for f in filenames)
    for data in contents:
        try:
            combined += "\n" + data[:4096].decode("utf-8", errors="ignore").lower()
        except Exception:
            pass
    return combined


# ── Détection AUTOMATIQUE du département d'une fiche ────────────────────────
# Cascade : nom de fichier → code UP → code UE → code module → mots-clés.
def _detect_departement(filenames: List[str], contents: List[bytes]) -> str:
    fname_upper = " ".join(filenames).upper()
    dept = _detect_by_filename(fname_upper)
    if dept:
        logger.info(f"Auto-detected department from filename: '{dept}'")
        return dept

    combined = _build_combined_text(filenames, contents)

    dept = _detect_by_up_code(combined)
    if dept:
        logger.info(f"Auto-detected department from UP code: '{dept}'")
        return dept

    dept = _detect_by_ue_code(combined)
    if dept:
        logger.info(f"Auto-detected department from UE code '{dept}'")
        return dept

    dept = _detect_by_module_code(combined)
    if dept:
        logger.info(f"Auto-detected department from module code '{dept}'")
        return dept

    dept = _detect_by_keywords(combined)
    logger.info(f"Auto-detected department: '{dept}' (keyword match)")
    return dept
