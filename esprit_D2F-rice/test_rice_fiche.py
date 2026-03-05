"""
test_rice_fiche.py
──────────────────
Standalone integration test for rice_analyzer:
  - Extracts text + tables from a real PDF fiche
  - Runs _extract_metadata (table-based NER + regex fallback)
  - Runs the full analyze_files pipeline
  - Prints results without needing a running server or database
"""

from __future__ import annotations

import json
import os
import sys
import textwrap
from pathlib import Path

# ── Add the rice service directory to path ────────────────────────────────────
HERE = Path(__file__).parent
ROOT = HERE.parent
sys.path.insert(0, str(HERE))

# Patch env so _get_db_connection never tries to reach a live DB in this test
os.environ.setdefault("DB_HOST", "127.0.0.1")
os.environ.setdefault("DB_PORT", "7432")
os.environ.setdefault("DB_NAME", "d2f")
os.environ.setdefault("DB_USER", "d2f")
os.environ.setdefault("DB_PASS", "d2fpasswd")

# ── Import analyzer internals ────────────────────────────────────────────────
from rice_analyzer import (
    _extract_text,
    _extract_metadata,
    analyze_files,
    EnseignantInfo,
    _PDF_OK,
    _SEMANTIC_OK,
    _FUZZY_OK,
)

# ─────────────────────────────────────────────────────────────────────────────
# Helpers
# ─────────────────────────────────────────────────────────────────────────────

RESET   = "\033[0m"
GREEN   = "\033[32m"
CYAN    = "\033[36m"
YELLOW  = "\033[33m"
MAGENTA = "\033[35m"
RED     = "\033[31m"
BOLD    = "\033[1m"


def _hdr(title: str) -> str:
    bar = "─" * 70
    return f"\n{BOLD}{CYAN}{bar}\n  {title}\n{bar}{RESET}"


def _ok(label: str, value: object) -> None:
    print(f"  {GREEN}✔{RESET}  {BOLD}{label}{RESET}: {value}")


def _warn(msg: str) -> None:
    print(f"  {YELLOW}⚠{RESET}  {msg}")


def _section(title: str) -> None:
    print(f"\n{MAGENTA}── {title} {RESET}")


def _pprint_dict(d: dict, indent: int = 4) -> None:
    text = json.dumps(d, ensure_ascii=False, indent=2, default=str)
    for line in text.splitlines():
        print(" " * indent + line)


# ─────────────────────────────────────────────────────────────────────────────
# Dependency report
# ─────────────────────────────────────────────────────────────────────────────

def print_capabilities() -> None:
    print(_hdr("Capabilities"))
    _ok("pdfplumber    ", "✅ available" if _PDF_OK     else f"{RED}❌ not installed (pip install pdfplumber){RESET}")
    _ok("rapidfuzz     ", "✅ available" if _FUZZY_OK   else f"{YELLOW}⚠ not installed – name matching degraded{RESET}")
    _ok("sentence-transformers", "✅ available" if _SEMANTIC_OK else f"{YELLOW}⚠ not installed – semantic matching disabled{RESET}")


# ─────────────────────────────────────────────────────────────────────────────
# Test 1 – Plain-text fiche (test_fiche.txt)
# ─────────────────────────────────────────────────────────────────────────────

