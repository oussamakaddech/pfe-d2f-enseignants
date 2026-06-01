"""FastAPI routes for the RICE analysis API."""

import csv as _csv
import io as _io
import json as _json
import logging
import os
from typing import Annotated, Dict, List

from fastapi import APIRouter, Depends, File, Form, HTTPException, Request, UploadFile
from fastapi.concurrency import run_in_threadpool
from fastapi.responses import StreamingResponse
from fastapi.security import OAuth2PasswordBearer
from pydantic import BaseModel

from rice.models import (
    DomaineProposition,
    EnseignantInfo,
    FicheEnseignantExtrait,
    RiceAnalysisResult,
    SavoirProposition,
    SousCompetenceProposition,
    CompetenceProposition,
    ValidateRequest,
    ValidateSummary,
)
from rice.db import (
    _get_db_connection,
    _put_db_connection,
    _fetch_enseignant_affectations,
    _AFFECTATIONS_CACHE,
)
from rice.referential import (
    _get_effective_referential,
    _match_gc_savoir,
    _match_gc_competence,
    _suggest_gc_enseignants,
    _detect_departement,
    _REF_DB_CACHE,
    _SEMANTIC_CORPUS_BUILT,
)
from rice.analyzer import analyze_files
from rice.validate_helpers import (
    _upsert_domaine,
    _upsert_competence,
    _upsert_sous_competence as _upsert_sous_competence_db,
    _insert_savoir_links,
    _upsert_savoir_row,
    _process_validate_propositions,
    _build_validate_summary,
)

logger = logging.getLogger("rice_analyzer")


async def _prepare_analyze_inputs(files: List[UploadFile], enseignants: str, departement: str):
    if not files:
        raise HTTPException(400, "Au moins un fichier est requis")

    try:
        ens_list = [EnseignantInfo(**e) for e in _json.loads(enseignants)]
    except Exception as exc:
        raise HTTPException(400, f"Format enseignants invalide: {exc}") from exc

    from rice.upload_security import sanitize_filename, validate_uploads_batch

    filenames = [sanitize_filename(f.filename, i) for i, f in enumerate(files)]
    contents = [await f.read() for f in files]

    validation_error = validate_uploads_batch(filenames, contents)
    if validation_error:
        logger.warning("Upload rejete: %s", validation_error)
        raise HTTPException(400, validation_error)

    dept_key = departement.lower().strip()
    if dept_key == "auto":
        dept_key = _detect_departement(filenames, contents)
        departement = dept_key

    return filenames, contents, ens_list, departement
def _empty_validate_counts():
    return {
        "upserted_domaines": 0,
        "upserted_competences": 0,
        "upserted_sous_competences": 0,
        "inserted_savoirs": 0,
        "updated_savoirs": 0,
        "inserted_links": 0,
    }

def _accumulate_savoir_counts(counts, inserted: int, updated: int, links: int):
    counts["inserted_savoirs"] += inserted
    counts["updated_savoirs"] += updated
    counts["inserted_links"] += links

def _upsert_savoir(cur, savoir, parent_code: str, overwrite: bool, errors: List[str], conn):
    return _upsert_savoir_row(cur, savoir, parent_code, overwrite, errors, conn)

def _upsert_savoir_sous_competence(cur, savoir, competence_code: str, overwrite: bool, errors: List[str], conn):
    return _upsert_savoir_row(cur, savoir, competence_code, overwrite, errors, conn, parent_type="sous_competence")

def _upsert_sous_competence(cur, sc, competence_code: str, overwrite: bool, errors: List[str], conn):
    upserted = 1 if _upsert_sous_competence_db(cur, sc, competence_code, errors, conn) else 0
    if not upserted:
        return (0, 0, 0, 0)

    inserted = updated = links = 0
    for savoir in sc.savoirs:
        ins, upd, lnk = _upsert_savoir_sous_competence(cur, savoir, sc.code, overwrite, errors, conn)
        inserted += ins
        updated += upd
        links += lnk
    return (upserted, inserted, updated, links)

def _process_competence_savoirs(cur, competence, overwrite: bool, errors: List[str], conn, counts) -> None:
    for savoir in (competence.savoirs or []):
        ins, upd, lnk = _upsert_savoir(cur, savoir, competence.code, overwrite, errors, conn)
        _accumulate_savoir_counts(counts, ins, upd, lnk)

