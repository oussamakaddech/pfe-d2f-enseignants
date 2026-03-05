# utils.py
# Recommandation semantique - couche utilitaire
# Correctifs vs version initiale :
#  BUG 1 - load_dotenv(os.getenv(".env.qa")) retourne None -> pas de chargement
#           Corrige : load_dotenv(os.getenv("ENV_FILE", ".env"))
#  BUG 2 - Connexion DB au niveau module (crash si DB down, non thread-safe)
#           Corrige : ThreadedConnectionPool + acquire/release par appel
#  BUG 3 - Modele AnglE au niveau module (crash si modele absent)
#           Corrige : chargement paresseux (lazy) avec verrou threading.Lock
#  BUG 4 - Dict[int, np.ndarray] : cles int vs str selon type SQL
#           Corrige : Dict[str, np.ndarray], str() systematique
#  BUG 5 - Curseur global partage entre threads (non thread-safe)
#           Corrige : connexion + curseur dedies par appel
#  BUG 6 - Pas de verrou sur _emb_cache (race condition)
#           Corrige : threading.Lock ajoute (_cache_lock)

from __future__ import annotations

import os
import threading
import joblib
import numpy as np
from pathlib import Path
from datetime import datetime, timedelta
from typing import Dict, List, Optional

import psycopg2
import psycopg2.pool
from dotenv import load_dotenv

# Chargement .env (ENV_FILE permet de pointer vers .env.qa/.env.prod)
load_dotenv(os.getenv("ENV_FILE", ".env"))

# --- Pool de connexions PostgreSQL (thread-safe, lazy) ----------------------
_DB_POOL: Optional[psycopg2.pool.ThreadedConnectionPool] = None
_DB_POOL_LOCK = threading.Lock()


def _get_pool() -> psycopg2.pool.ThreadedConnectionPool:
    """Cree le pool a la premiere utilisation (double-checked locking)."""
    global _DB_POOL
    if _DB_POOL is None:
        with _DB_POOL_LOCK:
            if _DB_POOL is None:
                _DB_POOL = psycopg2.pool.ThreadedConnectionPool(
                    minconn=1,
                    maxconn=5,
                    dbname=os.getenv("DB_NAME", "d2f"),
                    user=os.getenv("DB_USER", "d2f"),
                    password=os.getenv("DB_PASS", "d2fpasswd"),
                    host=os.getenv("DB_HOST", "localhost"),
                    port=int(os.getenv("DB_PORT", "7432")),
                )
    return _DB_POOL


def _acquire() -> psycopg2.extensions.connection:
    """Emprunte une connexion au pool."""
    return _get_pool().getconn()


def _release(conn) -> None:
    """Retourne la connexion au pool (ferme si pool corrompu)."""
    try:
        _get_pool().putconn(conn)
    except Exception:
        try:
            conn.close()
        except Exception:
            pass


# --- Modele AnglE (chargement paresseux, thread-safe) -----------------------
try:
    from angle_emb import AnglE
    _ANGLE_OK = True
except ImportError:
    _ANGLE_OK = False
    AnglE = None  # type: ignore[assignment,misc]

MODEL_NAME  = os.getenv("EMBED_MODEL", "WhereIsAI/UAE-Large-V1")
_model: Optional[object] = None
_model_lock = threading.Lock()


def _get_model():
    """Retourne l'instance AnglE (singleton, cree une seule fois)."""
    global _model
    if _model is None:
        with _model_lock:
            if _model is None and _ANGLE_OK:
                _model = AnglE.from_pretrained(  # type: ignore[union-attr]
                    MODEL_NAME,
                    pooling_strategy="cls",
                    apply_lora=False,
                    is_llm=False,
                )
    return _model


def embed(text: str) -> np.ndarray:
    """Retourne le vecteur L2-normalise de *text* (dim 1024 pour UAE-Large-V1)."""
    model = _get_model()
    if model is None:
        raise RuntimeError("Modele AnglE non disponible (pip install angle-emb)")
    v: np.ndarray = model.encode([text], to_numpy=True)[0]  # type: ignore[union-attr]
    norm = float(np.linalg.norm(v))
    return v / (norm + 1e-10)


# --- Cache d'embeddings enseignants (persiste disque, rafraichi 1x/semaine) -
CACHE_FILE  = Path(os.getenv("EMB_CACHE", "/app/cache")) / "enseignant_emb.pkl"
CACHE_TTL   = timedelta(days=7)

_emb_cache: Optional[Dict[str, np.ndarray]] = None   # cles = str(enseignant_id)
_cache_ts:  Optional[datetime]              = None
_cache_lock = threading.Lock()


def _need_refresh(force: bool = False) -> bool:
    if force:               return True
    if _emb_cache is None:  return True
    return (datetime.now() - _cache_ts) > CACHE_TTL  # type: ignore[operator]


