# esprit_D2F-rice

**RICE – Référentiel Intelligent de Compétences Enseignants**

Standalone FastAPI microservice that extracts a structured competence tree from UE/module fiches (PDF/DOCX) using NLP.

## Endpoints

| Method | Path | Description |
|--------|------|-------------|
| POST | `/rice/analyze` | Analyse fiches and generate RICE competence tree |
| GET | `/rice/gc-referential` | Get the full GC referential for matching |
| POST | `/rice/gc-match` | Match free text against the GC referential |
| GET | `/health` | Health check |

## Run locally

```bash
pip install -r requirements.txt
uvicorn main:app --reload --port 8001
```

## Docker

```bash
docker build -t rice-service .
docker run --env-file .env -p 8001:8001 rice-service
```
