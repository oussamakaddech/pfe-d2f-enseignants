# Détail de validation par modèle

Généré le : 2026-08-22T03:27:19.471252

## Métadonnées d'audit

- **generated_at** : 2026-08-22T03:27:19.471252
- **dataset_path** : C:\Users\oussama\Desktop\pfe-d2f-enseignants\esprit_D2F-predictive-analytics\data\clean\training_corpus_clean.csv
- **dataset_version** : v1.1.0
- **dataset_hash** : 896609dbdd57d98f0e32e971af6a7357be4064c17d74301856db8abf917e2b47
- **n_rows** : 172
- **n_teachers** : 40
- **n_competencies** : 13
- **feature_count** : 29
- **feature_schema_version** : 1.0
- **feature_schema_hash** : 71e029e254f9b3bced91f7faef0bd0ebb1f1c14f1a1c72c9820cc63e48445ef0
- **target** : gap_next_3m
- **forbidden_features** : ['gap_next_3m', 'required_level', 'required_level_t']
- **random_seed** : 42
- **synthetic_share_pct** : 0.0

## Modèles GAP
### baseline_persistence
- **task** : regression_gap
- **target** : gap_next_3m
- **dataset_version** : v1.1.0
- **dataset_hash** : 896609dbdd57d98f0e32e971af6a7357be4064c17d74301856db8abf917e2b47
- **n_rows** : 172
- **n_teachers** : 40
- **n_competencies** : 13
- **feature_count** : 29
- **feature_schema_version** : 1.0
- **feature_schema_hash** : 71e029e254f9b3bced91f7faef0bd0ebb1f1c14f1a1c72c9820cc63e48445ef0
- **train_period** : ('2016-03-01', '2026-07-22')
- **val_period** : ('2026-07-22', '2026-07-22')
- **test_period** : ('2026-07-22', '2026-07-22')
- **random_seed** : 42
- **split** : temporal_3way_train_2026-07-22_val_2026-07-22
- **metrics** : {'rmse': 2.4170790723164326, 'mae': 2.0921568627450977, 'r2': -3.903040251673791, 'median_abs_err': 2.0, 'max_abs_err': 4.0, 'n_predictions': 34}
- **n_train** : 104
- **n_val** : 34
- **n_test** : 34
- **train_teachers** : 30
- **val_teachers** : 12
- **test_teachers** : 12
- **train_time_s** : 0.0
- **inference_time_ms** : 0.0
- **artifact_path** : N/A (règle métier)
- **artifact_sha256** : N/A
- **serving_status** : KEEP_AS_BASELINE
### gradient_boosting
- **task** : regression_gap
- **target** : gap_next_3m
- **dataset_version** : v1.1.0
- **dataset_hash** : 896609dbdd57d98f0e32e971af6a7357be4064c17d74301856db8abf917e2b47
- **n_rows** : 172
- **n_teachers** : 40
- **n_competencies** : 13
- **feature_count** : 29
- **feature_schema_version** : 1.0
- **feature_schema_hash** : 71e029e254f9b3bced91f7faef0bd0ebb1f1c14f1a1c72c9820cc63e48445ef0
- **train_period** : ('2016-03-01', '2026-07-22')
- **val_period** : ('2026-07-22', '2026-07-22')
- **test_period** : ('2026-07-22', '2026-07-22')
- **random_seed** : 42
- **split** : temporal_3way_train_2026-07-22_val_2026-07-22
- **metrics** : {'rmse': 1.0696260222483547, 'mae': 0.8221447070327975, 'r2': 0.03983103936383037, 'median_abs_err': 0.6735384652068644, 'max_abs_err': 2.9596326129062414, 'n_predictions': 34, 'improvement_vs_persistence_pct': 55.75}
- **n_train** : 104
- **n_val** : 34
- **n_test** : 34
- **train_teachers** : 30
- **val_teachers** : 12
- **test_teachers** : 12
- **train_time_s** : 0.0657
- **inference_time_ms** : 0.311
- **artifact_path** : C:\Users\oussama\Desktop\pfe-d2f-enseignants\esprit_D2F-predictive-analytics\data\models\gap_predictor_temporal.joblib
- **artifact_sha256** : 6bbb396c1e28087deeeb402ecf856388510f54a08895dae5415132b08fb35bbe
- **serving_status** : ACTIVE
- **bootstrap_ci** : {'method': 'bootstrap_1000_ic95', 'seed': 42, 'rmse_ci95': [0.7454, 1.3948], 'mae_ci95': [0.6169, 1.0963], 'improvement_pct_ci95': [37.33, 70.55], 'improvement_significant_95': True, 'n_boot': 1000, 'n_test': 34}
### xgboost
- **task** : regression_gap
- **target** : gap_next_3m
- **dataset_version** : v1.1.0
- **dataset_hash** : 896609dbdd57d98f0e32e971af6a7357be4064c17d74301856db8abf917e2b47
- **n_rows** : 172
- **n_teachers** : 40
- **n_competencies** : 13
- **feature_count** : 29
- **feature_schema_version** : 1.0
- **feature_schema_hash** : 71e029e254f9b3bced91f7faef0bd0ebb1f1c14f1a1c72c9820cc63e48445ef0
- **train_period** : ('2016-03-01', '2026-07-22')
- **val_period** : ('2026-07-22', '2026-07-22')
- **test_period** : ('2026-07-22', '2026-07-22')
- **random_seed** : 42
- **split** : temporal_3way_train_2026-07-22_val_2026-07-22
- **metrics** : {'rmse': 1.0936831747264815, 'mae': 0.8137966435329587, 'r2': -0.003845332985124461, 'median_abs_err': 0.6468853950500488, 'max_abs_err': 2.9830074310302734, 'n_predictions': 34, 'improvement_vs_persistence_pct': 54.75}
- **n_train** : 104
- **n_val** : 34
- **n_test** : 34
- **train_teachers** : 30
- **val_teachers** : 12
- **test_teachers** : 12
- **train_time_s** : 0.0671
- **inference_time_ms** : 1.4467
- **artifact_path** : N/A (challenger, non enregistré)
- **artifact_sha256** : N/A
- **serving_status** : KEEP_AS_CHALLENGER
- **bootstrap_ci** : {'method': 'bootstrap_1000_ic95', 'seed': 42, 'rmse_ci95': [0.7603, 1.433], 'mae_ci95': [0.5845, 1.106], 'improvement_pct_ci95': [36.76, 70.06], 'improvement_significant_95': True, 'n_boot': 1000, 'n_test': 34}
### mlp
- **task** : regression_gap
- **target** : gap_next_3m
- **dataset_version** : v1.1.0
- **dataset_hash** : 896609dbdd57d98f0e32e971af6a7357be4064c17d74301856db8abf917e2b47
- **n_rows** : 172
- **n_teachers** : 40
- **n_competencies** : 13
- **feature_count** : 29
- **feature_schema_version** : 1.0
- **feature_schema_hash** : 71e029e254f9b3bced91f7faef0bd0ebb1f1c14f1a1c72c9820cc63e48445ef0
- **train_period** : ('2016-03-01', '2026-07-22')
- **val_period** : ('2026-07-22', '2026-07-22')
- **test_period** : ('2026-07-22', '2026-07-22')
- **random_seed** : 42
- **split** : temporal_3way_train_2026-07-22_val_2026-07-22
- **metrics** : {'rmse': 1.110131213863728, 'mae': 0.8332836562647046, 'r2': -0.03426629103745582, 'median_abs_err': 0.6474946109758379, 'max_abs_err': 3.0927084505624327, 'n_predictions': 34, 'improvement_vs_persistence_pct': 54.07}
- **n_train** : 104
- **n_val** : 34
- **n_test** : 34
- **train_teachers** : 30
- **val_teachers** : 12
- **test_teachers** : 12
- **train_time_s** : 0.4081
- **inference_time_ms** : 0.1586
- **artifact_path** : N/A (challenger, non enregistré)
- **artifact_sha256** : N/A
- **serving_status** : KEEP_AS_CHALLENGER
- **bootstrap_ci** : {'method': 'bootstrap_1000_ic95', 'seed': 42, 'rmse_ci95': [0.7844, 1.454], 'mae_ci95': [0.6135, 1.1091], 'improvement_pct_ci95': [34.24, 69.83], 'improvement_significant_95': True, 'n_boot': 1000, 'n_test': 34}
### legacy_gap_predictor
- **task** : regression_gap
- **target** : gap_next_3m
- **dataset_version** : v1.1.0
- **dataset_hash** : 896609dbdd57d98f0e32e971af6a7357be4064c17d74301856db8abf917e2b47
- **n_rows** : 172
- **metrics** : {'rmse': 'N/A', 'mae': 'N/A', 'r2': 'N/A'}
- **note** : Legacy non évaluable : X has 29 features, but GradientBoostingRegressor is expecting 21 features as input.
- **serving_status** : NOT_AVAILABLE
### subgroup_metrics
- **by_teacher** : {'ENS009': {'insufficient_sample': True, 'n': 1}, 'ENS010': {'rmse': 1.0480060695192008, 'mae': 0.8719422642757292, 'r2': -1.2811193451711742, 'median_abs_err': 0.7396547153406678, 'max_abs_err': 1.9596903845593054, 'n_predictions': 6}, 'ENS011': {'insufficient_sample': True, 'n': 3}, 'ENS012': {'rmse': 0.9685224697408216, 'mae': 0.7435844262762368, 'r2': 0.5657241785218239, 'median_abs_err': 0.3405060392654147, 'max_abs_err': 1.5385339145048587, 'n_predictions': 5}, 'ENS013': {'insufficient_sample': True, 'n': 3}, 'ENS020': {'insufficient_sample': True, 'n': 2}, 'ENS021': {'insufficient_sample': True, 'n': 1}, 'ENS023': {'insufficient_sample': True, 'n': 1}, 'ENS025': {'insufficient_sample': True, 'n': 3}, 'ENS026': {'insufficient_sample': True, 'n': 4}, 'ENS027': {'insufficient_sample': True, 'n': 4}, 'FORM001': {'insufficient_sample': True, 'n': 1}}
- **by_competence** : {'1': {'rmse': 1.2227421806428334, 'mae': 0.7185540464174484, 'r2': -0.5137871708272308, 'median_abs_err': 0.23029952653730767, 'max_abs_err': 2.9145686336735563, 'n_predictions': 6}, '2': {'rmse': 1.1065482217815665, 'mae': 1.0068746070038395, 'r2': -0.007546578665281967, 'median_abs_err': 0.8999331206598863, 'max_abs_err': 1.9596903845593054, 'n_predictions': 8}, '3': {'rmse': 1.2748551750678703, 'mae': 0.8320351588706852, 'r2': -0.5263271085122752, 'median_abs_err': 0.4742709070481519, 'max_abs_err': 2.9596326129062414, 'n_predictions': 6}, '4': {'insufficient_sample': True, 'n': 4}, '5': {'insufficient_sample': True, 'n': 4}, '6': {'rmse': 0.8570569290321152, 'mae': 0.7112586559650153, 'r2': 0.30207304460107, 'median_abs_err': 0.7084823400114377, 'max_abs_err': 1.5385339145048587, 'n_predictions': 6}}
- **by_ref_month** : {'2026-07-22': {'rmse': 1.0696260222483547, 'mae': 0.8221447070327975, 'r2': 0.03983103936383037, 'median_abs_err': 0.6735384652068644, 'max_abs_err': 2.9596326129062414, 'n_predictions': 34}}
- **by_gap_severity** : {'gap_faible': {'rmse': 1.9187995463409298, 'mae': 1.6908567877971266, 'r2': -29.067965542144957, 'median_abs_err': 1.4614660854951413, 'max_abs_err': 2.9596326129062414, 'n_predictions': 7}, 'gap_moyen': {'rmse': 0.6556745874029668, 'mae': 0.5681593807284723, 'r2': -6.2919208297549405, 'median_abs_err': 0.5453871485797182, 'max_abs_err': 1.2878382872674523, 'n_predictions': 14}, 'gap_élevé': {'rmse': 0.696477773323586, 'mae': 0.6429815684840906, 'r2': -30.433267509948944, 'median_abs_err': 0.6620756442630731, 'max_abs_err': 0.9542387662689911, 'n_predictions': 6}, 'gap_critique': {'rmse': 0.7743786637790865, 'mae': 0.614971683347439, 'r2': -10.018795036586697, 'median_abs_err': 0.3996384740249024, 'max_abs_err': 1.5385339145048587, 'n_predictions': 7}}

