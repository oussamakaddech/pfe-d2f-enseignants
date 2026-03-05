# rice_analyzer.py
# RICE – Référentiel Intelligent de Compétences Enseignants
# AI engine: extracts a structured competence tree from UE/module fiches (PDF/DOCX)
# Uses NLP techniques for structured information extraction from ESPRIT fiche format

from __future__ import annotations

import io
import re
import uuid
import unicodedata
import logging
from pathlib import Path
from typing import List, Optional, Dict, Any, Tuple

import os

from fastapi import APIRouter, File, UploadFile, Form, HTTPException
from pydantic import BaseModel
from dotenv import load_dotenv

load_dotenv()  # charge .env (DB_NAME, DB_USER, …)

logger = logging.getLogger("rice_analyzer")

import time as _time

# ── Database helper ──────────────────────────────────────────────────────────
def _get_db_connection():
    """Create a fresh psycopg2 connection from env vars."""
    import psycopg2
    return psycopg2.connect(
        dbname=os.getenv("DB_NAME", "d2f"),
        user=os.getenv("DB_USER", "d2f"),
        password=os.getenv("DB_PASS", "d2fpasswd"),
        host=os.getenv("DB_HOST", "localhost"),
        port=int(os.getenv("DB_PORT", "7432")),
    )


# ── Cached enseignant affectations (TTL = 5 min) ────────────────────────────
_AFFECTATIONS_CACHE: Dict[str, List[str]] = {}
_AFFECTATIONS_CACHE_TS: float = 0.0
_AFFECTATIONS_CACHE_TTL: float = 300.0  # secondes


def _fetch_enseignant_affectations() -> Dict[str, List[str]]:
    """
    Fetch enseignant → savoir-codes mapping dynamically from PostgreSQL.
    Results are cached for 5 minutes to avoid repeated DB queries.
    Returns a dict like {"E001": ["S2a", "C3b", ...], ...}
    Falls back to cached data or empty dict if the DB is unreachable.
    """
    global _AFFECTATIONS_CACHE, _AFFECTATIONS_CACHE_TS

    # Return cached data if still fresh
    if _AFFECTATIONS_CACHE and (_time.time() - _AFFECTATIONS_CACHE_TS) < _AFFECTATIONS_CACHE_TTL:
        return _AFFECTATIONS_CACHE

    try:
        conn = _get_db_connection()
        cur = conn.cursor()
        cur.execute("""
            SELECT e.id, array_agg(s.code ORDER BY s.code)
            FROM enseignant_competences ec
            JOIN enseignants e ON e.id = ec.enseignant_id
            JOIN savoirs     s ON s.id = ec.savoir_id
            GROUP BY e.id
            ORDER BY e.id
        """)
        result: Dict[str, List[str]] = {}
        for ens_id, codes in cur.fetchall():
            result[str(ens_id)] = codes if codes else []
        cur.close()
        conn.close()
        _AFFECTATIONS_CACHE = result
        _AFFECTATIONS_CACHE_TS = _time.time()
        logger.info(f"Loaded enseignant_affectations from DB: {len(result)} enseignants")
        return result
    except Exception as exc:
        logger.warning(f"Cannot fetch enseignant_affectations from DB: {exc}")
        return _AFFECTATIONS_CACHE  # return stale cache if available

_ENS_INFO_CACHE: Dict[str, EnseignantInfo] = {}
_ENS_INFO_TS: float = 0.0

def _fetch_all_enseignants_info() -> Dict[str, EnseignantInfo]:
    """Fetch basic info (id, nom, prenom) for ALL teachers from DB."""
    global _ENS_INFO_CACHE, _ENS_INFO_TS
    if _ENS_INFO_CACHE and (_time.time() - _ENS_INFO_TS) < 300:
        return _ENS_INFO_CACHE

    try:
        conn = _get_db_connection()
        cur = conn.cursor()
        cur.execute("SELECT id, nom, prenom FROM enseignants")
        res = {}
        for row in cur.fetchall():
            eid = str(row[0])
            res[eid] = EnseignantInfo(
                id=eid,
                nom=row[1] or "",
                prenom=row[2] or "",
                modules=[]
            )
        cur.close()
        conn.close()
        _ENS_INFO_CACHE = res
        _ENS_INFO_TS = _time.time()
        return res
    except Exception as e:
        logger.error(f"Failed to fetch enseignants info: {e}")
        return _ENS_INFO_CACHE or {}


def _create_enseignant_if_new(nom_complet: str) -> Tuple[str, str]:
    """Auto-create a new enseignant row from a name extracted in a fiche module.

    If the name was not fuzzy-matched against any existing DB teacher, this
    function inserts a new row into ``enseignants`` so the extracted professor
    gets a real DB ID that will survive the import filter.

    Returns (new_id, display_name).
    """
    parts = nom_complet.strip().split()
    nom    = parts[0].upper()                             if parts      else "INCONNU"
    prenom = " ".join(parts[1:]).title()                  if len(parts) > 1 else ""

    slug_raw  = re.sub(r"[^A-Z0-9]", "-", f"{nom}-{prenom}".upper())
    slug_base = re.sub(r"-+", "-", slug_raw).strip("-")[:20]
    new_id    = f"EX-{slug_base}"
    mail      = f"{slug_base.lower()[:30]}@esprit.tn"
    display   = f"{prenom} {nom}".strip() if prenom else nom

    try:
        conn = _get_db_connection()
        cur  = conn.cursor()
        cur.execute("""
            INSERT INTO enseignants
                (id, nom, prenom, mail, type, etat, cup, chefdepartement, up_id, dept_id)
            VALUES (%s, %s, %s, %s, 'P', 'A', 'N', 'N', 1, 1)
            ON CONFLICT (id) DO NOTHING
        """, (new_id, nom, prenom, mail))
        conn.commit()
        cur.close()
        conn.close()
        # Invalidate cache so next load picks up the new row
        global _ENS_INFO_CACHE, _ENS_INFO_TS
        _ENS_INFO_CACHE = {}
        _ENS_INFO_TS    = 0.0
        logger.info(f"  Auto-created enseignant from fiche: {new_id} ({display})")
    except Exception as exc:
        logger.warning(f"  Cannot auto-create enseignant '{nom_complet}': {exc}")

    return new_id, display


# ── optional imports (graceful degradation if libs missing) ──────────────────
try:
    import pdfplumber
    _PDF_OK = True
except ImportError:
    _PDF_OK = False

try:
    from docx import Document as DocxDocument
    _DOCX_OK = True
except ImportError:
    _DOCX_OK = False

rice_router = APIRouter(prefix="/rice", tags=["RICE"])

# ─────────────────────────────────────────────────────────────────────────────
# Pydantic models
# ─────────────────────────────────────────────────────────────────────────────

class EnseignantInfo(BaseModel):
    id: str
    nom: str
    prenom: str
    modules: List[str] = []   # list of module names the teacher handles

class SavoirProposition(BaseModel):
    tmpId: str
    code: str
    nom: str
    description: Optional[str] = None
    type: str                  # THEORIQUE | PRATIQUE
    niveau: str                # N1_DEBUTANT … N5_EXPERT
    enseignantsSuggeres: List[str] = []   # list of enseignant IDs
    gcCodes: List[str] = []              # matched GC referential codes (e.g. S1a, C2b)

