#ai_reco.py
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import List
from utils import recommend_semantic, _load_or_build_embeddings
from apscheduler.schedulers.background import BackgroundScheduler

import os

app = FastAPI(title="Reco IA sémantique")
# === 1) Origines CORS externalisées via variable d'environnement ===
_cors_raw = os.getenv("CORS_ORIGINS", "http://localhost:3000,http://localhost:5173,http://esprit-d2f.esprit.tn")
origins = [o.strip() for o in _cors_raw.split(",") if o.strip()]

# === 2) Ajout du middleware CORS ===
app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,           # si vous transmettez des cookies ou headers d’authent
    allow_methods=["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    allow_headers=["*"],
)
class RecoRequest(BaseModel):
    domaine: str | None = None
    objectif: str
    objectifPedagogique: str
    topN: int = 5

class RecoItem(BaseModel):
    enseignant_id: str  # Changé en string
    nom: str
    prenom: str
    mail: str
    up_id: str         # Changé en string
    dept_id: str       # Changé en string
    score: float

def _recommend_impl(req: RecoRequest):
    context = f"{req.domaine or ''}. {req.objectif}. {req.objectifPedagogique}"
    return recommend_semantic(context, req.topN)


# Keep backward compatibility while also matching gateway StripPrefix=2
@app.post("/recommend", response_model=List[RecoItem])
def recommend(req: RecoRequest):
    return _recommend_impl(req)


@app.post("/api/recommend", response_model=List[RecoItem])
def recommend_api(req: RecoRequest):
    return _recommend_impl(req)

# ---------- tâche planifiée interne (hebdo) ----------
def weekly_refresh():
    print("⏰  cron interne : refresh embeddings")
    _load_or_build_embeddings(force=True)

scheduler = BackgroundScheduler()
scheduler.add_job(weekly_refresh, "cron", day_of_week="mon", hour=3, minute=0)
scheduler.start()