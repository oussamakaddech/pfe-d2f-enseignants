"""Endpoints /api/v1/analytics/* — analyse descriptive (features 1-4 + export 7).

RBAC : ADMIN (toutes UP/départements) et CUP (limité à SON UP/département,
filtrage **côté serveur**). Toutes les listes sont paginées ou bornées.
"""

import logging
from datetime import date, timedelta
from typing import Annotated, Any, Optional

from fastapi import APIRouter, Depends, HTTPException, Query, Response
from sqlalchemy.orm import Session

from app.core.auth import require_roles
from app.core.db import get_db
from app.core.jwt_middleware import JWT_AUTH_ENABLED
from app.config import settings
from app.engines.reporting_engine import GRANULARITE_TO_TRUNC, ReportingEngine
from app.services.data_service import DataService

router = APIRouter(prefix="/v1/analytics", tags=["Analytics — Reporting"])
logger = logging.getLogger(__name__)

DbSession = Annotated[Session, Depends(get_db)]
ReadAuth = Annotated[dict, Depends(require_roles("ADMIN", "CUP"))]

PageParam = Annotated[int, Query(ge=0)]
SizeParam = Annotated[int, Query(ge=1, le=100)]
MoisParam = Annotated[int, Query(ge=1, le=120, description="Seuil de mois sans formation")]
DeptFilter = Annotated[Optional[str], Query(description="Filtre département (id)")]
UpFilter = Annotated[Optional[str], Query(description="Filtre UP (id)")]
AnneeFilter = Annotated[Optional[int], Query(ge=2000, le=2100)]
GranulariteParam = Annotated[str, Query(description="SEMAINE|MOIS|TRIMESTRE|ANNEE")]
DateFilter = Annotated[Optional[str], Query(description="Date ISO yyyy-MM-dd")]


def _resolve_scope(
    auth: dict, db: Session, departement: str | None, up: str | None,
) -> tuple[str | None, str | None]:
    """Applique le périmètre RBAC.

    ADMIN : conserve les filtres demandés. CUP : forcé sur SON UP/département,
    les filtres clients sont ignorés (sécurité : pas d'accès cross-UP via l'URL).
    """
    role = (auth.get("role") or "").upper()
    if not JWT_AUTH_ENABLED or "ADMIN" in role:
        return departement, up
    if "CUP" in role:
        scope = DataService(db).get_enseignant_scope(auth.get("user_id"))
        if not scope:
            raise HTTPException(
                status_code=403,
                detail="Périmètre CUP introuvable pour l'utilisateur authentifié.",
            )
        return scope.get("departement_id"), scope.get("up_id")
    raise HTTPException(status_code=403, detail="Rôle non autorisé.")


def _default_range(debut: str | None, fin: str | None) -> tuple[str, str]:
    """Fenêtre par défaut : 12 derniers mois si non précisée."""
    fin_d = date.fromisoformat(fin) if fin else date.today()
    debut_d = date.fromisoformat(debut) if debut else (fin_d - timedelta(days=365))
    return debut_d.isoformat(), fin_d.isoformat()


# ── Feature 1 — Enseignants sans formation ───────────────────
@router.get(
    "/enseignants-sans-formation",
    summary="Enseignants inactifs (sans formation depuis > N mois) — paginé",
)
async def enseignants_sans_formation(
    auth: ReadAuth,
    db: DbSession,
    mois: MoisParam = settings.seuil_inactivite_mois,
    departement: DeptFilter = None,
    up: UpFilter = None,
    page: PageParam = 0,
    size: SizeParam = 20,
) -> dict[str, Any]:
    departement, up = _resolve_scope(auth, db, departement, up)
    return ReportingEngine(db).enseignants_sans_formation(mois, departement, up, page, size)


