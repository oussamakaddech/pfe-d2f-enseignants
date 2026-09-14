# Choix final du modèle — protocole commun, métriques GAP, décision

## protocole_commun
```json
{
  "split": "temporel 3-way (train/val/test), sans shuffle",
  "seed": 42,
  "n_bootstrap": 1000,
  "multi_seed": [
    10,
    20,
    42,
    99,
    2026
  ],
  "target": "gap_next_3m",
  "features": 29,
  "source": {
    "train_months": [
      "2025-01",
      "2025-02",
      "2025-03",
      "2025-04",
      "2025-05",
      "2025-06",
      "2025-07",
      "2025-08",
      "2025-09",
      "2025-10",
      "2025-11",
      "2025-12"
    ],
    "validation_months": [
      "2026-01",
      "2026-02",
      "2026-03"
    ],
    "test_months": [
      "2026-04",
      "2026-05",
      "2026-06"
    ],
    "train_rows": 664,
    "validation_rows": 154,
    "test_rows": 182
  }
}
```

## decision
- **best_demo_model** : mlp
- **mlp_eligible_as_best** : True
- **justification** : MLP est retenu car il obtient les meilleures métriques (RMSE 0.7402, MAE 0.4316, R2 0.3495, gain 33.9% vs baseline_persistence) avec une stabilité multi-seed (std RMSE 0.0306) et un bootstrap IC95 du gain strictement positif [18.8%, 43.4%].
- **bootstrap_confirm** : True
- **mlp_stable** : True

## separation_production_demo
```json
{
  "modele_production": {
    "mode": "PRODUCTION_ML",
    "version": "v1.0.0",
    "statut": "ACTIVE / APPROVED",
    "validation": "100% données institutionnelles, 0% synthétique, registre approuvé"
  },
  "modele_demo": {
    "mode": "DEMO_ML",
    "version": "demo-gap-synthetic-v1.0.0",
    "data_origin": "SYNTHETIC",
    "institutional_verified": false,
    "promotion_refused": true,
    "jamais_présenté_comme_performance_ESPRIT": true
  }
}
```

## Métriques GAP (comparaison)
| Modèle | RMSE | MAE | R² | Gain vs baseline (%) | Décision |
|---|---|---|---|---|---|
| baseline_persistence | 1.1203 | 0.6808 | -0.4882 | 0.0 | baseline |
| baseline_mean | 0.9531 | 0.7838 | -0.0772 | 14.9246 | baseline |
| gradient_boosting | 0.749 | 0.4642 | 0.3348 | 33.1474 | retenu_demo |
| xgboost | 0.7632 | 0.47 | 0.3092 | 31.8754 | retenu_demo |
| mlp | 0.7402 | 0.4316 | 0.3495 | 33.9329 | retenu_demo |
