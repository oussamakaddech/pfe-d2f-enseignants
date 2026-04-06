"""NLP utilities: text extraction, normalization, Bloom taxonomy, type detection,
metadata/acquis/séance extraction, name cleaning, and sub-competence parsing.

This module also contains the LLM-assisted extraction helpers (_llm_extract_*)
that are tightly coupled to the NLP regex fallback logic.
"""

from __future__ import annotations

import io
import logging
import os
import re
import unicodedata
from pathlib import Path
from typing import Any, Dict, List, Optional, Tuple

from fastapi import HTTPException

# LLM symbols (import from package stub). If unavailable, provide safe defaults.
try:
    from .llm import _LLM_OK, _LLM_MODEL, _LLM_TIMEOUT, _escape_prompt, _llm_chat  # type: ignore
except Exception:
    _LLM_OK = False
    _LLM_MODEL = ""
    _LLM_TIMEOUT = 5
    def _escape_prompt(p: str) -> str:  # type: ignore
        return p
    def _llm_chat(*args, **kwargs):  # type: ignore
        raise RuntimeError("LLM integration is disabled in this environment")

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
    from rapidfuzz import fuzz as _rfuzz
    from rapidfuzz import process as _rprocess

    _FUZZY_OK = True
except ImportError:
    _FUZZY_OK = False
    _rfuzz = None  # type: ignore[assignment]
    _rprocess = None  # type: ignore[assignment]

# ── OCR support (scanned / image PDFs) ───────────────────────────────────────
try:
    import fitz as _fitz  # PyMuPDF – renders PDF pages to images
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
    _fitz = None  # type: ignore[assignment]
    _tess = None  # type: ignore[assignment]
    _PILImage = None  # type: ignore[assignment]
    _OCR_OK = False

# Re-export so other submodules can check availability
__all_flags__ = {"_PDF_OK", "_DOCX_OK", "_FUZZY_OK", "_OCR_OK"}


# ─────────────────────────────────────────────────────────────────────────────
# Text extraction
# ─────────────────────────────────────────────────────────────────────────────


def _clean_cell(raw) -> str:
    """Normalise a PDF table cell: None → '', collapse internal newlines, strip."""
    if raw is None:
        return ""
    s = str(raw).replace("\n", " ").replace("\r", " ")
    s = " ".join(s.split())  # collapse multiple spaces too
    merged_hits = re.findall(r"(?:^|\s)([A-ZÀ-Ü][^:]{3,40}):\s*", s)
    if len(merged_hits) > 1:
        logger.debug("Potential merged table cell detected: %s", s[:140])
    return s


# Column headers that represent hours/ECTS — treated as numeric meta, not labels
_HOUR_HEADERS = {"he", "hne", "ects", "cours integre", "cours integré",
                 "heures", "credits", "coeff", "coefficient"}


def _serialize_pdf_tables(tables: list) -> str:
    """
    Convert pdfplumber table data (list-of-rows-of-cells) to 'label: value' text
    so that existing regex patterns (_RE_RESPONSABLE, etc.) can match them.
    Handles multi-column header tables, reversed key-value tables (label in col 0),
    and the ESPRIT Code/HE/HNE/ECTS 4-column layout.
    """
    lines: List[str] = []
    for table in tables:
        if not table:
            continue

        # Clean every cell first (handle None + internal newlines)
        cleaned_table = [[_clean_cell(c) for c in row] for row in table]

        # Detect header row: first non-empty row with multiple non-empty cells
        header: List[str] = []
        data_rows: List[List[str]] = []
        for i, row in enumerate(cleaned_table):
            if not any(row):
                continue
            if i == 0 and sum(bool(c) for c in row) > 1:
                header = row
            else:
                data_rows.append(row)

        if header and data_rows:
            # Emit "Code: MT-34", "HE: 24h", etc. for each header/value pair
            for row in data_rows:
                # Deduplicate adjacent identical cells (merged PDF cells)
                seen_vals: set = set()
                for col_idx, cell in enumerate(row):
                    if not cell or col_idx >= len(header) or not header[col_idx]:
                        continue
                    # Normalise header for comparison (strip accents/spaces)
                    hdr_norm = _normalize(header[col_idx])
                    # Avoid emitting pure hour/ECTS columns as metadata labels
                    if hdr_norm in _HOUR_HEADERS:
                        # Still emit for _scan_tables_for_meta hour detection
                        lines.append(f"{header[col_idx]}: {cell}")
                        continue
                    cell_key = (hdr_norm, cell)
                    if cell_key in seen_vals:
                        continue
                    seen_vals.add(cell_key)
                    lines.append(f"{header[col_idx]}: {cell}")
        else:
            # Two-column key-value table (label | value)
            for row in cleaned_table:
                if not row:
                    continue
                non_empty = [c for c in row if c]
                if len(non_empty) == 2:
                    lines.append(f"{non_empty[0]}: {non_empty[1]}")
                elif len(non_empty) > 2:
                    # Could be a label in col 0, value spanning col 1+
                    # Heuristic: if col 0 looks like a field label (short, ends in nothing
                    # numeric), emit "col0: rest-joined"
                    col0_norm = _normalize(non_empty[0])
                    if col0_norm in _TABLE_NER_LABELS or len(non_empty[0]) < 40:
                        joined = " ".join(non_empty[1:])
                        lines.append(f"{non_empty[0]}: {joined}")
                    else:
                        # Flatten multi-column row with pipe separator
                        lines.append(" | ".join(non_empty[:4]))
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
    all_table_texts: List[
        str
    ] = []  # collected separately to avoid polluting AA/séance zones
    with pdfplumber.open(io.BytesIO(data)) as pdf:
        for page in pdf.pages:
            text = page.extract_text() or ""
            # Extract structured table data
            try:
                tables = page.extract_tables() or []
                all_raw_tables.extend(tables)  # keep raw for NER
                table_text = _serialize_pdf_tables(tables)
                if table_text:
                    all_table_texts.append(table_text)
            except Exception as tbl_err:
                logger.debug(f"Table extraction failed on page: {tbl_err}")
            page_texts.append(text)
    full_text = "\n".join(page_texts)
    # Append serialized table text at the END so regex metadata extraction
    # can still match it, but it won't pollute AA / séance extraction zones.
    if all_table_texts:
        full_text = full_text + "\n" + "\n".join(all_table_texts)
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
    psm = os.getenv("TESSERACT_PSM", "3")  # auto page segmentation

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
    logger.info(
        "OCR completed: %d chars extracted from %d page(s)",
        len(result),
        len(page_texts),
    )
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
    name = re.sub(r"[\x00-\x1f]", "", filename)
    # Take only the base name (strip any directory components)
    name = os.path.basename(name.replace("..", ""))
    # Remove remaining problematic characters
    name = re.sub(r'[<>:"|?*]', "_", name)
    return name.strip() or "unnamed_file"


# ─────────────────────────────────────────────────────────────────────────────
# NLP – Text normalization & utilities
# ─────────────────────────────────────────────────────────────────────────────