def test_text_fiche() -> None:
    fiche_path = ROOT / "test_fiche.txt"
    if not fiche_path.exists():
        _warn(f"test_fiche.txt not found at {fiche_path} – skipping")
        return

    print(_hdr("Test 1 – Plain-text fiche  (test_fiche.txt)"))

    raw = fiche_path.read_bytes()
    filename = "test_fiche.txt"

    # Step A: extraction
    _section("A. Text extraction")
    text, raw_tables = _extract_text(filename, raw)
    print(textwrap.indent(text[:600] + ("…" if len(text) > 600 else ""), "    "))
    _ok("Raw tables found", len(raw_tables))

    # Step B: metadata NER
    _section("B. Metadata (_extract_metadata)")
    meta = _extract_metadata(text, raw_tables=raw_tables)
    _pprint_dict(meta)

    # Step C: full pipeline
    _section("C. Full analyze_files pipeline")
    dummy_ens = [
        EnseignantInfo(id="E001", nom="Ben Ali",   prenom="Mohamed",  modules=["Programmation web"]),
        EnseignantInfo(id="E002", nom="Trabelsi",  prenom="Fatma",    modules=["Laravel", "PHP"]),
        EnseignantInfo(id="E003", nom="Hammami",   prenom="Ahmed",    modules=["JavaScript"]),
        EnseignantInfo(id="E004", nom="Bouazizi",  prenom="Sarra",    modules=["React"]),
    ]

    result = analyze_files([filename], [raw], dummy_ens, departement="info")

    _section("  Stats")
    _pprint_dict(result.stats)

    _section("  Domaines proposés")
    for dom in result.propositions:
        print(f"    {BOLD}Domaine:{RESET} [{dom.code}] {dom.nom}")
        for comp in dom.competences:
            print(f"      ├─ Compétence: [{comp.code}] {comp.nom}")
            for sc in comp.sousCompetences:
                print(f"      │    ├─ Sous-comp: [{sc.code}] {sc.nom}")
                for sav in sc.savoirs:
                    ens_ids = ", ".join(sav.enseignantsSuggeres) or "—"
                    print(f"      │    │    └─ Savoir [{sav.code}] {sav.nom[:60]}")
                    print(f"      │    │       niveau={sav.niveau}  type={sav.type}  enseignants={ens_ids}")

    _section("  Enseignants extraits de la fiche")
    for e in result.extractedEnseignants:
        match = f"{e.matched_id} ({e.matched_nom})" if e.matched_id else "— non trouvé en DB"
        print(f"    {e.nom_complet!r}  rôle={e.role}  →  {match}")


# ─────────────────────────────────────────────────────────────────────────────
# Test 2 – Real PDF fiche (Fiche module 2025-2026.pdf)
# ─────────────────────────────────────────────────────────────────────────────

def test_pdf_fiche() -> None:
    pdf_path = ROOT / "Fiche module 2025-2026.pdf"
    if not pdf_path.exists():
        _warn(f"PDF not found at {pdf_path} – skipping")
        return
    if not _PDF_OK:
        _warn("pdfplumber not available – skipping PDF test")
        return

    print(_hdr("Test 2 – Real PDF fiche  (Fiche module 2025-2026.pdf)"))

    raw = pdf_path.read_bytes()
    filename = pdf_path.name

    # Step A: extraction + table scan
    _section("A. PDF text + table extraction")
    text, raw_tables = _extract_text(filename, raw)
    _ok("Pages text length", f"{len(text):,} chars")
    _ok("Raw tables found", len(raw_tables))
    if raw_tables:
        print("    First table (first 3 rows):")
        for row in raw_tables[0][:3]:
            print(f"      {row}")

    # Step B: metadata NER
    _section("B. Metadata (_extract_metadata)")
    meta = _extract_metadata(text, raw_tables=raw_tables)
    _pprint_dict(meta)

    # Step C: full pipeline (no DB teachers – will use names from fiche)
    _section("C. Full analyze_files pipeline")
    result = analyze_files([filename], [raw], [], departement="gc")

    _section("  Stats")
    _pprint_dict(result.stats)

    _section("  Domaines proposés")
    for dom in result.propositions:
        print(f"    {BOLD}Domaine:{RESET} [{dom.code}] {dom.nom}")
        for comp in dom.competences[:5]:          # limit output
            print(f"      ├─ Compétence: [{comp.code}] {comp.nom}")
            for sc in comp.sousCompetences[:3]:
                print(f"      │    ├─ Sous-comp: [{sc.code}] {sc.nom}")
                for sav in sc.savoirs[:3]:
                    ens_ids = ", ".join(sav.enseignantsSuggeres) or "—"
                    print(f"      │    │   └─ [{sav.code}] {sav.nom[:55]}  "
                          f"niv={sav.niveau}  ens={ens_ids}")

    _section("  Enseignants extraits de la fiche")
    if result.extractedEnseignants:
        for e in result.extractedEnseignants:
            match = f"{e.matched_id} ({e.matched_nom})" if e.matched_id else "— non trouvé en DB"
            print(f"    {e.nom_complet!r}  rôle={e.role}  →  {match}")
    else:
        _warn("Aucun enseignant extrait de la fiche PDF.")

    _section("  Codes GC couverts")
    gc_codes = result.stats.get("gcCodesCovered", [])
    print(f"    {', '.join(gc_codes) if gc_codes else '(aucun)'}")


# ─────────────────────────────────────────────────────────────────────────────
# Main
# ─────────────────────────────────────────────────────────────────────────────

if __name__ == "__main__":
    print_capabilities()
    print()
    test_text_fiche()
    print()
    test_pdf_fiche()
    print(f"\n{BOLD}{GREEN}═══ Tests terminés ═══{RESET}\n")
