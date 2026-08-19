# D2F Predictive Analytics Microservice

Microservice Python (FastAPI) pour l'analyse prédictive des compétences, des gaps et des risques de formation des enseignants (ESPRIT).

## Modes d'exécution ML

Le service expose trois modes **strictement exclusifs** dans la réponse `model_mode` :

| Mode | Signification | Conditions |
|---|---|---|
| `PRODUCTION_ML` | Modèle actif en production | Intégrité SHA-256 valide, provenance calculée depuis les lignes du dataset, features compatibles, métriques minimales, registre approuvé |
| `DEMO_ML` | Modèle de démonstration | Artefact disponible mais corpus synthétique/insuffisant, métriques non satisfaites, ou registre non approuvé — jamais présenté comme production |
| `HEURISTIC_FALLBACK` | Moteur heuristique explicable | Échec d'intégrité, de provenance, de schéma ou de disponibilité — toujours disponible |

Le mode est **calculé dynamiquement à chaque appel** : les contrôles peuvent refuser l'activation même si `ML_SERVING_MODE=PRODUCTION_ML`.

### Formulation officielle

> Le modèle est actif en production après validation de l'intégrité de l'artefact, de la compatibilité des features, de la provenance des données et des métriques minimales.

> Le modèle reste indisponible en production car les conditions de provenance ou de validation ne sont pas satisfaites. Le service utilise automatiquement un moteur heuristique explicable.

## Pipeline de réentraînement

```bash
# 1. Préparer le dataset avec provenance par ligne
python -m pipelines.prepare_dataset --dataset-version v1.0.0

# 2. Entraîner et évaluer (baseline, GradientBoosting, XGBoost)
python -m pipelines.train_gap_model --dataset-version v1.0.0 --model-version v1.0.0

# 3. Valider les métriques (anti-fuite, lift vs baseline)
python -m pipelines.validate_model_metrics --json

# 4. Enregistrer comme CANDIDATE (PENDING)
python -m pipelines.register_model --model-version v1.0.0

# 5. Promouvoir en ACTIVE (approuvé)
python -m pipelines.register_model --model-version v1.0.0 --approve --actor "ml-engineer"

# 6. Rollback vers la dernière version approuvée
python -m pipelines.register_model --rollback
```

Le modèle n'est **jamais** régénéré silencieusement au démarrage du conteneur.

## Endpoints API

| Méthode | Endpoint | Description |
|---|---|---|
| GET | `/api/v1/analytics/teachers/{teacher_id}/gaps` | Gaps de compétences + `model_mode`, `model_version`, `fallback_reason`, `dataset_version` |
| GET | `/api/v1/analytics/teachers/{teacher_id}/risk` | Score de risque (règles métier prioritaires sur le ML) |
| GET | `/api/v1/analytics/dashboard` | Dashboard agrégé |
| GET | `/api/v1/analytics/dashboard/latest` | Dernier snapshot |
| GET | `/api/v1/analytics/dashboard/declining` | Compétences en déclin |
| GET | `/api/v1/analytics/alerts` | Alertes |

## Variables d'environnement ML

| Variable | Défaut | Description |
|---|---|---|
| `ML_SERVING_MODE` | `PRODUCTION_ML` | Mode **demandé** par l'opérateur — les contrôles peuvent refuser |
| `ML_REQUIRE_REAL_DATA` | `true` | Exige des données réelles pour PRODUCTION_ML |
| `ML_SYNTHETIC_TOLERANCE_PCT` | `50.0` | Seuil max de lignes synthétiques (calculé depuis les lignes) |
| `ML_MIN_REAL_ROWS` | `50` | Minimum de lignes réelles |
| `ML_MIN_R2` | `0.0` | R² minimum de promotion |
| `ML_MAX_RMSE` | `2.0` | RMSE maximum de promotion |
| `ML_MAX_MAE` | `1.5` | MAE maximum de promotion |
| `ML_ARTIFACT_PATH` | `gap_predictor_temporal.joblib` | Artefact joblib |
| `ML_METADATA_PATH` | `temporal_training_metadata.json` | Metadata d'entraînement |
| `ML_REGISTRY_PATH` | `model_registry.json` | Registre d'artefacts (promotion/rollback) |
| `ML_FEATURE_SCHEMA_PATH` | `feature_schema.json` | Schéma de features |


## Tests

```bash
# Tests ML (modes, provenance, registre, validation)
python -m pytest tests/unit/test_ml_modes.py -v

# Tests gouvernance ML (anti-fuite, ranking heuristique, règles de risque, RBAC)
python -m pytest tests/unit/test_ml_governance.py -v

# Tests inference (modèle réel actif)
python -m pytest tests/unit/test_ml_inference.py -v

# Tests intégration API gaps
python -m pytest tests/integration/test_api_gaps.py -v

# Suite complète
python -m pytest tests/ -v
```

## Réponse API réelle

Le mode final est **`PRODUCTION_ML`** car toutes les conditions sont satisfaites :
- Artefact `gap_predictor_temporal.joblib` intègre (SHA-256 vérifié) ;
- Provenance : 107 lignes réelles, 0% synthétique ;
- Registre : version `v1.0.0` ACTIVE et APPROVED ;
- Features compatibles (29 features, schéma 1.0) ;
- Métriques : RMSE=0.9883, MAE=0.6388, R²=0.1897 (seuils respectés).

```json
{
  "model_mode": "PRODUCTION_ML",
  "model_version": "v1.0.0",
  "prediction_horizon": "3m",
  "provenance": {
    "synthetic_share_pct": 0.0,
    "dataset_version": "v1.0.0"
  }
}
```

## Anti-fuite

`required_level` et `gap_next_3m` ne sont **jamais** dans les features. Le split est temporel strict.

---
© 2024 D2F Platform — ESPRIT University