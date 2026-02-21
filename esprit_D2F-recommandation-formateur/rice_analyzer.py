# rice_analyzer.py
# RICE – Référentiel Intelligent de Compétences Enseignants
# AI engine: extracts a structured competence tree from UE/module fiches (PDF/DOCX)

from __future__ import annotations

import io
import re
import uuid
import unicodedata
from pathlib import Path
from typing import List, Optional, Dict, Any

from fastapi import APIRouter, File, UploadFile, Form, HTTPException
from pydantic import BaseModel

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

class RiceAnalysisResult(BaseModel):
    propositions: List[DomaineProposition]
    stats: Dict[str, Any]

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
# NLP helpers
# ─────────────────────────────────────────────────────────────────────────────

_LEVEL_PATTERNS = [
    (r"\b(introduction|initiation|découverte|bases?|notions?|premier)\b",  "N1_DEBUTANT"),
    (r"\b(élémentaire|fondamentaux|fondamental|débutant)\b",               "N2_ELEMENTAIRE"),
    (r"\b(intermédiaire|partiel|maîtrise\s+partielle)\b",                  "N3_INTERMEDIAIRE"),
    (r"\b(avancé|maîtrise|confirmé|spécialisé)\b",                        "N4_AVANCE"),
    (r"\b(expert|recherche|innovation|spécialisation|master)\b",           "N5_EXPERT"),
]

_PRATIQUE_KEYWORDS = re.compile(
    r"\b(tp|td|travaux\s+pratiques?|travaux\s+dirigés?|projet|labo|atelier|"
    r"manipulation|mise\s+en\s+pratique|implémentation|réalisation|développement)\b",
    re.IGNORECASE,
)

_SECTION_HEADERS = re.compile(
    r"^(?:\d[\.\d]*\s+)?(?:objectifs?|compétences?\s+visées?|contenu|programme|"
    r"syllabus|modules?|unités?|ressources?|prérequis|évaluation|"
    r"description|présentation|introduction)\s*:?\s*$",
    re.IGNORECASE | re.MULTILINE,
)

_BULLET_LINE = re.compile(r"^[\-•*›◦▪]\s+(.+)$", re.MULTILINE)
_NUMBERED    = re.compile(r"^\d+[\.\)]\s+(.+)$",  re.MULTILINE)


def _normalize(text: str) -> str:
    """Strip accents and lowercase for matching."""
    return "".join(
        c for c in unicodedata.normalize("NFD", text.lower())
        if unicodedata.category(c) != "Mn"
    )


def _detect_level(text: str) -> str:
    t = text.lower()
    for pattern, level in _LEVEL_PATTERNS:
        if re.search(pattern, t):
            return level
    return "N2_ELEMENTAIRE"   # default


def _detect_type(text: str) -> str:
    return "PRATIQUE" if _PRATIQUE_KEYWORDS.search(text) else "THEORIQUE"


def _slug(text: str, max_len: int = 30) -> str:
    """Create a short uppercase code from text."""
    words = re.findall(r"[a-zA-ZÀ-ÿ]{3,}", text)[:3]
    raw = "-".join(w[:4].upper() for w in words) if words else "ITEM"
    return raw[:max_len]


def _match_enseignants(text: str, enseignants: List[EnseignantInfo]) -> List[str]:
    """Return enseignant IDs whose declared modules overlap with the text."""
    norm_text = _normalize(text)
    matched = []
    for ens in enseignants:
        for mod in ens.modules:
            if len(mod) > 3 and _normalize(mod) in norm_text:
                matched.append(ens.id)
                break
    return matched


# ─────────────────────────────────────────────────────────────────────────────
# Core analyzer
# ─────────────────────────────────────────────────────────────────────────────

def _extract_items(text: str) -> List[str]:
    """Pull all bullet / numbered items from the text."""
    items = _BULLET_LINE.findall(text) + _NUMBERED.findall(text)
    return [i.strip() for i in items if len(i.strip()) > 5]


def _build_savoir(raw: str, idx: int, parent_code: str,
                  enseignants: List[EnseignantInfo]) -> SavoirProposition:
    code = f"{parent_code}-S{idx+1}"
    return SavoirProposition(
        tmpId=str(uuid.uuid4()),
        code=code,
        nom=raw[:120],
        description=raw if len(raw) > 30 else None,
        type=_detect_type(raw),
        niveau=_detect_level(raw),
        enseignantsSuggeres=_match_enseignants(raw, enseignants),
    )


def _build_sous_competence(title: str, items: List[str], idx: int,
                            parent_code: str,
                            enseignants: List[EnseignantInfo]) -> SousCompetenceProposition:
    code = f"{parent_code}-SC{idx+1}"
    savoirs = [_build_savoir(it, i, code, enseignants) for i, it in enumerate(items)]
    # Ensure at least one savoir when the title itself is leaf content
    if not savoirs and title:
        savoirs = [_build_savoir(title, 0, code, enseignants)]
    return SousCompetenceProposition(
        tmpId=str(uuid.uuid4()),
        code=code,
        nom=title[:100],
        description=None,
        savoirs=savoirs,
    )


