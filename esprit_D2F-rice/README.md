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

## Moteur IA : 100 % local, aucun LLM

- **Extraction** (structure, acquis, séances, enseignants) : règles (regex + NER sur
  tableaux + taxonomie de Bloom). Aucun LLM (`rice/llm.py` est un stub désactivé).
- **Rapprochement au référentiel** : mots-clés + embeddings
  `sentence-transformers/paraphrase-multilingual-MiniLM-L12-v2` (révision épinglée),
  **vendu dans l'image** et exécuté sur CPU, `HF_HUB_OFFLINE=1` : aucun appel réseau
  au runtime. Seuil d'abstention sur la similarité brute (`RICE_SEMANTIC_THRESHOLD`,
  0,40), classement sur la similarité **centrée** (neutralise les savoirs « hubs »).
- Vérification : `GET /health` → `llm: "aucun"`, `ia_locale: true` ;
  `GET /metrics` (JWT) → modèle réellement chargé, source du référentiel par
  département. Chaque résultat de `/analyze` porte `stats.referentielSource` et
  `stats.moteurIA`, affichés dans l'étape de revue du front.

### Référentiel utilisé

1. **Officiel** : schéma `competence` (domaines → compétences → sous-compétences →
   savoirs + niveaux requis), lecture seule. `gc` → `DEPT_GC` ; `info` →
   `DEPT_INFO`, `DEPT_GL`, `DEPT_IA`, `DEPT_WEB` ; `telecom` → `DEPT_RT`.
2. Historique `public.ref_*` (tables absentes aujourd'hui).
3. Secours : `refs/*.json` / GC intégré — **leurs codes n'existent pas en base**
   (ex. `INFO-A1`) ; le front l'affiche en avertissement.

Droits requis pour `app_user_rice` (versionnés dans
`infra/postgres/sql/10_schemas_and_grants.sql`) : `SELECT` sur les 6 tables du
référentiel + `formation.enseignants(id, nom, prenom, deleted_at)`. `/analyze` est en
**lecture seule** : un enseignant nommé dans une fiche mais inconnu de l'annuaire est
renvoyé avec `matched_id = null` et créé par l'utilisateur via le service compétence.

### Évaluation

`tests/manual/eval_referentiel_fr.py` (70 acquis FR + 20 phrases hors sujet, codes
du référentiel officiel). Mesure du 2026-09-23 :

| Configuration | top-1 | top-3 | hors sujet proposés (réglage / validation) |
|---|---|---|---|
| Avant (référentiel JSON, all-MiniLM-L6-v2 anglais) | 12,9 % | 17,1 % | 2/10 |
| Référentiel officiel + all-MiniLM-L6-v2, seuil 0,35 | 60,0 % | 71,4 % | 5/10 / 4/10 |
| Référentiel officiel + multilingue L12, seuil 0,40, classement centré | 68,6 % | 84,3 % | 1/10 / 0/10 |

Écartés : `multilingual-e5-small` (top-1 brut 77 % mais scores tassés 0,83–0,87 :
le seuil passe de 74 % à 59 % de top-1 entre 0,84 et 0,86, trop fragile) et
`paraphrase-multilingual-mpnet-base-v2` (pas meilleur, 4× plus lent).

## Semantic embedding cache

Embeddings des savoirs persistés dans `RICE_SEMANTIC_CACHE_DIR` (défaut
`_semantic_cache/`, `/tmp/rice-semantic-cache` en conteneur) sous
`<dept>-<empreinte>.npy`. L'empreinte couvre le modèle et le texte de chaque savoir :
un changement de référentiel ou de modèle ne peut plus servir des vecteurs périmés.

---

## Environment variables

| Variable | Default | Description |
|----------|---------|-------------|
| `DATABASE_URL` | — | PostgreSQL connection string |
| `RICE_AUTH_ENABLED` | `false` | Enable JWT Bearer authentication on modifying routes |
| `RICE_AUTH_SECRET` | `change-me` | Secret key used to verify JWT tokens |
| `RICE_LOG_LEVEL` | `INFO` | Logging level (DEBUG, INFO, WARNING, ERROR, CRITICAL) |
| `RICE_SEMANTIC_MODEL` | multilingue L12 (HF) / `/opt/models/semantic` (image) | Modèle d'embeddings (chemin local ou identifiant HF) |
| `RICE_SEMANTIC_THRESHOLD` | `0.40` | Similarité brute minimale pour proposer un savoir |
| `RICE_SEMANTIC_QUERY_PREFIX` / `RICE_SEMANTIC_PASSAGE_PREFIX` | vides | Préfixes requis par certains modèles (e5 : `query: ` / `passage: `) |
| `RICE_SEMANTIC_CACHE_DIR` | `_semantic_cache/` | Cache disque des embeddings |
| `RICE_DISABLE_SEMANTIC` | — | `true` = mots-clés seuls (tests) |

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
