"""Database connection pool and enseignant/affectation data access."""

from __future__ import annotations

import os
import re
import logging
import threading as _threading
from typing import Any, Dict, List, Tuple

from rice.cache import _ThreadSafeCache
from rice.models import EnseignantInfo

logger = logging.getLogger("rice_analyzer")

# ── Database connection pool ────────────────────────────────────────────────

_DB_POOL: Any = None
_DB_POOL_LOCK = _threading.Lock()


def _get_db_pool():
    """Lazily create and return the shared ThreadedConnectionPool (thread-safe)."""
    global _DB_POOL
    if _DB_POOL is None:
        with _DB_POOL_LOCK:
            if _DB_POOL is None:
                import psycopg2.pool as _pg_pool
                _DB_POOL = _pg_pool.ThreadedConnectionPool(
                    1, 10,
                    dbname=os.getenv("DB_NAME", "d2f"),
                    user=os.getenv("DB_USER", "d2f"),
                    password=os.getenv("DB_PASS", "d2fpasswd"),
                    host=os.getenv("DB_HOST", "localhost"),
                    port=int(os.getenv("DB_PORT", "7432")),
                )
    return _DB_POOL


def _get_db_connection():
    """Acquire a connection from the shared pool.

    Callers MUST eventually call ``_put_db_connection(conn)`` to return the
    connection to the pool (instead of ``conn.close()``).
    """
    return _get_db_pool().getconn()


def _put_db_connection(conn) -> None:
    """Return *conn* to the pool (or close it on pool error)."""
    try:
        _get_db_pool().putconn(conn)
    except Exception:
        try:
            conn.close()
        except Exception:
            pass


# ── Cached enseignant affectations (TTL = 5 min) ────────────────────────────
_AFFECTATIONS_CACHE = _ThreadSafeCache()
_AFFECTATIONS_CACHE_TTL: float = float(os.getenv("RICE_CACHE_TTL", "300"))  # secondes


def _fetch_enseignant_affectations() -> Dict[str, List[str]]:
    """
    Fetch enseignant → savoir-codes mapping dynamically from PostgreSQL.
    Results are cached for 5 minutes to avoid repeated DB queries.
    Returns a dict like {"E001": ["S2a", "C3b", ...], ...}
    Falls back to cached data or empty dict if the DB is unreachable.
    """
    cached = _AFFECTATIONS_CACHE.get("all", ttl=_AFFECTATIONS_CACHE_TTL)
    if cached is not None:
        return cached

    try:
        conn = _get_db_connection()
        cur = conn.cursor()
        cur.execute("""
            SELECT e.id, array_agg(s.code ORDER BY s.code)
            FROM enseignant_competences ec
            JOIN enseignants e ON e.id = ec.enseignant_id
            JOIN savoirs     s ON s.id = ec.savoir_id
            GROUP BY e.id
            ORDER BY e.id
        """)
        result: Dict[str, List[str]] = {}
        for ens_id, codes in cur.fetchall():
            result[str(ens_id)] = codes if codes else []
        cur.close()
        _put_db_connection(conn)
        _AFFECTATIONS_CACHE.set("all", result)
        logger.info("Loaded enseignant_affectations from DB: %d enseignants", len(result))
        return result
    except Exception as exc:
        logger.warning("Cannot fetch enseignant_affectations from DB: %s", exc)
        stale = _AFFECTATIONS_CACHE.get("all")  # return stale cache if available
        return stale if stale is not None else {}

_ENS_INFO_CACHE = _ThreadSafeCache()
_ENS_INFO_TTL: float = 300.0