class SousCompetenceProposition(BaseModel):
    tmpId: str
    code: str
    nom: str
    description: Optional[str] = None
    savoirs: List[SavoirProposition] = []

class CompetenceProposition(BaseModel):
    tmpId: str
    code: str
    nom: str
    description: Optional[str] = None
    ordre: int = 1
    sousCompetences: List[SousCompetenceProposition] = []

class DomaineProposition(BaseModel):
    tmpId: str
    code: str
    nom: str
    description: Optional[str] = None
    competences: List[CompetenceProposition] = []

class FicheEnseignantExtrait(BaseModel):
    """Professor name extracted from a fiche module."""
    fichier: str                              # source filename
    nom_complet: str                          # raw name as found in fiche
    role: str = "enseignant"                   # responsable | coordinateur | enseignant | intervenant
    matched_id: Optional[str] = None          # matched enseignant ID (if fuzzy-matched)
    matched_nom: Optional[str] = None         # matched full name for display

class RiceAnalysisResult(BaseModel):
    propositions: List[DomaineProposition]
    stats: Dict[str, Any]
    extractedEnseignants: List[FicheEnseignantExtrait] = []  # professors found in fiches
    foundEnseignants: List[EnseignantInfo] = []  # Added this field

# ─────────────────────────────────────────────────────────────────────────────
# Text extraction
# ─────────────────────────────────────────────────────────────────────────────

def _extract_pdf(data: bytes) -> str:
    if not _PDF_OK:
        raise HTTPException(500, "pdfplumber not installed")
    with pdfplumber.open(io.BytesIO(data)) as pdf:
        pages = [p.extract_text() or "" for p in pdf.pages]
    return "\n".join(pages)

def _extract_docx(data: bytes) -> str:
    if not _DOCX_OK:
        raise HTTPException(500, "python-docx not installed")
    doc = DocxDocument(io.BytesIO(data))
    return "\n".join(p.text for p in doc.paragraphs)

def _extract_text(filename: str, data: bytes) -> str:
    name = filename.lower()
    if name.endswith(".pdf"):
        return _extract_pdf(data)
    if name.endswith(".docx") or name.endswith(".doc"):
        return _extract_docx(data)
    # plain text fallback
    return data.decode("utf-8", errors="ignore")

# ─────────────────────────────────────────────────────────────────────────────
# NLP – Text normalization & utilities
# ─────────────────────────────────────────────────────────────────────────────

def _normalize(text: str) -> str:
    """Strip accents and lowercase for fuzzy matching."""
    return "".join(
        c for c in unicodedata.normalize("NFD", text.lower())
        if unicodedata.category(c) != "Mn"
    )

def _slug(text: str, max_len: int = 30) -> str:
    """Create a short uppercase code from text."""
    words = re.findall(r"[a-zA-Z\u00C0-\u00FF]{3,}", _normalize(text))[:4]
    raw = "-".join(w[:5].upper() for w in words) if words else "ITEM"
    return raw[:max_len]

# ─────────────────────────────────────────────────────────────────────────────
# NLP – Bloom's Taxonomy detection (6 levels → 5 RICE levels)
# ─────────────────────────────────────────────────────────────────────────────

# Bloom level → RICE niveau mapping
_BLOOM_TO_NIVEAU = {
    1: "N1_DEBUTANT",       # Mémoriser / Reconnaître
    2: "N2_ELEMENTAIRE",    # Comprendre
    3: "N3_INTERMEDIAIRE",  # Appliquer
    4: "N4_AVANCE",         # Analyser
    5: "N4_AVANCE",         # Évaluer
    6: "N5_EXPERT",         # Créer
}

# Verb-based Bloom classification (NLP keyword extraction)
# Includes Génie Civil (GC) domain-specific verbs
_BLOOM_VERBS: List[Tuple[re.Pattern, int]] = [
    # Level 6 – Créer (includes GC: dimensionner, rehabiliter, amenager)
    (re.compile(
        r"\b(creer|concevoir|developper|produire|construire|elaborer|"
        r"proposer|innover|composer|planifier|mettre\s+en\s+place|realiser|"
        r"dimensionner|rehabiliter|amenager|piloter|optimiser)\b",
        re.I), 6),
    # Level 5 – Évaluer (includes GC: diagnostiquer, verifier, controler)
    (re.compile(
        r"\b(evaluer|juger|critiquer|justifier|argumenter|"
        r"defendre|recommander|selectionner|"
        r"diagnostiquer|verifier|controler|auditer|expertiser|valider)\b", re.I), 5),
    # Level 4 – Analyser (includes GC: modeliser, interpreter, superviser)
    (re.compile(
        r"\b(analyser|comparer|distinguer|examiner|"
        r"differencier|decomposer|organiser|categoriser|"
        r"modeliser|interpreter|superviser|instrumenter|calculer)\b", re.I), 4),
    # Level 3 – Appliquer (includes GC: effectuer, rediger, maitriser)
    (re.compile(
        r"\b(appliquer|utiliser|manipuler|implementer|"
        r"executer|resoudre|employer|configurer|installer|"
        r"gerer|integrer|regrouper|"
        r"effectuer|rediger|maitriser|tracer|relever|mesurer)\b", re.I), 3),
    # Level 2 – Comprendre
    (re.compile(
        r"\b(comprendre|expliquer|decrire|illustrer|"
        r"interpreter|resumer|classifier|discuter|"
        r"se\s+familiariser)\b", re.I), 2),
    # Level 1 – Mémoriser
    (re.compile(
        r"\b(reconnaitre|identifier|lister|nommer|"
        r"definir|memoriser|citer|rappeler|introduire)\b", re.I), 1),
]

def _detect_bloom_level(text: str) -> int:
    """Detect Bloom's taxonomy level from verb patterns. Returns 1-6."""
    norm = _normalize(text)
    best = 0
    for pattern, level in _BLOOM_VERBS:
        if pattern.search(norm):
            best = max(best, level)
    return best if best > 0 else 2  # default: Comprendre

def _bloom_to_niveau(bloom: int) -> str:
    """Convert Bloom level (1-6) to RICE niveau string."""
    return _BLOOM_TO_NIVEAU.get(bloom, "N2_ELEMENTAIRE")

# ─────────────────────────────────────────────────────────────────────────────
# NLP – Savoir type detection (THEORIQUE / PRATIQUE)
# ─────────────────────────────────────────────────────────────────────────────

_PRATIQUE_PATTERNS = re.compile(
    r"\b(tp|td|travaux\s+pratiques?|travaux\s+diriges?|projet|labo|atelier|"
    r"manipulation|mise\s+en\s+pratique|implementation|realisation|"
    r"developper|developpement|configurer|installer|creer|coder|"
    r"demarrer\s+un\s+projet|generer|manipuler|implementer|"
    r"app\b|mini[\s\-]projet|validation\s+du\s+projet|"
    # Génie Civil specific
    r"chantier|terrain|essai|laboratoire|releve|mesure|maquette|"
    r"bim|autocad|revit|robot\s+structural|etabs|sap2000|"
    r"modeli|simulation|dimensionn|concevoir|fondation|soutenement|"
    r"terrassement|coffrage|ferraillage|betonnage|topographi)\b",
    re.IGNORECASE,
)

