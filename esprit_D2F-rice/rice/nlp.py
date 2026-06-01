"""NLP utilities: text extraction, normalization, Bloom taxonomy, type detection,
metadata/acquis/séance extraction, name cleaning, and sub-competence parsing.

This module also contains the LLM-assisted extraction helpers (_llm_extract_*)
that are tightly coupled to the NLP regex fallback logic.
"""

from __future__ import annotations

import io
import os
import re
import unicodedata
import logging
from typing import Any, Dict, List, Optional, Tuple

from fastapi import HTTPException

from rice.llm import _LLM_OK, _llm_chat

logger = logging.getLogger("rice_analyzer")

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

try:
    from rapidfuzz import fuzz as _rfuzz, process as _rprocess
    _FUZZY_OK = True
except ImportError:
    _FUZZY_OK = False
    _rfuzz = None   # type: ignore[assignment]
    _rprocess = None  # type: ignore[assignment]

# ── OCR support (scanned / image PDFs) ───────────────────────────────────────
try:
    import fitz as _fitz        # PyMuPDF – renders PDF pages to images
    import pytesseract as _tess  # Tesseract OCR Python wrapper
    from PIL import Image as _PILImage
    # Configure tesseract binary path via env var so Docker / local can differ
    _tess_cmd = os.getenv("TESSERACT_CMD", "")
    if _tess_cmd:
        _tess.pytesseract.tesseract_cmd = _tess_cmd
    # Quick sanity-check: get_tesseract_version() raises if binary is missing
    _tess.get_tesseract_version()
    _OCR_OK = True
except Exception:
    _fitz = None        # type: ignore[assignment]
    _tess = None        # type: ignore[assignment]
    _PILImage = None    # type: ignore[assignment]
    _OCR_OK = False

# Re-export so other submodules can check availability
__all_flags__ = {"_PDF_OK", "_DOCX_OK", "_FUZZY_OK", "_OCR_OK"}

_RE_WHITESPACE_NEWLINE = r"\s*\n\s*"
_RE_SINGLE_DIGIT = r"^(\d)\s*$"


# ─────────────────────────────────────────────────────────────────────────────
# Text extraction
# ─────────────────────────────────────────────────────────────────────────────

def _serialize_table_header(header: List[str], data_rows: List[List[str]], lines: List[str]) -> None:
    for row in data_rows:
        for col_idx, cell in enumerate(row):
            if cell and col_idx < len(header) and header[col_idx]:
                lines.append(f"{header[col_idx]}: {cell}")


def _serialize_table_kv(table, lines: List[str]) -> None:
    for row in table:
        if not row:
            continue
        cells = [str(c).strip() if c else "" for c in row]
        non_empty = [c for c in cells if c]
        if len(non_empty) == 2:
            lines.append(f"{non_empty[0]}: {non_empty[1]}")
        elif len(non_empty) > 2:
            lines.append(" | ".join(non_empty[:4]))


def _classify_table(table) -> Tuple[List[str], List[List[str]], bool]:
    header: List[str] = []
    data_rows: List[List[str]] = []
    for i, row in enumerate(table):
        cells = [str(c).strip() if c else "" for c in row]
        if not any(cells):
            continue
        if i == 0 and sum(bool(c) for c in cells) > 1:
            header = cells
        else:
            data_rows.append(cells)
    return header, data_rows, bool(header and data_rows)


def _serialize_pdf_tables(tables: list) -> str:
    lines: List[str] = []
    for table in tables:
        if not table:
            continue
        header, data_rows, has_header = _classify_table(table)
        if has_header:
            _serialize_table_header(header, data_rows, lines)
        else:
            _serialize_table_kv(table, lines)
    return "\n".join(lines)


def _extract_pdf(data: bytes) -> Tuple[str, List]:
    """Return (full_text, raw_tables) from all pages of a PDF.

    ``raw_tables`` is a flat list of pdfplumber tables (each table is a
    list-of-rows; each row is a list of cell strings).  It is passed down
    to :func:`_extract_metadata` so that structured table-cell scanning
    can be used before falling back to regex patterns.
    """
    if not _PDF_OK:
        raise HTTPException(500, "pdfplumber not installed")
    page_texts: List[str] = []
    all_raw_tables: List = []
    with pdfplumber.open(io.BytesIO(data)) as pdf:
        for page in pdf.pages:
            text = page.extract_text() or ""
            # Extract structured table data
            try:
                tables = page.extract_tables() or []
                all_raw_tables.extend(tables)          # keep raw for NER
                table_text = _serialize_pdf_tables(tables)
                if table_text:
                    text = f"{text}\n{table_text}" if text else table_text
            except Exception as tbl_err:
                logger.debug(f"Table extraction failed on page: {tbl_err}")
            page_texts.append(text)
    full_text = "\n".join(page_texts)
    # ── OCR fallback for scanned / image PDFs ──────────────────────────────
    if len(full_text.strip()) < 50:
        if _OCR_OK:
            logger.info("PDF has no embedded text — running OCR (pytesseract)")
            full_text = _ocr_scanned_pdf(data)
        else:
            logger.warning(
                "PDF has no embedded text (scanned image) and OCR is not "
                "available. Install Tesseract OCR and set TESSERACT_CMD env var "
                "(or add tesseract to PATH) then restart the service. "
                "See: https://github.com/UB-Mannheim/tesseract/wiki"
            )
    return full_text, all_raw_tables


def _ocr_scanned_pdf(data: bytes) -> str:
    """Extract text from a scanned (image-only) PDF using PyMuPDF + pytesseract.

    Renders each page at 300 DPI (greyscale) for good OCR accuracy, then
    applies Tesseract with French + English language models.
    Requires: pytesseract, pymupdf (fitz), Pillow, and the Tesseract binary
    with the ``fra`` language pack installed.
    """
    # Tesseract language: French primary (ESPRIT fiches), English fallback.
    # Gracefully degrade to 'eng' if the 'fra' pack is not installed.
    lang = os.getenv("TESSERACT_LANG", "fra+eng")
    psm  = os.getenv("TESSERACT_PSM",  "3")   # auto page segmentation

    doc = _fitz.open(stream=data, filetype="pdf")
    page_texts: List[str] = []
    try:
        for page_num in range(len(doc)):
            page = doc[page_num]
            # 300 DPI gives reliable OCR on typical A4 scans.
            mat = _fitz.Matrix(300 / 72, 300 / 72)
            pix = page.get_pixmap(matrix=mat, colorspace=_fitz.csGRAY)
            img = _PILImage.frombytes("L", (pix.width, pix.height), pix.samples)
            try:
                text = _tess.image_to_string(
                    img,
                    lang=lang,
                    config=f"--psm {psm} --oem 3",
                )
            except _tess.TesseractError as exc:
                # 'fra' language pack missing — fall back to English only
                if "fra" in str(exc):
                    logger.warning(
                        "Tesseract 'fra' language pack not found — falling back "
                        "to English. Install it for better French OCR quality."
                    )
                    text = _tess.image_to_string(
                        img, lang="eng", config=f"--psm {psm} --oem 3"
                    )
                else:
                    raise
            page_texts.append(text)
    finally:
        doc.close()

    result = "\n".join(page_texts)
    logger.info("OCR completed: %d chars extracted from %d page(s)",
                len(result), len(page_texts))
    return result


def _extract_docx(data: bytes) -> str:
    if not _DOCX_OK:
        raise HTTPException(500, "python-docx not installed")
    doc = DocxDocument(io.BytesIO(data))
    return "\n".join(p.text for p in doc.paragraphs)


def _extract_text(filename: str, data: bytes) -> Tuple[str, List]:
    """Return ``(text, raw_tables)`` for the given file.

    ``raw_tables`` is only populated for PDF files where pdfplumber can
    extract structured tables; it is an empty list for DOCX / plain-text.
    """
    name = _secure_filename(filename).lower()
    if name.endswith(".pdf"):
        return _extract_pdf(data)
    if name.endswith(".docx") or name.endswith(".doc"):
        return _extract_docx(data), []
    # plain text fallback
    return data.decode("utf-8", errors="ignore"), []


