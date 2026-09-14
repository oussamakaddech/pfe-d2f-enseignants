"""Routes v1 analytics — reporting descriptif réel (feature 2).

`formations-par-periode` est branché sur la base (schéma `formation`), plus
un stub vide. `formations-par-up` / `formations-par-departement` restent
inertes : non consommées par le dashboard CUP actuel (queries désactivées).
"""
from datetime import date, timedelta
from typing import Annotated, Any

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy import text

from app.api.deps import ContainerDependency, resolve_user_teacher
from app.core.exceptions import ForbiddenScopeError
from app.core.security import CurrentUser, get_optional_current_user

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
        return _tendance_from_zero(apres)
    variation = (apres - avant) / abs(avant)
    if variation > 0.05:
        return "HAUSSE"
    if variation < -0.05:
        return "BAISSE"
    return "STABLE"


def _tendance_from_zero(apres: float) -> str:
    """Tendance quand la valeur précédente est nulle (évite la division)."""
    if apres > 0:
        return "HAUSSE"
    return "STABLE"


def _parse_date(value: str | None, default: date) -> date:
    if not value:
        return default
    try:
        return date.fromisoformat(value)
    except ValueError:
        raise HTTPException(status_code=400, detail=f"Date invalide: {value!r} (attendu yyyy-MM-dd)")


def _resolve_scope(
    container, user, up: str | None, departement: str | None
) -> tuple[str | None, str | None]:
    """Résout le périmètre serveur pour un utilisateur non admin (§8 droits).

    Retourne ``(up, departement)`` potentiellement surchargés par la fiche
    enseignant.  Un CUP sans UP ou un chef sans département lève 403.
    """
    if _is_global_viewer(user):
        return up, departement

    user_teacher = resolve_user_teacher(container, user)

    if user.is_cup:
        return _cup_scope(user_teacher)

    if user.is_chef_departement:
        return _chef_scope(user_teacher)

    return up, departement


def _is_global_viewer(user) -> bool:
    """Vue globale : anonyme ou admin (aucun périmètre serveur imposé)."""
    if user is None:
        return True
    return user.is_admin


def _cup_scope(user_teacher) -> tuple[str | None, str | None]:
    """Périmètre CUP : sa propre UP, jamais la vue globale."""
    if user_teacher is None:
        raise ForbiddenScopeError(
            "Périmètre indéterminé : aucune UP rattachée à votre compte."
        )
    resolved_up = user_teacher.up_id
    if not resolved_up:
        raise ForbiddenScopeError(
            "Périmètre indéterminé : aucune UP rattachée à votre compte."
        )
    return resolved_up, None


def _chef_scope(user_teacher) -> tuple[str | None, str | None]:
    """Périmètre chef : son propre département, UP forcée à None."""
    if user_teacher is None:
        raise ForbiddenScopeError(
            "Périmètre indéterminé : aucun département rattaché à votre compte."
        )
    resolved_dept = user_teacher.dept_id
    if not resolved_dept:
        raise ForbiddenScopeError(
            "Périmètre indéterminé : aucun département rattaché à votre compte."
        )
    return None, resolved_dept


def _as_int(value: Any) -> int:
    """Entier sûr pour les compteurs SQL (NULL → 0)."""
    if value is None:
        return 0
    return int(value)


def _completion_rate(nb_part: int, total_ins: int) -> float:
    """Taux de complétion en % (0.0 si aucun inscrit)."""
    if total_ins == 0:
        return 0.0
    return round(nb_part / total_ins * 100, 1)


def _build_periode(r: dict) -> dict[str, Any]:
    """Construit un dict période à partir d'une ligne SQL."""
    nb_form = _as_int(r["nb_formations"])
    nb_part = _as_int(r["nb_participants"])
    total_ins = _as_int(r["total_inscriptions"])
    return {
        "label": str(r["period_start"]),
        "nombreFormations": nb_form,
        "nombreParticipants": nb_part,
        "tauxCompletion": _completion_rate(nb_part, total_ins),
    }


BAD_REQUEST_RESPONSES = {
    400: {"description": "Paramètres de requête invalides (date, granularité ou plage)"},
}


@router.get("/formations-par-periode", responses=BAD_REQUEST_RESPONSES)
def formations_par_periode(
    container: ContainerDependency,
    user: Annotated[CurrentUser | None, Depends(get_optional_current_user)],
    granularite: Annotated[str, Query()] = "MOIS",
    debut: Annotated[str | None, Query()] = None,
    fin: Annotated[str | None, Query()] = None,
    departement: Annotated[str | None, Query()] = None,
    up: Annotated[str | None, Query()] = None,
) -> dict[str, Any]:
    granul_key = _validate_granularite(granularite)
    debut_d, fin_d = _resolve_periode(debut, fin)

    # Périmètre serveur (§8 droits) : un CUP ne voit que sa propre UP, un chef
    # de département que son propre département — résolus depuis la fiche
    # enseignant (jamais depuis les paramètres du client). Un CUP/chef sans
    # périmètre résolu reçoit 403 (deny-by-default, jamais la vue globale).
    up, departement = _resolve_scope(container, user, up, departement)

    rows = _fetch_periode_rows(container, granul_key, debut_d, fin_d, departement, up)
    periodes = [_build_periode(r) for r in rows]
    return _summarize_periodes(granul_key, periodes)


def _validate_granularite(granularite: str) -> str:
    """Valide la granularité (whitelist) et retourne la clé normalisée."""
    granul_key = granularite.upper()
    if granul_key not in GRANULARITE_TO_TRUNC:
        raise HTTPException(
            status_code=400,
            detail=f"Granularité invalide: {granularite}. Attendu: {sorted(GRANULARITE_TO_TRUNC)}",
        )
    return granul_key


def _resolve_periode(debut: str | None, fin: str | None) -> tuple[date, date]:
    """Résout la fenêtre [debut, fin] (défaut : 365 derniers jours)."""
    fin_d = _parse_date(fin, date.today())
    debut_d = _parse_date(debut, fin_d - timedelta(days=365))
    if debut_d > fin_d:
        raise HTTPException(status_code=400, detail="La date de début ne peut pas être après la fin.")
    return debut_d, fin_d


def _fetch_periode_rows(
    container,
    granul_key: str,
    debut_d: date,
    fin_d: date,
    departement: str | None,
    up: str | None,
) -> list:
    """Exécute la requête formations-par-période (SQL injecté via whitelist)."""
    with container.database.read_connection() as conn:
        return conn.execute(
            text(FORMATIONS_PAR_PERIODE_QUERY),
            {
                "granul": GRANULARITE_TO_TRUNC[granul_key],
                "debut": debut_d.isoformat(),
                "fin": fin_d.isoformat(),
                "departement": departement,
                "up": up,
            },
        ).mappings().all()


def _summarize_periodes(granul_key: str, periodes: list[dict[str, Any]]) -> dict[str, Any]:
    """Agrège les périodes (totaux, moyenne, tendance)."""
    total_formations = sum(p["nombreFormations"] for p in periodes)
    total_participants = sum(p["nombreParticipants"] for p in periodes)
    return {
        "granularite": granul_key,
        "periodes": periodes,
        "totalFormations": total_formations,
        "totalParticipants": total_participants,
        "moyenneParPeriode": round(total_formations / max(len(periodes), 1), 2),
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
