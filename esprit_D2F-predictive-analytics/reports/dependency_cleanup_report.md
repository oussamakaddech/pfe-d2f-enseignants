# Dependency Cleanup Report

**Date** : 2026-07-30T22:45:44.799693

## Analyse

### Dependencies core (production)
- fastapi, uvicorn, pydantic, pydantic-settings
- sqlalchemy, psycopg2-binary
- APScheduler (scheduler)
- httpx (inter-service)
- pika (RabbitMQ, optional)
- PyJWT (auth)
- python-dateutil, networkx (utils)

### Dependencies ML experimentales (PEU UTILISEES en production)
- scikit-learn, pandas, numpy, joblib (feature engineering minimal)
- xgboost, lightgbm (charges, non utilises car GapPredictor deprecate)
- imbalanced-learn (SMOTE - non utilise)
- shap (explicabilite - proxy seulement)
- openpyxl, reportlab (exports - utilises)

### Recommandation
Creer requirements-prod.txt sans xgboost/lightgbm/shap/imbalanced-learn
Creer requirements-ml-experimental.txt pour experimentations
Dockerfile prod minimal sans ML lourdes
