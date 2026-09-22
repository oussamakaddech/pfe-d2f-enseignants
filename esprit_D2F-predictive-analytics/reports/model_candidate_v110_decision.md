# Décision gouvernance — candidat v1.1.0 (dataset réel étendu)

Généré le : 2026-08-19

## 1. Objectif

Augmenter le corpus d'entraînement du gap predictor avec des **observations réelles** issues de la base PostgreSQL (module `competence`), réentraîner, valider, et décider de la promotion ou non de la nouvelle version dans le registre de modèles.

## 2. Dataset v1.1.0

- Source : `pipelines/extract_real_observations.py` (lecture seule de `competence.enseignant_competences`).
- Fichier : `data/clean/training_corpus_from_db_v110.csv` (sortie extraction) puis `data/clean/training_corpus_provenanced_v110.csv` (sortie `prepare_dataset`).
- **172 lignes** : 40 enseignants, 13 compétences, 36 mois (2016-03 → 2026-07-22), 4.3 observations/enseignant en moyenne.
- Provenance ligne à ligne : `source_type=postgresql_d2f`, `source_id=ec_id`, `is_synthetic=False`, `dataset_version=v1.1.0`, `created_at`, `ref_month`.
- Paires (enseignant, compétence) : 172 au total dont 107 paires ≥ 2 savoirs (identiques au corpus v1.0.0) et **65 nouvelles paires** à 1 savoir (jamais inventées : historique plat = niveau inchangé).
- Rapport qualité : `reports/dataset_quality_report_v1.1.0.json` → `USE_FOR_EXPERIMENT` (172 réelles, 0 synthétique, 0 manquant, 0 doublon, aucune colonne de fuite, hash SHA-256 `896609db…e2b47`).
- Écart vs cibles PFE : prototype 500 lignes (écart 328), préprod 2000 lignes (écart 1828). Le volume maximal disponible en base est atteint.

## 3. Réentraînement v1.1.0

