# Validation des modèles — D2F Predictive Analytics

Généré le : 2026-08-22T03:27:19.471252

## Tableau principal

| Model | Task | Dataset | Rows | Features | RMSE | MAE | R² | F1 macro | Precision@K | Baseline | Improvement | Status |
|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---|
| baseline_persistence | regression_gap | v1.1.0 | 172 | 29 | 2.4170790723164326 | 2.0921568627450977 | -3.903040251673791 | N/A | N/A | N/A | N/A | KEEP_AS_BASELINE |
| gradient_boosting | regression_gap | v1.1.0 | 172 | 29 | 1.0696260222483547 | 0.8221447070327975 | 0.03983103936383037 | N/A | N/A | N/A | 55.75 | ACTIVE |
| xgboost | regression_gap | v1.1.0 | 172 | 29 | 1.0936831747264815 | 0.8137966435329587 | -0.003845332985124461 | N/A | N/A | N/A | 54.75 | KEEP_AS_CHALLENGER |
| mlp | regression_gap | v1.1.0 | 172 | 29 | 1.110131213863728 | 0.8332836562647046 | -0.03426629103745582 | N/A | N/A | N/A | 54.07 | KEEP_AS_CHALLENGER |
| legacy_gap_predictor | regression_gap | v1.1.0 | 172 | N/A | N/A | N/A | N/A | N/A | N/A | N/A | N/A | NOT_AVAILABLE |
| risk_heuristic_six_factors | risk_scoring | v1.1.0 | N/A | N/A | N/A | N/A | N/A | N/A | N/A | N/A | N/A | KEEP_AS_BASELINE |
| risk_random_forest | risk_scoring | v1.1.0 | N/A | N/A | N/A | N/A | N/A | N/A | N/A | N/A | N/A | NOT_AVAILABLE |
| ranking_heuristic_ranking | recommendation_ranking | v1.1.0 | N/A | N/A | N/A | N/A | N/A | N/A | N/A | N/A | N/A | KEEP_AS_BASELINE |
| ranking_relevance_model | recommendation_ranking | v1.1.0 | N/A | N/A | N/A | N/A | N/A | N/A | N/A | N/A | N/A | NOT_AVAILABLE |

## Tableau GAP

| Modèle | RMSE | MAE | R² | IC95 amélioration | Temps inférence | Décision |
|---|---:|---:|---:|---:|---:|---|
| baseline_persistence | 2.4170790723164326 | 2.0921568627450977 | -3.903040251673791 | N/A | 0.0 ms | KEEP_AS_BASELINE |
| gradient_boosting | 1.0696260222483547 | 0.8221447070327975 | 0.03983103936383037 | [37.33, 70.55] | 0.311 ms | ACTIVE |
| xgboost | 1.0936831747264815 | 0.8137966435329587 | -0.003845332985124461 | [36.76, 70.06] | 1.4467 ms | KEEP_AS_CHALLENGER |
| mlp | 1.110131213863728 | 0.8332836562647046 | -0.03426629103745582 | [34.24, 69.83] | 0.1586 ms | KEEP_AS_CHALLENGER |
| legacy_gap_predictor | N/A | N/A | N/A | N/A | N/A ms | NOT_AVAILABLE |

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

## Incohérences avec le rapport PFE
- **gradient_boosting** test_rmse : 1.0018 → 1.0696260222483547 (Les deux séries de métriques correspondent à des expériences différentes et ne doivent pas être présentées comme une comparaison directe (dataset, split ou version de features différents).)
- **gradient_boosting** test_r2 : 0.3145 → 0.03983103936383037 (Les deux séries de métriques correspondent à des expériences différentes et ne doivent pas être présentées comme une comparaison directe (dataset, split ou version de features différents).)