_THEORIQUE_PATTERNS = re.compile(
    r"\b(cours|theorie|theorique|concept|principe|fondement|notion|"
    r"reconnaitre|comprendre|definir|identifier|memoriser|"
    r"introduction|presentation|fondamentaux|"
    # Génie Civil specific
    r"mecanique\s+des\s+sols|resistance\s+des\s+materiaux|rdm|"
    r"bael|eurocode|norme|reglementation|formule|loi\s+de|"
    r"hypothese|demonstration|calcul\s+theorique)\b",
    re.IGNORECASE,
)

def _detect_type(text: str) -> str:
    """Classify a savoir as PRATIQUE or THEORIQUE using keyword NLP."""
    norm = _normalize(text)
    prat_score = len(_PRATIQUE_PATTERNS.findall(norm))
    theo_score = len(_THEORIQUE_PATTERNS.findall(norm))
    return "PRATIQUE" if prat_score > theo_score else "THEORIQUE"

# ─────────────────────────────────────────────────────────────────────────────
# NLP – Fiche metadata extraction (Named Entity Recognition style)
# ─────────────────────────────────────────────────────────────────────────────

# ── Standard format: label : value on the SAME line ─────────────────────────
_RE_MODULE_CODE = re.compile(
    r"(?:Code|code)\s*[:\-]?\s*([A-Z][A-Z0-9\-_]{2,15})", re.I
)
# ── Table/reversed format: value on previous line, label on next line ────────
# Captures code like "MT-34" that appears as a standalone token on its own line
_RE_MODULE_CODE_TABLE = re.compile(
    r"^\s*([A-Z]{1,4}[\-_]?\d{1,4}[A-Z]?)\s*\d*h.*$",
    re.MULTILINE,
)
_RE_MODULE_NAME = re.compile(
    r"(?:Module|Mati\u00e8re|Unit\u00e9\s+d['\u2019]enseignement)\s*[:\-]?\s*(.{5,80})",
    re.IGNORECASE,
)
_RE_UNITE_PEDAGOGIQUE = re.compile(
    r"(?:Unit\u00e9\s+p\u00e9dagogique|UP)\s*[:\-]?\s*(.{3,60})",
    re.IGNORECASE,
)
# Standard responsable (label: value)
_RE_RESPONSABLE = re.compile(
    r"(?:Responsable(?:\s+(?:Module|UE|Mati[eè]re|Cours))?|Coordinat(?:eur|rice))\s*[:\-]?\s*(.{3,80})",
    re.IGNORECASE,
)
# Reversed format: capture line BEFORE "Responsable Module" label
_RE_RESPONSABLE_REV = re.compile(
    r"^(.{5,80})\n\s*Responsable(?:\s+(?:Module|UE|Mati[eè]re|Cours))",
    re.IGNORECASE | re.MULTILINE,
)
# Standard enseignants (label: value)
_RE_ENSEIGNANTS = re.compile(
    r"(?:Enseignants?|Intervenants?|Enseignants?\s*[\u2013\-]\s*Intervenants?|Professeurs?|Formateurs?|Titulaire)\s*[:\-]?\s*(.{5,300})",
    re.IGNORECASE,
)
# Reversed format: capture line BEFORE "Enseignants" label
_RE_ENSEIGNANTS_REV = re.compile(
    r"^(.{5,300})\n\s*(?:Enseignants?(?:\s*[\u2013\-]\s*Intervenants?)?|Intervenants?)\s*$",
    re.IGNORECASE | re.MULTILINE,
)
# Additional patterns for ESPRIT fiche modules (table-based PDFs)
_RE_NOM_PRENOM = re.compile(
    r"(?:Nom\s+(?:et|&)\s+Pr[eé]nom|Nom\s+Pr[eé]nom)\s*[:\-]?\s*(.{5,80})",
    re.IGNORECASE,
)
_RE_EQUIPE_PEDAGOGIQUE = re.compile(
    r"[EÉ]quipe\s+[Pp][eé]dagogique\s*[:\-]?\s*(.{5,400})",
    re.IGNORECASE,
)
_RE_COORDINATEUR = re.compile(
    r"Coordinat(?:eur|rice)(?:\s+(?:du\s+)?(?:module|UE|cours))?\s*[:\-]?\s*(.{3,80})",
    re.IGNORECASE,
)
# Standard prerequis
_RE_PREREQUIS = re.compile(
    r"(?:Pr\u00e9requis|Pr\u00e9[\-\s]?requis)\s*[:\-]?\s*(.{3,200})",
    re.IGNORECASE,
)
# Reversed format: capture line BEFORE "Prérequis" label
_RE_PREREQUIS_REV = re.compile(
    r"^(.{3,200})\n\s*(?:Pr[eé]requis|Pr[eé][\-\s]?requis)\s*$",
    re.IGNORECASE | re.MULTILINE,
)
_RE_OBJECTIF = re.compile(
    r"(?:Objectif(?:s)?(?:\s+du\s+module)?)\s*[:\-]?\s*(.+?)(?=\n\n|Mode\s+d|Acquis|$)",
    re.IGNORECASE | re.DOTALL,
)

# ─── Name cleaning & splitting helpers ───────────────────────────────────────

# Words that are NOT person names (false positive filters)
_STOP_WORDS = {
    "module", "cours", "matiere", "matière", "ue", "tp", "td", "prerequis",
    "objectif", "objectifs", "contenu", "evaluation", "mode", "duree", "durée",
    "semestre", "niveau", "credits", "coefficient", "code", "reference",
    "département", "departement", "informatique", "genie", "civil", "esprit",
    "fiche", "pedagogique", "pédagogique", "unite", "unité", "formation",
    "description", "compétence", "competence", "savoir", "acquis",
    "apprentissage", "séance", "seance", "chapitre",
    "responsable", "coordinateur", "coordinatrice", "enseignant", "enseignants",
    "intervenant", "intervenants", "web", "semantique", "sémantique",
    "nouvelles", "applications", "options", "niveaux",
    # Fiche module table headers & labels
    "he", "hne", "ects", "integre", "intégré", "detaille", "détaillé",
    "situation", "rendu", "rendus", "atelier", "projet",
    "derniere", "dernière", "mise", "jour", "date",
    "moyenne", "calculee", "calculée", "suivant", "suit",
}

