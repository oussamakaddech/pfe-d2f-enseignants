# D2F Predictive Analytics & Recommendations Microservice

Microservice Python (FastAPI) pour l'analyse prédictive et les recommandations du module 8 de la plateforme D2F.

## Fonctionnalités

1. **Prédiction des gaps de compétences** — `POST /api/predict/gaps/{teacherId}`
2. **Recommandation de parcours de formation** — `POST /api/recommend/path`
3. **Détection des enseignants à risque** — `GET /api/detect/at-risk-teachers`
4. **Tableaux de bord prédictifs** — `GET /api/dashboard/*`

## Stack Technique

- **FastAPI** + Uvicorn — API REST asynchrone
- **SQLAlchemy** + psycopg2 — Accès PostgreSQL (lecture seule)
- **scikit-learn** — Modèles ML (Gradient Boosting)
- **joblib** — Persistance des modèles
- **pytest** — Tests unitaires et d'intégration

## Architecture

```
app/
├── main.py              # Point d'entrée FastAPI
├── config.py            # Configuration (pydantic-settings)
├── core/                # DB, logging, exceptions
├── routers/             # Endpoints API
├── services/            # Logique métier + accès données
├── ml/                  # Modèles ML + feature engineering
└── models/              # Schémas Pydantic
tests/                   # Tests pytest
```

## Démarrage Rapide

### Local (sans Docker)

```bash
# 1. Créer un environnement virtuel
python -m venv venv
source venv/bin/activate  # Windows: venv\Scripts\activate

# 2. Installer les dépendances
pip install -r requirements.txt

# 3. Configurer les variables d'environnement
cp .env.example .env
# Éditer .env avec vos paramètres DB

# 4. Lancer le serveur
uvicorn app.main:app --reload --port 8090
```

### Avec Docker

```bash
# Depuis la racine du projet D2F
docker compose up -d predictive-analytics-service

# Vérifier le healthcheck
curl http://localhost:8090/api/health
```

## Endpoints API

| Méthode | Endpoint | Description |
|---|---|---|
| GET | `/api/health` | Health check |
| POST | `/api/predict/gaps/{teacherId}` | Prédire les gaps |
| POST | `/api/predict/train` | Entraîner le modèle |
| POST | `/api/recommend/path` | Recommander un parcours |
| GET | `/api/detect/at-risk-teachers` | Enseignants à risque |
| GET | `/api/dashboard/summary` | Dashboard complet |

## Entraînement du Modèle

```bash
curl -X POST http://localhost:8090/api/predict/train
```

Le modèle est automatiquement persisté dans `data/models/` (volume Docker `d2f_models_data`).

## Tests

```bash
pytest tests/ -v
```

## Intégration Gateway Spring Boot

Le service est accessible via l'API Gateway à l'adresse :
```
http://localhost:8222/api/predict/...   # (à configurer dans le gateway)
```

## Modèle ML — Spécifications

| Caractéristique | Valeur |
|---|---|
| **Type de problème** | Régression (gap 0-5) |
| **Algorithme** | GradientBoostingRegressor |
| **Features** | 17 features (niveaux, formations, engagement...) |
| **Métriques** | RMSE, R² |
| **Validation** | 5-fold cross-validation |
| **Explicabilité** | Feature importances |

## Variables d'Environnement

Voir `.env.example` pour la liste complète.

---
© 2024 D2F Platform — ESPRIT University