def _analyze_text_block(block: str, domain_code: str, comp_idx: int,
                         enseignants: List[EnseignantInfo]) -> CompetenceProposition:
    """
    Turn a text block (section content) into a CompetenceProposition.
    Lines are grouped by whether they look like section sub-headers vs leaf items.
    """
    lines = [l.strip() for l in block.splitlines() if l.strip()]
    title = lines[0] if lines else f"Compétence {comp_idx+1}"
    comp_code = f"{domain_code}-C{comp_idx+1}"

    # Collect leaf bullet items
    all_items = _extract_items(block)

    # Group into sous-competences: split by meaningful header lines
    sc_groups: List[tuple[str, List[str]]] = []
    current_title = "Connaissances générales"
    current_items: List[str] = []

    for line in lines[1:]:
        if len(line) < 80 and line.endswith(":"):
            if current_items:
                sc_groups.append((current_title, current_items))
                current_items = []
            current_title = line.rstrip(":")
        elif re.match(r"^[\-•*›◦▪]|\d+[\.\)]", line):
            current_items.append(re.sub(r"^[\-•*›◦▪\d\.\)]\s*", "", line))
        else:
            if len(line) > 20:
                current_items.append(line)

    if current_items:
        sc_groups.append((current_title, current_items))

    # Fallback: put all items in one sous-compétence
    if not sc_groups:
        sc_groups = [("Contenus", all_items or [title])]

    sous_comps = [
        _build_sous_competence(sc_title, sc_items, i, comp_code, enseignants)
        for i, (sc_title, sc_items) in enumerate(sc_groups)
    ]

    return CompetenceProposition(
        tmpId=str(uuid.uuid4()),
        code=comp_code,
        nom=title[:100],
        description=None,
        ordre=comp_idx + 1,
        sousCompetences=sous_comps,
    )


def _infer_domain_from_filename(filename: str) -> tuple[str, str]:
    """Return (code, nom) for the domain inferred from filename."""
    stem = Path(filename).stem
    # Remove common prefixes like "Fiche_UE_", "Module_", etc.
    clean = re.sub(r"^(fiche[_\s]?)?(ue[_\s]?|module[_\s]?|cours[_\s]?)?",
                   "", stem, flags=re.IGNORECASE)
    clean = re.sub(r"[_\-]+", " ", clean).strip()
    if not clean:
        clean = stem or "Domaine"
    code = _slug(clean, 10)
    return code, clean.title()[:80]


def analyze_files(
    filenames: List[str],
    file_contents: List[bytes],
    enseignants: List[EnseignantInfo],
) -> RiceAnalysisResult:
    """Main analysis entry point."""
    domaines: List[DomaineProposition] = []
    seen_codes: Dict[str, int] = {}

    for filename, data in zip(filenames, file_contents):
        text = _extract_text(filename, data)
        dom_code, dom_nom = _infer_domain_from_filename(filename)

        # Deduplicate domain codes across files
        if dom_code in seen_codes:
            seen_codes[dom_code] += 1
            dom_code = f"{dom_code}{seen_codes[dom_code]}"
        else:
            seen_codes[dom_code] = 1

        # Split text into sections based on header lines
        sections = re.split(_SECTION_HEADERS, text)
        # Filter out empty / very short sections
        blocks = [s.strip() for s in sections if len(s.strip()) > 30]

        # Each block becomes one Competence
        competences = [
            _analyze_text_block(block, dom_code, i, enseignants)
            for i, block in enumerate(blocks[:10])   # cap at 10 compétences / fichier
        ]

        # Fallback: if no structure found, create one generic competence from all items
        if not competences:
            items = _extract_items(text) or [dom_nom]
            sc = _build_sous_competence("Contenus", items[:20], 0,
                                        f"{dom_code}-C1", enseignants)
            competences = [CompetenceProposition(
                tmpId=str(uuid.uuid4()),
                code=f"{dom_code}-C1",
                nom=dom_nom,
                ordre=1,
                sousCompetences=[sc],
            )]

        domaines.append(DomaineProposition(
            tmpId=str(uuid.uuid4()),
            code=dom_code,
            nom=dom_nom,
            description=f"Domaine extrait de : {filename}",
            competences=competences,
        ))

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
        "enseignantsCoverts": len(assigned_ens),
        "tauxCouverture": round(len(assigned_ens) / max(len(enseignants), 1) * 100, 1),
    }

    return RiceAnalysisResult(propositions=domaines, stats=stats)


# ─────────────────────────────────────────────────────────────────────────────
# FastAPI endpoint
# ─────────────────────────────────────────────────────────────────────────────

import json as _json

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