def _clean_name(raw: str) -> Optional[str]:
    """Clean a potential person name: remove noise, validate it looks like a name."""
    # Remove common trailing noise
    name = re.sub(r"\s*[\(\[].*?[\)\]]", "", raw)  # remove (parentheses)
    name = re.sub(r"\s*[-–]\s*(cours|tp|td|module|ue).*$", "", name, flags=re.I)
    name = re.sub(r"\s+(mail|email|tél|tel|bureau|grade).*$", "", name, flags=re.I)
    # Strip academic titles
    name = re.sub(r"^(Dr\.?|Pr\.?|Prof\.?|M\.?|Mme\.?|Mr\.?)\s+", "", name, flags=re.I)
    name = name.strip().strip(".,;:-–")
    # Take only first line if multiline
    name = name.split("\n")[0].strip()
    # Strip embedded enseignant/module codes (e.g. "GC05", "E001") before digit check
    # so a string like "GC05 Abidi Mounir" is not thrown away entirely
    name_no_codes = re.sub(r'\b[A-Z]{1,5}\d{1,4}\b\s*', '', name).strip()
    if name_no_codes:   # only use stripped version if something remains
        name = name_no_codes.strip(".,;:- –")
    # Must have at least 2 words (first + last name)
    words = name.split()
    if len(words) < 2 or len(name) < 5:
        return None
    # Filter out if it's all stop words
    norm_words = [_normalize(w) for w in words]
    if all(w in _STOP_WORDS for w in norm_words):
        return None
    # Reject if it contains digits (not a name — after codes are stripped)
    if re.search(r"\d", name):
        return None
    # Reject if ALL-CAPS abbreviation (like "HNE ECTS", "HE HNE")
    if all(w.isupper() and len(w) <= 4 for w in words):
        return None
    return name.strip()

def _split_names(raw: str) -> List[str]:
    """Split a raw string of professor names separated by , ; / – - or newlines."""
    # First split by common separators (including dash/en-dash which ESPRIT uses)
    parts = re.split(r"[,;/\n]+", raw)
    # Also try " – " (en-dash with spaces) and " - " as separators
    expanded = []
    for p in parts:
        sub = re.split(r"\s+[–\-]\s+", p)
        expanded.extend(sub)
    # Also try " et " as separator
    final = []
    for p in expanded:
        sub = re.split(r"\s+et\s+", p, flags=re.IGNORECASE)
        final.extend(sub)
    names = []
    for part in final:
        cleaned = _clean_name(part.strip())
        if cleaned:
            names.append(cleaned)
    return names

def _extract_metadata(text: str) -> Dict[str, Any]:
    """
    NLP-based Named Entity extraction for fiche module metadata.
    Handles both standard (label: value) and ESPRIT table format (value\nlabel).
    """
    meta: Dict[str, Any] = {}

    # ── Code module ──────────────────────────────────────────────────────
    # Table format first (more specific): "MT-34 24h 30h 3" line
    m = _RE_MODULE_CODE_TABLE.search(text)
    if m:
        meta["code_module"] = m.group(1).strip().upper()
    # Standard format fallback (label: value) — require at least one digit
    if "code_module" not in meta:
        m = _RE_MODULE_CODE.search(text)
        if m:
            code = m.group(1).strip().upper()
            if re.search(r'\d', code):
                meta["code_module"] = code

    # ── Module name ──────────────────────────────────────────────────────
    m = _RE_MODULE_NAME.search(text)
    if m:
        name = m.group(1).strip().rstrip(".")
        name = re.sub(r"\s*(Pr\u00e9requis|Niveaux|Objectif|Derni[eè]re).*$", "", name, flags=re.I)
        meta["nom_module"] = name

    # ── Unité pédagogique ────────────────────────────────────────────────
    m = _RE_UNITE_PEDAGOGIQUE.search(text)
    if m:
        val = m.group(1).strip()
        # In table format, "Unité pédagogique" is a label and value is on the line above
        # Check if the captured value looks like a label (e.g. starts with "Nouvelles" — keep it)
        meta["unite_pedagogique"] = val
    # Also try: line BEFORE "Unité pédagogique"
    if "unite_pedagogique" not in meta:
        m_rev = re.search(
            r"^(.{3,60})\n\s*(?:Unit[eé]\s+p[eé]dagogique|UP)\s*$",
            text, re.I | re.MULTILINE
        )
        if m_rev:
            meta["unite_pedagogique"] = m_rev.group(1).strip()

    # ── Responsable ──────────────────────────────────────────────────────
    # Try reversed format first (value line BEFORE label)
    m_rev = _RE_RESPONSABLE_REV.search(text)
    if m_rev:
        raw_resp = m_rev.group(1).strip()
        # Validate it looks like a person name (not a section header)
        cleaned = _clean_name(raw_resp)
        if cleaned:
            meta["responsable"] = cleaned
    # Standard format fallback
    if "responsable" not in meta:
        m = _RE_RESPONSABLE.search(text)
        if m:
            raw = m.group(1).strip()
            # If it looks like a label/section rather than a name, skip
            cleaned = _clean_name(raw)
            if cleaned:
                meta["responsable"] = cleaned

    # ── Enseignants ──────────────────────────────────────────────────────
    ens_names: List[str] = []
    # Try reversed format first (names line BEFORE "Enseignants" label)
    m_rev = _RE_ENSEIGNANTS_REV.search(text)
    if m_rev:
        raw = m_rev.group(1).strip()
        ens_names = _split_names(raw)
    # Standard format fallback
    if not ens_names:
        m = _RE_ENSEIGNANTS.search(text)
        if m:
            raw = m.group(1).strip()
            ens_names = _split_names(raw)
    if ens_names:
        meta["enseignants_noms"] = ens_names
        # Assign roles
        for n in ens_names:
            meta.setdefault("enseignants_roles", {})[n] = "enseignant"

    # Additional ESPRIT-specific patterns
    m = _RE_NOM_PRENOM.search(text)
    if m:
        name = _clean_name(m.group(1).strip())
        if name:
            meta.setdefault("enseignants_noms", []).append(name)
            meta.setdefault("enseignants_roles", {})[name] = "enseignant"

    m = _RE_EQUIPE_PEDAGOGIQUE.search(text)
    if m:
        raw = m.group(1).strip()
        eq_names = _split_names(raw)
        for n in eq_names:
            meta.setdefault("enseignants_noms", []).append(n)
            meta.setdefault("enseignants_roles", {})[n] = "enseignant"

    m = _RE_COORDINATEUR.search(text)
    if m:
        name = _clean_name(m.group(1).strip())
        if name:
            meta.setdefault("enseignants_noms", []).append(name)
            meta.setdefault("enseignants_roles", {})[name] = "coordinateur"

    # Assign role to responsable
    if "responsable" in meta:
        meta.setdefault("enseignants_roles", {})[meta["responsable"]] = "responsable"

    if "responsable" in meta and "enseignants_noms" not in meta:
        meta["enseignants_noms"] = [meta["responsable"]]

    # Deduplicate names
    if "enseignants_noms" in meta:
        seen = set()
        unique = []
        for n in meta["enseignants_noms"]:
            norm = _normalize(n)
            if norm not in seen and len(n.strip()) > 3:
                seen.add(norm)
                unique.append(n)
        meta["enseignants_noms"] = unique

    # ── Prérequis ────────────────────────────────────────────────────────
    # Try reversed format first (value BEFORE label)
    m_rev = _RE_PREREQUIS_REV.search(text)
    if m_rev:
        meta["prerequis"] = m_rev.group(1).strip()
    if "prerequis" not in meta:
        m = _RE_PREREQUIS.search(text)
        if m:
            val = m.group(1).strip()
            # If in table format, the captured text may be the next label — check
            if not re.match(r"^\d+[A-Z]{3,}", val):  # not "5TWIN" (that's a level)
                meta["prerequis"] = val

    # ── Objectif ─────────────────────────────────────────────────────────
    m = _RE_OBJECTIF.search(text)
    if m:
        obj = m.group(1).strip()
        # Clean up multi-line wrapping
        obj = re.sub(r"\s*\n\s*", " ", obj).strip()
        meta["objectif"] = obj

    return meta

