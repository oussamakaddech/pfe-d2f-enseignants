# D2F Predictive Analytics

Module de détection de gaps de compétences, de recommandation de formation et de
prédiction (ML) pour le référentiel D2F (Formation & Développement des enseignants).

## Principe scientifique

- **Déterministe d'abord** : les gaps sont calculés par règles pures
  `gap = max(required - current, 0)` — jamais prédits par ML.
- **ML uniquement sur des cibles futures non calculables** : `completion_probability`,
  `training_effectiveness_score`, `stagnation_risk_future`, `future_need_probability`.
- **Anti-fuite** : split temporel + garde `LeakageGuard` + `CuratedRepository` qui
  rétrograde les complétions futures au moment `as_of` (voir `docs/ADR-001-architecture.md`).
- **Identifiants canoniques uniquement** : `ENS\d{3,6}`. Les IDs legacy (`Txxx`,
  `Exxxxx` formation-service) sont rejetés par l'API (422 `LEGACY_ID_NOT_ALLOWED`).

## Arborescence

```
predictive-analytics/
├── backend/
│   ├── app/
│   │   ├── domain/          # enums, entités, value objects (pydantic)
│   │   ├── engines/         # gap, recommendation, learning_path, risk, data_quality, dashboard
│   │   ├── ml/              # contracts, cleaning, features, datasets, training, inference
│   │   ├── infrastructure/  # repository curated + cache mémoire
│   │   ├── application/     # use cases (orchestration + cache contrôlé)
│   │   ├── api/             # routers FastAPI + RBAC + validation IDs
│   │   └── core/            # config, exceptions, logging
│   └── tests/               # unit (42), contract (14), ml (17), integration (16)
├── frontend/                # React + TS + Vite + TanStack Query + Ant Design
├── scripts/                 # generate_sample_data.py, clean_data.py, train_models.py, build_data_dictionary.py
├── data/                    # raw, staging, curated, contracts, models, features, reports
└── docs/ADR-001-architecture.md
```

## Démarrage rapide (backend)

Prérequis : Python 3.13+, `pip install -r backend/requirements.txt`.

```powershell
# 1. Générer un jeu de données de démonstration (30 enseignants ENS001..ENS030)
$env:PYTHONPATH="backend"
python scripts/generate_sample_data.py

# 2. Nettoyer / valider / curer (produit data/curated + rapports data/reports)
python scripts/clean_data.py

# 3. (Optionnel) entraîner et exporter les modèles ML
python scripts/train_models.py

# 4. Démarrer l'API
python -m uvicorn app.main:app --reload --port 8000
# Swagger: http://127.0.0.1:8000/api/v1/docs
```

### Endpoints principaux

| Méthode | Path | Rôles |
|---|---|---|
| GET | `/api/v1/teachers/{id}/gaps` | TEACHER, DEPARTMENT_HEAD, UP_HEAD, ADMIN |
| GET | `/api/v1/teachers/{id}/recommendations?limit=10` | idem |
| GET | `/api/v1/teachers/{id}/learning-path` | idem |
| GET | `/api/v1/teachers/{id}/risk` | idem |
| GET | `/api/v1/teachers/{id}/data-quality` | idem |
| GET | `/api/v1/dashboard/global` | ADMIN, DEPARTMENT_HEAD, UP_HEAD |
| GET | `/api/v1/dashboard/teachers-at-risk` | idem |
| GET | `/api/v1/dashboard/gap-heatmap` | idem |
| GET | `/api/v1/dashboard/training-demand` | idem |
| POST | `/api/v1/ml/score/completion` | ADMIN, DEPARTMENT_HEAD, UP_HEAD |
| POST | `/api/v1/ml/score/effectiveness` | idem |
| POST | `/api/v1/ml/train/{completion\|effectiveness\|stagnation}` | idem |

RBAC : le rôle est transmis par le header `X-User-Role` (injecté par le gateway
d'auth en production). En mode debug, tout header `Authorization` non vide est
accepté et promu en `ADMIN`.

Format de réponse unifié : `{"data": ..., "meta": {...}, "errors": [{"code","message","details"}]}`.
Codes d'erreur notables : `LEGACY_ID_NOT_ALLOWED` (422), `TEACHER_NOT_FOUND` (404),
`INSUFFICIENT_HISTORICAL_DATA` (409), `MODEL_UNAVAILABLE` (503).

### Tests

```powershell
cd backend
python -m pytest        # 89 tests (unit, contract, ml, integration)
```

## Frontend

Prérequis : Node 22+.

```powershell
cd frontend
npm install
npm run dev             # http://127.0.0.1:5173 (proxy /api -> http://localhost:8000)
npm run typecheck       # tsc --noEmit
npm run test            # vitest
npm run build           # production build -> dist/
```

Pages : **Pilotage** (KPIs, at-risk, heatmap gaps, demande de formation),
**Enseignant** (gaps + risque + qualité), **Gaps**, **Recommandations**
(explications et décomposition du score), **Parcours** (ordre topologique),
**Prédictions ML** (scoring avec contributions des features).

Le sélecteur de rôle dans l'en-tête simule le RBAC du gateway d'auth.

## Docker

```powershell
docker build -f backend/Dockerfile -t d2f-predictive-analytics .
docker run -p 8000:8000 d2f-predictive-analytics
```

Le conteneur embarque les données de démonstration (le build copie `data/`).
Pour ré-entraîner dans le conteneur : `docker exec <id> python scripts/train_models.py`.