# ── Feature 2 — Formations par période ───────────────────────
@router.get(
    "/formations-par-periode",
    summary="Nombre de formations / participants par période (granularité variable)",
)
async def formations_par_periode(
    auth: ReadAuth,
    db: DbSession,
    granularite: GranulariteParam = "MOIS",
    debut: DateFilter = None,
    fin: DateFilter = None,
    departement: DeptFilter = None,
    up: UpFilter = None,
) -> dict[str, Any]:
    granul_key = granularite.upper()
    if granul_key not in GRANULARITE_TO_TRUNC:
        raise HTTPException(
            status_code=400,
            detail=f"Granularité invalide: {granularite}. Attendu: {sorted(GRANULARITE_TO_TRUNC)}",
        )
    debut_iso, fin_iso = _default_range(debut, fin)
    departement, up = _resolve_scope(auth, db, departement, up)
    return ReportingEngine(db).formations_par_periode(granul_key, debut_iso, fin_iso, departement, up)


# ── Feature 3 — Analyse par UP ───────────────────────────────
@router.get("/formations-par-up", summary="Analytique par Unité Pédagogique")
async def formations_par_up(
    auth: ReadAuth,
    db: DbSession,
    annee: AnneeFilter = None,
    departement: DeptFilter = None,
) -> dict[str, Any]:
    departement, _ = _resolve_scope(auth, db, departement, None)
    return {"items": ReportingEngine(db).formations_par_up(annee, departement)}


# ── Feature 4 — Analyse par département + radar ──────────────
@router.get("/formations-par-departement", summary="Analytique par département (+ comparaison radar)")
async def formations_par_departement(
    auth: ReadAuth,
    db: DbSession,
    annee: AnneeFilter = None,
) -> dict[str, Any]:
    # ADMIN uniquement pour la vue inter-départements ; un CUP n'a pas ce périmètre.
    role = (auth.get("role") or "").upper()
    if JWT_AUTH_ENABLED and "ADMIN" not in role:
        raise HTTPException(status_code=403, detail="Vue inter-départements réservée à l'ADMIN.")
    return ReportingEngine(db).formations_par_departement(annee)


# ── Feature 7 — Export Excel / PDF ───────────────────────────
ExportTypeParam = Annotated[str, Query(description="INACTIFS|PAR_UP|PAR_DEPT")]


@router.get(
    "/export/excel",
    summary="Export Excel (.xlsx) d'un rapport analytique",
    responses={200: {"content": {"application/vnd.openxmlformats-officedocument.spreadsheetml.sheet": {}}}},
)
async def export_excel(
    auth: ReadAuth,
    db: DbSession,
    type: ExportTypeParam = "INACTIFS",
    mois: MoisParam = settings.seuil_inactivite_mois,
    annee: AnneeFilter = None,
    departement: DeptFilter = None,
    up: UpFilter = None,
) -> Response:
    from app.services.export_service import build_excel
    departement, up = _resolve_scope(auth, db, departement, up)
    content, filename = build_excel(db, type.upper(), mois=mois, annee=annee,
                                    departement=departement, up=up)
    return Response(
        content=content,
        media_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        headers={"Content-Disposition": f'attachment; filename="{filename}"'},
    )


@router.get(
    "/export/pdf",
    summary="Export PDF d'un rapport analytique",
    responses={200: {"content": {"application/pdf": {}}}},
)
async def export_pdf(
    auth: ReadAuth,
    db: DbSession,
    type: Annotated[str, Query(description="RAPPORT_MENSUEL|RAPPORT_ANNUEL")] = "RAPPORT_MENSUEL",
    annee: AnneeFilter = None,
) -> Response:
    from app.services.export_service import build_pdf
    role = (auth.get("role") or "").upper()
    if JWT_AUTH_ENABLED and "ADMIN" not in role:
        raise HTTPException(status_code=403, detail="Export PDF réservé à l'ADMIN.")
    content, filename = build_pdf(db, type.upper(), annee=annee)
    return Response(
        content=content,
        media_type="application/pdf",
        headers={"Content-Disposition": f'attachment; filename="{filename}"'},
    )
