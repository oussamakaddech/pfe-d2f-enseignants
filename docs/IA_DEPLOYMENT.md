# Déploiement des modules IA — Plateforme D2F

## Architecture IA

Trois services IA fonctionnent en local, sans dépendance cloud :

| Service | Technologie | Modèle | Port | Accès |
|---------|-------------|--------|------|-------|
| RICE | Python 3.13 + FastAPI | sentence-transformers (optionnel) | 8001 | Via Gateway `/api/rice/` |
| Recommandation formateur | Python 3.13 + FastAPI | angle-emb + FAISS | 8000 | Via Gateway `/api/ai/` |
| Analyse prédictive | Python 3.11 + FastAPI | scikit-learn + XGBoost | 8080 | Via Gateway `/api/analyse/` |

## Déploiement offline

### Prérequis
- Docker & Docker Compose v2+
- Aucun accès Internet requis après le premier `docker pull` des images de base

### Procédure
```bash
# 1. Construire les images (une seule fois, avec Internet)
docker compose build ai-reco-service rice-service predictive-analytics-service

# 2. Sauvegarder les images pour déploiement offline
docker save d2f-ai-reco:latest -o d2f-ai-reco.tar
docker save d2f-rice:latest -o d2f-rice.tar
docker save d2f-predictive-analytics:latest -o d2f-predictive-analytics.tar

# 3. Déploiement offline
docker load -i d2f-ai-reco.tar
docker load -i d2f-rice.tar
docker load -i d2f-predictive-analytics.tar
docker compose up -d ai-reco-service rice-service predictive-analytics-service
```

### Mise à jour offline
```bash
# 1. Transférer les nouvelles images tar vers le serveur cible
# 2. Loader les images
docker load -i d2f-ai-reco-v2.tar
# 3. Redémarrer
docker compose up -d ai-reco-service
```

### Rollback
```bash
# Revenir à la version précédente
docker compose stop ai-reco-service
# Charger l'image précédente
docker load -i d2f-ai-reco-previous.tar
docker compose up -d ai-reco-service
```

## Métriques disponibles

### Techniques (Prometheus)
- `ai_requests_total` : Requêtes reçues
- `ai_request_duration_seconds` : Latence par requête
- `ai_errors_total` : Erreurs
- `ai_cpu_usage_percent` : Charge CPU (via Docker stats)

### Fonctionnelles
- `ai_recommendation_precision` : Précision des recommandations
- `ai_prediction_accuracy` : Exactitude des prédictions
- `ai_success_rate` : Taux de succès des analyses
