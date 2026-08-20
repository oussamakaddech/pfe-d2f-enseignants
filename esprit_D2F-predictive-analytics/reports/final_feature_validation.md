# Final Feature Validation

- **title** : Validation finale du contrat de features (29)
- **generated_at** : 2026-08-20T14:49:39.968751+00:00
- **feature_schema_version** : 1.0
- **contract_size** : 29
- **contract_ok** : True
## features (29)
- **forbidden_in_X** : ['future_level_ref', 'future_level_t3', 'gap_next_3m', 'knowledge_difficulty_level', 'required_level', 'required_level_t']
- **forbidden_present_in_production** : []
- **forbidden_present_in_demo** : []
- **forbidden_columns_present_in_production_dataset** : ['gap_next_3m']
- **forbidden_columns_present_in_demo_dataset** : ['gap_next_3m', 'knowledge_difficulty_level', 'required_level']
- **source_time_leq_ref_month** : True
- **source_time_issues** : []
- **feature_ranges_in_metadata** : 29
- **metadata_feature_cols** : ['current_level_t3', 'current_level_t2', 'current_level_t1', 'current_level_t', 'lag_gap_t3_t2', 'lag_gap_t2_t1', 'lag_gap_t1_t', 'rolling_tendance', 'days_since_last_training', 'training_frequency_per_month', 'is_long_absent', 'is_stagnant', 'avg_level', 'min_level', 'max_level', 'nb_level_5', 'nb_level_1', 'nb_savoirs', 'nb_competences', 'competency_coverage_rate', 'nb_formations_completed', 'nb_formations_in_progress', 'taux_assiduite', 'nb_besoins_exprimes', 'nb_besoins_approuves', 'avg_eval_score', 'nb_evaluations', 'months_since_last_training', 'engagement_score']
- **valid** : True