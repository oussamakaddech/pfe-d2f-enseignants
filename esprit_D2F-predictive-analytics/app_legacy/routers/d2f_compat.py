"""Compatibility adapter for legacy T-format teacher IDs.

This router maps legacy T001..T999 IDs to canonical ENS IDs via the
``teacher_id_mapping`` table, then delegates to the standard v1 endpoints.

Usage:
    GET /api/v1/compat/teacher/T001/gaps  →  maps T001→ENS001 → /api/v1/analytics/gaps/ENS001

This keeps backward compatibility with legacy integrations that still emit
T-format IDs, while ensuring the canonical ENS format is used everywhere
internally and in all responses.
"""

from __future__ import annotations

import logging
from typing import Annotated, Any

from fastapi import APIRouter, Depends, HTTPException, Query, Request
from sqlalchemy import text as sa_text
from sqlalchemy.orm import Session

from app.core.db import get_db
from app.core.id_policy import is_canonical_ens, is_legacy_t, validate_canonical_id
from app.core.observability import dsi_error_body

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/v1/compat", tags=["compat-legacy"])


def _map_legacy_to_canonical(legacy_id: str, db: Session) -> str:
    """Map a legacy T-format ID to its canonical ENS equivalent.

    Raises HTTPException(404) if the mapping is not found.
    """
    legacy_id = legacy_id.strip().upper()
    if is_canonical_ens(legacy_id):
        # Already canonical — pass through.
        return legacy_id
    if not is_legacy_t(legacy_id):
        raise HTTPException(
            status_code=400,
            detail=dsi_error_body(
                status=400,
                error_code="INVALID_TEACHER_ID",
                message=f"Invalid teacher ID format: '{legacy_id}'. Expected Txxx or ENSxxx.",
                path=f"/v1/compat/teacher/{legacy_id}",
            ),
        )

    row = db.execute(
        sa_text(
            "SELECT ens_id FROM teacher_id_mapping WHERE legacy_id = :lid "
            "AND deleted_at IS NULL"
        ),
        {"lid": legacy_id},
    ).fetchone()

    if row is None:
        raise HTTPException(
            status_code=404,
            detail=dsi_error_body(
                status=404,
                error_code="LEGACY_ID_NOT_MAPPED",
                message=(
                    f"Legacy teacher ID '{legacy_id}' has no mapping to a "
                    "canonical ENS ID. The teacher may not exist in the system."
                ),
                path=f"/v1/compat/teacher/{legacy_id}",
            ),
        )

    canonical = str(row[0]).strip().upper()
    if not is_canonical_ens(canonical):
        logger.error(
            "Mapping for %s returned non-canonical ID: %s", legacy_id, canonical
        )
        raise HTTPException(
            status_code=500,
            detail=dsi_error_body(
                status=500,
                error_code="MAPPING_INVALID",
                message=f"Internal mapping error for {legacy_id}",
                path=f"/v1/compat/teacher/{legacy_id}",
            ),
        )

    logger.info("Compat adapter mapped %s → %s", legacy_id, canonical)
    return canonical


@router.get(
    "/teacher/{legacy_id}/gaps",
    summary="Compat: gaps for legacy T-format ID (delegates to /analytics/gaps/{ENS})",
)
async def compat_teacher_gaps(
    legacy_id: str,
    request: Request,
    db: Session = Depends(get_db),
    urgence: Annotated[str | None, Query()] = None,
    page: Annotated[int, Query(ge=0)] = 0,
    size: Annotated[int, Query(ge=1, le=100)] = 20,
) -> dict[str, Any]:
    canonical = _map_legacy_to_canonical(legacy_id, db)
    from app.routers.analytics import get_gaps

    # Delegate to the canonical endpoint
    return await get_gaps(
        enseignant_id=canonical,
        request=request,
        db=db,
        urgence=urgence,
        page=page,
        size=size,
    )


@router.get(
    "/teacher/{legacy_id}/risk",
    summary="Compat: risk for legacy T-format ID (delegates to /analytics/risk/{ENS})",
)
async def compat_teacher_risk(
    legacy_id: str,
    db: Session = Depends(get_db),
) -> dict[str, Any]:
    canonical = _map_legacy_to_canonical(legacy_id, db)
    from app.routers.analytics import get_risk

    return await get_risk(enseignant_id=canonical, db=db)


@router.get(
    "/teacher/{legacy_id}/recommendations",
    summary="Compat: recommendations for legacy T-format ID",
)
async def compat_teacher_recommendations(
    legacy_id: str,
    db: Session = Depends(get_db),
    competence_id: Annotated[int | None, Query()] = None,
    page: Annotated[int, Query(ge=0)] = 0,
    size: Annotated[int, Query(ge=1, le=100)] = 20,
) -> dict[str, Any]:
    canonical = _map_legacy_to_canonical(legacy_id, db)
    from app.routers.analytics import get_recommendations

    return await get_recommendations(
        enseignant_id=canonical,
        db=db,
        competence_id=competence_id,
        page=page,
        size=size,
    )