# ─────────────────────────────────────────────────────────────────────────────
# NLP – Acquis d'Apprentissage extraction (AA)
# ─────────────────────────────────────────────────────────────────────────────

# ── AA extraction patterns ───────────────────────────────────────────────────
# Standard: AA1 <text> <bloom_level>  (all on one line)
_RE_AA_LINE = re.compile(
    r"(?:AA\s*(\d+))\s+(.+?)\s+(\d)\s*$", re.MULTILINE
)
# Alternative: AA lines without explicit level
_RE_AA_ALT = re.compile(
    r"(?:AA\s*(\d+))\s+(.+)", re.MULTILINE
)


def _extract_acquis_apprentissage(text: str) -> List[Dict[str, Any]]:
    """
    NLP extraction of Acquis d'Apprentissage with Bloom levels.
    Handles standard single-line format AND ESPRIT table-based PDF format
    where text/level can be split across multiple lines around the AA tag.
    Uses a line-by-line parser with uppercase heuristic to correctly assign
    text fragments that wrap before/after AA markers.
    Returns list of {id, text, bloom_level}.
    """
    acquis = []

    # ── Find the AA block section ─────────────────────────────────────────
    aa_block_match = re.search(
        r"Acquis\s+d['’]apprentissage\s*:?\s*.*?\n(.+?)(?=Contenu\s+d[eé]taill[eé]|Plan\s+du\s+cours|$)",
        text, re.I | re.DOTALL
    )
    if not aa_block_match:
        return []

    block = aa_block_match.group(1)
    lines = block.split('\n')

    # ── Step 1: Parse lines into markers and text segments ────────────────
    parsed = []
    for line in lines:
        stripped = line.strip()
        if not stripped:
            continue
        # Skip header, footer, and legend lines
        if re.match(r'^AA\s+Acquis|^Niveau|^\*\s*:|^\(1\s*:', stripped, re.I):
            continue
        if stripped.startswith('*') or stripped.startswith('(1'):
            continue
        # Skip legend continuation (e.g. ": Créer)")
        if re.match(r'^:\s', stripped):
            continue

        m = re.match(r'^AA\s*(\d+)\s*(.*)', stripped)
        if m:
            parsed.append({'type': 'marker', 'aa': int(m.group(1)), 'rest': m.group(2).strip()})
        else:
            parsed.append({'type': 'text', 'content': stripped})

    # ── Step 2: Build AA segments ─────────────────────────────────────────
    # Between consecutive AA markers, text lines are split into:
    # - post-text (continuation of previous AA): starts with lowercase
    # - pre-text (start of next AA): starts with uppercase verb/noun
    marker_indices = [i for i, p in enumerate(parsed) if p['type'] == 'marker']

    if not marker_indices:
        # Fallback: try simple single-line regex
        for m in _RE_AA_LINE.finditer(text):
            acquis.append({
                "id": int(m.group(1)),
                "text": m.group(2).strip(),
                "bloom_level": min(max(int(m.group(3)), 1), 6),
            })
        return acquis

    segments = []
    for idx, mi in enumerate(marker_indices):
        aa_num = parsed[mi]['aa']
        rest = parsed[mi]['rest']

        # Extract bloom level from end of inline text
        bloom = 0
        bm = re.search(r'\s+(\d)\s*$', rest)
        if bm:
            bloom = int(bm.group(1))
            rest = rest[:bm.start()].strip()
        elif re.match(r'^(\d)\s*$', rest):
            bloom = int(rest)
            rest = ''

        # Collect text lines between previous marker and this marker
        prev_mi = marker_indices[idx - 1] if idx > 0 else -1
        text_between = []
        for j in range(prev_mi + 1, mi):
            if parsed[j]['type'] == 'text':
                text_between.append(parsed[j]['content'])

        # Split text_between into post-text (prev AA) and pre-text (this AA)
        # Heuristic: first line starting with uppercase (new sentence) marks the split
        split_point = len(text_between)  # default: all are continuation (post-text)
        for k, t in enumerate(text_between):
            if not t:
                continue
            first_char = t[0]
            if first_char.isupper():
                # Exclude common continuation words
                if not re.match(r'^(sur|de|du|des|le|la|les|un|une|et|ou|au|aux)\s', t, re.I):
                    split_point = k
                    break

        post_text_prev = text_between[:split_point]
        pre_text_this = text_between[split_point:]

        # Assign post-text to previous segment
        if post_text_prev and segments:
            segments[-1]['post'].extend(post_text_prev)

        # Collect trailing text for the last marker
        trailing = []
        if idx == len(marker_indices) - 1:
            for j in range(mi + 1, len(parsed)):
                if parsed[j]['type'] == 'text':
                    trailing.append(parsed[j]['content'])

        segments.append({
            'aa': aa_num,
            'bloom': bloom,
            'pre': list(pre_text_this),
            'inline': rest,
            'post': trailing,
        })

    # ── Step 3: Build final result ────────────────────────────────────────
    for seg in segments:
        parts = seg['pre'] + ([seg['inline']] if seg['inline'] else []) + seg['post']
        aa_text = ' '.join(parts).strip()
        bloom = seg['bloom']

        # Clean trailing noise (table labels)
        aa_text = re.sub(
            r"\s*(?:Situation|Dur[eé]e|Rendu|d['’]apprentissage).*$",
            "", aa_text, flags=re.I
        ).strip()

        if not bloom and aa_text:
            bloom = _detect_bloom_level(aa_text)

        if aa_text and len(aa_text) > 5:
            acquis.append({
                "id": seg['aa'],
                "text": aa_text,
                "bloom_level": min(max(bloom, 1), 6),
            })

    return acquis

# ─────────────────────────────────────────────────────────────────────────────
# NLP – Séance / Session extraction (Contenu détaillé)
# ─────────────────────────────────────────────────────────────────────────────

_RE_SEANCE = re.compile(
    r"(?:S[eé]ance|Seance|Session|Chapitre|Semaine)\s*(\d+(?:\s*[-\u2013]\s*\d+)?)\s*[:\-]?\s*(.+?)(?=\n)",
    re.IGNORECASE,
)
_RE_CHECKMARK = re.compile(r"^[\u2714\u2713\u2611\u2610]\s*(.+)$", re.MULTILINE)
_RE_BULLET    = re.compile(r"^[\-\u2022\*\u203A\u25E6\u25AA]\s+(.+)$", re.MULTILINE)
_RE_NUMBERED  = re.compile(r"^\d+[\.\)]\s+(.+)$", re.MULTILINE)

