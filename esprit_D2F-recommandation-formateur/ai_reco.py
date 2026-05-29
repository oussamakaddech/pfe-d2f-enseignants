#ai_reco.py
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import List
from utils import recommend_semantic, _load_or_build_embeddings
from apscheduler.schedulers.background import BackgroundScheduler

app = FastAPI(title="Reco IA semantique")

origins = [
    "http://esprit-d2f.esprit.tn",
    "http://localhost:3000",
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    allow_headers=["*"],
)

class RecoRequest(BaseModel):
    domaine: str | None = None
    objectif: str
    objectifPedagogique: str
    topN: int = 5

class RecoItem(BaseModel):
    enseignant_id: str
    nom: str
    prenom: str
    mail: str
    up_id: str
    dept_id: str
    score: float

@app.get("/health")
def health():
    return {"status": "ok"}

@app.post("/api/recommend", response_model=List[RecoItem])
def recommend(req: RecoRequest):
    context = f"{req.domaine or ''}. {req.objectif}. {req.objectifPedagogique}"
    return recommend_semantic(context, req.topN)

def weekly_refresh():
    _load_or_build_embeddings(force=True)

scheduler = BackgroundScheduler()
scheduler.add_job(weekly_refresh, "cron", day_of_week="mon", hour=3, minute=0)
scheduler.start()