def _secure_filename(filename: str) -> str:
    """Sanitise a user-supplied filename to prevent path-traversal attacks.

    Strips directory components, null bytes, and non-ASCII control characters.
    Returns a safe basename suitable for logging and extension checks.
    """
    # Remove null bytes and control chars
    name = re.sub(r'[\x00-\x1f]', '', filename)
    # Take only the base name (strip any directory components)
    name = os.path.basename(name.replace("..", ""))
    # Remove remaining problematic characters
    name = re.sub(r'[<>:"|?*]', '_', name)
    return name.strip() or "unnamed_file"


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


def _build_domain_name_from_file(filename: str) -> str:
    """Infer a readable module/domain name from the filename stem."""
    stem = os.path.splitext(os.path.basename(filename))[0]
    clean = re.sub(
        r"^(?:fiche(?:[_\s]?module)?|module|ue|cours)[_\s]?",
        "",
        stem,
        flags=re.IGNORECASE,
    )
    clean = re.sub(r"[_\-]+", " ", clean).strip()
    clean = re.sub(r"([a-z])([A-ZÀ-Ü])", r"\1 \2", clean)
    return clean.strip().title() or "Module"


def _normalize_ref_code(code: str) -> str:
    """Strip any department prefix from a savoir code.

    Examples::

        'GC-01-S2a' → 'S2a'
        'INFO-A1'   → 'A1'
        'S2a'       → 'S2a'
    """
    return re.split(r"[-–]", code)[-1]


def _codes_match(db_code: str, search_code: str) -> bool:
    """Return True if *search_code* matches *db_code*, tolerating dept prefixes.

    Examples::

        _codes_match('GC-01-S2a', 'S2a')  → True
        _codes_match('S2a', 'GC-01-S2a')  → True
        _codes_match('S2a', 'S2a')        → True
        _codes_match('S3b', 'S2a')        → False
    """
    if db_code == search_code:
        return True
    return _normalize_ref_code(db_code) == _normalize_ref_code(search_code)


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
    # Level 6 – Créer (design, build, synthesize)
    (re.compile(
        r"\b(creer|concevoir|developper|produire|construire|elaborer|"
        r"proposer|innover|composer|planifier|mettre\s+en\s+place|realiser|"
        r"dimensionner|rehabiliter|amenager|piloter|optimiser|"
        r"architecturer|programmer|deployer|integrer\s+un\s+systeme|"
        r"usiner|assembler|fabriquer|prototyper|syntheti[sz]er)\b",
        re.I), 6),
    # Level 5 – Évaluer (judge, validate, audit)
    (re.compile(
        r"\b(evaluer|juger|critiquer|justifier|argumenter|"
        r"defendre|recommander|selectionner|"
        r"diagnostiquer|verifier|controler|auditer|expertiser|valider|"
        r"tester|benchmarker|qualifier|certifier)\b", re.I), 5),
    # Level 4 – Analyser (compare, decompose, model)
    (re.compile(
        r"\b(analyser|comparer|distinguer|examiner|"
        r"differencier|decomposer|organiser|categoriser|"
        r"modeliser|interpreter|superviser|instrumenter|calculer|"
        r"debugger?|profiler|tracer|simuler)\b", re.I), 4),
    # Level 3 – Appliquer (execute, configure, use)
    (re.compile(
        r"\b(appliquer|utiliser|manipuler|implementer|"
        r"executer|resoudre|employer|configurer|installer|"
        r"gerer|integrer|regrouper|"
        r"effectuer|rediger|maitriser|tracer|relever|mesurer|"
        r"programmer?|coder|deployer|monter|brancher|connecter)\b", re.I), 3),
    # Level 2 – Comprendre (explain, describe)
    (re.compile(
        r"\b(comprendre|expliquer|decrire|illustrer|"
        r"interpreter|resumer|classifier|discuter|"
        r"se\s+familiariser|reconnaitre\s+les)\b", re.I), 2),
    # Level 1 – Mémoriser (recall, list, name)
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
    # Civil / structural engineering
    r"chantier|terrain|essai|laboratoire|releve|mesure|maquette|"
    r"bim|autocad|revit|robot\s+structural|etabs|sap2000|"
    r"modeli|simulation|dimensionn|concevoir|fondation|soutenement|"
    r"terrassement|coffrage|ferraillage|betonnage|topographi|"
    # Computer science / software engineering
    r"programmer?|debugger?|tester|deployer|jenkins|docker|git|"
    r"base\s+de\s+donn[ée]es|reseau\s+local|socket|api\s+rest|"
    r"machine\s+learning|entrainement\s+mod[eè]le|"
    # Electrical / electronic engineering
    r"montage|circuit|oscilloscope|multimetre|banc\s+de\s+test|"
    r"fpga|arduino|raspberry|microcontroleur|"
    # Mechanical engineering
    r"usinage|fraisage|tournage|moulage|assemblage|"
    r"cfao|catia|solidworks|ansys|"
    # Telecom
    r"wireshark|routeur|switch|vlsi|hfss|matlab\s+simulink)\b",
    re.IGNORECASE,
)

_THEORIQUE_PATTERNS = re.compile(
    r"\b(cours|theorie|theorique|concept|principe|fondement|notion|"
    r"reconnaitre|comprendre|definir|identifier|memoriser|"
    r"introduction|presentation|fondamentaux|"
    # Civil / structural engineering theory
    r"mecanique\s+des\s+sols|resistance\s+des\s+materiaux|rdm|"
    r"bael|eurocode|norme|reglementation|formule|loi\s+de|"
    r"hypothese|demonstration|calcul\s+theorique|"
    # Computer science theory
    r"algorithmique|complexite|automate|grammaire|langage\s+formel|"
    r"protocole|modele\s+osi|architecture\s+logicielle|pattern|"
    # Electrical / electronic theory
    r"loi\s+(de\s+)?ohm|kirchhoff|theor[eè]me|composant|signal|"
    r"transformee|fourier|filtre|amplificateur|transistor|"
    # Mechanical engineering theory
    r"thermodynamique|cin[eé]matique|dynamique|m[eé]canique\s+des\s+fluides|"
    r"mat[eé]riaux|m[eé]tallurgie|tribologie|"
    # Telecom theory
    r"modulation|codage|antenne|propagation|debit|bande\s+passante)\b",
    re.IGNORECASE,
)