def _extract_seances(text: str) -> List[Dict[str, Any]]:
    """
    NLP extraction of séances/sessions from the contenu détaillé.
    """
    seances = []
    matches = list(_RE_SEANCE.finditer(text))
    if not matches:
        return seances

    for i, m in enumerate(matches):
        numero = m.group(1).strip()
        titre = m.group(2).strip()
        start = m.end()
        end = matches[i + 1].start() if i + 1 < len(matches) else len(text)
        block = text[start:end]

        items = []
        for pattern in [_RE_CHECKMARK, _RE_BULLET, _RE_NUMBERED]:
            items.extend(pattern.findall(block))
        items = [it.strip() for it in items if len(it.strip()) > 5]

        type_match = re.search(
            r"(?:Situation\s*(?:\(s\))?\s*|Type\s*)[:\-]?\s*(cours\s+int[e\u00e9]gr[e\u00e9]|TP|TD|APP|Projet|Labo)",
            block, re.IGNORECASE,
        )
        type_apprentissage = type_match.group(1).strip() if type_match else None

        duree_match = re.search(r"(?:Dur\u00e9e|Duree)\s*[:\-]?\s*(\d+\s*h)", block, re.I)
        duree = duree_match.group(1).strip() if duree_match else None

        seances.append({
            "numero": numero,
            "titre": titre,
            "items": items,
            "type_apprentissage": type_apprentissage,
            "duree": duree,
        })

    return seances

# ─────────────────────────────────────────────────────────────────────────────
# NLP – Enseignant matching (fuzzy name matching)
# ─────────────────────────────────────────────────────────────────────────────

def _match_enseignants_by_name(
    fiche_names: List[str],
    enseignants: List[EnseignantInfo],
) -> Tuple[List[str], Dict[str, Tuple[str, str]]]:
    """Fuzzy match enseignant names found in the fiche against the provided list.
    Returns (matched_ids, name_to_match) where name_to_match maps fiche_name → (ens_id, ens_display_name).
    """
    matched_ids: List[str] = []
    name_to_match: Dict[str, Tuple[str, str]] = {}  # fiche_name → (id, "Prenom Nom")
    for ens in enseignants:
        ens_norm = _normalize(f"{ens.prenom} {ens.nom}")
        ens_norm_rev = _normalize(f"{ens.nom} {ens.prenom}")
        ens_nom_norm = _normalize(ens.nom)
        ens_display = f"{ens.prenom} {ens.nom}"
        for fiche_name in fiche_names:
            fn = _normalize(fiche_name)
            if ens_norm in fn or ens_norm_rev in fn:
                matched_ids.append(ens.id)
                name_to_match[fiche_name] = (ens.id, ens_display)
                break
            if len(ens.nom) > 3 and ens_nom_norm in fn:
                matched_ids.append(ens.id)
                name_to_match[fiche_name] = (ens.id, ens_display)
                break
    return matched_ids, name_to_match

def _match_enseignants_by_module(
    text: str,
    enseignants: List[EnseignantInfo],
) -> List[str]:
    """Match enseignants whose declared modules overlap with the fiche text."""
    norm_text = _normalize(text)
    matched = []
    for ens in enseignants:
        for mod in ens.modules:
            if len(mod) > 3 and _normalize(mod) in norm_text:
                matched.append(ens.id)
                break
    return matched

# ─────────────────────────────────────────────────────────────────────────────
# Core NLP analyzer – builds the competence tree from extracted data
# ─────────────────────────────────────────────────────────────────────────────

