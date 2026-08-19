# Validation des modèles — D2F Predictive Analytics

Généré le : 2026-08-19T06:39:57.633729

## Tableau principal

| Model | Task | Dataset | Rows | Features | RMSE | MAE | R² | F1 macro | Precision@K | Baseline | Improvement | Status |
|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---|
| baseline_persistence | regression_gap | v1.0.0 | 107 | 29 | 2.546119570586752 | 2.1174603174603175 | -4.378330894648829 | N/A | N/A | N/A | N/A | KEEP_AS_BASELINE |
| gradient_boosting | regression_gap | v1.0.0 | 107 | 29 | 0.9882948532111454 | 0.6387745023620676 | 0.18966798927442208 | N/A | N/A | N/A | 61.18 | ACTIVE |
| xgboost | regression_gap | v1.0.0 | 107 | 29 | 1.0376624133264478 | 0.6309148621937585 | 0.10669019767622767 | N/A | N/A | N/A | 59.25 | KEEP_AS_CHALLENGER |
| mlp | regression_gap | v1.0.0 | 107 | 29 | 1.20523103634786 | 1.1337039942891198 | -0.20512068698250152 | N/A | N/A | N/A | 52.66 | KEEP_AS_CHALLENGER |
| legacy_gap_predictor | regression_gap | v1.0.0 | 107 | N/A | N/A | N/A | N/A | N/A | N/A | N/A | N/A | NOT_AVAILABLE |
| risk_heuristic_six_factors | risk_scoring | v1.0.0 | N/A | N/A | N/A | N/A | N/A | N/A | N/A | N/A | N/A | KEEP_AS_BASELINE |
| risk_random_forest | risk_scoring | v1.0.0 | N/A | N/A | N/A | N/A | N/A | N/A | N/A | N/A | N/A | NOT_AVAILABLE |
| ranking_heuristic_ranking | recommendation_ranking | v1.0.0 | N/A | N/A | N/A | N/A | N/A | N/A | N/A | N/A | N/A | KEEP_AS_BASELINE |
| ranking_relevance_model | recommendation_ranking | v1.0.0 | N/A | N/A | N/A | N/A | N/A | N/A | N/A | N/A | N/A | NOT_AVAILABLE |

## Tableau GAP

| Modèle | RMSE | MAE | R² | CV-RMSE | Amélioration vs baseline | Temps inférence | Décision |
|---|---:|---:|---:|---:|---:|---:|---|
| baseline_persistence | 2.546119570586752 | 2.1174603174603175 | -4.378330894648829 | N/A | N/A% | 0.0 ms | KEEP_AS_BASELINE |
| gradient_boosting | 0.9882948532111454 | 0.6387745023620676 | 0.18966798927442208 | N/A | 61.18% | 0.285 ms | ACTIVE |
| xgboost | 1.0376624133264478 | 0.6309148621937585 | 0.10669019767622767 | N/A | 59.25% | 1.0124 ms | KEEP_AS_CHALLENGER |
| mlp | 1.20523103634786 | 1.1337039942891198 | -0.20512068698250152 | N/A | 52.66% | 0.1459 ms | KEEP_AS_CHALLENGER |
| legacy_gap_predictor | N/A | N/A | N/A | N/A | N/A% | N/A ms | NOT_AVAILABLE |

## Tableau RISQUE

| Modèle | Balanced accuracy | Precision macro | Recall macro | F1 macro | AUC | Décision |
|---|---:|---:|---:|---:|---:|---|
| risk_heuristic_six_factors | N/A | N/A | N/A | N/A | N/A | KEEP_AS_BASELINE |
| risk_random_forest | N/A | N/A | N/A | N/A | N/A | NOT_AVAILABLE |

## Tableau RANKING

| Méthode | Precision@3 | Recall@3 | NDCG@3 | Taux acceptation | Statut |
|---|---:|---:|---:|---:|---|
| heuristic_ranking | N/A | N/A | N/A | N/A | KEEP_AS_BASELINE |
| relevance_model | N/A | N/A | N/A | N/A | NOT_AVAILABLE |

## Validation statistique
- Méthode : bootstrap_1000_ic95
- IC95 du lift : [0.6885, 2.3891]
- Lift significatif à 95% : True
- Note : Évaluation indicative : volume insuffisant pour conclure à une généralisation institutionnelle (107 lignes, 21 en test).

## Incohérences avec le rapport PFE
- **gradient_boosting** test_rmse : 1.0018 → 0.9882948532111454 (Les deux séries de métriques correspondent à des expériences différentes et ne doivent pas être présentées comme une comparaison directe (dataset, split ou version de features différents).)
- **gradient_boosting** test_r2 : 0.3145 → 0.18966798927442208 (Les deux séries de métriques correspondent à des expériences différentes et ne doivent pas être présentées comme une comparaison directe (dataset, split ou version de features différents).)