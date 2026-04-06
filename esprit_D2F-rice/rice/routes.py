"""FastAPI routes for the RICE analysis API."""

from __future__ import annotations

import csv as _csv
import io as _io
import json as _json
import logging
import os
from typing import Dict, List, Optional

from fastapi import APIRouter, Depends, File, Form, HTTPException, UploadFile
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

logger = logging.getLogger("rice_analyzer")


# ─────────────────────────────────────────────────────────────────────────────
# Authentication / Authorization
# ─────────────────────────────────────────────────────────────────────────────

_AUTH_ENABLED = os.getenv("RICE_AUTH_ENABLED", "true").lower() in ("true", "1", "yes")
_AUTH_SECRET  = os.getenv("RICE_AUTH_SECRET", "change-me-in-production")

_oauth2_scheme = OAuth2PasswordBearer(tokenUrl="token", auto_error=False)


def _get_current_user(token: Optional[str] = Depends(_oauth2_scheme)) -> Optional[Dict]:
    """Validate the JWT bearer token when auth is enabled.

    When ``RICE_AUTH_ENABLED`` env var is ``false`` (default), authentication is
    skipped and ``None`` is returned (open access – development mode).
    """
    if not _AUTH_ENABLED:
        return None  # auth disabled – allow all
    if not token:
        raise HTTPException(status_code=401, detail="Authentication required (bearer token missing)")
    try:
        import jwt as _pyjwt
        payload = _pyjwt.decode(token, _AUTH_SECRET, algorithms=["HS256"])
        user_id = payload.get("sub")
        if user_id is None:
            raise HTTPException(status_code=401, detail="Invalid token: missing 'sub'")
        return {"id": user_id, "username": payload.get("name", user_id)}
    except ImportError:
        logger.warning("PyJWT not installed – auth check skipped (install PyJWT to enable)")
        return None
    except Exception as exc:
        raise HTTPException(status_code=401, detail=f"Invalid token: {exc}")


# ─────────────────────────────────────────────────────────────────────────────
# Router
# ─────────────────────────────────────────────────────────────────────────────

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
    files: List[UploadFile] = File(..., description="Fiches UE et modules (PDF/DOCX)"),
    enseignants: str = Form(
        default="[]",
        description='JSON array: [{id, nom, prenom, modules:[...]}]',
    ),
    departement: str = Form(
        default="auto",
        description="**auto** (détecte GC/INFO/GE/MECA/TELECOM) | **gc** (Génie Civil - fallback JSON) | **info/ge/meca/telecom** (DB refs)"
    ),
    _user: Optional[Dict] = Depends(_get_current_user),
):
    if not files:
        raise HTTPException(400, "Au moins un fichier est requis")

    try:
        ens_list = [EnseignantInfo(**e) for e in _json.loads(enseignants)]
    except Exception as exc:
        raise HTTPException(400, f"Format enseignants invalide: {exc}") from exc

    # Sanitize filenames to prevent path-traversal attacks
    filenames = [
        os.path.basename((f.filename or "").replace("..", "")) or f"file_{i}"
        for i, f in enumerate(files)
    ]
    contents  = [await f.read() for f in files]

    # Department resolution: "auto" → heuristic detection from filenames & content
    dept_key = departement.lower().strip()
    if dept_key == "auto":
        dept_key = _detect_departement(filenames, contents)
        departement = dept_key

    # Run CPU-bound analysis in a thread pool to avoid blocking the event loop
    result = await run_in_threadpool(analyze_files, filenames, contents, ens_list, departement)
    return result


# ─────────────────────────────────────────────────────────────────────────────
# /export-csv  (convert a RiceAnalysisResult to downloadable CSV)
# ─────────────────────────────────────────────────────────────────────────────