class _UniversalPatterns:
    """Department-aware NLP pattern extensions for PRATIQUE/THEORIQUE classification.

    The base global patterns (_PRATIQUE_PATTERNS / _THEORIQUE_PATTERNS) already cover
    keywords for all ESPRIT departments.  This class adds *incremental* dept-specific
    phrases that are too specialised for the base patterns.
    """

    # Additional practical activity patterns per department
    _EXTRA_PRATIQUE: Dict[str, re.Pattern] = {
        "info": re.compile(
            r"\b(entrainer\s+mod[eè]le|fine[\s\-]tuning|notebook\s+jupyter|"
            r"pipeline\s+ci|deployer\s+image|build\s+docker|"
            r"commit\s+git|merge\s+request|pull\s+request)\b", re.IGNORECASE,
        ),
        "telecom": re.compile(
            r"\b(simulation\s+ns3|simulation\s+opnet|banc\s+rf|"
            r"analyseur\s+spectre|anritsu|configurer\s+routeur|"
            r"wireshark\s+capture|vlsi\s+implementation)\b", re.IGNORECASE,
        ),
        "ge": re.compile(
            r"\b(montage\s+circuit|banc\s+moteur|pupitre\s+electrique|"
            r"tp\s+fpga|tp\s+automate|maquette\s+electrique)\b", re.IGNORECASE,
        ),
        "meca": re.compile(
            r"\b(atelier\s+usinage|atelier\s+fraisage|banc\s+mecatronique|"
            r"tp\s+catia|tp\s+solidworks|maquette\s+robot)\b", re.IGNORECASE,
        ),
    }

    # Additional theory/concept patterns per department
    _EXTRA_THEORIQUE: Dict[str, re.Pattern] = {
        "info": re.compile(
            r"\b(algorithmique\s+avancee|theorie\s+des\s+graphes|"
            r"automate\s+fini|complexite\s+algorithmique|"
            r"paradigme\s+programmation|theorie\s+des\s+langages)\b", re.IGNORECASE,
        ),
        "telecom": re.compile(
            r"\b(theorie\s+(de\s+l[a'])?information|theorie\s+shannon|"
            r"electromagn[eé]tisme\s+th[eé]orique|propagation\s+th[eé]orie|"
            r"calcul\s+bilan\s+liaison)\b", re.IGNORECASE,
        ),
        "ge": re.compile(
            r"\b(theorie\s+(des\s+)?circuits|theorie\s+(de\s+la\s+)?commande|"
            r"electromagnetisme\s+cours|analyse\s+harmonique)\b", re.IGNORECASE,
        ),
        "meca": re.compile(
            r"\b(theorie\s+mecanique|mecanique\s+th[eé]orique|"
            r"cours\s+thermodynamique|cinématique\s+th[eé]orique)\b", re.IGNORECASE,
        ),
    }

    @classmethod
    def score(cls, text: str, department: str) -> Tuple[int, int]:
        """Return (pratique_score, theorique_score) combining base + dept-specific patterns.

        Args:
            text: raw text to classify (normalization applied internally)
            department: ESPRIT department code (e.g. 'gc', 'info', 'ge', 'meca', 'telecom')
        Returns:
            (prat_score, theo_score): higher score determines the type
        """
        norm = _normalize(text)
        prat = len(_PRATIQUE_PATTERNS.findall(norm))
        theo = len(_THEORIQUE_PATTERNS.findall(norm))
        dept = department.lower().strip()
        extra_p = cls._EXTRA_PRATIQUE.get(dept)
        extra_t = cls._EXTRA_THEORIQUE.get(dept)
        if extra_p:
            prat += len(extra_p.findall(norm))
        if extra_t:
            theo += len(extra_t.findall(norm))
        return prat, theo


def _detect_type(text: str, departement: str = "gc") -> str:
    """Classify a savoir as PRATIQUE or THEORIQUE using department-aware NLP.

    Uses _UniversalPatterns which combines the base cross-department keyword
    patterns with incremental department-specific extensions.
    """
    prat_score, theo_score = _UniversalPatterns.score(text, departement)
    return "PRATIQUE" if prat_score > theo_score else "THEORIQUE"


# ─────────────────────────────────────────────────────────────────────────────
# LLM-assisted extraction functions (tightly coupled to NLP regex fallbacks)
# ─────────────────────────────────────────────────────────────────────────────

def _llm_extract_metadata(text: str) -> Dict[str, Any]:
    """Use LLM to extract fiche module metadata (NER).

    Returns a partial dict with only the fields the LLM found.
    The caller merges this with the table/regex NER results.
    """
    import json as _json_local
    truncated = text[:3500]
    prompt = (
        "Tu es un expert en extraction d'information de fiches modules universitaires françaises.\n"
        "Extrais les métadonnées de cette fiche module ESPRIT (école d'ingénieurs tunisienne).\n"
        "Retourne UNIQUEMENT un objet JSON valide avec ces clés (null si absent) :\n"
        "{\n"
        '  "code_module": "code alphanumérique du module (ex: MT-34, GC05-F)",\n'
        '  "nom_module": "intitulé complet du module/UE",\n'
        '  "unite_pedagogique": "nom de l\'unité pédagogique ou spécialité",\n'
        '  "responsable": "nom complet du responsable/coordinateur du module",\n'
        '  "enseignants_noms": ["liste", "des", "noms", "complets"],\n'
        '  "enseignants_roles": {"Prénom NOM": "responsable|coordinateur|enseignant"},\n'
        '  "prerequis": "prérequis du module (chaîne texte)",\n'
        '  "objectif": "objectifs pédagogiques du module (chaîne texte)"\n'
        "}\n\n"
        f"FICHE :\n{truncated}"
    )
    raw = _llm_chat([{"role": "user", "content": prompt}])
    if not raw:
        return {}
    try:
        result = _json_local.loads(raw)
        out = _sanitize_llm_metadata(result)
        logger.info(f"LLM metadata extracted: {list(out.keys())}")
        return out
    except Exception as exc:
        logger.warning(f"LLM metadata parse error: {exc} | raw={raw[:200]}")
        return {}


_LLM_VALID_ROLES = {"responsable", "coordinateur", "enseignant", "intervenant"}


def _extract_llm_text(value: Any, min_len: int = 1, uppercase: bool = False) -> Optional[str]:
    if not isinstance(value, str):
        return None
    cleaned = value.strip()
    if uppercase:
        cleaned = cleaned.upper()
    if len(cleaned) < min_len:
        return None
    return cleaned


def _extract_llm_names(value: Any) -> List[str]:
    if not isinstance(value, list):
        return []
    names = [_clean_name(str(n)) for n in value if n]
    return [n for n in names if n]


def _extract_llm_roles(value: Any) -> Dict[str, str]:
    if not isinstance(value, dict):
        return {}
    roles: Dict[str, str] = {}
    for raw_name, raw_role in value.items():
        cleaned_name = _clean_name(str(raw_name))
        role = str(raw_role)
        if cleaned_name and role in _LLM_VALID_ROLES:
            roles[cleaned_name] = role
    return roles


def _sanitize_llm_metadata(result: Dict[str, Any]) -> Dict[str, Any]:
    out: Dict[str, Any] = {}

    code = _extract_llm_text(result.get("code_module"), min_len=2, uppercase=True)
    if code and re.search(r"[A-Z0-9]", code):
        out["code_module"] = code

    nom = _extract_llm_text(result.get("nom_module"), min_len=4)
    if nom:
        out["nom_module"] = nom

    up = _extract_llm_text(result.get("unite_pedagogique"), min_len=4)
    if up:
        out["unite_pedagogique"] = up

    responsable = _clean_name(str(result.get("responsable", "")))
    if responsable:
        out["responsable"] = responsable

    names = _extract_llm_names(result.get("enseignants_noms"))
    if names:
        out["enseignants_noms"] = names

    roles = _extract_llm_roles(result.get("enseignants_roles"))
    if roles:
        out["enseignants_roles"] = roles

    prerequis = _extract_llm_text(result.get("prerequis"), min_len=4)
    if prerequis:
        out["prerequis"] = prerequis

    objectif = _extract_llm_text(result.get("objectif"), min_len=6)
    if objectif:
        out["objectif"] = objectif

    return out


def _llm_extract_acquis(text: str) -> List[Dict[str, Any]]:
    """Use LLM to extract Acquis d'Apprentissage (AA) with Bloom levels.

    Returns a list of ``{id, text, bloom_level}`` dicts.
    Empty list on failure (caller falls back to regex parser).
    """
    import json as _json_local
    aa_match = re.search(
        r"(Acquis\s+d['\u2019\u2018]apprentissage.*)(?=Contenu\s+d[eé]taill[eé]|Plan\s+du\s+cours|$)",
        text, re.I | re.DOTALL,
    )
    section = (aa_match.group(1) if aa_match else text)[:2800]
    prompt = (
        "Tu es un expert en ingénierie pédagogique. "
        "Extrais les Acquis d'Apprentissage (AA) de cette section d'une fiche module universitaire française.\n"
        "Chaque AA est en général introduit par 'AA1', 'AA2', etc.\n"
        "Pour chaque AA, attribue un niveau de la taxonomie de Bloom :\n"
        "  1=Mémoriser, 2=Comprendre, 3=Appliquer, 4=Analyser, 5=Évaluer, 6=Créer\n"
        "Retourne UNIQUEMENT un objet JSON valide :\n"
        '{"acquis": [{"id": 1, "text": "Texte complet de l\'AA", "bloom_level": 3}, ...]}\n\n'
        f"SECTION :\n{section}"
    )
    raw = _llm_chat([{"role": "user", "content": prompt}])
    if not raw:
        return []
    try:
        result = _json_local.loads(raw)
        validated = []
        for aa in result.get("acquis", []):
            t = str(aa.get("text", "")).strip()
            bl = int(aa.get("bloom_level", 2))
            if len(t) > 5:
                validated.append({
                    "id": int(aa.get("id", len(validated) + 1)),
                    "text": t,
                    "bloom_level": min(max(bl, 1), 6),
                })
        logger.info(f"LLM acquis extracted: {len(validated)}")
        return validated
    except Exception as exc:
        logger.warning(f"LLM acquis parse error: {exc} | raw={raw[:200]}")
        return []


