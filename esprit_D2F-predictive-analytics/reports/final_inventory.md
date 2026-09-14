# Inventaire final — service ML prédictif

- **commit** : `6cc11176c77f4eaaf8ff1da16e967182aa02ab8b`
- **branche** : `oussama`
- **describe** : `6cc11176`

## Classification

| Classe | Définition |
|---|---|
| PRODUCTION | code, modèle v1.0.0/v1.1.0, corpus application, registre principal |
| DEMO | modèle démo + registre dédié (data/models/demo) |
| SYNTHETIC | dataset 1 000 lignes (data/synthetic), modèle entraîné dessus |
| UNKNOWN | fichiers sans provenance déclarée ou non lus |

## Modèles production (registre)

| version | statut | dataset_hash | artefact_sha256 | approbation |
|---|---|---|---|---|
| v1.0.0 | ACTIVE | `c70523c0d353ccfe` | `6bbb396c1e28087d` | APPROVED |
| v1.1.0 | CANDIDATE | `896609dbdd57d98f` | `4a6dd15fc23ace6b` | PENDING |

## Modèles démo (registre dédié)

| version | statut | data_origin | institutionnel | artefact |
|---|---|---|---|---|
| demo-gap-synthetic-v1.0.0 | DEMO_ONLY | SYNTHETIC | False | `09228ab2e99cd8fa` |

## Datasets

| chemin | lignes | classe | is_synthetic | inst_verified |
|---|---:|---|---|---|
| `data\synthetic\demo_dataset_synthetic-v1.0.0.csv` | 1013 | SYNTHETIC | True | False |
| `data\synthetic\demo_dataset_synthetic-v1.0.0_clean.csv` | 1000 | SYNTHETIC | True | False |
| `data\catalogue\competences.csv` | 12 | UNKNOWN | None | None |
| `data\catalogue\domaines.csv` | 4 | UNKNOWN | None | None |
| `data\catalogue\formation_competences.csv` | 52 | UNKNOWN | None | None |
| `data\catalogue\formations.csv` | 30 | UNKNOWN | None | None |
| `data\catalogue\inscriptions_sample.csv` | 40 | UNKNOWN | None | None |
| `data\catalogue\savoirs.csv` | 24 | UNKNOWN | None | None |
| `data\clean\alerts.csv` | 16 | UNKNOWN | None | None |
| `data\clean\corpus_brut_real_raw.csv` | 172 | UNKNOWN | False | None |
| `data\clean\recommendations.csv` | 34 | UNKNOWN | None | None |
| `data\clean\risk_scores.csv` | 30 | UNKNOWN | None | None |
| `data\clean\teacher_competencies.csv` | 51 | UNKNOWN | None | None |
| `data\clean\teachers.csv` | 30 | UNKNOWN | None | None |
| `data\clean\training_corpus.csv` | 5000 | UNKNOWN | None | None |
| `data\clean\training_corpus_clean.csv` | 172 | UNKNOWN | False | None |
| `data\clean\training_corpus_from_db.csv` | 107 | UNKNOWN | None | None |
| `data\clean\training_corpus_from_db_v110.csv` | 172 | UNKNOWN | False | None |
| `data\clean\training_corpus_provenanced.csv` | 107 | UNKNOWN | False | None |
| `data\clean\training_corpus_provenanced_v110.csv` | 172 | UNKNOWN | False | None |
| `data\raw\competences.csv` | 12 | UNKNOWN | None | None |
| `data\raw\departments.csv` | 6 | UNKNOWN | None | None |
| `data\raw\formations.csv` | 12 | UNKNOWN | None | None |

## Routes API