- Protocole : split temporel strict (train=138, test=34, cutoff 2026-07-22), seed 42, anti-fuite (`required_level`/`gap_next_3m` exclus de X), normalisation capturée sur train.
- Candidats (CV-RMSE) : GradientBoosting 0.8785 · XGBoost 0.8770 · **MLP 1.0730** (ajouté pour le comparatif B7 ; ConvergenceWarning max_iter=400 non bloquant).
- Meilleur candidat : **XGBoost** (identique à v1.0.0 qui sert GradientBoosting — comparé ci-dessous sur son propre protocole).
- Test : RMSE=1.0625 · MAE=0.7595 · R²=0.0527 · lift vs baseline persistance = 1.3546 (IC95 bootstrap [0.8369, 1.9091], significatif) · baseline_rmse=2.4171.
- Artefacts versionnés (ne touchent pas l'artefact servi) : `data/models/gap_predictor_temporal_v110.joblib` + sidecar, `data/models/temporal_training_metadata_v110.json`, `data/models/feature_schema_v110.json`.
- Validation technique : `reports/model_metrics_validation_v110.json` → `accept` (r2≥0, rmse≤2.0, mae≤1.5, écart train/test ≤ 50 %).

## 4. Comparaison honnête vs v1.0.0 (servi)

| Métrique | v1.0.0 (ACTIVE) | v1.1.0 (candidat) | Constat |
|---|---:|---:|---|
| RMSE test | 0.9883 | 1.0625 | **dégradation +7.5 %** |
| MAE test | 0.6388 | 0.7595 | **dégradation +18.9 %** |
| R² test | 0.1897 | 0.0527 | **dégradation** |
| Lignes | 107 (100 % réelles) | 172 (100 % réelles) | +65 lignes |
| Baseline persistance | 1.7888 (protocole v1.0.0) | 2.4171 (protocole v1.1.0) | protocoles différents : ne pas comparer les baselines entre expériences |

Note : les protocoles d'évaluation v1.0.0 et v1.1.0 diffèrent (split temporel strict vs historique, ensemble de test différent). La comparaison ci-dessus reste la seule lisible : **le candidat v1.1.0 ne bat pas la version servie sur aucun indicateur**.

## 5. Décision de gouvernance

- **v1.1.0 enregistré en `CANDIDATE` / `PENDING`** (jamais `ACTIVE` ni `APPROVED`).
- **v1.0.0 reste `ACTIVE` / `APPROVED`** — aucune régression de service.
- Justification : malgré un corpus réel plus large (172 vs 107) et une validation technique passante, les métriques test du candidat sont strictement moins bonnes que la version servie. Promouvoir v1.1.0 dégraderait l'inférence en production ; la promotion est réservée à une preuve de supériorité, qui n'existe pas ici.
- En l'état, l'augmentation réelle du corpus (65 nouvelles paires) **ne suffit pas** à compenser la variabilité : le volume reste très inférieur aux cibles PFE (500/2000+ lignes) et les nouvelles paires à 1 savoir sont historiquement pauvres.

## 6. Vérification API (serving réel)

`GET /api/v1/analytics/teachers/ENS012/gaps` (JWT valide, rôle ADMIN) :

```json
"meta": {
  "model_mode": "PRODUCTION_ML",
  "model_version": "v1.0.0",
  "fallback_reason": null,
  "dataset_version": "v1.0.0",
  "prediction_horizon": "3m",
  "synthetic_share_pct": 0.0,
  "provenance": { "total_rows": 107, "real_rows": 107, "synthetic_rows": 0,
                  "synthetic_share_pct": 0.0, "real_share_pct": 100.0,
                  "dataset_version": "v1.0.0", "min_date": "2016-03-01",
                  "max_date": "2026-07-22", ... }
}
```

- Le service sert bien **v1.0.0 en PRODUCTION_ML** (artefact + registre + provenance intacts).
- Le meta expose désormais la provenance complète (rebuild image : le code `status()` avec provenance était committé mais l'image déployée était antérieure).
- L'UI « Modèles » affiche donc des valeurs réelles : version v1.0.0, jeu de données v1.0.0, 107 observations (dont 107 réelles), 0 % synthétique, horizon 3 mois, pas de fallback.

## 7. Constats backend documentés (pour rapport PFE)

- `analysis_repository.py` code en dur `mois_stagnation=0` / `en_regression=False` pour les gaps persistés.
- `/gaps` lit le snapshot `analyse.skill_gaps` (ENS012 : 1 ligne « Infrastructure & Cloud » 25 % MOYENNE, computed_at 2026-08-19T17:37Z) alors que `/scope-analysis` recalcule en direct (3 gaps, 2 CRITIQUE) → incohérence snapshot vs recalcul à documenter.
- `feature_snapshots` : seules 132 lignes récentes (2026-07/08) existent en base — les snapshots historiques sont absents.
- `validate_all_models.py` : crash d'affichage cp1252 sur le caractère « → » (cosmétique, résultats imprimés avant).

## 8. Fichiers produits

| Fichier | Rôle |
|---|---|
| `pipelines/extract_real_observations.py` | Extraction réelle v1.1.0 (créé) |
| `pipelines/validate_dataset_quality.py` | Rapport qualité dataset (créé) |
| `pipelines/{prepare_dataset,train_gap_model,register_model,validate_model_metrics}.py` | Versionnage/MLP/params (modifiés) |
| `data/clean/training_corpus_from_db_v110.csv`, `training_corpus_provenanced_v110.csv` | Datasets v1.1.0 |
| `data/models/gap_predictor_temporal_v110.joblib` (+sidecar), `temporal_training_metadata_v110.json`, `feature_schema_v110.json` | Artefacts candidat v1.1.0 |
| `data/models/model_registry.json` | v1.1.0 CANDIDATE, v1.0.0 ACTIVE |
| `reports/dataset_quality_report_v1.1.0.json`, `reports/model_metrics_validation_v110.json` | Rapports de validation |
| `reports/model_candidate_v110_decision.md` | Ce document |