def _llm_extract_seances(text: str) -> List[Dict[str, Any]]:
    """Use LLM to extract sessions/séances from the contenu détaillé.

    Returns a list of séance dicts compatible with ``_extract_seances()``.
    Empty list on failure.
    """
    import json as _json_local
    seance_match = re.search(
        r"(Contenu\s+d[eé]taill[eé].*)(?=Mode\s+d['\u2019]|[EÉ]valuation|R[eé]f[eé]rences|Bibliographie|$)",
        text, re.I | re.DOTALL,
    )
    section = (seance_match.group(1) if seance_match else text)[:3000]
    prompt = (
        "Tu es un expert en ingénierie pédagogique. "
        "Extrais les séances/chapitres/sessions du contenu détaillé de cette fiche module universitaire.\n"
        "Pour chaque séance, identifie : numéro, titre, sous-points, type (Cours/TP/TD/Projet), durée.\n"
        "Retourne UNIQUEMENT un objet JSON valide :\n"
        '{"seances": [{\n'
        '  "numero": "1",\n'
        '  "titre": "Titre de la séance",\n'
        '  "items": ["Sous-point A", "Sous-point B"],\n'
        '  "type_apprentissage": "Cours|TP|TD|Projet|null",\n'
        '  "duree": "3h|null"\n'
        '}]}\n\n'
        f"SECTION :\n{section}"
    )
    raw = _llm_chat([{"role": "user", "content": prompt}])
    if not raw:
        return []
    try:
        result = _json_local.loads(raw)
        validated = []
        for s in result.get("seances", []):
            titre = str(s.get("titre", "")).strip()
            if not titre:
                continue
            validated.append({
                "numero": str(s.get("numero", len(validated) + 1)),
                "titre": titre,
                "items": [str(i).strip() for i in s.get("items", []) if str(i).strip()],
                "type_apprentissage": s.get("type_apprentissage") or None,
                "duree": s.get("duree") or None,
            })
        logger.info(f"LLM séances extracted: {len(validated)}")
        return validated
    except Exception as exc:
        logger.warning(f"LLM séances parse error: {exc} | raw={raw[:200]}")
        return []


def _llm_fallback_items(text: str, module_name: str) -> List[str]:
    """Use LLM to extract competence items from freeform text (last-resort fallback).

    Returns a list of action-verb phrases suitable as savoir names.
    """
    import json as _json_local
    prompt = (
        "Tu es un expert en ingénierie pédagogique. "
        "Extrais les compétences et savoirs à acquérir de ce texte de fiche module.\n"
        "Formule chaque compétence comme une phrase courte avec un verbe d'action "
        "(taxonomie de Bloom : analyser, concevoir, appliquer, réaliser…).\n"
        "Retourne UNIQUEMENT un objet JSON valide :\n"
        '{"items": ["Analyser les données de sol", "Concevoir un coffrage", ...]}\n\n'
        f"MODULE : {module_name}\n\nTEXTE :\n{text[:2500]}"
    )
    raw = _llm_chat([{"role": "user", "content": prompt}])
    if not raw:
        return []
    try:
        result = _json_local.loads(raw)
        items = [str(i).strip() for i in result.get("items", []) if len(str(i).strip()) > 5]
        logger.info(f"LLM fallback items extracted: {len(items)}")
        return items[:25]
    except Exception as exc:
        logger.warning(f"LLM fallback parse error: {exc} | raw={raw[:200]}")
        return []


# ─────────────────────────────────────────────────────────────────────────────
# NLP – Sous-compétence title extraction (regex + LLM fallback)
# ─────────────────────────────────────────────────────────────────────────────

# Various forms seen in ESPRIT fiches:
#   "SC1 – Analyse des exigences"
#   "Sous-compétence : Conception du test"
#   "S‑C 2. Validation logicielle"
_RE_SUBCOMP_TITLE_1 = re.compile(
    r"^(?:SC|Sous[-\s]?comp[ée]tence)\s*\d*\s*[:\-–]\s*([^\n\r]+)", re.I | re.M
)
_RE_SUBCOMP_TITLE_2 = re.compile(
    r"^Sous[-\s]?comp[ée]tence\s*[:\-–]\s*([^\n\r]+)", re.I | re.M
)
_RE_SUBCOMP_TITLE_3 = re.compile(
    r"^S[\-‑]C\s*(\d+)\s*[.\-–]\s*([^\n\r]+)", re.I | re.M
)


def _extract_subcompetences(text: str) -> List[Tuple[int, str]]:
    """Extract explicit sous-compétence titles from fiche text.

    Returns a list of ``(line_number_1based, title_string)`` tuples, sorted by
    line number.  Returns an empty list when no explicit titles are found in
    the text (the caller should then fall back to the LLM extractor or the
    default Bloom-level grouping).
    """
    titles: List[Tuple[int, str]] = []
    seen_titles: set = set()
    lines = text.splitlines()
    for i, line in enumerate(lines):
        for pat in (_RE_SUBCOMP_TITLE_1, _RE_SUBCOMP_TITLE_2, _RE_SUBCOMP_TITLE_3):
            m = pat.search(line)
            if m:
                # _RE_SUBCOMP_TITLE_3 captures (number, title), others capture (title)
                titre = m.group(2) if len(m.groups()) >= 2 else m.group(1)
                titre = titre.strip(" :‑–-")
                if titre and titre.lower() not in seen_titles:
                    seen_titles.add(titre.lower())
                    titles.append((i + 1, titre))
                break
    return titles


def _llm_extract_subcompetences(text: str, module_name: str) -> List[str]:
    """Use LLM to extract sous-compétence titles when regex finds nothing.

    Returns a list of title strings (no line numbers).
    """
    prompt = (
        "Tu es un expert en ingénierie pédagogique. "
        "À partir du texte ci-dessous, liste seulement les titres de sous-compétences, "
        "un titre par ligne. Ne numérote pas les titres. Pas de commentaire.\n\n"
        f"MODULE : {module_name}\n\n"
        f"{text[:3500]}"
    )
    raw = _llm_chat([{"role": "user", "content": prompt}], temperature=0.1)
    if not raw:
        return []
    # LLM may return JSON or plain lines; handle both
    try:
        import json as _jl
        parsed = _jl.loads(raw)
        if isinstance(parsed, list):
            return [str(t).strip() for t in parsed if str(t).strip()]
        if isinstance(parsed, dict):
            items = parsed.get("items") or parsed.get("titres") or parsed.get("sous_competences") or []
            return [str(t).strip() for t in items if str(t).strip()]
    except Exception:
        pass
    return [ln.strip() for ln in raw.splitlines() if ln.strip() and len(ln.strip()) > 3]


# ─────────────────────────────────────────────────────────────────────────────
# NLP – Fiche metadata extraction (Named Entity Recognition style)
# ─────────────────────────────────────────────────────────────────────────────