| fichier | verbe |
|---|---|
| `alerts.py` | `GET @router.get("")` |
| `alerts.py` | `PATCH @router.patch("/{alert_id}/status")` |
| `analysis.py` | `POST @router.post("/analysis/{teacher_id}", response_model=AnalysisAcceptedOut, status_code=202)` |
| `analysis.py` | `GET @router.get("/teachers/{teacher_id}/analysis")` |
| `analytics_api_routes.py` | `GET @router.get("/formations-par-periode", responses=BAD_REQUEST_RESPONSES)` |
| `analytics_api_routes.py` | `GET @router.get("/formations-par-up")` |
| `analytics_api_routes.py` | `GET @router.get("/formations-par-departement")` |
| `dashboard_real.py` | `GET @router.get("/impact")` |
| `dashboards.py` | `GET @router.get("")` |
| `dashboards.py` | `GET @router.get("/latest")` |
| `dashboards.py` | `GET @router.get("/declining")` |
| `gaps.py` | `GET @router.get("")` |
| `health.py` | `GET @router.get("/health", include_in_schema=True)` |
| `health.py` | `GET @router.get("/ready", include_in_schema=True)` |
| `integrations.py` | `POST @router.post("/process", response_model=EventOut)` |
| `needs.py` | `GET @router.get("")` |
| `needs.py` | `POST @router.post("/{need_id}/close")` |
| `recommendations.py` | `GET @router.get("")` |
| `risk.py` | `GET @router.get("")` |
| `teacher_scope.py` | `GET @router.get("")` |

## Variables d'environnement (documentées)

| clé | défaut sécurisé |
|---|---|
| `APP_ENV` | True |
| `DEBUG` | True |
| `LOG_LEVEL` | True |
| `DATABASE_URL` | False |
| `DB_CONNECT_TIMEOUT` | True |
| `JWT_SECRET` | False |
| `JWT_ALGORITHM` | True |
| `JWT_AUTH_ENABLED` | True |
| `CORS_ORIGINS` | True |
| `PAGINATION_DEFAULT_SIZE` | True |
| `PAGINATION_MAX_SIZE` | True |
| `SEUIL_GAP_CRITIQUE` | True |
| `SEUIL_GAP_HAUTE` | True |
| `SEUIL_GAP_MOYENNE` | True |
| `RISK_THRESHOLD_HIGH` | True |
| `RISK_THRESHOLD_MEDIUM` | True |
| `COLLECTIVE_MIN_TEACHERS` | True |
| `STAGNATION_REF_MONTHS` | True |
| `ENGAGEMENT_REF_DAYS` | True |
| `RISK_WEIGHTS` | True |
| `MODELS_DIR` | True |
| `GAP_MODEL_ARTIFACT` | True |
| `ANALYSIS_CACHE_TTL_HOURS` | True |
| `NEED_DETECTION_THRESHOLD` | True |
| `NEED_DETECTION_MIN_TEACHERS` | True |
| `ALERT_RECOMPUTE_DAYS` | True |
| `SCHEDULER_ENABLED` | True |
| `SCHEDULER_BATCH_INTERVAL_MINUTES` | True |
| `SCHEDULER_ALERTS_INTERVAL_MINUTES` | True |
| `SCHEDULER_NEEDS_INTERVAL_MINUTES` | True |
| `MESSAGE_BROKER_TYPE` | True |
| `RABBITMQ_URL` | True |
| `RABBITMQ_EXCHANGE` | True |
| `RABBITMQ_QUEUE` | True |
| `RABBITMQ_ROUTING_KEY` | True |
| `RABBITMQ_CONSUMER_ENABLED` | True |
| `THROTTLING_MAX_THREADS` | True |

## Tests

- Fichiers de test : 30

## Docker

| fichier | lignes |
|---|---:|
| `Dockerfile` | 58 |
| `Dockerfile.prod` | 65 |
| `.dockerignore` | 25 |

## Rapports existants (91)