@rice_router.post(
    "/export-csv",
    summary="📊 Export CSV (1 ligne/savoir)",
    description="Flatten arbre RICE → CSV Excel-ready (UTF-8 BOM). Colonnes: domaine/comp/savoir + enseignants/ref_codes.",
    responses={200: {"description": "rice_export.csv (UTF-8 Excel-ready)"}}
)
async def export_csv(
    result: RiceAnalysisResult,
    _user: Optional[Dict] = Depends(_get_current_user),
):
    """Accept a ``RiceAnalysisResult`` JSON body (as returned by ``/analyze``)
    and return a flattened CSV with one row per *savoir*.

    Columns: ``domaine_code``, ``domaine_nom``, ``competence_code``,
    ``competence_nom``, ``sous_competence_code``, ``sous_competence_nom``,
    ``savoir_code``, ``savoir_nom``, ``savoir_type``, ``savoir_niveau``,
    ``enseignants_suggeres``, ``ref_codes``.
    """
    buf = _io.StringIO()
    writer = _csv.writer(buf)

    # Header row
    writer.writerow([
        "domaine_code", "domaine_nom",
        "competence_code", "competence_nom",
        "sous_competence_code", "sous_competence_nom",
        "savoir_code", "savoir_nom", "savoir_type", "savoir_niveau",
        "enseignants_suggeres", "ref_codes",
    ])

    for domaine in result.propositions:
        domaine_code = domaine.code or ""
        domaine_nom = domaine.nom or ""
        for comp in domaine.competences:
            comp_code = comp.code or ""
            comp_nom = comp.nom or ""
            for sav in (comp.savoirs or []):
                writer.writerow([
                    domaine_code,
                    domaine_nom,
                    comp_code,
                    comp_nom,
                    "",
                    "",
                    sav.code,
                    sav.nom,
                    sav.type,
                    sav.niveau,
                    "; ".join(sav.enseignantsSuggeres),
                    "; ".join(sav.refCodes),
                ])
            for sc in comp.sousCompetences:
                for sav in sc.savoirs:
                    writer.writerow([
                        domaine_code,
                        domaine_nom,
                        comp_code,
                        comp_nom,
                        sc.code,
                        sc.nom,
                        sav.code,
                        sav.nom,
                        sav.type,
                        sav.niveau,
                        "; ".join(sav.enseignantsSuggeres),
                        "; ".join(sav.refCodes),
                    ])

    # Add UTF-8 BOM so Excel opens accented characters correctly
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
def refresh_cache(_user: Optional[Dict] = Depends(_get_current_user)):
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
    text: str = Form(..., description="Texte à matcher (objectif, contenu de fiche…)"),
    departement: str = Form(default="gc", description="Code département (gc, info, ge, telecom, meca, …)"),
    _user: Optional[Dict] = Depends(_get_current_user),
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
)
async def rice_validate(request: ValidateRequest, _user: Optional[Dict] = Depends(_get_current_user)):
    """
    Persist the human-validated competence tree to PostgreSQL.

    Traverses the full Domaine → Compétence → SousCompétence → Savoir hierarchy
    and upserts every level in order so that the foreign-key chain is always intact.
    """
    if not request.propositions:
        raise HTTPException(400, "propositions list is empty")

    upserted_domaines = 0
    upserted_competences = 0
    upserted_sous_competences = 0
    inserted_savoirs = 0
    updated_savoirs = 0
    inserted_links = 0
    errors: List[str] = []

    try:
        conn = _get_db_connection()
        cur = conn.cursor()
    except Exception as exc:
        raise HTTPException(503, f"Database unreachable: {exc}") from exc

    try:
        for domaine in request.propositions:
            # ── Upsert domaine ────────────────────────────────────────────
            try:
                cur.execute("""
                    INSERT INTO domaines (code, nom, description, actif)
                    VALUES (%s, %s, %s, true)
                    ON CONFLICT (code) DO UPDATE SET
                        nom         = EXCLUDED.nom,
                        description = EXCLUDED.description
                """, (
                    domaine.code[:50],
                    domaine.nom[:255],
                    (domaine.description or "")[:500],
                ))
                upserted_domaines += 1
            except Exception as dom_err:
                conn.rollback()
                errors.append(f"domaine {domaine.code}: {dom_err}")
                continue

            for competence in domaine.competences:
                # ── Upsert competence ─────────────────────────────────────
                try:
                    cur.execute("""
                        INSERT INTO competences
                            (code, nom, description, ordre, domaine_id)
                        VALUES (
                            %s, %s, %s, %s,
                            (SELECT id FROM domaines WHERE code = %s)
                        )
                        ON CONFLICT (code) DO UPDATE SET
                            nom        = EXCLUDED.nom,
                            description = EXCLUDED.description,
                            ordre      = EXCLUDED.ordre,
                            domaine_id = EXCLUDED.domaine_id
                    """, (
                        competence.code[:50],
                        competence.nom[:255],
                        (competence.description or "")[:500],
                        competence.ordre,
                        domaine.code[:50],
                    ))
                    upserted_competences += 1
                except Exception as comp_err:
                    conn.rollback()
                    errors.append(f"competence {competence.code}: {comp_err}")
                    continue

                for savoir in (competence.savoirs or []):
                    sav_id = savoir.tmpId
                    try:
                        cur.execute("""
                            INSERT INTO savoirs
                                (id, code, nom, description, type, niveau,
                                 sous_competence_id, competence_id)
                            VALUES (
                                %s, %s, %s, %s, %s, %s,
                                NULL,
                                (SELECT id FROM competences WHERE code = %s)
                            )
                            ON CONFLICT (id) DO UPDATE SET
                                code               = EXCLUDED.code,
                                nom                = EXCLUDED.nom,
                                description        = EXCLUDED.description,
                                type               = EXCLUDED.type,
                                niveau             = EXCLUDED.niveau,
                                sous_competence_id = NULL,
                                competence_id      = EXCLUDED.competence_id
                            RETURNING (xmax = 0) AS inserted
                        """, (
                            sav_id,
                            savoir.code[:50],
                            savoir.nom[:255],
                            (savoir.description or "")[:500],
                            savoir.type,
                            savoir.niveau,
                            competence.code[:50],
                        ))
                        row = cur.fetchone()
                        if row and row[0]:
                            inserted_savoirs += 1
                        else:
                            updated_savoirs += 1
                    except Exception as sav_err:
                        conn.rollback()
                        errors.append(f"savoir {savoir.code}: {sav_err}")
                        continue

                    if request.overwrite:
                        try:
                            cur.execute(
                                "DELETE FROM enseignant_competences WHERE savoir_id = %s",
                                (sav_id,),
                            )
                        except Exception:
                            conn.rollback()

                    for ens_id in savoir.enseignantsSuggeres:
                        try:
                            cur.execute("""
                                INSERT INTO enseignant_competences
                                    (enseignant_id, savoir_id, niveau, date_acquisition)
                                VALUES (%s, %s, %s, CURRENT_DATE)
                                ON CONFLICT DO NOTHING
                            """, (ens_id, sav_id, savoir.niveau))
                            inserted_links += 1
                        except Exception as link_err:
                            conn.rollback()
                            errors.append(f"link {ens_id}->{savoir.code}: {link_err}")

                for sc in competence.sousCompetences:
                    # ── Upsert sous_competence ────────────────────────────
                    try:
                        cur.execute("""
                            INSERT INTO sous_competences
                                (code, nom, description, competence_id)
                            VALUES (
                                %s, %s, %s,
                                (SELECT id FROM competences WHERE code = %s)
                            )
                            ON CONFLICT (code) DO UPDATE SET
                                nom          = EXCLUDED.nom,
                                description  = EXCLUDED.description,
                                competence_id = EXCLUDED.competence_id
                        """, (
                            sc.code[:50],
                            sc.nom[:255],
                            (sc.description or "")[:500],
                            competence.code[:50],
                        ))
                        upserted_sous_competences += 1
                    except Exception as sc_err:
                        conn.rollback()
                        errors.append(f"sous_competence {sc.code}: {sc_err}")
                        continue

                    for savoir in sc.savoirs:
                        sav_id = savoir.tmpId
                        # ── Upsert savoir ─────────────────────────────────
                        try:
                            cur.execute("""
                                INSERT INTO savoirs
                                        (id, code, nom, description, type, niveau,
                                         sous_competence_id, competence_id)
                                VALUES (
                                    %s, %s, %s, %s, %s, %s,
                                        (SELECT id FROM sous_competences WHERE code = %s),
                                        NULL
                                )
                                ON CONFLICT (id) DO UPDATE SET
                                    code               = EXCLUDED.code,
                                    nom                = EXCLUDED.nom,
                                    description        = EXCLUDED.description,
                                    type               = EXCLUDED.type,
                                    niveau             = EXCLUDED.niveau,
                                        sous_competence_id = EXCLUDED.sous_competence_id,
                                        competence_id      = NULL
                                RETURNING (xmax = 0) AS inserted
                            """, (
                                sav_id,
                                savoir.code[:50],
                                savoir.nom[:255],
                                (savoir.description or "")[:500],
                                savoir.type,
                                savoir.niveau,
                                sc.code[:50],
                            ))
                            row = cur.fetchone()
                            if row and row[0]:
                                inserted_savoirs += 1
                            else:
                                updated_savoirs += 1
                        except Exception as sav_err:
                            conn.rollback()
                            errors.append(f"savoir {savoir.code}: {sav_err}")
                            continue

                        # ── Teacher links ─────────────────────────────────
                        if request.overwrite:
                            try:
                                cur.execute(
                                    "DELETE FROM enseignant_competences WHERE savoir_id = %s",
                                    (sav_id,),
                                )
                            except Exception:
                                conn.rollback()

                        for ens_id in savoir.enseignantsSuggeres:
                            try:
                                cur.execute("""
                                    INSERT INTO enseignant_competences
                                        (enseignant_id, savoir_id, niveau, date_acquisition)
                                    VALUES (%s, %s, %s, CURRENT_DATE)
                                    ON CONFLICT DO NOTHING
                                """, (ens_id, sav_id, savoir.niveau))
                                inserted_links += 1
                            except Exception as link_err:
                                conn.rollback()
                                errors.append(f"link {ens_id}->{savoir.code}: {link_err}")

        conn.commit()
    except Exception as exc:
        conn.rollback()
        raise HTTPException(500, f"DB error during validation: {exc}") from exc
    finally:
        try:
            cur.close()
            _put_db_connection(conn)
        except Exception:
            pass

    logger.info(
        f"Validate: domaines={upserted_domaines} competences={upserted_competences} "
        f"sous_competences={upserted_sous_competences} "
        f"inserted={inserted_savoirs} updated={updated_savoirs} "
        f"links={inserted_links} errors={len(errors)}"
    )
    return ValidateSummary(
        status="ok",
        upserted_domaines=upserted_domaines,
        upserted_competences=upserted_competences,
        upserted_sous_competences=upserted_sous_competences,
        inserted_savoirs=inserted_savoirs,
        updated_savoirs=updated_savoirs,
        inserted_enseignant_links=inserted_links,
        errors=errors[:30],
    )