def _normalize(text: str) -> str:
    """Strip accents and lowercase for fuzzy matching."""
    return "".join(
        c
        for c in unicodedata.normalize("NFD", text.lower())
        if unicodedata.category(c) != "Mn"
    )


def _slug(text: str, max_len: int = 30) -> str:
    """Create a short uppercase code from text."""
    stop_words = {
        "les", "des", "du", "de", "la", "le", "un", "une",
        "et", "ou", "en", "au", "aux", "par", "pour", "sur",
    }
    words = re.findall(r"[a-zA-Z\u00C0-\u00FF]{3,}", _normalize(text))
    words = [w for w in words if w.lower() not in stop_words]
    raw = "-".join(w[:5].upper() for w in words) if words else "ITEM"
    return raw[:max_len]


def _build_domain_name_from_file(filename: str) -> str:
    """Infer a readable module/domain name from the filename stem."""
    stem = Path(filename).stem
    clean = re.sub(
        r"^(fiche[_\s]?module[_\s]?|fiche[_\s]?|module[_\s]?|ue[_\s]?|cours[_\s]?)",
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
    1: "N1_DEBUTANT",  # Mémoriser / Reconnaître
    2: "N2_ELEMENTAIRE",  # Comprendre
    3: "N3_INTERMEDIAIRE",  # Appliquer
    4: "N4_AVANCE",  # Analyser
    5: "N4_AVANCE",  # Évaluer
    6: "N5_EXPERT",  # Créer
}

