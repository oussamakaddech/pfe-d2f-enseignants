# Model Metrics — D2F Predictive Analytics (état post-audit DSI)

Document d'état des artefacts ML au **2026-08-06**, après correction d'audit.

> Historique : la version précédente de ce document décrivait `gap_predictor`
> avec R²≈1.0 — symptôme de la fuite de cible (current_level/required_level
> utilisés comme features pour prédire un gap calculé à partir d'eux). Ce
> modèle a été **supprimé** (voir ci-dessous).

## Artefacts actuels (data/models)

| Artefact | Statut | Chargé en prod ? | Source de vérité |
|---|---|---|---|
| `gap_predictor_temporal.joblib` | Réentraîné (107 lignes réelles datées, 0% synthétique) | **NON — désactivé par audit** (`_gap_model_enabled=False`) | `app/infrastructure/ml/predictor.py` |
| `risk_classifier.joblib` | Hérité (36 échantillons, CRITICAL=1) | NON — pas de sidecar SHA-256 → refusé (fail-closed) | `pipelines/train_risk_classifier.py` |
| `relevance_model.joblib` | Hérité | NON — pas de sidecar SHA-256 → refusé (fail-closed) | `pipelines/train_relevance_model.py` |
| `gap_predictor.joblib` | **SUPPRIMÉ** (corpus 98% synthétique + fuite de cible) | — | voir `docs/THRESHOLDS_AND_RISK_POLICY.md` |

Conséquence opérationnelle : **toute la surface d'API fonctionne sur les
règles métier déterministes** (gap = required - current ; règle de risque
par seuils ; blending heuristique des recommandations). C'est un choix
assumé d'audit : ne pas servir des prédictions ML non prouvées.

## Métriques du dernier run réel (2026-08-06, corpus 107 lignes réelles datées)

| Métrique | Valeur | Commentaire |
|---|---|---|
| `test_rmse` | 0.7426 | Échelle 0–5 |
| `test_mae` | 0.4692 | |
| `test_r2` | **0.6582** | Split temporel strict (test = 20% lignes les plus récentes) |
| `baseline_rmse` (persistance) | 2.8520 | |
| `lift_rmse` | +2.1094 | **IC95% bootstrap (1000 réplicas, n=21) : [1.3237, 2.8088] — significatif** (borne basse > 0) |
| `n_train` / `n_test` | 86 / 21 | **Split temporel strict sur `date_t`** (corpus daté, cutoff 2026-07-22) — plus aucun shuffle |
| `cv` | KFold(5) | Régression continue — plus aucun StratifiedKFold |
| Candidates | gradient_boosting (0.7802), xgboost (0.7840) | CV-RMSE |

Source : `data/models/temporal_training_metadata.json` (régénéré, contient
`data_sources`, `hyperparameters`, `split.type=temporal_strict_*`,
`feature_ranges`, `lift_rmse_ci95`).

⚠️ Interprétation : R²=0.66 sur split temporel strict avec 21 lignes de
test est encourageant, mais le corpus (107 lignes) reste petit : l'IC95%
du lift exclut 0, à confirmer sur un corpus ≥ 500 lignes datées. Le modèle
reste désactivé en production tant que `_gap_model_enabled=False`
(bascule manuelle documentée dans `predictor.py::_load`).

## risk_classifier (retraîné le 2026-08-06 — base accessible)

- 45 échantillons réels (depuis `"analyse".teacher_risk_snapshots` +
  `"analyse".skill_gaps`), macro F1 CV = 0.2847 vs baseline 0.2115.
- **Decision : reject** (seuil 0.45) → artefact supprimé, fallback règle
  déterministe conservé (≥ 3 gaps critiques → CRITICAL, facteur
  `critical_gaps_rule` non silencieux).
- Métadonnées complètes (`data_sources`, `hyperparameters`) écrites dans
  `data/models/risk_training_metadata.json`.

## relevance_model (retraîné le 2026-08-06 — base accessible)

- ~90 lignes réelles (recommandations + inscriptions + évaluations DB).
- **Decision : reject** (CV-RMSE=0.1150 > baseline 0.1069) → heuristique
  conservée (blending 100% heuristique actuellement).
- Métadonnées complètes dans
  `data/models/relevance_training_metadata.json`.

## Mécanismes ajoutés par l'audit

| Mécanisme | Emplacement | Effet |
|---|---|---|
| Intégrité fail-closed (SHA-256/HMAC + sidecar obligatoire) | `app/infrastructure/ml/artifact_integrity.py` | Artefact non vérifié → non chargé |
| Kill-switch global `ML_ENABLED` | `app/core/config.py` (`ml_enabled`) | `false` → aucun artefact chargé |
| Drift check passif (part synthétique, âge du modèle) | `predictor.status().drift_check` | Alertes exposées via /health et dashboard |
| Métadonnées `data_sources` + `hyperparameters` | 3 scripts de training | Traçabilité complète du corpus |
| Garde-fous d'entraînement | `pipelines/train_*` | Refus si corpus < seuils (voir THRESHOLDS_AND_RISK_POLICY.md) |

## Endpoint de contrôle

- `GET /api/v1/analytics/health` → expose `model.mode` (ML ou
  HEURISTIC_FALLBACK) et `kill_switch`.
- `GET /api/v1/analytics/dashboard/kpis` → `kpis["model"]` = status complet
  (mode, drift_check, warning_critical_class).

## Historique des runs

| Date | Modèle | n_train/n_test | test_r2 | test_rmse | Decision | Notes |
|---|---|---|---|---|---|---|
| 2026-08-06 | gradient_boosting | 86/21 (temporel strict, cutoff 2026-07-22) | 0.6582 | 0.7426 | accept (lift=2.1094, IC95% [1.32, 2.81]) | Reste désactivé en prod par audit |
| 2026-08-06 | gradient_boosting | 84/21 (séquentiel) | 0.1085 | 0.9671 | accept (lift>0) | Remplacé par le split temporel strict |
| 2026-07-21 | xgboost (legacy) | — | 1.0 | 0.008 | accept | Fuite de cible — modèle supprimé |

## Recommandations

1. **Ne pas servir de prédiction ML gap tant que** : corpus réel < 500
   lignes datées, ou `_gap_model_enabled=False`.
2. **Augmenter le corpus daté** : 107 lignes datées actuellement (split
   temporel strict désormais possible via `date_t`). Viser ≥ 500 lignes
   avec plusieurs années d'historique pour stabiliser l'IC du lift.
3. **Revoir `ML_SYNTHETIC_TOLERANCE_PCT` et les seuils** au premier corpus
   ≥ 500 enseignants (cf. `docs/THRESHOLDS_AND_RISK_POLICY.md`).
