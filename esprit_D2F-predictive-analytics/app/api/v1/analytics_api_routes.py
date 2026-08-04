"""Routes v1 analytics — reporting descriptif réel (feature 2).

`formations-par-periode` est branché sur la base (schéma `formation`), plus
un stub vide. `formations-par-up` / `formations-par-departement` restent
inertes : non consommées par le dashboard CUP actuel (queries désactivées).
"""
from datetime import date, timedelta
from typing import Any

from fastapi import APIRouter, HTTPException, Query
from sqlalchemy import text

from app.api.deps import ContainerDependency

router = APIRouter(tags=["analytics-steps"])

# Granularité (param API) → unité date_trunc Postgres. Whitelist : aucune valeur
# utilisateur n'atteint le SQL hors de ce mapping (anti-injection).
GRANULARITE_TO_TRUNC = {
    "SEMAINE": "week",
    "MOIS": "month",
    "TRIMESTRE": "quarter",
    "ANNEE": "year",
}

FORMATIONS_PAR_PERIODE_QUERY = """
WITH fwin AS (
    SELECT f.id_formation,
           date_trunc(:granul, f.date_debut) AS bucket
    FROM formation.formations f
    WHERE f.etat_formation <> 'ANNULE'
      AND f.date_debut IS NOT NULL
      AND f.date_debut >= :debut
      AND f.date_debut <= :fin
      AND (:departement IS NULL OR f.departement_id = :departement)
      AND (:up IS NULL OR f.up_id = :up)
),
ins AS (
    SELECT i.formation_id,
           COUNT(*)                                     AS total,
           COUNT(*) FILTER (WHERE i.etat = 'APPROVED')  AS approved
    FROM formation.inscriptions i
    GROUP BY i.formation_id
)
SELECT to_char(fwin.bucket, 'YYYY-MM-DD') AS period_start,
       COUNT(DISTINCT fwin.id_formation) AS nb_formations,
       COALESCE(SUM(ins.approved), 0)    AS nb_participants,
       COALESCE(SUM(ins.total), 0)       AS total_inscriptions
FROM fwin
LEFT JOIN ins ON ins.formation_id = fwin.id_formation
GROUP BY fwin.bucket
ORDER BY fwin.bucket
"""


def _tendance(serie: list[float]) -> str:
    """HAUSSE / BAISSE / STABLE à partir des 2 dernières valeurs de la série."""
    if len(serie) < 2:
        return "STABLE"
    avant, apres = serie[-2], serie[-1]
    if avant == 0:
        return "HAUSSE" if apres > 0 else "STABLE"
    variation = (apres - avant) / abs(avant)
    if variation > 0.05:
        return "HAUSSE"
    if variation < -0.05:
        return "BAISSE"
    return "STABLE"


def _parse_date(value: str | None, default: date) -> date:
    if not value:
        return default
    try:
        return date.fromisoformat(value)
    except ValueError:
        raise HTTPException(status_code=400, detail=f"Date invalide: {value!r} (attendu yyyy-MM-dd)")


@router.get("/formations-par-periode")
def formations_par_periode(
    container: ContainerDependency,
    granularite: str = Query(default="MOIS"),
    debut: str | None = Query(default=None),
    fin: str | None = Query(default=None),
    departement: str | None = Query(default=None),
    up: str | None = Query(default=None),
) -> dict[str, Any]:
    granul_key = granularite.upper()
    if granul_key not in GRANULARITE_TO_TRUNC:
        raise HTTPException(
            status_code=400,
            detail=f"Granularité invalide: {granularite}. Attendu: {sorted(GRANULARITE_TO_TRUNC)}",
        )
    fin_d = _parse_date(fin, date.today())
    debut_d = _parse_date(debut, fin_d - timedelta(days=365))
    if debut_d > fin_d:
        raise HTTPException(status_code=400, detail="La date de début ne peut pas être après la fin.")

    with container.database.read_connection() as conn:
        rows = conn.execute(
            text(FORMATIONS_PAR_PERIODE_QUERY),
            {
                "granul": GRANULARITE_TO_TRUNC[granul_key],
                "debut": debut_d.isoformat(),
                "fin": fin_d.isoformat(),
                "departement": departement,
                "up": up,
            },
        ).mappings().all()

    periodes = []
    for r in rows:
        nb_form = int(r["nb_formations"] or 0)
        nb_part = int(r["nb_participants"] or 0)
        total_ins = int(r["total_inscriptions"] or 0)
        periodes.append({
            "label": str(r["period_start"]),
            "nombreFormations": nb_form,
            "nombreParticipants": nb_part,
            "tauxCompletion": round(nb_part / total_ins * 100, 1) if total_ins else 0.0,
        })

    total_formations = sum(p["nombreFormations"] for p in periodes)
    total_participants = sum(p["nombreParticipants"] for p in periodes)
    nb_periodes = len(periodes) or 1
    return {
        "granularite": granul_key,
        "periodes": periodes,
        "totalFormations": total_formations,
        "totalParticipants": total_participants,
        "moyenneParPeriode": round(total_formations / nb_periodes, 2),
        "tendance": _tendance([p["nombreFormations"] for p in periodes]),
    }


def _box(items: list[dict[str, Any]], total_key: str) -> dict[str, Any]:
    return {"data": items, "meta": {total_key: len(items)}, "errors": []}


@router.get("/formations-par-up")
def formations_par_up() -> dict[str, Any]:
    return _box([], "total_formations")


@router.get("/formations-par-departement")
def formations_par_departement() -> dict[str, Any]:
    return _box([], "total_formations")
