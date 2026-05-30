#utils.py

from __future__ import annotations
import os, psycopg2, joblib, numpy as np
from pathlib import Path
from datetime import datetime, timedelta
from typing import Dict, List
from angle_emb import AnglE
from sklearn.metrics.pairwise import cosine_similarity
from dotenv import load_dotenv

load_dotenv(os.getenv("ENV_FILE", ".env"))

# DSI #9 — pas de téléchargement depuis HuggingFace au runtime.
# Le modèle est pré-téléchargé dans l'image Docker (révision épinglée) et
# EMBEDDING_MODEL pointe alors sur un chemin LOCAL ; en dev, on retombe sur
# l'identifiant HF. La révision sert au pré-téléchargement reproductible (build).
MODEL_NAME = os.getenv("EMBEDDING_MODEL", "WhereIsAI/UAE-Large-V1")
MODEL_REVISION = os.getenv("EMBEDDING_MODEL_REVISION", "9c9b2c999b3350cfb3171ed429320668e39b00b8")

model = AnglE.from_pretrained(
    MODEL_NAME,
    pooling_strategy='cls',
    apply_lora=False,
    is_llm=False
)

def embed(text: str) -> np.ndarray:
    v = model.encode([text], to_numpy=True)[0]
    return v / np.linalg.norm(v)

conn = psycopg2.connect(
    dbname=os.getenv("DB_NAME"),
    user=os.getenv("DB_USER"),
    password=os.getenv("DB_PASS"),
    host=os.getenv("DB_HOST"),
    port=int(os.getenv("DB_PORT")),
)
cur = conn.cursor()

CACHE_FILE  = Path(os.getenv("EMB_CACHE", "/app/cache")) / "enseignant_emb.pkl"
CACHE_TTL   = timedelta(days=7)
_emb_cache: Dict[int, np.ndarray] | None = None
_cache_ts: datetime | None = None

def _need_refresh(force: bool = False) -> bool:
    if force:
        return True
    if _emb_cache is None:
        return True
    return datetime.now() - _cache_ts > CACHE_TTL

def _load_or_build_embeddings(force=False) -> Dict[int, np.ndarray]:
    global _emb_cache, _cache_ts
    if not _need_refresh(force):
        return _emb_cache

    if not force and CACHE_FILE.exists():
        _emb_cache = joblib.load(CACHE_FILE)
        _cache_ts = datetime.fromtimestamp(CACHE_FILE.stat().st_mtime)
        if not _need_refresh():
            return _emb_cache

    cur.execute("""
        SELECT e.id,
               array_agg(f.domaine || ' ' || f.objectifs || ' ' || f.objectifs_pedago)
        FROM   enseignants  e
        JOIN   seance_animateur sa ON sa.enseignant_id = e.id
        JOIN   seances        s  ON s.id_seance  = sa.seance_id
        JOIN   formations     f  ON f.id_formation = s.formation_id
        GROUP  BY e.id
    """)
    rows = cur.fetchall()
    data = {eid: " ".join(txts) for eid, txts in rows}
    _emb_cache = {eid: embed(txt) for eid, txt in data.items()}
    joblib.dump(_emb_cache, CACHE_FILE)
    _cache_ts = datetime.now()
    return _emb_cache

def recommend_semantic(context: str, topN: int = 5) -> List[Dict]:
    emb_q = embed(context)
    cache = _load_or_build_embeddings()

    sims = [(eid, float(cosine_similarity([emb_q], [vec])[0][0]))
            for eid, vec in cache.items()]
    sims.sort(key=lambda x: x[1], reverse=True)
    top_ids = [eid for eid, _ in sims[:topN]]

    cur.execute("""
        SELECT id, nom, prenom, mail, up_id, dept_id
        FROM   enseignants WHERE id = ANY(%s)
    """, (top_ids,))
    meta = {r[0]: r for r in cur.fetchall()}

    return [{
        "enseignant_id": str(eid),
        "nom": meta[eid][1],
        "prenom": meta[eid][2],
        "mail": meta[eid][3],
        "up_id": str(meta[eid][4]),
        "dept_id": str(meta[eid][5]),
        "score": score,
    } for eid, score in sims[:topN]]