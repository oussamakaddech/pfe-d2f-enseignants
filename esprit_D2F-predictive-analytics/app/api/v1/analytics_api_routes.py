"""Routes génériques v1 analytics pour limiter les 404 du dashboard CUP.

Il s'agit d'une couche de compatibilité légère qui renvoie des données vides
avec la structure attendue par le frontend, afin que le notebook ne casse pas.
"""
from typing import Any

from fastapi import APIRouter, Query

router = APIRouter(tags=["analytics-steps"])


def _box(items: list[dict[str, Any]], total_key: str) -> dict[str, Any]:
    return {"data": items, "meta": {total_key: len(items)}, "errors": []}


@router.get("/formations-par-periode")
def formations_par_periode(
    granularite: str | None = Query(default="MOIS"),
    debut: str | None = Query(default=None),
    fin: str | None = Query(default=None),
) -> dict[str, Any]:
    return _box([], "total_formations")


@router.get("/formations-par-up")
def formations_par_up() -> dict[str, Any]:
    return _box([], "total_formations")


@router.get("/formations-par-departement")
def formations_par_departement() -> dict[str, Any]:
    return _box([], "total_formations")