def _process_competence_subcompetences(cur, competence, overwrite: bool, errors: List[str], conn, counts) -> None:
    for sc in competence.sousCompetences:
        upserted, ins, upd, lnk = _upsert_sous_competence(cur, sc, competence.code, overwrite, errors, conn)
        counts["upserted_sous_competences"] += upserted
        _accumulate_savoir_counts(counts, ins, upd, lnk)

def _process_validate_domaine(cur, domaine, overwrite: bool, counts, errors, conn) -> None:
    if not _upsert_domaine(cur, domaine, errors, conn):
        return

    counts["upserted_domaines"] += 1
    for competence in domaine.competences:
        if not _upsert_competence(cur, competence, domaine.code, errors, conn):
            continue
        counts["upserted_competences"] += 1
        _process_competence_savoirs(cur, competence, overwrite, errors, conn, counts)
        _process_competence_subcompetences(cur, competence, overwrite, errors, conn, counts)

def _process_validate_propositions(cur, request: ValidateRequest, errors: List[str], conn):
    counts = _empty_validate_counts()
    for domaine in request.propositions:
        _process_validate_domaine(cur, domaine, request.overwrite, counts, errors, conn)
    return counts

def _open_validate_connection():
    import rice.db as _db_mod

    conn = _db_mod._get_db_connection()
    cur = conn.cursor()
    return conn, cur

def _close_validate_connection(conn, cur):
    try:
        cur.close()
        import rice.db as _db_mod

        _db_mod._put_db_connection(conn)
    except Exception:
        pass

def _run_validate_transaction(request: ValidateRequest, errors: List[str], conn, cur):
    counts = _process_validate_propositions(cur, request, errors, conn)
    conn.commit()
    return counts


def _csv_header():
    return [
        "domaine_code", "domaine_nom",
        "competence_code", "competence_nom",
        "sous_competence_code", "sous_competence_nom",
        "savoir_code", "savoir_nom", "savoir_type", "savoir_niveau",
        "enseignants_suggeres", "ref_codes",
    ]


def _build_export_row(domaine_code, domaine_nom, comp_code, comp_nom, sav, sc_code, sc_nom):
    return [
        domaine_code, domaine_nom, comp_code, comp_nom,
        sc_code or "", sc_nom or "",
        sav.code, sav.nom, sav.type, sav.niveau,
        "; ".join(sav.enseignantsSuggeres),
        "; ".join(sav.refCodes),
    ]


def _iter_export_rows(result: RiceAnalysisResult):
    for domaine in result.propositions:
        domaine_code = domaine.code or ""
        domaine_nom = domaine.nom or ""
        for comp in domaine.competences:
            yield from _iter_competence_export_rows(domaine_code, domaine_nom, comp)


def _iter_competence_export_rows(domaine_code, domaine_nom, comp):
    comp_code = comp.code or ""
    comp_nom = comp.nom or ""
    for sav in (comp.savoirs or []):
        yield _build_export_row(domaine_code, domaine_nom, comp_code, comp_nom, sav, "", "")
    for sc in comp.sousCompetences:
        for sav in sc.savoirs:
            yield _build_export_row(domaine_code, domaine_nom, comp_code, comp_nom, sav, sc.code, sc.nom)


# ─────────────────────────────────────────────────────────────────────────────
# Authentication / Authorization
#
# L'authentification globale est assuree par JWTAuthMiddleware (rice/jwt_middleware.py)
# avec JWT_SECRET HS512 fourni via variable d'environnement.
#

# _get_current_user lit le contexte deja injecte par le middleware (request.state),
# evitant une seconde decode du token et toute logique secret independante.
# ─────────────────────────────────────────────────────────────────────────────

_APP_ENV = os.getenv("APP_ENV", "development").lower()
_AUTH_ENABLED = os.getenv("RICE_AUTH_ENABLED", "false").lower() in ("true", "1", "yes")
_oauth2_scheme = OAuth2PasswordBearer(tokenUrl="token", auto_error=False)


