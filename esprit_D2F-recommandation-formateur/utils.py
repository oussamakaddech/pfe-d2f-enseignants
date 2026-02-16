#utils.py

from __future__ import annotations
import os, psycopg2, joblib, numpy as np
from pathlib import Path
from datetime import datetime, timedelta
from typing import Dict, List
from angle_emb import AnglE               # ← LLaMA-based embedder
from sklearn.metrics.pairwise import cosine_similarity
from dotenv import load_dotenv

# Load variables from .env-qa (override with ENV_FILE env var if needed)
load_dotenv(os.getenv(".env.qa"))

# ---------- Modèle ------------------------------------------------------------------
MODEL_NAME = "WhereIsAI/UAE-Large-V1"

# Charger le modèle avec des paramètres optimisés
model = AnglE.from_pretrained(
    MODEL_NAME,
    pooling_strategy='cls',  # Stratégie recommandée pour ce modèle
    apply_lora=False,        # Désactiver LoRA car non nécessaire
    is_llm=False             # Indiquer explicitement que ce n'est pas un LLM
)
def embed(text: str) -> np.ndarray:
    """Embedding(L2=1)"""
    v = model.encode([text], to_numpy=True)[0]  # Utiliser to_numpy=True
    return v / np.linalg.norm(v)

# ---------- Postgres ----------------------------------------------------------------
conn = psycopg2.connect(
    dbname = os.getenv("DB_NAME"),
    user   = os.getenv("DB_USER"),
    password=os.getenv("DB_PASS"),
    host   = os.getenv("DB_HOST"),
    port   = int(os.getenv("DB_PORT")),
)
cur = conn.cursor()

# ---------- Cache -------------------------------------------------------------------
CACHE_FILE  = Path(os.getenv("EMB_CACHE", "/app/cache")) / "enseignant_emb.pkl"
CACHE_TTL   = timedelta(days=7)                       # rafraîchit 1×/semaine
_emb_cache: Dict[int, np.ndarray] | None = None
_cache_ts: datetime | None = None

def _need_refresh(force: bool=False) -> bool:
    if force: return True
    if _emb_cache is None: return True
    return datetime.now() - _cache_ts > CACHE_TTL     # type: ignore

def _load_or_build_embeddings(force=False) -> Dict[int, np.ndarray]:
    global _emb_cache, _cache_ts
    if not _need_refresh(force) :
        return _emb_cache                              # type: ignore

    if not force and CACHE_FILE.exists():
        _emb_cache       = joblib.load(CACHE_FILE)
        _cache_ts        = datetime.fromtimestamp(CACHE_FILE.stat().st_mtime)
        if not _need_refresh():                        # fraîche
            return _emb_cache

    # -- Reconstruit depuis la base ---------------------------------------------------
    print("🔄  Recalcul des embeddings enseignants …")
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

# ---------- API “métier” -------------------------------------------------------------
def recommend_semantic(context: str, topN: int = 5) -> List[Dict]:
    emb_q = embed(context)
    cache = _load_or_build_embeddings()

    sims = [(eid, float(cosine_similarity([emb_q], [vec])[0][0]))
            for eid, vec in cache.items()]
    sims.sort(key=lambda x: x[1], reverse=True)
    top_ids = [eid for eid, _ in sims[:topN]]

    cur.execute(f"""
        SELECT id, nom, prenom, mail, up_id, dept_id
        FROM   enseignants WHERE id = ANY(%s)
    """, (top_ids,))
    meta = {r[0]: r for r in cur.fetchall()}

    return [{
        "enseignant_id": str(eid),  # Converti en string
        "nom"         : meta[eid][1],
        "prenom"      : meta[eid][2],
        "mail"        : meta[eid][3],
        "up_id"       : str(meta[eid][4]),  # Converti en string
        "dept_id"     : str(meta[eid][5]),  # Converti en string
        "score"       : score,
    } for eid, score in sims[:topN]]