# Validation ML finale (reproductible)

- Généré le : `2026-08-20T02:51:38.754607`
- Commit audité : `6cc11176c77f4eaaf8ff1da16e967182aa02ab8b` (`ci: exclude one-off _fix_* repair scripts from print() guard`)
- Seed : `42` — Bootstrap : `1000` réplications (percentile 2.5-97.5)

## Protocole officiel 80/20 (par version, tel que déployé)

### v1.0.0 — split `temporal_strict_cutoff_2026-07-22`

- CV-RMSE candidats : {'gradient_boosting': 0.8022, 'mlp': 1.327, 'xgboost': 0.8217}
- Meilleur candidat : `gradient_boosting`
- Baseline persistance : RMSE=2.5461 MAE=2.1175
- **gradient_boosting** : RMSE=0.9883 (IC95 [0.4829, 1.4286]) MAE=0.6388 R²=0.1897 gain vs persistance=61.18% (IC95 [33.46, 83.14], significatif=True)
- **mlp** : RMSE=1.3202 (IC95 [1.0324, 1.6155]) MAE=1.1835 R²=-0.4459 gain vs persistance=48.15% (IC95 [40.54, 54.94], significatif=True)
- **xgboost** : RMSE=1.0377 (IC95 [0.4677, 1.4954]) MAE=0.6309 R²=0.1067 gain vs persistance=59.25% (IC95 [29.42, 83.32], significatif=True)

### v1.1.0 — split `temporal_strict_cutoff_2026-07-22`

- CV-RMSE candidats : {'gradient_boosting': 0.8785, 'mlp': 1.073, 'xgboost': 0.877}
- Meilleur candidat : `xgboost`
- Baseline persistance : RMSE=2.4171 MAE=2.0922
- **gradient_boosting** : RMSE=1.0428 (IC95 [0.7455, 1.3544]) MAE=0.7923 R²=0.0875 gain vs persistance=56.86% (IC95 [38.88, 71.05], significatif=True)
- **mlp** : RMSE=1.0851 (IC95 [0.8189, 1.388]) MAE=0.8588 R²=0.0118 gain vs persistance=55.11% (IC95 [37.59, 68.32], significatif=True)
- **xgboost** : RMSE=1.0625 (IC95 [0.7363, 1.3799]) MAE=0.7595 R²=0.0527 gain vs persistance=56.04% (IC95 [38.86, 71.05], significatif=True)

## Comparaison commune obligatoire (corpus union = v1.1.0, 172 lignes)

- Split : `temporal_3way_train_2026-07-22_val_2026-07-22` — train=104 val=34 test=34
- Test : ('2026-07-22', '2026-07-22')

| Modèle | RMSE | MAE | R² | gain vs persistance | IC95 RMSE |
|---|---|---|---|---|---|
| v1.0.0 | 1.2161 | 0.8952 | -0.2411 | 49.69% (IC95 [29.64, 65.74], sig=True) | [0.9097, 1.5363] |
| v1.1.0 | 1.0625 | 0.7595 | 0.0527 | 56.04% (IC95 [38.86, 71.05], sig=True) | [0.7363, 1.3799] |
| gradient_boosting | 1.0696 | 0.8221 | 0.0398 | 55.75% (IC95 [37.33, 70.55], sig=True) | [0.7454, 1.3948] |
| mlp | 1.1101 | 0.8333 | -0.0343 | 54.07% (IC95 [34.24, 69.83], sig=True) | [0.7844, 1.454] |
| xgboost | 1.0937 | 0.8138 | -0.0038 | 54.75% (IC95 [36.76, 70.06], sig=True) | [0.7603, 1.433] |

### Recouvrement test commun / train de chaque modèle
- v1.0.0 : 5 ligne(s) — évaluation commune possible mais partiellement leaky pour ce modèle
- v1.1.0 : 0 ligne(s) — aucun recouvrement

