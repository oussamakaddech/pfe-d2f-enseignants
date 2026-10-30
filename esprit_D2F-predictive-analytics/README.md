# D2F Predictive Analytics Microservice

Microservice Python (FastAPI) pour l'analyse prédictive des compétences, des écarts de couverture et des risques de formation des enseignants (ESPRIT).

> **Ce que mesure l'écart.** Le niveau N1–N5 est un attribut **descriptif du savoir** (sa difficulté), pas une maîtrise de l'enseignant ([politique](docs/KNOWLEDGE_DIFFICULTY_LEVEL_POLICY.md)). L'écart prédit est donc un **écart de couverture** : niveau de difficulté exigé par le périmètre moins niveau de difficulté des savoirs couverts. La maîtrise réelle se mesurera par des résultats observés (tests avant/après formation). La réponse de `/model-health` porte cette définition dans `target_meaning`.

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
| GET | `/api/v1/analytics/teachers/{teacher_id}/gaps` | Écarts de couverture + `model_mode`, `model_version`, `fallback_reason`, `dataset_version` |
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

État vérifié en direct le 2026-10-01 (`GET /api/v1/analytics/health`, conteneur
`d2f-predictive-analytics`) : mode **`PRODUCTION_ML`**, modèle **`v1.3.0-xgb`**
(XGBoost, entrée ACTIVE du registre, sous override déclaré
`decision-projet:2026-09-27`).

- Artefact `gap_predictor_temporal.joblib` intègre (SHA-256 `8068bfb0…` = registre) ;
- Corpus : 200 lignes réelles (38 enseignants, seeds de démo exclus), 0 % synthétique ;
- Features : 29 (schéma 1.0) ; split temporel 160 / 40 ;
- Holdout : RMSE 0,3811 · MAE 0,2835 · R² 0,7867 ;
- **Limite assumée** : la règle d'extrapolation à un paramètre fait 0,3418 ;
  écart −0,0393, IC95 [−0,1395 ; +0,0524], non significatif → `decision: reject`
  conservée en metadata. La cible est extrapolée (`EXTRAPOLATED_TARGET`) tant
  qu'aucune re-mesure réelle à M+3 n'existe.
- Moteur de risque : formule pondérée 0,50/0,12/0,40, **validée en simulation**
  (`risk_training_metadata.json` → `formula_validation` : macro-F1 0,7222 à M+3 sur
  400 enseignants simulés, seuil 0,70). Le meilleur modèle ML testé (0,6629) fait
  significativement moins bien : il n'est pas servi (`risk-simulation-v1.1.0`, REJECTED).

```json
{
  "status": "ok",
  "model": "PRODUCTION_ML",
  "model_version": "v1.3.0-xgb",
  "target_validity": "EXTRAPOLATED_TARGET",
  "data_origin": "DEMO_SEED",
  "validation_scope": "DEMO_VALIDATED",
  "risk_mode": "HEURISTIC"
}
```

## Anti-fuite

`required_level` et `gap_next_3m` ne sont **jamais** dans les features. Le split est temporel strict.

---
© 2024 D2F Platform — ESPRIT University