def _analyze_single_fiche(
    filename: str,
    text: str,
    enseignants: List[EnseignantInfo],
) -> Tuple[DomaineProposition, List[FicheEnseignantExtrait]]:
    """
    Full NLP pipeline for one fiche module:
      1. Extract metadata (NER)
      2. Extract Acquis d'Apprentissage (Bloom taxonomy)
      3. Extract Séances (content chunking)
      4. Build competence tree
      5. Match enseignants (fuzzy name + module matching)
    """
    logger.info(f"Analyzing fiche: {filename} ({len(text)} chars)")

    # ── Step 1: Metadata extraction ──────────────────────────────────────
    meta = _extract_metadata(text)
    logger.info(f"  Metadata: {meta}")

    domain_name = meta.get("unite_pedagogique")
    module_name = meta.get("nom_module")
    module_code = meta.get("code_module")

    if not domain_name:
        stem = Path(filename).stem
        clean = re.sub(r"^(fiche[_\s]?)?(ue[_\s]?|module[_\s]?|cours[_\s]?)?",
                       "", stem, flags=re.IGNORECASE)
        domain_name = re.sub(r"[_\-]+", " ", clean).strip().title() or "Domaine G\u00e9n\u00e9ral"

    if not module_name:
        module_name = domain_name
    if not module_code:
        module_code = _slug(module_name, 15)

    domain_code = _slug(domain_name, 10)

    # ── Step 2: Enseignant matching ──────────────────────────────────────
    fiche_ens_names = meta.get("enseignants_noms", [])
    roles_map = meta.get("enseignants_roles", {})
    if meta.get("responsable"):
        if meta["responsable"] not in fiche_ens_names:
            fiche_ens_names.append(meta["responsable"])
        roles_map.setdefault(meta["responsable"], "responsable")
    fiche_ens_names = list(dict.fromkeys(fiche_ens_names))  # dedupe preserving order

    matched_by_name, name_match_map = _match_enseignants_by_name(fiche_ens_names, enseignants)
    matched_by_module = _match_enseignants_by_module(text, enseignants)

    # Build extracted enseignant list – every name gets a real DB ID
    extracted_ens: List[FicheEnseignantExtrait] = []
    for name in fiche_ens_names:
        role = roles_map.get(name, "enseignant")
        match_info = name_match_map.get(name)
        if match_info:
            mid, mnom = match_info
        else:
            # Name not found in DB → create a new enseignant row automatically
            mid, mnom = _create_enseignant_if_new(name)
        extracted_ens.append(FicheEnseignantExtrait(
            fichier=filename,
            nom_complet=name,
            role=role,
            matched_id=mid,
            matched_nom=mnom,
        ))
    logger.info(f"  Extracted professor names: {[e.nom_complet for e in extracted_ens]}")

    # ── Add GC-referential & module-matched teachers (by ID) to extractedEnseignants ──
    # Build a name-lookup map: id → EnseignantInfo from passed list + DB cache
    all_ens_by_id: Dict[str, "EnseignantInfo"] = {str(e.id): e for e in enseignants}
    try:
        all_ens_by_id.update(_fetch_all_enseignants_info())
    except Exception:
        pass  # DB unreachable – use only the passed list

    # GC referential-based matching: match text → savoirs → enseignants
    gc_savoir_matches = _match_gc_savoir(text)
    matched_by_gc_ref = _suggest_gc_enseignants(gc_savoir_matches[:10])
    all_matched = list(set(matched_by_name + matched_by_module + matched_by_gc_ref))

    # Enrich extractedEnseignants: add any matched ID that is not yet represented
    already_extracted_ids = {ex.matched_id for ex in extracted_ens if ex.matched_id}
    for eid in all_matched:
        eid_str = str(eid)
        if eid_str in already_extracted_ids:
            continue
        ens_obj = all_ens_by_id.get(eid_str)
        if not ens_obj:
            # Cannot resolve a real name – skip rather than showing a raw code
            continue
        full_name = f"{ens_obj.prenom} {ens_obj.nom}".strip() or eid_str
        extracted_ens.append(FicheEnseignantExtrait(
            fichier=filename,
            nom_complet=full_name,
            role="enseignant",
            matched_id=eid_str,
            matched_nom=full_name,
        ))
        already_extracted_ids.add(eid_str)

    logger.info(f"  Matched enseignants: {len(all_matched)} "
                f"(by name: {len(matched_by_name)}, by module: {len(matched_by_module)}, "
                f"by GC ref: {len(matched_by_gc_ref)})")
    if gc_savoir_matches:
        logger.info(f"  GC savoir matches: {gc_savoir_matches[:5]}")

    # ── Step 3: Extract Acquis d'Apprentissage ───────────────────────────
    acquis = _extract_acquis_apprentissage(text)
    logger.info(f"  Acquis d'apprentissage found: {len(acquis)}")

    # ── Step 4: Extract Séances ──────────────────────────────────────────
    seances = _extract_seances(text)
    logger.info(f"  S\u00e9ances found: {len(seances)}")

    # ── Step 5: Build competence tree ────────────────────────────────────
    competences: List[CompetenceProposition] = []
    comp_idx = 0

    # === Compétence 1: from Acquis d'Apprentissage ===
    if acquis:
        # Group AAs by Bloom level into sous-compétences
        groups: Dict[str, List[Dict]] = {
            "Connaissances fondamentales": [],
            "Comp\u00e9tences appliqu\u00e9es": [],
            "Comp\u00e9tences avanc\u00e9es": [],
        }
        for aa in acquis:
            bl = aa["bloom_level"]
            if bl <= 2:
                groups["Connaissances fondamentales"].append(aa)
            elif bl <= 4:
                groups["Comp\u00e9tences appliqu\u00e9es"].append(aa)
            else:
                groups["Comp\u00e9tences avanc\u00e9es"].append(aa)

        comp_code = f"{module_code}-C{comp_idx + 1}"
        sous_comps: List[SousCompetenceProposition] = []
        sc_idx = 0

        for sc_name, aa_list in groups.items():
            if not aa_list:
                continue
            sc_code = f"{comp_code}-SC{sc_idx + 1}"
            savoirs = []
            for j, aa in enumerate(aa_list):
                sav_code = f"{sc_code}-S{j + 1}"
                gc_codes = _match_gc_savoir(aa["text"])
                savoirs.append(SavoirProposition(
                    tmpId=str(uuid.uuid4()),
                    code=sav_code,
                    nom=aa["text"][:120],
                    description=aa["text"][:200],
                    type=_detect_type(aa["text"]),
                    niveau=_gc_ref_niveau(gc_codes) or _bloom_to_niveau(aa["bloom_level"]),
                    enseignantsSuggeres=all_matched,
                    gcCodes=gc_codes,
                ))
            sous_comps.append(SousCompetenceProposition(
                tmpId=str(uuid.uuid4()),
                code=sc_code,
                nom=sc_name,
                description=None,
                savoirs=savoirs,
            ))
            sc_idx += 1

        competences.append(CompetenceProposition(
            tmpId=str(uuid.uuid4()),
            code=comp_code,
            nom=f"Acquis d'apprentissage \u2013 {module_name}",
            description=meta.get("objectif"),
            ordre=comp_idx + 1,
            sousCompetences=sous_comps,
        ))
        comp_idx += 1

    # === Compétence(s) from Séances (contenu détaillé) ===
    if seances:
        comp_code = f"{module_code}-C{comp_idx + 1}"
        sous_comps_seances: List[SousCompetenceProposition] = []

        for sc_idx, seance in enumerate(seances):
            sc_code = f"{comp_code}-SC{sc_idx + 1}"
            items = seance["items"]
            if not items:
                items = [seance["titre"]]

            savoirs = []
            for j, item in enumerate(items):
                sav_code = f"{sc_code}-S{j + 1}"
                bloom = _detect_bloom_level(item)
                item_type = _detect_type(item + " " + (seance.get("type_apprentissage") or ""))
                gc_codes = _match_gc_savoir(item)
                savoirs.append(SavoirProposition(
                    tmpId=str(uuid.uuid4()),
                    code=sav_code,
                    nom=item[:120],
                    description=None,
                    type=item_type,
                    niveau=_gc_ref_niveau(gc_codes) or _bloom_to_niveau(bloom),
                    enseignantsSuggeres=all_matched,
                    gcCodes=gc_codes,
                ))

            sc_titre = f"S\u00e9ance {seance['numero']} : {seance['titre']}"
            if seance.get("duree"):
                sc_titre += f" ({seance['duree']})"

            sous_comps_seances.append(SousCompetenceProposition(
                tmpId=str(uuid.uuid4()),
                code=sc_code,
                nom=sc_titre[:100],
                description=seance.get("type_apprentissage"),
                savoirs=savoirs,
            ))

        competences.append(CompetenceProposition(
            tmpId=str(uuid.uuid4()),
            code=comp_code,
            nom=f"Contenu d\u00e9taill\u00e9 \u2013 {module_name}",
            description=None,
            ordre=comp_idx + 1,
            sousCompetences=sous_comps_seances,
        ))
        comp_idx += 1

    # === Fallback: generic extraction if no AA and no séances found ===
    if not competences:
        competences = _fallback_extraction(text, module_code, module_name, all_matched)

    domaine = DomaineProposition(
        tmpId=str(uuid.uuid4()),
        code=domain_code,
        nom=domain_name,
        description=f"Domaine extrait de : {filename}" + (
            f" | Pr\u00e9requis: {meta['prerequis']}" if meta.get("prerequis") else ""
        ),
        competences=competences,
    )
    return domaine, extracted_ens


def _fallback_extraction(
    text: str,
    module_code: str,
    module_name: str,
    matched_ens: List[str],
) -> List[CompetenceProposition]:
    """
    Fallback when structured sections (AA, Séances) are not found.
    Uses generic NLP: bullet extraction + Bloom verb detection.
    """
    items: List[str] = []
    for pattern in [_RE_CHECKMARK, _RE_BULLET, _RE_NUMBERED]:
        items.extend(pattern.findall(text))
    items = [it.strip() for it in items if len(it.strip()) > 5]

    if not items:
        sentences = re.split(r"[.\n]+", text)
        items = [s.strip() for s in sentences
                 if 10 < len(s.strip()) < 200
                 and not re.match(r"^(Code|Mode|Evaluation|R\u00e9f\u00e9rence)", s.strip())]
        items = items[:20]

    if not items:
        items = [module_name]

    comp_code = f"{module_code}-C1"
    sc_code = f"{comp_code}-SC1"

    savoirs = []
    for j, item in enumerate(items[:25]):
        sav_code = f"{sc_code}-S{j + 1}"
        bloom = _detect_bloom_level(item)
        gc_codes = _match_gc_savoir(item)
        savoirs.append(SavoirProposition(
            tmpId=str(uuid.uuid4()),
            code=sav_code,
            nom=item[:120],
            description=None,
            type=_detect_type(item),
            niveau=_gc_ref_niveau(gc_codes) or _bloom_to_niveau(bloom),
            enseignantsSuggeres=matched_ens,
            gcCodes=gc_codes,
        ))

    sc = SousCompetenceProposition(
        tmpId=str(uuid.uuid4()),
        code=sc_code,
        nom="Contenus extraits",
        savoirs=savoirs,
    )

    return [CompetenceProposition(
        tmpId=str(uuid.uuid4()),
        code=comp_code,
        nom=module_name,
        ordre=1,
        sousCompetences=[sc],
    )]