# Verb-based Bloom classification (NLP keyword extraction)
# Includes Génie Civil (GC) domain-specific verbs
_BLOOM_VERBS: List[Tuple[re.Pattern, int]] = [
    # Level 6 – Créer (design, build, synthesize)
    (
        re.compile(
            r"\b(creer|concevoir|developper|produire|construire|elaborer|"
            r"proposer|innover|composer|planifier|mettre\s+en\s+place|realiser|"
            r"dimensionner|rehabiliter|amenager|piloter|optimiser|"
            r"architecturer|programmer|deployer|integrer\s+un\s+systeme|"
            r"usiner|assembler|fabriquer|prototyper|syntheti[sz]er)\b",
            re.I,
        ),
        6,
    ),
    # Level 5 – Évaluer (judge, validate, audit)
    (
        re.compile(
            r"\b(evaluer|juger|critiquer|justifier|argumenter|"
            r"defendre|recommander|selectionner|"
            r"diagnostiquer|verifier|controler|auditer|expertiser|valider|"
            r"tester|benchmarker|qualifier|certifier)\b",
            re.I,
        ),
        5,
    ),
    # Level 4 – Analyser (compare, decompose, model)
    (
        re.compile(
            r"\b(analyser|comparer|distinguer|examiner|"
            r"differencier|decomposer|organiser|categoriser|"
            r"modeliser|interpreter|superviser|instrumenter|calculer|"
            r"debugger?|profiler|tracer|simuler)\b",
            re.I,
        ),
        4,
    ),
    # Level 3 – Appliquer (execute, configure, use)
    (
        re.compile(
            r"\b(appliquer|utiliser|manipuler|implementer|"
            r"executer|resoudre|employer|configurer|installer|"
            r"gerer|integrer|regrouper|"
            r"effectuer|rediger|maitriser|tracer|relever|mesurer|"
            r"programmer?|coder|deployer|monter|brancher|connecter)\b",
            re.I,
        ),
        3,
    ),
    # Level 2 – Comprendre (explain, describe)
    (
        re.compile(
            r"\b(comprendre|expliquer|decrire|illustrer|"
            r"interpreter|resumer|classifier|discuter|"
            r"se\s+familiariser|reconnaitre\s+les)\b",
            re.I,
        ),
        2,
    ),
    # Level 1 – Mémoriser (recall, list, name)
    (
        re.compile(
            r"\b(reconnaitre|identifier|lister|nommer|"
            r"definir|memoriser|citer|rappeler|introduire)\b",
            re.I,
        ),
        1,
    ),
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
    r"usinage|usinage|fraisage|tournage|moulage|assemblage|"
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
            r"commit\s+git|merge\s+request|pull\s+request)\b",
            re.IGNORECASE,
        ),
        "telecom": re.compile(
            r"\b(simulation\s+ns3|simulation\s+opnet|banc\s+rf|"
            r"analyseur\s+spectre|anritsu|configurer\s+routeur|"
            r"wireshark\s+capture|vlsi\s+implementation)\b",
            re.IGNORECASE,
        ),
        "ge": re.compile(
            r"\b(montage\s+circuit|banc\s+moteur|pupitre\s+electrique|"
            r"tp\s+fpga|tp\s+automate|maquette\s+electrique)\b",
            re.IGNORECASE,
        ),
        "meca": re.compile(
            r"\b(atelier\s+usinage|atelier\s+fraisage|banc\s+mecatronique|"
            r"tp\s+catia|tp\s+solidworks|maquette\s+robot)\b",
            re.IGNORECASE,
        ),
    }

    # Additional theory/concept patterns per department
    _EXTRA_THEORIQUE: Dict[str, re.Pattern] = {
        "info": re.compile(
            r"\b(algorithmique\s+avancee|theorie\s+des\s+graphes|"
            r"automate\s+fini|complexite\s+algorithmique|"
            r"paradigme\s+programmation|theorie\s+des\s+langages)\b",
            re.IGNORECASE,
        ),
        "telecom": re.compile(
            r"\b(theorie\s+(de\s+l[a'])?information|theorie\s+shannon|"
            r"electromagn[eé]tisme\s+th[eé]orique|propagation\s+th[eé]orie|"
            r"calcul\s+bilan\s+liaison)\b",
            re.IGNORECASE,
        ),
        "ge": re.compile(
            r"\b(theorie\s+(des\s+)?circuits|theorie\s+(de\s+la\s+)?commande|"
            r"electromagnetisme\s+cours|analyse\s+harmonique)\b",
            re.IGNORECASE,
        ),
        "meca": re.compile(
            r"\b(theorie\s+mecanique|mecanique\s+th[eé]orique|"
            r"cours\s+thermodynamique|cinématique\s+th[eé]orique)\b",
            re.IGNORECASE,
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
        out: Dict[str, Any] = {}
        if result.get("code_module") and isinstance(result["code_module"], str):
            code = result["code_module"].strip().upper()
            if re.search(r"[A-Z0-9]", code) and len(code) >= 2:
                out["code_module"] = code
        if result.get("nom_module") and isinstance(result["nom_module"], str):
            nom = result["nom_module"].strip()
            if len(nom) > 3:
                out["nom_module"] = nom
        if result.get("unite_pedagogique") and isinstance(
            result["unite_pedagogique"], str
        ):
            up = result["unite_pedagogique"].strip()
            if len(up) > 3:
                out["unite_pedagogique"] = up
        if result.get("responsable") and isinstance(result["responsable"], str):
            resp = _clean_name(result["responsable"])
            if resp:
                out["responsable"] = resp
        if result.get("enseignants_noms") and isinstance(
            result["enseignants_noms"], list
        ):
            names = [_clean_name(str(n)) for n in result["enseignants_noms"] if n]
            names = [n for n in names if n]
            if names:
                out["enseignants_noms"] = names
        if result.get("enseignants_roles") and isinstance(
            result["enseignants_roles"], dict
        ):
            valid_roles = {"responsable", "coordinateur", "enseignant", "intervenant"}
            roles: Dict[str, str] = {}
            for k, v in result["enseignants_roles"].items():
                ck = _clean_name(str(k))
                if ck and str(v) in valid_roles:
                    roles[ck] = str(v)
            if roles:
                out["enseignants_roles"] = roles
        if result.get("prerequis") and isinstance(result["prerequis"], str):
            pq = result["prerequis"].strip()
            if len(pq) > 3:
                out["prerequis"] = pq
        if result.get("objectif") and isinstance(result["objectif"], str):
            obj = result["objectif"].strip()
            if len(obj) > 5:
                out["objectif"] = obj
        logger.info(f"LLM metadata extracted: {list(out.keys())}")
        return out
    except Exception as exc:
        logger.warning(f"LLM metadata parse error: {exc} | raw={raw[:200]}")
        return {}


def _llm_extract_acquis(text: str) -> List[Dict[str, Any]]:
    """Use LLM to extract Acquis d'Apprentissage (AA) with Bloom levels.

    Returns a list of ``{id, text, bloom_level}`` dicts.
    Empty list on failure (caller falls back to regex parser).
    """
    import json as _json_local

    aa_match = re.search(
        r"(Acquis\s+d['\u2019\u2018]apprentissage.*?)(?=Contenu\s+d[eé]taill[eé]|Plan\s+du\s+cours|$)",
        text,
        re.I | re.DOTALL,
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
                validated.append(
                    {
                        "id": int(aa.get("id", len(validated) + 1)),
                        "text": t,
                        "bloom_level": min(max(bl, 1), 6),
                    }
                )
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
        r"(Contenu\s+d[eé]taill[eé].*?)(?=Mode\s+d['\u2019]|[EÉ]valuation|R[eé]f[eé]rences|Bibliographie|$)",
        text,
        re.I | re.DOTALL,
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
        "}]}\n\n"
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
            validated.append(
                {
                    "numero": str(s.get("numero", len(validated) + 1)),
                    "titre": titre,
                    "items": [
                        str(i).strip() for i in s.get("items", []) if str(i).strip()
                    ],
                    "type_apprentissage": s.get("type_apprentissage") or None,
                    "duree": s.get("duree") or None,
                }
            )
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
        items = [
            str(i).strip() for i in result.get("items", []) if len(str(i).strip()) > 5
        ]
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
_RE_SUBCOMP_TITLE_3 = re.compile(r"^S[\-‑]C\s*(\d+)\s*[.\-–]\s*([^\n\r]+)", re.I | re.M)


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
            items = (
                parsed.get("items")
                or parsed.get("titres")
                or parsed.get("sous_competences")
                or []
            )
            return [str(t).strip() for t in items if str(t).strip()]
    except Exception:
        pass
    return [ln.strip() for ln in raw.splitlines() if ln.strip() and len(ln.strip()) > 3]


# ─────────────────────────────────────────────────────────────────────────────
# NLP – Fiche metadata extraction (Named Entity Recognition style)
# ─────────────────────────────────────────────────────────────────────────────

# ── Standard format: label : value on the SAME line ─────────────────────────
_RE_MODULE_CODE = re.compile(r"(?:Code|code)\s*[:\-]?\s*([A-Z][A-Z0-9\-_]{2,15})", re.I)
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
    r"^(?:Module\s*[:\-]\s*|Fiche\s+[Mm]odule\s*[:\-]?\s*)(.{3,100})$",
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
    "module",
    "cours",
    "matiere",
    "matière",
    "ue",
    "tp",
    "td",
    "prerequis",
    "objectif",
    "objectifs",
    "contenu",
    "evaluation",
    "mode",
    "duree",
    "durée",
    "semestre",
    "niveau",
    "credits",
    "coefficient",
    "code",
    "reference",
    "département",
    "departement",
    "informatique",
    "genie",
    "civil",
    "esprit",
    "fiche",
    "pedagogique",
    "pédagogique",
    "unite",
    "unité",
    "formation",
    "description",
    "compétence",
    "competence",
    "savoir",
    "acquis",
    "apprentissage",
    "séance",
    "seance",
    "chapitre",
    "responsable",
    "coordinateur",
    "coordinatrice",
    "enseignant",
    "enseignants",
    "intervenant",
    "intervenants",
    "intervenantes",
    "web",
    "semantique",
    "sémantique",
    "nouvelles",
    "applications",
    "options",
    "niveaux",
    # Fiche module table headers & labels
    "he",
    "hne",
    "ects",
    "integre",
    "intégré",
    "detaille",
    "détaillé",
    "situation",
    "rendu",
    "rendus",
    "atelier",
    "projet",
    "derniere",
    "dernière",
    "mise",
    "jour",
    "date",
    "moyenne",
    "calculee",
    "calculée",
    "suivant",
    "suit",
}


def _clean_name(raw: str) -> Optional[str]:
    """Clean a potential person name: remove noise, validate it looks like a name."""
    # Remove common trailing noise
    name = re.sub(r"\s*[\(\[].*?[\)\]]", "", raw)  # remove (parentheses)
    name = re.sub(r"\s*[-–]\s*(cours|tp|td|module|ue).*$", "", name, flags=re.I)
    name = re.sub(r"\s+(mail|email|tél|tel|bureau|grade).*$", "", name, flags=re.I)
    # Strip academic titles
    name = re.sub(r"^(Dr\.?|Pr\.?|Prof\.?|M\.?|Mme\.?|Mr\.?)\s+", "", name, flags=re.I)
    # Remove embedded table labels that leak into name strings
    name = re.sub(r"\b(Intervenants?|Enseignants?|Responsable)\b", "", name, flags=re.I)
    name = re.sub(r"\s{2,}", " ", name).strip()
    name = name.strip().strip(".,;:-–")

    norm_name = _normalize(name)
    # Reject merged metadata strings that are not person names.
    if ":" in name and len(name) > 15:
        return None
    if re.match(
        r"^(module|code|unite|responsable|enseignants?|intervenants?|prerequis|objectif)\b",
        norm_name,
    ):
        return None
    if "module" in norm_name and "unite" in norm_name:
        return None

    # Take only first line if multiline
    name = name.split("\n")[0].strip()
    # Strip embedded enseignant/module codes (e.g. "GC05", "E001") before digit check
    # so a string like "GC05 Abidi Mounir" is not thrown away entirely
    name_no_codes = re.sub(r"\b[A-Z]{1,5}\d{1,4}\b\s*", "", name).strip()
    if name_no_codes:  # only use stripped version if something remains
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
    if not raw:
        return []
    parts = re.split(
        r"[,;/\n]"
        r"|\s+[–\-]\s+"
        r"|\s*\u2013\s*"
        r"|\s*\u2014\s*",
        raw,
    )
    expanded = list(parts)
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
    "responsable": "responsable",
    "responsable du module": "responsable",
    "responsable module": "responsable",
    "coordinateur": "coordinateur",
    "coordinatrice": "coordinateur",
    "coordinateur du module": "coordinateur",
    "enseignant": "enseignant_raw",
    "enseignants": "enseignant_raw",
    "intervenants": "enseignant_raw",
    "equipe pedagogique": "enseignant_raw",
    "nom et prenom": "enseignant_raw",
    "nom prenom": "enseignant_raw",
    "intitule": "nom_module",
    "intitule du module": "nom_module",
    "module": "nom_module",
    "code": "code_module",
    "code module": "code_module",
    "code ue": "code_module",
    "unite pedagogique": "unite_pedagogique",
    "up": "unite_pedagogique",
    "prerequis": "prerequis",
    "pre-requis": "prerequis",
    "objectif": "objectif",
    "objectifs": "objectif",
    "objectifs du module": "objectif",
    # Additional ESPRIT fiche layouts
    "enseignants intervenants": "enseignant_raw",
    "enseignants – intervenants": "enseignant_raw",
    "enseignants - intervenants": "enseignant_raw",
    "enseignants \u2013 intervenants": "enseignant_raw",
    "enseignants–intervenants": "enseignant_raw",
    "enseignants-intervenants": "enseignant_raw",
    "enseignants\nintervenants": "enseignant_raw",
    "cours integre": None,           # hours column – skip
    "cours integr\u00e9": None,       # accented variant
    "niveaux et options": None,       # ignore
    "unite d enseignement": "unite_enseignement",
    "unit\u00e9 d enseignement": "unite_enseignement",
    "ue": "unite_enseignement",
}


def _find_meta_key_for_cell(cell: str) -> Optional[str]:
    """Resolve a raw table label cell to a metadata key across PDF variants."""
    if not cell:
        return None

    norm1 = _normalize(cell.strip())
    norm2 = re.sub(r"\s+", " ", norm1).strip()
    norm3 = re.sub(r"[\-–\u2013\u2014]", " ", norm2)
    norm3 = re.sub(r"\s+", " ", norm3).strip()

    for norm in (norm1, norm2, norm3):
        key = _TABLE_NER_LABELS.get(norm)
        if key is not None:
            return key

    if norm3.startswith("enseignant") and ("intervenant" in norm3 or len(norm3) < 45):
        return "enseignant_raw"

    for label, mk in sorted(_TABLE_NER_LABELS.items(), key=lambda x: -len(x[0])):
        if mk is None:
            continue
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


def _scan_tables_for_meta(raw_tables: List, meta: Dict[str, Any]) -> None:
    """Scan pdfplumber raw tables to extract metadata fields.

    Each table is a list-of-rows; each row is a list of cell strings.
    We look for a cell whose normalised text matches a known label and
    take the adjacent cell (right or below) as the value.

    Results are written into *meta* only for keys that are not yet set,
    so this function acts as the **primary** source; regex is the fallback.
    """
    for table in raw_tables:
        for row_idx, row in enumerate(table):
            cells = [_clean_cell(c) for c in row]
            for col_idx, cell in enumerate(cells):
                meta_key = _find_meta_key_for_cell(cell)
                if meta_key is None:
                    continue

                # Gather all adjacent candidate values (right + below) and process all valid ones.
                candidates: List[str] = []
                if col_idx + 1 < len(cells) and cells[col_idx + 1].strip():
                    candidates.append(cells[col_idx + 1].strip())
                if row_idx + 1 < len(table):
                    next_row = [str(c).strip() if c else "" for c in table[row_idx + 1]]
                    if col_idx < len(next_row) and next_row[col_idx].strip():
                        candidates.append(next_row[col_idx].strip())
                if not candidates:
                    continue

                if meta_key == "responsable" and "responsable" not in meta:
                    value = candidates[0]
                    if not _is_valid_enseignant_value(value):
                        continue
                    cleaned = _clean_name(value)
                    if cleaned:
                        meta["responsable"] = cleaned

                elif meta_key == "coordinateur" and "coordinateur" not in meta:
                    value = candidates[0]
                    if not _is_valid_enseignant_value(value):
                        continue
                    cleaned = _clean_name(value)
                    if cleaned:
                        meta["coordinateur"] = cleaned
                        meta.setdefault("enseignants_noms", []).append(cleaned)
                        meta.setdefault("enseignants_roles", {})[cleaned] = (
                            "coordinateur"
                        )

                elif meta_key == "enseignant_raw":
                    for candidate in candidates:
                        value_clean = _clean_cell(candidate)
                        if not _is_valid_enseignant_value(value_clean):
                            continue
                        names = _split_names(value_clean)
                        for n in names:
                            if n not in meta.get("enseignants_noms", []):
                                meta.setdefault("enseignants_noms", []).append(n)
                                meta.setdefault("enseignants_roles", {})[n] = "enseignant"

                elif meta_key == "nom_module" and "nom_module" not in meta:
                    value = candidates[0]
                    raw_val = value.strip().rstrip(".")
                    raw_val = re.sub(
                        r"\s*(Pr\u00e9requis|Niveaux|Objectif|Derni[\u00e8e]re).*$",
                        "",
                        raw_val,
                        flags=re.I,
                    )
                    if len(raw_val) > 2:
                        meta["nom_module"] = raw_val

                elif meta_key == "code_module" and "code_module" not in meta:
                    value = candidates[0]
                    code = value.strip().upper()
                    # Must have at least one letter AND one digit, length >= 3
                    # Reject pure counts like "3", "24H", "30H"
                    if (
                        re.search(r"[A-Z]", code)
                        and re.search(r"\d", code)
                        and len(code) >= 3
                        and not re.match(r"^\d+H?$", code)
                    ):
                        meta["code_module"] = code

                elif (
                    meta_key == "unite_pedagogique" and "unite_pedagogique" not in meta
                ):
                    value = candidates[0]
                    if len(value) > 2:
                        meta["unite_pedagogique"] = value.strip()

                elif meta_key == "prerequis" and "prerequis" not in meta:
                    value = candidates[0]
                    meta["prerequis"] = value.strip()

                elif meta_key == "unite_enseignement" and "unite_enseignement" not in meta:
                    value = candidates[0]
                    ue_val = value.strip()
                    if ue_val:
                        meta["unite_enseignement"] = ue_val
                        # If it looks like a code (e.g. "UE12"), also set code_ue
                        if re.match(r"^[A-Z]{2,6}\d{2,6}$", ue_val.upper()):
                            meta.setdefault("code_ue", ue_val.upper())

                elif meta_key == "objectif" and "objectif" not in meta:
                    value = candidates[0]
                    meta["objectif"] = re.sub(r"\s*\n\s*", " ", value).strip()


def _extract_metadata(text: str, raw_tables: Optional[List] = None) -> Dict[str, Any]:
    """
    NLP-based Named Entity extraction for fiche module metadata.

    Strategy (priority order):
    1. **Table-based NER** (primary) — pdfplumber structured tables.
    2. **Regex-based NER** (fills gaps) — pattern matching fallback.
    3. **Semantic matching** — optional sentence-transformer embeddings for fuzzy matching.
    3. **Semantic matching** — optional sentence-transformer embeddings for fuzzy matching.
    """
    meta: Dict[str, Any] = {}

    # LLM-based NER is disabled (Ollama removed)
    # The pipeline now relies on table-based and regex-based NER
    if False and _LLM_OK:
        llm_meta = _llm_extract_metadata(text)
        # Seed meta with LLM findings – only authoritative non-empty values
        for key in (
            "code_module",
            "nom_module",
            "unite_pedagogique",
            "responsable",
            "prerequis",
            "objectif",
        ):
            if llm_meta.get(key):
                meta[key] = llm_meta[key]
        if llm_meta.get("enseignants_noms"):
            meta["enseignants_noms"] = llm_meta["enseignants_noms"]
        if llm_meta.get("enseignants_roles"):
            meta["enseignants_roles"] = llm_meta["enseignants_roles"]

    # ── 1. Table-based NER (fills any gaps not found by LLM) ──────────────
    if raw_tables:
        _scan_tables_for_meta(raw_tables, meta)

    # ── 2. Regex-based NER (fallback for any field not yet populated) ─────

    # ── Module title ESPRIT (preferred for "Module : ...") ─────────────
    if "nom_module" not in meta:
        m_title = _RE_MODULE_TITLE_ESPRIT.search(text[:500])
        if m_title:
            titre = m_title.group(1).strip().rstrip(".")
            titre = titre.split("\n")[0].strip()
            titre = re.sub(r"\s*Derni[eè]re\s+mise.*$", "", titre, flags=re.I).strip()
            titre = re.sub(r"\s*\d{2}/\d{2}/\d{4}.*$", "", titre).strip()
            if len(titre) > 2:
                meta["nom_module"] = titre
                logger.info("Module title extracted: '%s'", titre)

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
            if re.search(r"\d", code):
                meta["code_module"] = code

    # ── Document title (referential / non-standard fiche) ───────────────
    # Look only in the first chars and stop once competence rows start.
    if "nom_module" not in meta:
        head = text[:500]
        for raw_line in head.splitlines():
            line = raw_line.strip(" \t-•\u2022")
            if len(line) < 5:
                continue
            # Skip classic metadata labels often present in fiche headers.
            if re.match(
                r"^(?:Unit[eé]\s+p[eé]dagogique|UP|Code\s+module|Code\s+UE|"
                r"Responsable|Enseignants?|Pr[eé]requis|Objectifs?)\b",
                line,
                re.I,
            ):
                continue
            # If we already reached competence-item lines, stop title search.
            if re.match(r"^[A-Z][a-z0-9]{0,3}\d*\s*[-\u2013]\s+", line):
                break
            # Ignore section labels like: "Compétences dans le domaine..."
            if re.match(r"^Comp[eé]tences?\s+dans\s+le\s+domaine", line, re.I):
                continue

            if re.search(r"Ing[eé]nieur\s+en|G[eé]nie\s+Civil|Formation|Comp[eé]tences", line, re.I):
                mt = re.search(
                    r"(?:Ing[eé]nieur\s+en\s+|Formation\s+|Sp[eé]cialit[eé]\s+)(.{5,80})",
                    line,
                    re.I,
                )
                candidate = (mt.group(1) if mt else line).strip(" :;-\t")
                if len(candidate) >= 5:
                    meta["nom_module"] = candidate
                    break

    # ── Module name ──────────────────────────────────────────────────────
    if "nom_module" not in meta:
        m = _RE_MODULE_NAME.search(text)
        if m:
            name = m.group(1).strip().rstrip(".")
            name = re.sub(
                r"\s*(Pr\u00e9requis|Niveaux|Objectif|Derni[eè]re).*$",
                "",
                name,
                flags=re.I,
            )
            meta["nom_module"] = name

    # ── Unité pédagogique ────────────────────────────────────────────────
    m = _RE_UNITE_PEDAGOGIQUE.search(text)
    if m:
        val = m.group(1).strip()
        meta["unite_pedagogique"] = val
    # Also try: line BEFORE "Unité pédagogique"
    if "unite_pedagogique" not in meta:
        m_rev = re.search(
            r"^(.{3,60})\n\s*(?:Unit[eé]\s+p[eé]dagogique|UP)\s*$",
            text,
            re.I | re.MULTILINE,
        )
        if m_rev:
            meta["unite_pedagogique"] = m_rev.group(1).strip()

    # ── Unité d'enseignement (NLP-6) ──────────────────────────────────────
    # Regex fallback for "Unité d'enseignement : XYZ" in text (complement to
    # table-based detection in _scan_tables_for_meta)
    if "unite_enseignement" not in meta:
        m_ue = re.search(
            r"Unit[e\u00e9]\s+d[\u0027\u2019]\s*enseignement\s*[:\-]\s*(.+?)(?:\n|$)",
            text,
            re.I,
        )
        if m_ue:
            ue_val = m_ue.group(1).strip()
            if ue_val:
                meta["unite_enseignement"] = ue_val
                if re.match(r"^[A-Z]{2,6}\d{2,6}$", ue_val.upper()):
                    meta.setdefault("code_ue", ue_val.upper())

    # ── Responsable ──────────────────────────────────────────────────────
    # Try reversed format first (value line BEFORE label)
    m_rev = _RE_RESPONSABLE_REV.search(text)
    if m_rev:
        raw_resp = m_rev.group(1).strip()
        cleaned = _clean_name(raw_resp)
        if cleaned:
            meta["responsable"] = cleaned
    # Standard format fallback
    if "responsable" not in meta:
        m = _RE_RESPONSABLE.search(text)
        if m:
            raw_val = m.group(1).strip()
            cleaned = _clean_name(raw_val)
            if cleaned:
                meta["responsable"] = cleaned

    # ── Enseignants ──────────────────────────────────────────────────────
    # Section-header pattern used to detect end of name continuation lines
    _SECTION_HDR = re.compile(
        r"^(?:Unit[eé]|Pr[eé]requis|Niveaux|Objectif|Mode\s+d|Acquis|"
        r"Responsable|Enseignants?|Coordinat|Volume|Cr[eé]dit|ECTS|Semestre|"
        r"Code\s|Description|Plan\s|Chapitre|S[eé]ance|Contenu|R[eé]f[eé]rence|"
        r"Bibliographie|Evaluation|Examen)",
        re.IGNORECASE,
    )

    def _grab_continuation(match_obj: re.Match, source: str) -> str:
        """After an enseignants regex match, grab continuation lines that are
        still part of the name list (before the next section header / blank line)."""
        raw = match_obj.group(1).strip()
        pos = match_obj.end()
        remainder = source[pos:].lstrip("\n")  # skip newline right after match
        for cont_line in remainder.split("\n"):
            cl = cont_line.strip()
            if not cl:
                break
            if _SECTION_HDR.match(cl):
                break
            # Looks like more names – uppercase words, commas, etc.
            raw += " " + cl
        return raw

    ens_names: List[str] = []
    # Try forward regex first (more reliable with continuation lines)
    m = _RE_ENSEIGNANTS.search(text)
    if m:
        raw_val = _grab_continuation(m, text)
        if _is_valid_enseignant_value(raw_val):
            ens_names = _split_names(raw_val)
        else:
            clean_val = raw_val.split(":", 1)[0].strip() if ":" in raw_val else raw_val
            if _is_valid_enseignant_value(clean_val):
                ens_names = _split_names(clean_val)
    # Fallback: reversed format (value line BEFORE label)
    if not ens_names:
        m_rev = _RE_ENSEIGNANTS_REV.search(text)
        if m_rev:
            raw_val = m_rev.group(1).strip()
            # Skip if captured text is clearly a "Responsable" line
            if (not re.match(r"^Responsable\b", raw_val, re.I)
                    and _is_valid_enseignant_value(raw_val)):
                ens_names = _split_names(raw_val)
    if ens_names:
        meta["enseignants_noms"] = ens_names
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
        raw_val = m.group(1).strip()
        eq_names = _split_names(raw_val)
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

    # Final defensive cleanup: keep only valid person-like names and sync roles.
    raw_names: List[str] = list(meta.get("enseignants_noms", []))
    raw_roles: Dict[str, str] = dict(meta.get("enseignants_roles", {}))
    if meta.get("responsable"):
        raw_names.append(meta["responsable"])

    valid_role_values = {"responsable", "coordinateur", "enseignant", "intervenant"}
    clean_roles: Dict[str, str] = {}
    for raw_name, role in raw_roles.items():
        cleaned = _clean_name(str(raw_name))
        if not cleaned:
            continue
        if not _is_valid_enseignant_value(cleaned):
            continue
        clean_roles[cleaned] = role if role in valid_role_values else "enseignant"
        raw_names.append(cleaned)

    seen: set = set()
    unique: List[str] = []
    for raw_name in raw_names:
        cleaned = _clean_name(str(raw_name))
        if not cleaned:
            continue
        if not _is_valid_enseignant_value(cleaned):
            continue
        key = _normalize(cleaned).strip()
        if key in seen:
            continue
        seen.add(key)
        unique.append(cleaned)
        clean_roles.setdefault(cleaned, "enseignant")

    if unique:
        meta["enseignants_noms"] = unique
        # Keep only roles for names that survived cleanup.
        meta["enseignants_roles"] = {n: clean_roles.get(n, "enseignant") for n in unique}
    else:
        meta.pop("enseignants_noms", None)
        meta.pop("enseignants_roles", None)

    # ── Prérequis ────────────────────────────────────────────────────────
    m_rev = _RE_PREREQUIS_REV.search(text)
    if m_rev:
        meta["prerequis"] = m_rev.group(1).strip()
    if "prerequis" not in meta:
        m = _RE_PREREQUIS.search(text)
        if m:
            val = m.group(1).strip()
            if not re.match(r"^\d+[A-Z]{3,}", val):
                meta["prerequis"] = val

    # ── Objectif ─────────────────────────────────────────────────────────
    m = _RE_OBJECTIF.search(text)
    if m:
        obj = m.group(1).strip()
        obj = re.sub(r"\s*\n\s*", " ", obj).strip()
        meta["objectif"] = obj

    return meta


# ─────────────────────────────────────────────────────────────────────────────
# NLP – Acquis d'Apprentissage extraction (AA)
# ─────────────────────────────────────────────────────────────────────────────

# ── AA extraction patterns ───────────────────────────────────────────────────
_RE_AA_LINE = re.compile(r"(?:AA\s*(\d+))\s+(.+?)\s+(\d)\s*$", re.MULTILINE)
_RE_AA_ALT = re.compile(r"(?:AA\s*(\d+))\s+(.+)", re.MULTILINE)


def _extract_acquis_apprentissage(
    text: str, raw_tables=None
) -> List[Dict[str, Any]]:
    """
    NLP extraction of Acquis d'Apprentissage with Bloom levels.

    Strategy:
    1. **LLM** (primary) — understands any AA format.
    2. **Table scanner** — detects 3-column AA tables from pdfplumber raw_tables.
    3. **Regex block-parser** (fallback) — line-by-line AA marker detection.

    Returns list of {id, text, bloom_level}.

    Args:
        text: full extracted text of the fiche.
        raw_tables: optional pdfplumber raw_tables – primary for 3-col AA format.
    """
    # ── 0. LLM extraction (primary) ──────────────────────────────────────
    if _LLM_OK:
        llm_acquis = _llm_extract_acquis(text)
        if llm_acquis:
            return llm_acquis

    # ── 0b. Table-based AA scanner ────────────────────────────────────────
    # Handles fiches where AAs are in a 3-column table: [AA id | description | Bloom]
    # Also handles 2-column tables: [AA id | description] with Bloom in description tail
    if raw_tables:
        table_acquis: List[Dict[str, Any]] = []
        for table in raw_tables:
            if not table or len(table) < 2:
                continue
            for row in table:
                cells = [_clean_cell(c) for c in row]
                non_empty = [c for c in cells if c]
                if len(non_empty) < 2:
                    continue
                # Detect if first column is an AA identifier like "AA1", "AA 1", "1"
                aa_id_match = re.match(r"^AA\s*(\d+)$", non_empty[0].strip(), re.I)
                if not aa_id_match:
                    # Also accept bare integers in first column (some fiches use "1", "2"…)
                    aa_id_match = re.match(r"^(\d+)$", non_empty[0].strip())
                if not aa_id_match:
                    continue
                aa_num = int(aa_id_match.group(1))
                # Second column = text of the AA (possibly multi-line, already cleaned)
                aa_text = non_empty[1].strip()
                if len(aa_text) < 5:
                    continue
                # Third column (optional) = Bloom level (digit 1-6 or label)
                bloom = 1
                if len(non_empty) >= 3:
                    bloom_raw = non_empty[2].strip()
                    # Direct digit
                    bd = re.match(r"^(\d)$", bloom_raw)
                    if bd:
                        bloom = min(max(int(bd.group(1)), 1), 6)
                    # "1 et 2" → take first digit
                    bm = re.search(r"(\d)", bloom_raw)
                    if bm:
                        bloom = min(max(int(bm.group(1)), 1), 6)
                else:
                    bloom = _detect_bloom_level(aa_text)
                table_acquis.append(
                    {"id": aa_num, "text": aa_text, "bloom_level": bloom}
                )
        # If we found structured AA rows, prefer that result
        if table_acquis:
            # Deduplicate by id (keep first occurrence)
            seen_ids: set = set()
            deduped = []
            for item in table_acquis:
                if item["id"] not in seen_ids:
                    seen_ids.add(item["id"])
                    deduped.append(item)
            return deduped

    # ── 1. Regex block parser (fallback) ─────────────────────────────────
    acquis: List[Dict[str, Any]] = []

    # Apostrophe variants: U+0027 ASCII, U+2018 left curly, U+2019 right curly (Word/PDF), U+2032 prime
    aa_block_match = re.search(
        r"Acquis\s+d[\u0027\u2018\u2019\u2032]apprentissage\s*:?\s*[^\n]*\n(.+?)"
        r"(?=Contenu\s+d[e\u00e9]taill[e\u00e9]|Plan\s+du\s+cours"
        r"|Plan\s+du\s+module|Contenu\s+p[e\u00e9]dagogique|\Z)",
        text,
        re.I | re.DOTALL,
    )
    if not aa_block_match:
        return []

    block = aa_block_match.group(1)
    lines = block.split("\n")

    parsed: List[Dict[str, Any]] = []
    for line in lines:
        stripped = line.strip()
        if not stripped:
            continue
        # Skip header / legend lines inside the AA block
        if re.match(r"^AA\s+Acquis|^Niveau|^\*\s*:|^\(1\s*:", stripped, re.I):
            continue
        if stripped.startswith("*") or stripped.startswith("(1"):
            continue
        if re.match(r"^:\s", stripped):
            continue
        # Skip repeated "Acquis d'apprentissage" header inside the block
        if re.match(r"^Acquis\s+d[\x27\u2019]appre", stripped, re.I):
            continue
        # Skip legend lines like "d'approfondissement (*)" or "(1 : Mémoriser…)"
        if re.match(r"^d[\x27\u2019]approfondissement", stripped, re.I):
            continue

        m = re.match(r"^AA\s*(\d+)\s*(.*)", stripped)
        if m:
            parsed.append(
                {"type": "marker", "aa": int(m.group(1)), "rest": m.group(2).strip()}
            )
        else:
            parsed.append({"type": "text", "content": stripped})

    marker_indices = [i for i, p in enumerate(parsed) if p["type"] == "marker"]

    if not marker_indices:
        # Try "AA N  text  bloom" format across the full text
        for m in _RE_AA_LINE.finditer(text):
            acquis.append(
                {
                    "id": int(m.group(1)),
                    "text": m.group(2).strip(),
                    "bloom_level": min(max(int(m.group(3)), 1), 6),
                }
            )
        if acquis:
            return acquis
        # Last resort: extract bullet/numbered action-verb lines from the AA block
        # (fiches that list objectives without AA markers)
        aa_id = 1
        for tok in parsed:
            if tok["type"] != "text":
                continue
            content = tok["content"].strip()
            # Strip leading bullet chars
            content = re.sub(
                r"^[\-\u2022\*\u203A\u25E6\u25AA\d]+[.):]\s*", "", content
            ).strip()
            if len(content) < 10:
                continue
            bloom = _detect_bloom_level(content)
            acquis.append({"id": aa_id, "text": content, "bloom_level": bloom})
            aa_id += 1
        return acquis

    segments: List[Dict[str, Any]] = []
    for idx, mi in enumerate(marker_indices):
        aa_num = parsed[mi]["aa"]
        rest = parsed[mi]["rest"]

        bloom = 0
        # Handle bloom levels like "2 et 3", "1 et 2" — take the highest
        # Also match when rest IS the bloom (e.g. rest="1 et 2" with no preceding text)
        bm_multi_full = re.match(r"^(\d)\s+et\s+(\d)\s*$", rest)
        bm_multi = (
            re.search(r"\s+(\d)\s+et\s+(\d)\s*$", rest) if not bm_multi_full else None
        )
        if bm_multi_full:
            bloom = max(int(bm_multi_full.group(1)), int(bm_multi_full.group(2)))
            rest = ""
        elif bm_multi:
            bloom = max(int(bm_multi.group(1)), int(bm_multi.group(2)))
            rest = rest[: bm_multi.start()].strip()
        else:
            bm = re.search(r"\s+(\d)\s*$", rest)
            if bm:
                bloom = int(bm.group(1))
                rest = rest[: bm.start()].strip()
            elif re.match(r"^(\d)\s*$", rest):
                bloom = int(rest)
                rest = ""

        prev_mi = marker_indices[idx - 1] if idx > 0 else -1
        text_between: List[str] = []
        bloom_standalone: Optional[int] = None  # standalone bloom line for prev AA
        for j in range(prev_mi + 1, mi):
            if parsed[j]["type"] == "text":
                ct = parsed[j]["content"]
                # Detect standalone bloom-level lines: "3", "1 et 2", "2 et 3"
                bm_standalone = re.match(r"^(\d)\s+et\s+(\d)\s*$", ct)
                if bm_standalone:
                    bloom_standalone = max(
                        int(bm_standalone.group(1)), int(bm_standalone.group(2))
                    )
                    continue  # don't add to text_between
                bm_single = re.match(r"^(\d)\s*$", ct)
                if bm_single:
                    bloom_standalone = int(bm_single.group(1))
                    continue
                text_between.append(ct)

        # Assign standalone bloom to previous segment if it had no bloom
        if bloom_standalone is not None and segments and segments[-1]["bloom"] == 0:
            segments[-1]["bloom"] = bloom_standalone

        split_point = len(text_between)
        for k, t in enumerate(text_between):
            if not t:
                continue
            first_char = t[0]
            if first_char.isupper():
                if not re.match(
                    r"^(sur|de|du|des|le|la|les|un|une|et|ou|au|aux)\s", t, re.I
                ):
                    split_point = k
                    break

        post_text_prev = text_between[:split_point]
        pre_text_this = text_between[split_point:]

        if post_text_prev and segments:
            segments[-1]["post"].extend(post_text_prev)

        trailing: List[str] = []
        trailing_bloom: Optional[int] = None
        if idx == len(marker_indices) - 1:
            for j in range(mi + 1, len(parsed)):
                if parsed[j]["type"] == "text":
                    ct = parsed[j]["content"]
                    # Detect standalone bloom after last AA
                    bm_s2 = re.match(r"^(\d)\s+et\s+(\d)\s*$", ct)
                    if bm_s2:
                        trailing_bloom = max(int(bm_s2.group(1)), int(bm_s2.group(2)))
                        continue
                    bm_s1 = re.match(r"^(\d)\s*$", ct)
                    if bm_s1:
                        trailing_bloom = int(bm_s1.group(1))
                        continue
                    trailing.append(ct)

        # Use trailing bloom for last segment if its inline bloom was 0
        effective_bloom = bloom if bloom else (trailing_bloom or 0)

        segments.append(
            {
                "aa": aa_num,
                "bloom": effective_bloom,
                "pre": list(pre_text_this),
                "inline": rest,
                "post": trailing,
            }
        )

    for seg in segments:
        parts = seg["pre"] + ([seg["inline"]] if seg["inline"] else []) + seg["post"]
        aa_text = " ".join(parts).strip()
        bloom = seg["bloom"]

        aa_text = re.sub(
            r"\s*(?:Situation|Dur[eé]e|Rendu|d['']apprentissage).*$",
            "",
            aa_text,
            flags=re.I,
        ).strip()

        if not bloom and aa_text:
            bloom = _detect_bloom_level(aa_text)

        if aa_text and len(aa_text) > 5:
            acquis.append(
                {
                    "id": seg["aa"],
                    "text": aa_text,
                    "bloom_level": min(max(bloom, 1), 6),
                }
            )

    return acquis


# ─────────────────────────────────────────────────────────────────────────────
# NLP – Séance / Session extraction (Contenu détaillé)
# ─────────────────────────────────────────────────────────────────────────────

# Title group is optional – handles both "Chapitre1" (bare) and "Chapitre 1 : Titre"
_RE_SEANCE = re.compile(
    r"(?:S[eé]ance|Seance|Session|Chapitre|Semaine)\s*(\d+(?:\s*[-\u2013]\s*\d+)?)"
    r"(?:\s*[:\-]\s*(.+?))?(?=\n|$)",
    re.IGNORECASE | re.MULTILINE,
)
_RE_CHECKMARK = re.compile(r"^[\u2714\u2713\u2611\u2610]\s*(.+)$", re.MULTILINE)
_RE_BULLET = re.compile(r"^[\-\u2022\*\u203A\u25E6\u25AA]\s+(.+)$", re.MULTILINE)
_RE_NUMBERED = re.compile(r"^\d+[\.\)]\s+(.+)$", re.MULTILINE)


def _extract_seances(text: str) -> List[Dict[str, Any]]:
    """
    NLP extraction of séances/sessions from the contenu détaillé.

    Strategy:
    1. **LLM** (primary) — handles any section format and bullet style.
    2. **Regex** (fallback) — requires explicit "Séance N" markers.
    """
    # ── 0. LLM extraction (primary) ──────────────────────────────────────
    if _LLM_OK:
        llm_seances = _llm_extract_seances(text)
        if llm_seances:
            return llm_seances

    # ── 1. Regex fallback ─────────────────────────────────────────────────
    seances: List[Dict[str, Any]] = []
    matches = list(_RE_SEANCE.finditer(text))
    if not matches:
        return seances

    for i, match in enumerate(matches):
        numero = match.group(1).strip()
        titre = (match.group(2) or "").strip()  # group(2) is optional → may be None
        start = match.end()
        end = matches[i + 1].start() if i + 1 < len(matches) else len(text)
        block = text[start:end]

        items: List[str] = []
        for pattern in [_RE_CHECKMARK, _RE_BULLET, _RE_NUMBERED]:
            items.extend(pattern.findall(block))
        items = [it.strip() for it in items if len(it.strip()) > 5]
        # Remove pure AA-reference lines like "AA1", "AA1 AA2", "AA 3" etc.
        items = [
            it for it in items
            if not re.match(r'^(?:AA\s*\d+\s*)+$', it.strip(), re.I)
        ]
        # If titre is empty (bare "Chapitre1" line) try to pull title from
        # first non-empty, non-AA item in block
        if not titre:
            for candidate in items:
                if not re.match(r'^(?:AA\s*\d+\s*)+$', candidate.strip(), re.I):
                    titre = candidate
                    items = items[1:] if items and items[0] == candidate else items
                    break

        type_match = re.search(
            r"(?:Situation\s*(?:\(s\))?\s*|Type\s*)[:\-]?\s*(cours\s+int[e\u00e9]gr[e\u00e9]|TP|TD|APP|Projet|Labo)",
            block,
            re.IGNORECASE,
        )
        type_apprentissage = type_match.group(1).strip() if type_match else None

        duree_match = re.search(
            r"(?:Dur\u00e9e|Duree)\s*[:\-]?\s*(\d+\s*h)", block, re.I
        )
        duree = duree_match.group(1).strip() if duree_match else None

        seances.append(
            {
                "numero": numero,
                "titre": titre,
                "items": items,
                "type_apprentissage": type_apprentissage,
                "duree": duree,
            }
        )

    return seances


def _extract_referentiel_competences(text: str) -> List[Dict[str, Any]]:
    """
    Detect and extract ESPRIT referential competencies formatted like:
      "S1 - Effectuer...", "C4 - Gérer...", "T2 - Contribuer..."

    Returns a list of dicts: {code, text, domaine_code, domaine_nom, bloom_level}
    only if this looks like a referential document (>= 3 items), else [].
    """
    re_comp = re.compile(
        r"^([A-Z][a-z]?(?:ech)?)\s*(\d+[a-z]?)\s*[-\u2013]\s*(.{10,300})$",
        re.MULTILINE,
    )
    re_section = re.compile(
        r"Comp[eé]tences?\s+(?:dans\s+le\s+domaine\s+(?:de[sl]?\s+)?|en\s+|transversales?\s+)"
        r"(.{3,60})\s*\(\s*([A-Z][a-z]*)\s*\)",
        re.IGNORECASE,
    )

    section_map: Dict[str, str] = {}
    for m in re_section.finditer(text):
        domaine_nom = re.sub(r"\s+", " ", m.group(1)).strip(" .:-")
        lettre = m.group(2).strip().upper()
        if domaine_nom:
            section_map[lettre] = domaine_nom

    lines = text.splitlines()
    items: List[Dict[str, Any]] = []
    i = 0
    while i < len(lines):
        line = lines[i].strip()
        m = re.match(
            r"^([A-Z][a-z]?(?:ech)?)\s*(\d+[a-z]?)\s*[-\u2013]\s*(.{10,300})$",
            line,
        )
        if not m:
            i += 1
            continue

        lettre = m.group(1).strip().upper()
        numero = m.group(2).strip()
        comp_text = m.group(3).strip()

        # Join continuation lines until next item/section/header noise.
        j = i + 1
        tail: List[str] = []
        while j < len(lines):
            nxt = lines[j].strip()
            if not nxt:
                break
            if re.match(r"^[A-Z][a-z]?(?:ech)?\s*\d+[a-z]?\s*[-\u2013]\s+", nxt):
                break
            if re.match(r"^Comp[eé]tences?\s+", nxt, re.I):
                break
            if re.match(r"^(?:Axes?\s+forts|Objectifs?|Dimension\s+sp[eé]cifique)", nxt, re.I):
                break
            tail.append(nxt)
            j += 1

        if tail:
            comp_text = f"{comp_text} {' '.join(tail)}"

        comp_text = re.sub(r"\s*\n\s*", " ", comp_text)
        comp_text = re.sub(r"\s+", " ", comp_text).strip()
        # Some PDFs append next section title on same visual line (e.g. "• Compétences...").
        comp_text = re.split(
            r"\s+[•·]\s*Comp[eé]tences?\s+|\s+Comp[eé]tences?\s+dans\s+le\s+domaine\s+",
            comp_text,
            maxsplit=1,
            flags=re.IGNORECASE,
        )[0].strip()
        domaine_nom = section_map.get(lettre, lettre)

        items.append(
            {
                "code": f"{lettre}{numero}",
                "text": comp_text,
                "domaine_code": lettre,
                "domaine_nom": domaine_nom,
                "bloom_level": _detect_bloom_level(comp_text),
            }
        )
        i = j

    if len(items) < 3:
        return []

    return items