def _fetch_all_enseignants_info() -> Dict[str, EnseignantInfo]:
    """Fetch info (id, nom, prenom, modules) for ALL teachers from DB.

    Also loads savoir names from ``enseignant_competences`` as pseudo-modules
    so that ``_match_enseignants_by_module`` has material to work with.
    """
    cached = _ENS_INFO_CACHE.get("all", ttl=_ENS_INFO_TTL)
    if cached is not None:
        return cached

    try:
        conn = _get_db_connection()
        cur = conn.cursor()
        # Base enseignant info
        cur.execute("SELECT id, nom, prenom FROM enseignants")
        res: Dict[str, Any] = {}
        for row in cur.fetchall():
            eid = str(row[0])
            res[eid] = {
                "id": eid,
                "nom": row[1] or "",
                "prenom": row[2] or "",
                "modules": [],
            }
        # Load savoir names as pseudo-modules (task #3)
        try:
            cur.execute("""
                SELECT ec.enseignant_id, s.nom
                FROM enseignant_competences ec
                JOIN savoirs s ON s.id = ec.savoir_id
            """)
            for eid_raw, snom in cur.fetchall():
                eid = str(eid_raw)
                if eid in res and snom:
                    res[eid]["modules"].append(snom)
        except Exception:
            pass  # table may not exist yet
        cur.close()
        _put_db_connection(conn)

        # Convert raw dicts to EnseignantInfo
        info_map: Dict[str, EnseignantInfo] = {}
        for eid, d in res.items():
            info_map[eid] = EnseignantInfo(
                id=d["id"], nom=d["nom"], prenom=d["prenom"],
                modules=list(set(d["modules"])),  # dedupe
            )
        _ENS_INFO_CACHE.set("all", info_map)
        return info_map
    except Exception as e:
        logger.error("Failed to fetch enseignants info: %s", e)
        stale = _ENS_INFO_CACHE.get("all")
        return stale if stale is not None else {}


def _dept_to_numeric_id(departement: str) -> int:
    """Map a department code string to its numeric DB id.

    Falls back to 1 (GC) for unknown codes.
    """
    _MAP = {
        "gc": 1, "genie_civil": 1, "genie-civil": 1,
        "info": 2, "informatique": 2,
        "ge": 3, "genie_electrique": 3, "genie-electrique": 3,
        "meca": 4, "genie_mecanique": 4,
        "telecom": 5, "telecommunications": 5,
    }
    return _MAP.get(departement.lower().strip(), 1)


def _create_enseignant_if_new(nom_complet: str, departement: str = "gc") -> Tuple[str, str]:
    """Auto-create a new enseignant row from a name extracted in a fiche module.

    If the name was not fuzzy-matched against any existing DB teacher, this
    function inserts a new row into ``enseignants`` so the extracted professor
    gets a real DB ID that will survive the import filter.

    Returns (new_id, display_name).
    """
    parts = nom_complet.strip().split()
    nom    = parts[0].upper()                             if parts      else "INCONNU"
    prenom = " ".join(parts[1:]).title()                  if len(parts) > 1 else ""

    slug_raw  = re.sub(r"[^A-Z0-9]", "-", f"{nom}-{prenom}".upper())
    slug_base = re.sub(r"-+", "-", slug_raw).strip("-")[:20]
    new_id    = f"EX-{slug_base}"
    mail      = f"{slug_base.lower()[:30]}@esprit.tn"
    display   = f"{prenom} {nom}".strip() if prenom else nom

    try:
        conn = _get_db_connection()
        cur  = conn.cursor()
        cur.execute("""
            INSERT INTO enseignants
                (id, nom, prenom, mail, type, etat, cup, chefdepartement, up_id, dept_id)
            VALUES (%s, %s, %s, %s, 'P', 'A', 'N', 'N', 1, %s)
            ON CONFLICT (id) DO NOTHING
        """, (new_id, nom, prenom, mail, _dept_to_numeric_id(departement)))
        conn.commit()
        cur.close()
        _put_db_connection(conn)
        # Invalidate cache so next load picks up the new row
        _ENS_INFO_CACHE.clear()
        logger.info(f"  Auto-created enseignant from fiche: {new_id} ({display})")
    except Exception as exc:
        logger.warning(f"  Cannot auto-create enseignant '{nom_complet}': {exc}")

    return new_id, display