def analyze_files(
    filenames: List[str],
    file_contents: List[bytes],
    enseignants: List[EnseignantInfo],
) -> RiceAnalysisResult:
    """Main analysis entry point – processes multiple fiche files."""
    domaines: List[DomaineProposition] = []
    all_extracted_ens: List[FicheEnseignantExtrait] = []
    seen_codes: Dict[str, int] = {}

    for filename, data in zip(filenames, file_contents):
        text = _extract_text(filename, data)
        domaine, extracted_ens = _analyze_single_fiche(filename, text, enseignants)

        # Deduplicate domain codes across files
        if domaine.code in seen_codes:
            seen_codes[domaine.code] += 1
            domaine.code = f"{domaine.code}{seen_codes[domaine.code]}"
        else:
            seen_codes[domaine.code] = 1

        domaines.append(domaine)
        all_extracted_ens.extend(extracted_ens)

    # Build summary stats
    total_comp = sum(len(d.competences) for d in domaines)
    total_sc   = sum(len(c.sousCompetences)
                     for d in domaines for c in d.competences)
    total_sav  = sum(len(sc.savoirs)
                     for d in domaines for c in d.competences
                     for sc in c.sousCompetences)
    assigned_ens = {
        eid
        for d in domaines for c in d.competences
        for sc in c.sousCompetences for s in sc.savoirs
        for eid in s.enseignantsSuggeres
    }

    stats = {
        "totalDomaines": len(domaines),
        "totalCompetences": total_comp,
        "totalSousCompetences": total_sc,
        "totalSavoirs": total_sav,
        "enseignantsCovered": len(assigned_ens),
        "tauxCouverture": round(len(assigned_ens) / max(len(enseignants), 1) * 100, 1),
    }

    # Build list of detailed EnseignantInfo for any assigned ID found in DB
    all_db_infos = _fetch_all_enseignants_info()
    found_ens_list = []
    for eid in assigned_ens:
        if eid in all_db_infos:
            found_ens_list.append(all_db_infos[eid])

    return RiceAnalysisResult(
        propositions=domaines,
        stats=stats,
        extractedEnseignants=all_extracted_ens,
        foundEnseignants=found_ens_list,
    )


# ─────────────────────────────────────────────────────────────────────────────
# FastAPI endpoint
# ─────────────────────────────────────────────────────────────────────────────

import json as _json

# ─────────────────────────────────────────────────────────────────────────────
# GC Referential Knowledge Base  (Génie Civil ESPRIT)
# Used for intelligent matching of fiche content → existing competence codes
# ─────────────────────────────────────────────────────────────────────────────

_GC_REFERENTIAL = {
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
    # Chaque entrée reflète exactement l'intitulé officiel du référentiel GC
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
    # Source : tableau "Affectation des savoirs par compétence et par niveaux"
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


def _match_gc_savoir(text: str) -> List[str]:
    """
    Match text against the GC referential to find matching savoir codes.
    Returns list of matched savoir codes sorted by relevance.
    """
    norm = _normalize(text)
    matches = []
    for code, keywords in _GC_REFERENTIAL["savoirs"].items():
        score = sum(1 for kw in keywords if kw in norm)
        if score > 0:
            matches.append((code, score))
    matches.sort(key=lambda x: x[1], reverse=True)
    return [code for code, _ in matches]


def _gc_ref_niveau(gc_codes: List[str]) -> Optional[str]:
    """
    Return the official niveau for the best-matched GC savoir code.
    Prioritises the highest-scoring (first) code in the list.
    Returns None if no code is found in the niveaux table.
    """
    niveaux_map = _GC_REFERENTIAL.get("niveaux", {})
    for code in gc_codes:
        if code in niveaux_map:
            return niveaux_map[code]
    return None


def _match_gc_competence(text: str) -> Optional[str]:
    """
    Match text against the GC referential to find the best-matching competence code.
    """
    norm = _normalize(text)
    best_code = None
    best_score = 0
    for code, info in _GC_REFERENTIAL["competences"].items():
        score = sum(1 for kw in info["keywords"] if kw in norm)
        if score > best_score:
            best_score = score
            best_code = code
    return best_code if best_score > 0 else None


def _suggest_gc_enseignants(savoir_codes: List[str]) -> List[str]:
    """
    Given a list of savoir codes, find which GC enseignants are mapped to them.
    Fetches the mapping dynamically from the database.
    """
    affectations = _fetch_enseignant_affectations()
    suggested = set()
    for ens_id, codes in affectations.items():
        if any(sc in codes for sc in savoir_codes):
            suggested.add(ens_id)
    return list(suggested)


@rice_router.post("/analyze", response_model=RiceAnalysisResult,
                  summary="Analyser les fiches UE/modules et générer le référentiel RICE")
async def rice_analyze(
    files: List[UploadFile] = File(..., description="Fiches UE et modules (PDF/DOCX)"),
    enseignants: str = Form(
        default="[]",
        description='JSON array: [{id, nom, prenom, modules:[...]}]',
    ),
):
    if not files:
        raise HTTPException(400, "Au moins un fichier est requis")

    try:
        ens_list = [EnseignantInfo(**e) for e in _json.loads(enseignants)]
    except Exception as exc:
        raise HTTPException(400, f"Format enseignants invalide: {exc}") from exc

    filenames = [f.filename or f"file_{i}" for i, f in enumerate(files)]
    contents  = [await f.read() for f in files]

    result = analyze_files(filenames, contents, ens_list)
    return result


@rice_router.get("/gc-referential",
                 summary="Obtenir le référentiel GC complet pour matching")
def get_gc_referential():
    """Return the GC competence referential (+ dynamic enseignant affectations)."""
    return {
        **_GC_REFERENTIAL,
        "enseignant_affectations": _fetch_enseignant_affectations(),
    }


@rice_router.post("/gc-refresh-cache",
                  summary="Forcer le rafraîchissement du cache des affectations enseignants")
def gc_refresh_cache():
    """Invalidate the affectations cache so the next call reads fresh data from DB."""
    global _AFFECTATIONS_CACHE_TS
    _AFFECTATIONS_CACHE_TS = 0.0
    fresh = _fetch_enseignant_affectations()
    return {"status": "ok", "enseignants_count": len(fresh)}


@rice_router.post("/gc-match",
                  summary="Matcher un texte libre contre le référentiel GC")
async def gc_match(
    text: str = Form(..., description="Texte à matcher (objectif, contenu de fiche…)"),
):
    """
    Match free text against the GC referential.
    Returns matched savoirs, competence, and suggested enseignants.
    """
    savoir_codes = _match_gc_savoir(text)
    competence = _match_gc_competence(text)
    suggested_ens = _suggest_gc_enseignants(savoir_codes[:5])
    return {
        "matched_savoirs": savoir_codes[:10],
        "matched_competence": competence,
        "suggested_enseignants": suggested_ens,
    }