## Modèles RISQUE
### heuristic_six_factors
- **task** : risk_scoring
- **method** : heuristic_six_factors
- **weights** : {'stagnation': 0.25, 'decline': 0.2, 'attendance': 0.2, 'low_eval': 0.15, 'repeated_need': 0.1, 'low_engagement': 0.1}
- **total_weight** : 1.0
- **thresholds** : {'high': 70.0, 'medium': 30.0}
- **metrics** : {'accuracy': 'N/A', 'balanced_accuracy': 'N/A', 'precision_macro': 'N/A', 'recall_macro': 'N/A', 'f1_macro': 'N/A', 'roc_auc': 'N/A'}
- **note** : Le moteur heuristique est explicable (six facteurs pondérés). Les règles critiques restent prioritaires sur toute prédiction statistique.
- **serving_status** : KEEP_AS_BASELINE
### random_forest
- **task** : risk_classification
- **method** : random_forest
- **metrics** : {'f1_macro': 'N/A'}
- **note** : Artefact risk_classifier.joblib absent — modèle non évalué
- **serving_status** : NOT_AVAILABLE

## Modèles RECOMMANDATION
### heuristic_ranking
- **task** : ranking
- **method** : heuristic_weighted_sum
- **weights** : {'content': 0.7, 'quality': 0.2, 'recency': 0.1}
- **metrics** : {'precision_at_1': 'N/A', 'precision_at_3': 'N/A', 'precision_at_5': 'N/A', 'recall_at_k': 'N/A', 'ndcg_at_k': 'N/A', 'map_at_k': 'N/A'}
- **note** : Évaluation du ranking limitée en l'absence de labels de pertinence réels ou de feedback utilisateur suffisant.
- **serving_status** : KEEP_AS_BASELINE
### relevance_model
- **task** : recommendation_ranking
- **method** : relevance_model
- **metrics** : {'precision_at_3': 'N/A'}
- **note** : Artefact relevance_model.joblib absent — ranking heuristique conservé
- **serving_status** : NOT_AVAILABLE