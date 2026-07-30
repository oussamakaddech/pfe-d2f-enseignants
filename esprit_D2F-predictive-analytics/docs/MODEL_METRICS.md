# Model Metrics — D2F Predictive Analytics

Ce document décrit l'état du modèle ML `gap_predictor` et son pipeline d'entraînement. Il est mis à jour à chaque ré-entraînement réussi.

## Vue d'ensemble

| Champ | Valeur |
|-------|--------|
| Nom du modèle | `gap_predictor` (sélection automatique parmi 4 candidats) |
| Type | Régression (gap = required_level - current_level, borné [0, 5]) |
| Candidates | GradientBoosting · XGBoost · LightGBM · MLP (sklearn) |
| Selection | StratifiedKFold (cv_folds=5) sur RMSE |
| Validation | Hold-out 80/20, random_state=42, balanced sample weights |
| Persistance | joblib + SHA-256/HMAC sidecar (anti-tampering) |
| Rollback | Oui, si accuracy_after < accuracy_before - max_drop |
| Warm start | Oui (GB, XGBoost, LightGBM) |
| Fallback | Heuristique déterministe (gap = required - current) |

## Formule déterministe de risque (source de vérité dashboard)

Le score de risque affiché sur le dashboard D2F n'est PAS issu du ML. Il utilise la formule officielle :

```
risk = 0.40 * critical_gap_factor + 0.25 * coverage_factor + 0.20 * stagnation_factor + 0.15 * regression_factor
```

avec seuils `CRITIQUE ≥ 0.75`, `ELEVE ≥ 0.50`, `MODERE ≥ 0.25`, `FAIBLE < 0.25`.

Le ML sert uniquement à enrichir les prédictions de gap avec une confiance calibrée (features top-importance, RMSE vs baseline). **Si le ML est désactivé (skew, modèle absent), le dashboard reste fonctionnel grâce à la formule déterministe.**

## Métriques courantes

| Métrique | Source | Description |
|----------|--------|-------------|
| `test_r2` | Hold-out 20% | R² du modèle sur le test set |
| `test_rmse` | Hold-out 20% | RMSE du modèle (échelle 0–5) |
| `cv_rmse` | StratifiedKFold 5 folds | RMSE cross-validé (entraînement) |
| `baseline_rmse` | Heuristique déterministe | RMSE du baseline (gap = required - current) |
| `baseline_mae` | Heuristique déterministe | MAE du baseline |
| `lift_rmse` | Comparaison | baseline_rmse - ml_rmse (positif = ML > baseline) |
| `lift_mae` | Comparaison | baseline_mae - ml_mae |
| `n_samples` | Pipeline | Nombre de lignes après merge teacher↔gap |

## Interprétation du R²

⚠️ **Le `test_r2` est souvent très proche de 1.0 sur ce dataset.** C'est attendu car `current_level` et `required_level` sont dans les features et déterminent `gap = required - current` par construction. Le ML apprend donc une approximation de la formule déterministe, pas une nouvelle source de signal.

Conséquence : pour la soutenance, il est important de :
1. **Ne pas vendre le ML comme révolutionnaire** — il complète le pipeline déterministe.
2. **Documenter que le dashboard reste sur la formule déterministe**, même si le ML est plus précis.
3. **Pointer le warning** `R2>=0.99 with n_samples<200` retourné par `model_health()`.

## Endpoint /model-health

`GET /api/v1/predict/model-health` retourne :

```json
{
  "model_loaded": true,
  "model_name": "xgboost",
  "trained_at": "2026-07-21T06:46:26.089209",
  "n_features_model": 19,
  "n_features_code": 23,
  "feature_skew_ok": false,
  "feature_skew_reason": "n_features mismatch: model trained on 19, code declares 23. Re-train via POST /api/v1/predict/train.",
  "fallback_mode": true,
  "fallback_reason": "feature_skew",
  "metrics": {
    "test_r2": 1.0,
    "test_rmse": 0.008,
    "cv_rmse": 0.008,
    "n_samples": 80,
    "baseline_rmse": 0.008,
    "lift_rmse": 0.0
  },
  "candidate_cv_scores": {
    "gradient_boosting": 0.0261,
    "xgboost": 0.008,
    "mlp": 0.2027
  },
  "warnings": [
    "R2=1.000 with n_samples=80 is suspicious: small dataset + near-perfect R2 usually indicates target leakage..."
  ],
  "feature_cols": [...],
  "outlier_report": {...}
}
```

## Procédure de validation

Pour vérifier l'état ML après chaque modification :

```bash
# Valider toutes les métriques (lecture seule, ne touche pas le modèle)
python -m pipelines.validate_model_metrics

# Sortie JSON pour intégration CI
python -m pipelines.validate_model_metrics --json

# Ré-entraîner depuis zéro (avec rollback si régression)
curl -X POST http://localhost:8000/api/v1/predict/train -H "Authorization: Bearer $TOKEN"
```

## Validation post-ré-entraînement

Le script `validate_model_metrics.py` exécute 6 vérifications :

| Check | Sévérité | Description |
|-------|----------|-------------|
| `feature_skew` | error | n_features_model == n_features_code |
| `test_r2_range` | warning | test_r2 ≤ 1.0 |
| `test_rmse_positive` | warning | test_rmse ≥ 0 |
| `leakage_warning` | warning | R2 ≥ 0.99 + n_samples < 200 = suspect |
| `outliers` | warning | Aucune valeur hors bornes métier |
| `baseline_lift` | warning | ML RMSE ≤ 1.2 × baseline RMSE |
| `fallback_mode` | info | predict() mode nominal ou fallback |

Le verdict final est `PASS` si aucune vérification `error` n'a échoué. Les `warning` n'échouent pas le verdict final mais doivent être documentées.

## Historique des runs

À remplir après chaque ré-entraînement réussi.

| Date | Modèle | n_samples | test_r2 | test_rmse | baseline_rmse | lift_rmse | Warnings |
|------|--------|-----------|---------|-----------|---------------|-----------|----------|
| 2026-07-21 | xgboost | 80 | 1.0 | 0.008 | 0.008 | 0.0 | R2=1.0 suspect (n<200) |

## Recommandations

1. **Re-train** : si le modèle persisté a un `n_features_model` ≠ `FEATURE_COLS`, lancer `POST /api/v1/predict/train` pour ré-aligner.
2. **Au-delà de 200 samples** : le warning R2=0.99 se désactive automatiquement, et les métriques deviennent représentatives.
3. **Pour augmenter la valeur ML** : retirer `current_level` et `required_level` des features (prédire l'évolution future plutôt que la gap courante). Mais cela réduit le rôle du ML à de la prédiction temporelle, pas une amélioration directe du dashboard.