def _load_or_build_embeddings(force: bool = False) -> Dict[str, np.ndarray]:
    """Charge (ou reconstruit) les embeddings enseignants. Thread-safe.

    Les cles sont des str(enseignant_id) pour eviter les incoherences de types
    entre psycopg2 int et les comparaisons de cles dict.
    """
    global _emb_cache, _cache_ts

    with _cache_lock:
        if not _need_refresh(force):
            return _emb_cache  # type: ignore[return-value]

        # Essai lecture depuis le cache disque
        if not force and CACHE_FILE.exists():
            try:
                loaded: Dict[str, np.ndarray] = joblib.load(CACHE_FILE)
                ts = datetime.fromtimestamp(CACHE_FILE.stat().st_mtime)
                if (datetime.now() - ts) <= CACHE_TTL:
                    _emb_cache = loaded
                    _cache_ts  = ts
                    print(f"  Cache charge depuis disque : {len(loaded)} embeddings")
                    return _emb_cache
            except Exception as exc:
                print(f"  [cache] Fichier corrompu, recalcul : {exc}")

        # Reconstruction depuis PostgreSQL
        # string_agg (vs array_agg) : joint directement en str, gere les NULL via COALESCE
        print("[reco] Recalcul des embeddings enseignants ...")
        conn = _acquire()
        rows: list = []
        try:
            cur = conn.cursor()
            cur.execute("""
                SELECT e.id,
                       string_agg(
                           COALESCE(f.domaine, '') || ' ' ||
                           COALESCE(f.objectifs, '') || ' ' ||
                           COALESCE(f.objectifs_pedago, ''),
                           ' '
                       ) AS texte
                FROM   enseignants      e
                JOIN   seance_animateur sa ON sa.enseignant_id = e.id
                JOIN   seances          s  ON s.id_seance      = sa.seance_id
                JOIN   formations       f  ON f.id_formation   = s.formation_id
                GROUP  BY e.id
            """)
            rows = cur.fetchall()
            cur.close()
        except Exception as exc:
            print(f"  [reco] Impossible de charger les formations : {exc}")
        finally:
            _release(conn)

        data: Dict[str, str] = {
            str(eid): txt.strip()
            for eid, txt in rows
            if txt and txt.strip()
        }
        new_cache: Dict[str, np.ndarray] = {}
        for eid, txt in data.items():
            try:
                new_cache[eid] = embed(txt)
            except Exception as exc:
                print(f"  [embed] ignore {eid} : {exc}")

        CACHE_FILE.parent.mkdir(parents=True, exist_ok=True)
        try:
            joblib.dump(new_cache, CACHE_FILE)
        except Exception as exc:
            print(f"  [cache] Sauvegarde impossible -> {CACHE_FILE} : {exc}")

        _emb_cache = new_cache
        _cache_ts  = datetime.now()
        print(f"  {len(new_cache)} embeddings calcules")
        return _emb_cache


# --- API metier -------------------------------------------------------------

def recommend_semantic(context: str, topN: int = 5) -> List[Dict]:
    """Retourne les *topN* enseignants les plus proches semantiquement de *context*.

    Cosine similarity via produit scalaire (vecteurs L2-normalises).
    Connexion PostgreSQL dediee par appel (thread-safe).
    """
    emb_q = embed(context)
    cache = _load_or_build_embeddings()

    if not cache:
        return []

    # cos(q, v) = q . v  car les vecteurs sont L2-normalises
    sims: List[tuple] = [
        (eid, float(np.dot(emb_q, vec)))
        for eid, vec in cache.items()
    ]
    sims.sort(key=lambda x: x[1], reverse=True)
    top     = sims[:topN]
    top_ids = [eid for eid, _ in top]  # list[str]

    conn = _acquire()
    meta: Dict[str, tuple] = {}
    try:
        cur = conn.cursor()
        cur.execute(
            "SELECT id, nom, prenom, mail, up_id, dept_id "
            "FROM enseignants WHERE id = ANY(%s)",
            (top_ids,),
        )
        meta = {str(r[0]): r for r in cur.fetchall()}
        cur.close()
    except Exception as exc:
        print(f"  [reco] Erreur DB metadonnees : {exc}")
    finally:
        _release(conn)

    result = []
    for eid, score in top:
        if eid not in meta:
            continue
        r = meta[eid]
        result.append({
            "enseignant_id": eid,
            "nom":     r[1] or "",
            "prenom":  r[2] or "",
            "mail":    r[3] or "",
            "up_id":   str(r[4]) if r[4] is not None else "",
            "dept_id": str(r[5]) if r[5] is not None else "",
            "score":   round(float(score), 4),
        })
    return result