def _get_current_user(
    request: Request,
    token: Annotated[str | None, Depends(_oauth2_scheme)] = None,
) -> Dict | None:
    """Retourne le contexte utilisateur deja valide par JWTAuthMiddleware.

    Le middleware a deja decode le JWT HS512 avec JWT_SECRET et injecte les claims
    dans request.state. Cette fonction ne fait qu'extraire le contexte.

    En mode dev/test si _AUTH_ENABLED=false, retourne None (open access).
    En production, _AUTH_ENABLED est force a True : si le middleware a laisse passer
    sans contexte, c'est un bug de configuration, on rejette.
    """
    if not _AUTH_ENABLED:
        return None

    user_id = getattr(request.state, "user_id", None)
    if user_id is None:
        raise HTTPException(status_code=401, detail="Authentication required")
    return {
        "id": user_id,
        "username": getattr(request.state, "user_email", None) or user_id,
        "role": getattr(request.state, "user_role", ""),
    }


# Router

rice_router = APIRouter(
    prefix="/rice",
    tags=["RICE - Référentiel Intelligent de Compétences Enseignants"],
    responses={404: {"description": "Not found"}}
)


@rice_router.post("/analyze", response_model=RiceAnalysisResult,
                  summary="🎯 Analyser fiches PDF/DOCX → Arbre de compétences RICE",
                  description="Upload fiches UE/modules ESPRIT. Auto-détecte département (GC/INFO/GE/MECA/TELECOM). Retourne hiérarchie Domaine→Compétence→Savoir avec niveaux Bloom + matching enseignants.",
                  responses={
                      200: {"description": "RiceAnalysisResult JSON (arbre validé)"},
                      400: {"description": "Fichier manquant ou JSON enseignants invalide"}
                  })
async def rice_analyze(
    files: Annotated[List[UploadFile], File(description="Fiches UE et modules (PDF/DOCX)")],
    enseignants: Annotated[str, Form(description='JSON array: [{id, nom, prenom, modules:[...]}]')] = "[]",
    departement: Annotated[str, Form(description="**auto** (détecte GC/INFO/GE/MECA/TELECOM) | **gc** (Génie Civil - fallback JSON) | **info/ge/meca/telecom** (DB refs)")] = "auto",
    _user: Annotated[Dict | None, Depends(_get_current_user)] = None,
):
    filenames, contents, ens_list, departement = await _prepare_analyze_inputs(files, enseignants, departement)

    # Run CPU-bound analysis in a thread pool to avoid blocking the event loop
    result = await run_in_threadpool(analyze_files, filenames, contents, ens_list, departement)
    return result


# ─────────────────────────────────────────────────────────────────────────────
# /export-csv  (convert a RiceAnalysisResult to downloadable CSV)
# ─────────────────────────────────────────────────────────────────────────────

def _write_competence_csv_rows(writer, domaine_code, domaine_nom, comp):
    """Write all savoir rows for a single competence (direct + sous-competence)."""
    comp_code = comp.code or ""
    comp_nom = comp.nom or ""
    for sav in (comp.savoirs or []):
        writer.writerow([
            domaine_code, domaine_nom, comp_code, comp_nom,
            "", "",
            sav.code, sav.nom, sav.type, sav.niveau,
            "; ".join(sav.enseignantsSuggeres),
            "; ".join(sav.refCodes),
        ])
    for sc in comp.sousCompetences:
        for sav in sc.savoirs:
            writer.writerow([
                domaine_code, domaine_nom, comp_code, comp_nom,
                sc.code, sc.nom,
                sav.code, sav.nom, sav.type, sav.niveau,
                "; ".join(sav.enseignantsSuggeres),
                "; ".join(sav.refCodes),
            ])


@rice_router.post(
    "/export-csv",
    summary="📊 Export CSV (1 ligne/savoir)",
    description="Flatten arbre RICE → CSV Excel-ready (UTF-8 BOM). Colonnes: domaine/comp/savoir + enseignants/ref_codes.",
    responses={200: {"description": "rice_export.csv (UTF-8 Excel-ready)"}}
)
async def export_csv(
    result: RiceAnalysisResult,
    _user: Annotated[Dict | None, Depends(_get_current_user)] = None,
):
    """Accept a ``RiceAnalysisResult`` JSON body (as returned by ``/analyze``)
    and return a flattened CSV with one row per *savoir*.
    """
    buf = _io.StringIO()
    writer = _csv.writer(buf)

    writer.writerow(_csv_header())
    for row in _iter_export_rows(result):
        writer.writerow(row)

    csv_bytes = ("\ufeff" + buf.getvalue()).encode("utf-8")
    return StreamingResponse(
        _io.BytesIO(csv_bytes),
        media_type="text/csv; charset=utf-8",
        headers={"Content-Disposition": 'attachment; filename="rice_export.csv"'},
    )