# ── Standard format: label : value on the SAME line ─────────────────────────
_RE_MODULE_CODE = re.compile(
    r"code\s*[:\-]?\s*([A-Z][A-Z0-9\-_]{2,15})", re.I
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
_RE_MODULE_TITLE_ESPRIT = re.compile(
    r"^(Module\s*[:\-]\s*|Fiche\s+[Mm]odule\s*[:\-]?\s*)(.{3,100})$",
    re.MULTILINE,
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
    r"^(.{5,80})\n\s*Responsable\s*(?:Module|UE|Mati[eè]re|Cours)?",
    re.IGNORECASE | re.MULTILINE,
)
# Standard enseignants (label: value)
_RE_ENSEIGNANTS = re.compile(
    r"(?:Enseignants?|Intervenants?|Professeurs?|Formateurs?|Titulaire)\s*[:\-]?\s*(.{5,300})",
    re.IGNORECASE,
)
_RE_ENSEIGNANTS_DUAL = re.compile(
    r"(?:Enseignants?|Intervenants?)\s*[\u2013\-]\s*(?:Enseignants?|Intervenants?)\s*[:\-]?\s*(.{5,300})",
    re.IGNORECASE,
)
# Reversed format: capture line BEFORE "Enseignants" label
_RE_ENSEIGNANTS_REV = re.compile(
    r"^(.{5,300})\n\s*(?:Enseignants?|Intervenants?)\s*$",
    re.IGNORECASE | re.MULTILINE,
)
_RE_ENSEIGNANTS_REV_DUAL = re.compile(
    r"^(.{5,300})\n\s*(?:Enseignants?|Intervenants?)\s*[\u2013\-]\s*(?:Enseignants?|Intervenants?)\s*$",
    re.IGNORECASE | re.MULTILINE,
)
# Additional patterns for ESPRIT fiche modules (table-based PDFs)
_RE_NOM_PRENOM = re.compile(
    r"(?:Nom\s+(?:et|&)\s+Pr[eé]nom|Nom\s+Pr[eé]nom)\s*[:\-]?\s*(.{5,80})",
    re.IGNORECASE,
)
_RE_EQUIPE_PEDAGOGIQUE = re.compile(
    r"[ÉE]quipe\s+p[ée]dagogique\s*[:\-]?\s*(.{5,400})",
    re.IGNORECASE,
)
_RE_COORDINATEUR = re.compile(
    r"Coordinat(?:eur|rice)(?:\s+(?:du\s+)?(?:module|UE|cours))?\s*[:\-]?\s*(.{3,80})",
    re.IGNORECASE,
)
# Standard prerequis
_RE_PREREQUIS = re.compile(
    r"Pr\u00e9[\-\s]?requis\s*[:\-]?\s*(.{3,200})",
    re.IGNORECASE,
)
# Reversed format: capture line BEFORE "Prérequis" label
_RE_PREREQUIS_REV = re.compile(
    r"^(.{3,200})\n\s*Pr[eé][\-\s]?requis\s*$",
    re.IGNORECASE | re.MULTILINE,
)
_RE_OBJECTIF = re.compile(
    r"Objectifs?(?:\s+du\s+module)?\s*[:\-]?\s*(.+)(?=\n\n|Mode\s+d|Acquis|$)",
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
    name = re.sub(r"\s*[\(\[][^\)\]]*[\)\]]", "", raw)  # remove (parentheses)
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


# ── Labels used for table-based NER (normalised) ─────────────────────────────
_TABLE_NER_LABELS: Dict[str, str] = {
    # normalised label text → meta key
    "responsable":             "responsable",
    "responsable du module":   "responsable",
    "responsable module":      "responsable",
    "coordinateur":            "coordinateur",
    "coordinatrice":           "coordinateur",
    "coordinateur du module":  "coordinateur",
    "enseignant":              "enseignant_raw",
    "enseignants":             "enseignant_raw",
    "intervenants":            "enseignant_raw",
    "equipe pedagogique":      "enseignant_raw",
    "nom et prenom":           "enseignant_raw",
    "nom prenom":              "enseignant_raw",
    "intitule":                "nom_module",
    "intitule du module":      "nom_module",
    "module":                  "nom_module",
    "code":                    "code_module",
    "code module":             "code_module",
    "code ue":                 "code_module",
    "unite pedagogique":       "unite_pedagogique",
    "up":                      "unite_pedagogique",
    "prerequis":               "prerequis",
    "pre-requis":              "prerequis",
    "objectif":                "objectif",
    "objectifs":               "objectif",
    "objectifs du module":     "objectif",
}


def _find_meta_key_for_cell(cell: str) -> Optional[str]:
    """Resolve a raw table label cell to a metadata key across PDF variants."""
    if not cell:
        return None

    norm1 = _normalize(cell.strip())
    norm2 = re.sub(r"\s+", " ", norm1).strip()
    norm3 = re.sub(r"[\-–\u2014]", " ", norm2)
    norm3 = re.sub(r"\s+", " ", norm3).strip()

    for norm in (norm1, norm2, norm3):
        key = _TABLE_NER_LABELS.get(norm)
        if key is not None:
            return key

    if norm3.startswith("enseignant") and ("intervenant" in norm3 or len(norm3) < 45):
        return "enseignant_raw"

    for label, mk in sorted(_TABLE_NER_LABELS.items(), key=lambda x: -len(x[0])):
        if len(label) >= 5 and label in norm3:
            return mk

    return None


def _is_valid_enseignant_value(value: str) -> bool:
    """Return True only when *value* looks like a teacher-name list."""
    if not value or len(value.strip()) < 3:
        return False

    v = value.strip()
    if v.count(":") >= 2:
        return False

    label_starts = re.compile(
        r"^(module|code|unite|responsable|prerequis|niveaux|objectif|"
        r"mode\s+d|evaluation|contenu|acquis|derniere)\b",
        re.IGNORECASE,
    )
    if label_starts.match(_normalize(v)):
        return False

    if len(v) > 150 and ":" in v:
        return False

    if re.search(r"\b(responsable|module)\b", _normalize(v)) and ":" not in v:
        return False

    if not re.search(r"[A-ZÀ-Ü]", v):
        return False

    return True


def _get_cell_value(cells: List[str], table, row_idx: int, col_idx: int) -> str:
    if col_idx + 1 < len(cells) and cells[col_idx + 1].strip():
        return cells[col_idx + 1].strip()
    if row_idx + 1 < len(table):
        next_row = [str(c).strip() if c else "" for c in table[row_idx + 1]]
        if col_idx < len(next_row) and next_row[col_idx].strip():
            return next_row[col_idx].strip()
    return ""


def _handle_table_responsable(value: str, meta: Dict[str, Any]) -> None:
    if "responsable" not in meta:
        cleaned = _clean_name(value)
        if cleaned:
            meta["responsable"] = cleaned


def _handle_table_coordinateur(value: str, meta: Dict[str, Any]) -> None:
    if "coordinateur" not in meta:
        cleaned = _clean_name(value)
        if cleaned:
            meta["coordinateur"] = cleaned
            meta.setdefault("enseignants_noms", []).append(cleaned)
            meta.setdefault("enseignants_roles", {})[cleaned] = "coordinateur"


def _handle_table_enseignant(value: str, meta: Dict[str, Any]) -> None:
    names = _split_names(value)
    for n in names:
        meta.setdefault("enseignants_noms", []).append(n)
        meta.setdefault("enseignants_roles", {})[n] = "enseignant"


def _handle_table_nom_module(value: str, meta: Dict[str, Any]) -> None:
    if "nom_module" not in meta:
        raw_val = value.strip().rstrip(".")
        raw_val = re.sub(r"\s*(Pr\u00e9requis|Niveaux|Objectif|Derni[\u00e8e]re).*$", "", raw_val, flags=re.I)
        if len(raw_val) > 2:
            meta["nom_module"] = raw_val


def _handle_table_code_module(value: str, meta: Dict[str, Any]) -> None:
    if "code_module" not in meta:
        code = value.strip().upper()
        if re.search(r"\d", code):
            meta["code_module"] = code


def _handle_table_unite_pedagogique(value: str, meta: Dict[str, Any]) -> None:
    if "unite_pedagogique" not in meta and len(value) > 2:
        meta["unite_pedagogique"] = value.strip()


def _handle_table_prerequis(value: str, meta: Dict[str, Any]) -> None:
    if "prerequis" not in meta:
        meta["prerequis"] = value.strip()


def _handle_table_objectif(value: str, meta: Dict[str, Any]) -> None:
    if "objectif" not in meta:
        meta["objectif"] = re.sub(_RE_WHITESPACE_NEWLINE, " ", value).strip()


_TABLE_META_HANDLERS = {
    "responsable": _handle_table_responsable,
    "coordinateur": _handle_table_coordinateur,
    "enseignant_raw": _handle_table_enseignant,
    "nom_module": _handle_table_nom_module,
    "code_module": _handle_table_code_module,
    "unite_pedagogique": _handle_table_unite_pedagogique,
    "prerequis": _handle_table_prerequis,
    "objectif": _handle_table_objectif,
}


def _scan_tables_for_meta(raw_tables: List, meta: Dict[str, Any]) -> None:
    for table in raw_tables:
        for row_idx, row in enumerate(table):
            _scan_table_row_for_meta(table, row_idx, row, meta)


def _scan_table_row_for_meta(table, row_idx: int, row, meta: Dict[str, Any]) -> None:
    cells = [str(c).strip() if c else "" for c in row]
    for col_idx, cell in enumerate(cells):
        _apply_table_meta_cell(cells, table, row_idx, col_idx, cell, meta)


def _apply_table_meta_cell(
    cells: List[str],
    table,
    row_idx: int,
    col_idx: int,
    cell: str,
    meta: Dict[str, Any],
) -> None:
    meta_key = _TABLE_NER_LABELS.get(_normalize(cell))
    if meta_key is None:
        return
    value = _get_cell_value(cells, table, row_idx, col_idx)
    if not value:
        return
    handler = _TABLE_META_HANDLERS.get(meta_key)
    if handler:
        handler(value, meta)


_RE_UP_REV = re.compile(
    r"^(.{3,60})\n\s*(?:Unit[eé]\s+p[eé]dagogique|UP)\s*$", re.I | re.MULTILINE,
)
_RE_PREREQUIS_NOISE = re.compile(r"^\d+[A-Z]{3,}")
_RE_SECTION_HDR = re.compile(
    r"^(?:Unit[eé]|Pr[eé]requis|Niveaux|Objectif|Mode\s+d|Acquis|"
    r"Responsable|Enseignants?|Coordinat|Volume|Cr[eé]dit|ECTS|Semestre|"
    r"Code\s|Description|Plan\s|Chapitre|S[eé]ance|Contenu|R[eé]f[eé]rence|"
    r"Bibliographie|Evaluation|Examen)",
    re.IGNORECASE,
)


def _grab_continuation(match_obj: re.Match, source: str) -> str:
    raw = match_obj.group(1).strip()
    pos = match_obj.end()
    remainder = source[pos:].lstrip("\n")
    for cont_line in remainder.split("\n"):
        cl = cont_line.strip()
        if not cl:
            break
        if _RE_SECTION_HDR.match(cl):
            break
        raw += " " + cl
    return raw


def _deduplicate_names(meta: Dict[str, Any]) -> None:
    if "enseignants_noms" not in meta:
        return
    seen: set = set()
    unique: List[str] = []
    for n in meta["enseignants_noms"]:
        if not n or len(n.strip()) <= 3:
            continue
        norm = _normalize(n)
        if norm not in seen:
            seen.add(norm)
            unique.append(n)
    meta["enseignants_noms"] = unique


def _extract_regex_code_module(text: str) -> Optional[str]:
    m = _RE_MODULE_CODE_TABLE.search(text)
    if m:
        return m.group(1).strip().upper()
    m = _RE_MODULE_CODE.search(text)
    if m:
        code = m.group(1).strip().upper()
        if re.search(r'\d', code):
            return code
    return None


def _extract_regex_nom_module(text: str) -> Optional[str]:
    m = _RE_MODULE_NAME.search(text)
    if not m:
        return None
    name = m.group(1).strip().rstrip(".")
    return re.sub(r"\s*(Pr\u00e9requis|Niveaux|Objectif|Derni[eè]re).*$", "", name, flags=re.I)


def _extract_regex_unite_pedagogique(text: str) -> Optional[str]:
    m = _RE_UNITE_PEDAGOGIQUE.search(text)
    if m:
        return m.group(1).strip()
    m_rev = _RE_UP_REV.search(text)
    if m_rev:
        return m_rev.group(1).strip()
    return None


def _extract_regex_responsable(text: str) -> Optional[str]:
    m_rev = _RE_RESPONSABLE_REV.search(text)
    if m_rev:
        cleaned = _clean_name(m_rev.group(1).strip())
        if cleaned:
            return cleaned
    m = _RE_RESPONSABLE.search(text)
    if m:
        cleaned = _clean_name(m.group(1).strip())
        if cleaned:
            return cleaned
    return None


def _extract_ens_names_from_standard(text: str) -> List[str]:
    m = _RE_ENSEIGNANTS_DUAL.search(text)
    if not m:
        m = _RE_ENSEIGNANTS.search(text)
    if m:
        raw_val = _grab_continuation(m, text)
        return _split_names(raw_val)
    return []


def _extract_ens_names_from_rev(text: str) -> List[str]:
    m_rev = _RE_ENSEIGNANTS_REV_DUAL.search(text)
    if not m_rev:
        m_rev = _RE_ENSEIGNANTS_REV.search(text)
    if m_rev:
        raw_val = m_rev.group(1).strip()
        if not re.match(r'^Responsable\b', raw_val, re.I):
            return _split_names(raw_val)
    return []


def _extract_regex_enseignants(text: str) -> List[str]:
    names = _extract_ens_names_from_standard(text)
    if not names:
        names = _extract_ens_names_from_rev(text)
    return names


def _extract_regex_prerequis(text: str) -> Optional[str]:
    m_rev = _RE_PREREQUIS_REV.search(text)
    if m_rev:
        return m_rev.group(1).strip()
    m = _RE_PREREQUIS.search(text)
    if m:
        val = m.group(1).strip()
        if not _RE_PREREQUIS_NOISE.match(val):
            return val
    return None


def _extract_regex_objectif(text: str) -> Optional[str]:
    m = _RE_OBJECTIF.search(text)
    if m:
        obj = m.group(1).strip()
        return re.sub(_RE_WHITESPACE_NEWLINE, " ", obj).strip()
    return None


def _merge_llm_meta(text: str, meta: Dict[str, Any]) -> None:
    llm_meta = _llm_extract_metadata(text)
    for key in ("code_module", "nom_module", "unite_pedagogique", "responsable", "prerequis", "objectif"):
        if llm_meta.get(key):
            meta[key] = llm_meta[key]
    if llm_meta.get("enseignants_noms"):
        meta["enseignants_noms"] = llm_meta["enseignants_noms"]
    if llm_meta.get("enseignants_roles"):
        meta["enseignants_roles"] = llm_meta["enseignants_roles"]


def _apply_regex_meta_defaults(text: str, meta: Dict[str, Any]) -> None:
    meta.setdefault("code_module", _extract_regex_code_module(text))
    meta.setdefault("nom_module", _extract_regex_nom_module(text))
    meta.setdefault("unite_pedagogique", _extract_regex_unite_pedagogique(text))
    meta.setdefault("responsable", _extract_regex_responsable(text))


def _ensure_regex_enseignants(text: str, meta: Dict[str, Any]) -> None:
    if "enseignants_noms" in meta:
        return
    ens_names = _extract_regex_enseignants(text)
    if not ens_names:
        return
    meta["enseignants_noms"] = ens_names
    for name in ens_names:
        meta.setdefault("enseignants_roles", {})[name] = "enseignant"


def _append_meta_enseignant(meta: Dict[str, Any], name: Optional[str], role: str) -> None:
    if not name:
        return
    meta.setdefault("enseignants_noms", []).append(name)
    meta.setdefault("enseignants_roles", {})[name] = role


def _merge_pattern_enseignants(text: str, meta: Dict[str, Any]) -> None:
    eq_match = _RE_EQUIPE_PEDAGOGIQUE.search(text)
    if eq_match:
        eq_names = _split_names(eq_match.group(1).strip())
        for name in eq_names:
            _append_meta_enseignant(meta, name, "enseignant")

    nom_match = _RE_NOM_PRENOM.search(text)
    if nom_match:
        _append_meta_enseignant(meta, _clean_name(nom_match.group(1).strip()), "enseignant")

    coord_match = _RE_COORDINATEUR.search(text)
    if coord_match:
        _append_meta_enseignant(meta, _clean_name(coord_match.group(1).strip()), "coordinateur")


def _ensure_responsable_presence(meta: Dict[str, Any]) -> None:
    responsable = meta.get("responsable")
    if not responsable:
        return
    meta.setdefault("enseignants_roles", {})[responsable] = "responsable"
    if "enseignants_noms" not in meta:
        meta["enseignants_noms"] = [responsable]


def _set_regex_text_fields(text: str, meta: Dict[str, Any]) -> None:
    meta.setdefault("prerequis", _extract_regex_prerequis(text))
    meta.setdefault("objectif", _extract_regex_objectif(text))


def _extract_metadata(text: str, raw_tables: Optional[List] = None) -> Dict[str, Any]:
    meta: Dict[str, Any] = {}

    if _LLM_OK:
        _merge_llm_meta(text, meta)

    if raw_tables:
        _scan_tables_for_meta(raw_tables, meta)

    _apply_regex_meta_defaults(text, meta)
    _ensure_regex_enseignants(text, meta)
    _merge_pattern_enseignants(text, meta)
    _ensure_responsable_presence(meta)

    _deduplicate_names(meta)
    _set_regex_text_fields(text, meta)
    return meta


# ─────────────────────────────────────────────────────────────────────────────
# NLP – Acquis d'Apprentissage extraction (AA)
# ─────────────────────────────────────────────────────────────────────────────

# ── AA extraction patterns ───────────────────────────────────────────────────
_RE_AA_LINE = re.compile(
    r"AA\s*(\d+)\s+([^\n\r]+)\s+(\d)\s*$", re.MULTILINE
)
_RE_AA_ALT = re.compile(
    r"AA\s*(\d+)\s+(.+)", re.MULTILINE
)


_RE_AA_BLOCK = re.compile(
    r"Acquis\s+d['\u2019]apprentissage[^\n]*",
    re.I,
)
_RE_AA_BLOCK_END = re.compile(
    r"(?im)^(?:Contenu\s+d[ée]taill[ée]|Plan\s+du\s+cours)\b",
)
_RE_AA_SKIP = re.compile(
    r"^AA\s+Acquis|^Niveau|^\*\s*:|^\(1\s*:", re.I,
)
_RE_AA_SKIP2 = re.compile(r"^Acquis\s+d[\x27\u2019]appre", re.I)
_RE_AA_SKIP3 = re.compile(r"^d[\x27\u2019]approfondissement", re.I)
_RE_AA_BLOOM_MULTI = re.compile(r"\s+(\d)\s+et\s+(\d)\s*$")
_RE_AA_BLOOM_SINGLE = re.compile(r"\s+(\d)\s*$")
_RE_AA_STANDALONE_MULTI = re.compile(r"^(\d)\s+et\s+(\d)\s*$")
_RE_AA_CLEAN = re.compile(r"\s*(?:Situation|Dur[eé]e|Rendu|d['\u2019]apprentissage).*$", re.I)


def _is_aa_skip(stripped: str) -> bool:
    if not stripped:
        return True
    if _RE_AA_SKIP.match(stripped):
        return True
    if stripped.startswith('*') or stripped.startswith('(1'):
        return True
    if re.match(r'^:\s', stripped):
        return True
    if _RE_AA_SKIP2.match(stripped):
        return True
    if _RE_AA_SKIP3.match(stripped):
        return True
    return False


def _extract_aa_block(text: str) -> Optional[str]:
    header_match = _RE_AA_BLOCK.search(text)
    if not header_match:
        return None

    block = text[header_match.end():]
    end_match = _RE_AA_BLOCK_END.search(block)
    if end_match:
        block = block[:end_match.start()]
    return block.lstrip("\r\n")


def _parse_aa_lines(block: str) -> List[Dict[str, Any]]:
    parsed: List[Dict[str, Any]] = []
    for line in block.split('\n'):
        stripped = line.strip()
        if _is_aa_skip(stripped):
            continue
        m = re.match(r'^AA\s*(\d+)\s*(.*)', stripped)
        if m:
            parsed.append({'type': 'marker', 'aa': int(m.group(1)), 'rest': m.group(2).strip()})
        else:
            parsed.append({'type': 'text', 'content': stripped})
    return parsed


def _extract_aa_no_marker(parsed: List[Dict[str, Any]], text: str) -> List[Dict[str, Any]]:
    acquis: List[Dict[str, Any]] = []
    for m in _RE_AA_LINE.finditer(text):
        acquis.append({
            "id": int(m.group(1)),
            "text": m.group(2).strip(),
            "bloom_level": min(max(int(m.group(3)), 1), 6),
        })
    if acquis:
        return acquis
    aa_id = 1
    for tok in parsed:
        if tok["type"] != "text":
            continue
        content = re.sub(r"^[\-\u2022\*\u203A\u25E6\u25AA\d]+[.):]\s*", "", tok["content"].strip())
        if len(content) < 10:
            continue
        acquis.append({"id": aa_id, "text": content, "bloom_level": _detect_bloom_level(content)})
        aa_id += 1
    return acquis


def _parse_aa_bloom(rest: str) -> Tuple[int, str]:
    bm_multi = _RE_AA_BLOOM_MULTI.search(rest)
    if bm_multi:
        return max(int(bm_multi.group(1)), int(bm_multi.group(2))), rest[:bm_multi.start()].strip()
    bm = _RE_AA_BLOOM_SINGLE.search(rest)
    if bm:
        return int(bm.group(1)), rest[:bm.start()].strip()
    if re.match(_RE_SINGLE_DIGIT, rest):
        return int(rest), ''
    return 0, rest


def _collect_standalone_bloom(ct: str) -> Optional[int]:
    bm = _RE_AA_STANDALONE_MULTI.match(ct)
    if bm:
        return max(int(bm.group(1)), int(bm.group(2)))
    bm = re.match(_RE_SINGLE_DIGIT, ct)
    if bm:
        return int(bm.group(1))
    return None


def _collect_trailing(parsed: List[Dict[str, Any]], mi: int) -> Tuple[List[str], Optional[int]]:
    trailing_bloom: Optional[int] = None
    trailing: List[str] = []
    for j in range(mi + 1, len(parsed)):
        if parsed[j]['type'] != 'text':
            continue
        ct = parsed[j]['content']
        bl = _collect_standalone_bloom(ct)
        if bl is not None:
            trailing_bloom = bl
            continue
        trailing.append(ct)
    return trailing, trailing_bloom


def _find_split_point(text_between: List[str]) -> int:
    for k, t in enumerate(text_between):
        if not t:
            continue
        if t[0].isupper() and not re.match(r'^(sur|de|du|des|le|la|les|un|une|et|ou|au|aux)\s', t, re.I):
            return k
    return len(text_between)


def _collect_segment_context(
    parsed: List[Dict[str, Any]],
    marker_indices: List[int],
    idx: int,
) -> Tuple[int, int, str, List[str], Optional[int], int]:
    marker_index = marker_indices[idx]
    aa_num = parsed[marker_index]['aa']
    bloom, rest = _parse_aa_bloom(parsed[marker_index]['rest'])
    prev_marker_index = marker_indices[idx - 1] if idx > 0 else -1

    text_between: List[str] = []
    bloom_standalone: Optional[int] = None
    for j in range(prev_marker_index + 1, marker_index):
        if parsed[j]['type'] != 'text':
            continue
        content = parsed[j]['content']
        standalone = _collect_standalone_bloom(content)
        if standalone is not None:
            bloom_standalone = standalone
            continue
        text_between.append(content)
    return aa_num, bloom, rest, text_between, bloom_standalone, marker_index


def _apply_previous_segment_updates(
    segments: List[Dict[str, Any]],
    bloom_standalone: Optional[int],
    post_text_prev: List[str],
) -> None:
    if bloom_standalone is not None and segments and segments[-1]['bloom'] == 0:
        segments[-1]['bloom'] = bloom_standalone
    if post_text_prev and segments:
        segments[-1]['post'].extend(post_text_prev)


def _collect_segment_trailing(
    parsed: List[Dict[str, Any]],
    marker_index: int,
    is_last: bool,
) -> Tuple[List[str], Optional[int]]:
    if not is_last:
        return [], None
    return _collect_trailing(parsed, marker_index)


def _build_aa_segments(parsed: List[Dict[str, Any]], marker_indices: List[int]) -> List[Dict[str, Any]]:
    segments: List[Dict[str, Any]] = []
    last_idx = len(marker_indices) - 1
    for idx, _ in enumerate(marker_indices):
        aa_num, bloom, rest, text_between, bloom_standalone, marker_index = _collect_segment_context(parsed, marker_indices, idx)
        split_point = _find_split_point(text_between)
        post_text_prev = text_between[:split_point]
        pre_text_this = text_between[split_point:]
        _apply_previous_segment_updates(segments, bloom_standalone, post_text_prev)

        trailing, trailing_bloom = _collect_segment_trailing(parsed, marker_index, idx == last_idx)

        segments.append({
            'aa': aa_num,
            'bloom': bloom if bloom else (trailing_bloom or 0),
            'pre': list(pre_text_this),
            'inline': rest,
            'post': trailing,
        })
    return segments


def _finalize_aa_segments(segments: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
    acquis: List[Dict[str, Any]] = []
    for seg in segments:
        parts = seg['pre'] + ([seg['inline']] if seg['inline'] else []) + seg['post']
        aa_text = ' '.join(parts).strip()
        bloom = seg['bloom']
        aa_text = _RE_AA_CLEAN.sub("", aa_text).strip()
        if not bloom and aa_text:
            bloom = _detect_bloom_level(aa_text)
        if aa_text and len(aa_text) > 5:
            acquis.append({
                "id": seg['aa'],
                "text": aa_text,
                "bloom_level": min(max(bloom, 1), 6),
            })
    return acquis


def _extract_acquis_apprentissage(text: str) -> List[Dict[str, Any]]:
    if _LLM_OK:
        llm_acquis = _llm_extract_acquis(text)
        if llm_acquis:
            return llm_acquis

    block = _extract_aa_block(text)
    if not block:
        return []

    parsed = _parse_aa_lines(block)
    marker_indices = [i for i, p in enumerate(parsed) if p['type'] == 'marker']

    if not marker_indices:
        return _extract_aa_no_marker(parsed, text)

    segments = _build_aa_segments(parsed, marker_indices)
    return _finalize_aa_segments(segments)


# ─────────────────────────────────────────────────────────────────────────────
# NLP – Séance / Session extraction (Contenu détaillé)
# ─────────────────────────────────────────────────────────────────────────────

_RE_SEANCE = re.compile(
    r"(?:S[eé]ance|Session|Chapitre|Semaine)\s*(\d+(?:\s*[-\u2013]\s*\d+)?)\s*[:\-]?\s*([^\n]+)",
    re.IGNORECASE,
)
_RE_CHECKMARK = re.compile(r"^[\u2714\u2713\u2611\u2610]\s*(.+)$", re.MULTILINE)
_RE_BULLET    = re.compile(r"^[\-\u2022\*\u203A\u25E6\u25AA]\s+(.+)$", re.MULTILINE)
_RE_NUMBERED  = re.compile(r"^\d+[\.\)]\s+(.+)$", re.MULTILINE)

def _extract_block_items(block: str) -> List[str]:
    items: List[str] = []
    for pattern in [_RE_CHECKMARK, _RE_BULLET, _RE_NUMBERED]:
        items.extend(pattern.findall(block))
    return [it.strip() for it in items if len(it.strip()) > 5]


def _extract_block_type(block: str) -> Optional[str]:
    m = re.search(r"(?:Situation\s*(?:\(s\))?|Type)\s*[:\-]?\s*", block, re.IGNORECASE)
    if not m:
        return None
    start = m.end()
    type_match = re.search(r"\b(cours\s+int[e\u00e9]gr[e\u00e9]|TP|TD|APP|Projet|Labo)\b", block[start:], re.IGNORECASE)
    if not type_match:
        return None
    m = type_match
    return m.group(1).strip() if m else None


def _extract_block_duree(block: str) -> Optional[str]:
    m = re.search(r"(?:Dur\u00e9e|Duree)\s*[:\-]?\s*(\d+\s*h)", block, re.I)
    return m.group(1).strip() if m else None


def _extract_seances(text: str) -> List[Dict[str, Any]]:
    if _LLM_OK:
        llm_seances = _llm_extract_seances(text)
        if llm_seances:
            return llm_seances

    seances: List[Dict[str, Any]] = []
    matches = list(_RE_SEANCE.finditer(text))
    if not matches:
        return seances

    for i, match in enumerate(matches):
        numero = match.group(1).strip()
        titre = match.group(2).strip()
        start = match.end()
        end = matches[i + 1].start() if i + 1 < len(matches) else len(text)
        block = text[start:end]

        seances.append({
            "numero": numero,
            "titre": titre,
            "items": _extract_block_items(block),
            "type_apprentissage": _extract_block_type(block),
            "duree": _extract_block_duree(block),
        })

    return seances


_RE_COMP_ITEM = re.compile(
    r"^([A-Z](?:ech|[a-z])?)\s*(\d+[a-z]?)\s*[-\u2013]\s*(.{10,300})$",
)

_RE_COMP_STOP = re.compile(
    r"^(?:Axes?\s+forts|Objectifs?|Dimension\s+sp[eé]cifique)", re.I,
)

_RE_COMP_TRUNCATE = re.compile(
    r"\s+(?:[•·]\s*)?Comp[eé]tences?(?:\s+dans\s+le\s+domaine\s+|\s+)",
    re.I,
)


def _collect_tail(lines: List[str], start: int) -> Tuple[List[str], int]:
    j = start
    tail: List[str] = []
    while j < len(lines):
        nxt = lines[j].strip()
        if not nxt:
            break
        if _RE_COMP_ITEM.match(nxt):
            break
        if re.match(r"^Comp[eé]tences?\s+", nxt, re.I):
            break
        if _RE_COMP_STOP.match(nxt):
            break
        tail.append(nxt)
        j += 1
    return tail, j


def _build_section_map(text: str) -> Dict[str, str]:
    normalized = re.sub(
        r"dans\s+le\s+domaine\s+de[sl]?\s+",
        "dans le domaine ",
        text,
        flags=re.IGNORECASE,
    )
    re_section = re.compile(
        r"Comp[eé]tences?\s+(?:dans\s+le\s+domaine\s+|en\s+|transversales?\s+)"
        r"(.{3,60})\s*\(\s*([A-Z][a-z]*)\s*\)",
        re.IGNORECASE,
    )
    section_map: Dict[str, str] = {}
    for m in re_section.finditer(normalized):
        domaine_nom = re.sub(r"\s+", " ", m.group(1)).strip(" .:-")
        lettre = m.group(2).strip().upper()
        if domaine_nom:
            section_map[lettre] = domaine_nom
    return section_map


def _clean_comp_text(raw: str) -> str:
    cleaned = re.sub(_RE_WHITESPACE_NEWLINE, " ", raw)
    cleaned = re.sub(r"\s+", " ", cleaned).strip()
    return re.split(_RE_COMP_TRUNCATE, cleaned, maxsplit=1)[0].strip()


def _extract_referentiel_competences(text: str) -> List[Dict[str, Any]]:
    section_map = _build_section_map(text)
    lines = text.splitlines()
    items: List[Dict[str, Any]] = []
    i = 0
    while i < len(lines):
        line = lines[i].strip()
        m = _RE_COMP_ITEM.match(line)
        if not m:
            i += 1
            continue
        lettre = m.group(1).strip().upper()
        numero = m.group(2).strip()
        comp_text = m.group(3).strip()
        tail, j = _collect_tail(lines, i + 1)
        if tail:
            comp_text = f"{comp_text} {' '.join(tail)}"
        comp_text = _clean_comp_text(comp_text)
        items.append({
            "code": f"{lettre}{numero}",
            "text": comp_text,
            "domaine_code": lettre,
            "domaine_nom": section_map.get(lettre, lettre),
            "bloom_level": _detect_bloom_level(comp_text),
        })
        i = j
    return items if len(items) >= 3 else []