- `reports\application_inference_demo.json`
- `reports\application_inference_demo.md`
- `reports\audit_script.py`
- `reports\dataset_audit_before.json`
- `reports\dataset_audit_before.md`
- `reports\dataset_cleaning_report.json`
- `reports\dataset_cleaning_report.md`
- `reports\dataset_quality_report_v1.1.0.json`
- `reports\demo_bootstrap_report.json`
- `reports\demo_cleaning_report.json`
- `reports\demo_dataset_audit.json`
- `reports\demo_feature_dictionary.json`
- `reports\demo_feature_report.json`
- `reports\demo_final_validation.json`
- `reports\demo_final_validation.md`
- `reports\demo_generation_raw_report.json`
- `reports\demo_generation_report.md`
- `reports\demo_generation_spec.md`
- `reports\demo_leakage_report.json`
- `reports\demo_model_comparison.csv`
- `reports\demo_model_comparison.json`
- `reports\demo_model_comparison.md`
- `reports\demo_pipeline_audit_before.json`
- `reports\demo_pipeline_audit_before.md`
- `reports\demo_quarantine.csv`
- `reports\demo_ranking_report.json`
- `reports\demo_risk_report.json`
- `reports\demo_serving_validation.json`
- `reports\dependency_cleanup_report.md`
- `reports\domain_shift_report.json`
- `reports\duplicate_conflicts.csv`
- `reports\expanded_dataset_audit.json`
- `reports\expanded_model_comparison.json`
- `reports\expanded_promotion_decision.json`
- `reports\expanded_quality_report.json`
- `reports\expanded_serving_validation.json`
- `reports\expanded_target_coverage_report.json`
- `reports\feature_dictionary.json`
- `reports\feature_leakage_report.json`
- `reports\final_conclusion_augmentation.md`
- `reports\final_dataset_audit.json`
- `reports\final_dataset_quality.json`
- `reports\final_feature_contract.json`
- `reports\final_leakage_report.json`
- `reports\final_leakage_report.md`
- `reports\final_ml_audit_inventory.json`
- `reports\final_ml_audit_inventory.md`
- `reports\final_ml_validation.json`
- `reports\final_ml_validation.md`
- `reports\final_model_comparison.csv`
- `reports\final_pfe_consistency.md`
- `reports\final_pfe_text.md`
- `reports\final_provenance_report.json`
- `reports\final_provenance_report.md`
- `reports\final_risk_ranking.json`
- `reports\final_service_correction_report.json`
- `reports\final_service_correction_report.md`
- `reports\final_serving_validation.json`
- `reports\final_serving_validation.md`
- `reports\gap_factor_audit.csv`
- `reports\interservice_integrity_audit.json`
- `reports\model_candidate_v110_decision.md`
- `reports\model_comparison.csv`
- `reports\model_comparison.json`
- `reports\model_comparison.md`
- `reports\model_metrics_validation_v110.json`
- `reports\model_validation_details.md`
- `reports\model_validation_final.md`
- `reports\model_validation_report.csv`
- `reports\model_validation_report.json`
- `reports\predictive_analysis_alignment_audit.md`
- `reports\predictive_analysis_traceability.csv`
- `reports\rapport_audit_ecran_analyse_predicitive_ens014.md`
- `reports\rapport_final.md`
- `reports\rapport_normalisation_score_risque.md`
- `reports\real_data_duplicate_conflicts.csv`
- `reports\real_data_growth_report.json`
- `reports\real_data_growth_report.md`
- `reports\real_data_overlap_report.json`
- `reports\real_data_source_audit.json`
- `reports\recommendation_explanation_audit.csv`
- `reports\recommendation_traceability_audit.csv`
- `reports\removed_or_quarantined_rows.csv`
- `reports\risk_factor_audit.csv`
- `reports\runtime_validation.json`
- `reports\runtime_validation.md`
- `reports\service_inventory_after.json`
- `reports\service_inventory_before.json`
- `reports\target_coverage_report.json`
- `reports\teacher_gap_examples.csv`
- `reports\teacher_profile_comparison.csv`
