# esprit_D2F-rice

**RICE – Référentiel Intelligent de Compétences Enseignants**

Standalone FastAPI microservice that extracts a structured competence tree from UE/module fiches (PDF/DOCX) using NLP.  
Supports **all 5 ESPRIT departments**: GC, INFO, GE, MÉCA, TELECOM.

---

## Endpoints

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| POST | `/rice/analyze` | Bearer | Analyse fiches and generate RICE competence tree |
| GET | `/rice/referential?dept=gc` | Bearer | Get the referential for a given department |
| POST | `/rice/refresh-cache` | Bearer | Rebuild semantic corpus cache for a department |
| POST | `/rice/match` | Bearer | Match free text against a department referential |
| POST | `/rice/validate` | Bearer | Validate & persist a RICE analysis result to the DB |
| GET | `/health` | — | Health check |

> When `RICE_AUTH_ENABLED=false` (the default), the Bearer token is **not** checked.

---

## Multi-department referentials

Each department has a JSON fallback file under `refs/`:

```
refs/
├── generic_ref.json      ← maps dept code → JSON path
├── gc_ref.json
├── info_ref.json
├── ge_ref.json
├── meca_ref.json
└── telecom_ref.json
```

### Adding a new department

1. Create `refs/<dept>_ref.json` following the same schema:
   ```json
   {
     "domaines": [
       {
         "code": "DEPT-A",
         "titre": "…",
         "competences": [
           {
             "code": "DEPT-A1",
             "titre": "…",
             "savoirs": [
               { "code": "DEPT-A1-S1", "titre": "…" }
             ]
           }
         ]
       }
     ],
     "niveaux": ["Initiation", "Approfondissement", "Maîtrise"]
   }
   ```
2. Register it in `refs/generic_ref.json`:
   ```json
   { "dept_code": "./refs/dept_ref.json" }
   ```
3. (Optional) Insert rows into the `ref_savoirs`, `ref_competences`, `ref_domaines` database tables for full DB-driven matching.

---

## Semantic embedding cache

Precomputed sentence-transformer embeddings are persisted to `_semantic_cache/<dept>.npy`.  
The cache is rebuilt automatically on first call or when `/rice/refresh-cache` is invoked.

---

## Environment variables

| Variable | Default | Description |
|----------|---------|-------------|
| `DATABASE_URL` | — | PostgreSQL connection string |
| `RICE_AUTH_ENABLED` | `false` | Enable JWT Bearer authentication on modifying routes |
| `RICE_AUTH_SECRET` | `change-me` | Secret key used to verify JWT tokens |
| `RICE_LOG_LEVEL` | `INFO` | Logging level (DEBUG, INFO, WARNING, ERROR, CRITICAL) |

---

## Run locally

```bash
pip install -r requirements.txt
uvicorn main:app --reload --port 8001
```

## Run tests

```bash
pip install -r requirements-dev.txt
pytest -q tests/
```

## Docker

```bash
docker build -t rice-service .
docker run --env-file .env -p 8001:8001 rice-service
```
