# Comparaison des modèles GAP (dataset synthétique démo)

> Données 100 % synthétiques — démonstration technique uniquement,
> PAS une validation institutionnelle.

| Modèle | RMSE | MAE | R² | Tolérance ±0,10 | Tolérance ±0,20 | Gain vs baseline (%) | Temps inférence (ms) | Décision |
|---|---:|---:|---:|---:|---:|---:|---:|---|
| baseline_persistence | 1.1203 | 0.6808 | -0.4882 | 0.3901 | 0.456 | 0.0 | 0.0 | baseline |
| baseline_mean | 0.9531 | 0.7838 | -0.0772 | 0.0769 | 0.1758 | 14.9246 | 0.0 | baseline |
| gradient_boosting | 0.749 | 0.4642 | 0.3348 | 0.2967 | 0.4066 | 33.1474 | 1.7 | retenu_demo |
| xgboost | 0.7632 | 0.47 | 0.3092 | 0.3132 | 0.4176 | 31.8754 | 9.0425 | retenu_demo |
| mlp | 0.7402 | 0.4316 | 0.3495 | 0.3626 | 0.4725 | 33.9329 | 1.69 | retenu_demo |

## Bootstrap IC95 (meilleur modèle, seed 42)
- **mlp** — 1000 réplications :
  - IC95 RMSE : [0.5846, 0.9618]
  - IC95 MAE : [0.3708, 0.5533]
  - IC95 gain vs baseline : [18.7605, 43.4197] %

## Multi-seed (42, 43, 44, 45) — RMSE moyen
- **baseline_persistence** : 1.1203 ± 0.0 (min 1.1203 / max 1.1203)
- **baseline_mean** : 0.9531 ± 0.0 (min 0.9531 / max 0.9531)
- **gradient_boosting** : 0.749 ± 0.0062 (min 0.7422 / max 0.756)
- **xgboost** : 0.7632 ± 0.0043 (min 0.7569 / max 0.7663)
- **mlp** : 0.7402 ± 0.0306 (min 0.7033 / max 0.7706)

> Un modèle n'est retenu que si l'amélioration vs persistance est positive sur plusieurs seeds (jamais une seule seed).
