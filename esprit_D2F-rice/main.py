# main.py – RICE microservice
# RICE – Référentiel Intelligent de Compétences Enseignants
# Standalone FastAPI app exposing the RICE analysis endpoints

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from rice_analyzer import rice_router

app = FastAPI(
    title="RICE – Référentiel Intelligent de Compétences Enseignants",
    description="AI engine: extracts a structured competence tree from UE/module fiches (PDF/DOCX)",
    version="1.0.0",
)

# === CORS ===
origins = [
    "http://esprit-d2f.esprit.tn/*",
    "http://localhost:3000",
    "http://localhost:5173",
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    allow_headers=["*"],
)

# === Register RICE router ===
app.include_router(rice_router)


@app.get("/health")
def health():
    return {"status": "ok", "service": "rice"}