@rice_router.get("/referential/{departement}",
                 summary="📚 Référentiel département (Savoirs + Affectations)",
                 description="GC/INFO/GE/MECA/TELECOM refs + enseignants par module. Cache 1h, refresh via /refresh-cache")
def get_referential(
    departement: str = "gc",
):
    """Return the department referential (+ dynamic enseignant affectations).

    Use ``?departement=gc`` for Génie Civil (default),
    or ``?departement=info``, ``?departement=ge``, ``?departement=telecom``, etc.
    for other ESPRIT departments.
    """
    return {
        **_get_effective_referential(departement),
        "departement": departement,
        "enseignant_affectations": _fetch_enseignant_affectations(),
    }


@rice_router.post("/refresh-cache",
                  summary="Forcer le rafraîchissement du cache du référentiel et des affectations")
@rice_router.post("/gc-refresh-cache",  # backward-compat alias
                  summary="Alias déprécié – utiliser /refresh-cache", include_in_schema=False)
def refresh_cache(_user: Annotated[Dict | None, Depends(_get_current_user)] = None):
    """Invalidate the affectations cache AND all department referential DB caches
    so the next call reads fresh data from DB."""
    import rice.referential as _ref_mod
    _AFFECTATIONS_CACHE.clear()
    _REF_DB_CACHE.clear()
    _ref_mod._SEMANTIC_CORPUS_BUILT = False  # force re-encoding if ref changed
    fresh = _fetch_enseignant_affectations()
    return {"status": "ok", "enseignants_count": len(fresh)}


@rice_router.post("/match",
                  summary="Matcher un texte libre contre le référentiel d'un département")
@rice_router.post("/gc-match",  # backward-compat alias
                  summary="Alias déprécié – utiliser /match", include_in_schema=False)
async def match_text(
    text: Annotated[str, Form(description="Texte à matcher (objectif, contenu de fiche…)")],
    departement: Annotated[str, Form(description="Code département (gc, info, ge, telecom, meca, …)")] = "gc",
    _user: Annotated[Dict | None, Depends(_get_current_user)] = None,
):
    """
    Match free text against the department referential.
    Returns matched savoirs, competence, and suggested enseignants.
    Works for all ESPRIT departments: gc, info, ge, telecom, meca, …
    """
    savoir_codes = _match_gc_savoir(text, departement=departement)
    competence = _match_gc_competence(text, departement=departement)
    suggested_ens = _suggest_gc_enseignants(savoir_codes[:5])
    return {
        "departement": departement,
        "matched_savoirs": savoir_codes[:10],
        "matched_competence": competence,
        "suggested_enseignants": suggested_ens,
    }


# ─────────────────────────────────────────────────────────────────────────────
# /validate  (human review → persist to DB)
# ─────────────────────────────────────────────────────────────────────────────

@rice_router.post(
    "/validate",
    response_model=ValidateSummary,
    summary="Valider et persister le référentiel RICE validé par l'humain en BDD",
    responses={
        400: {"description": "propositions list is empty"},
        500: {"description": "DB error during validation"},
        503: {"description": "Database unreachable"},
    },
)
async def rice_validate(
    request: ValidateRequest,
    _user: Annotated[Dict | None, Depends(_get_current_user)] = None,
):
    """Persist the human-validated competence tree to PostgreSQL."""
    if not request.propositions:
        raise HTTPException(400, "propositions list is empty")

    errors: List[str] = []

    try:
        conn, cur = _open_validate_connection()
    except Exception as exc:
        raise HTTPException(503, f"Database unreachable: {exc}") from exc

    try:
        counts = _run_validate_transaction(request, errors, conn, cur)
    except Exception as exc:
        conn.rollback()
        raise HTTPException(500, f"DB error during validation: {exc}") from exc
    finally:
        _close_validate_connection(conn, cur)

    return _build_validate_summary(counts, errors, logger)
