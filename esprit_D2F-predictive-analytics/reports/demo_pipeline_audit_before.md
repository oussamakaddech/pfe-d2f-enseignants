# Audit avant modification — Pipeline démo ML (état initial)

> Audit effectué AVANT tout ajout du pipeline expérimental. Détail machine : `demo_pipeline_audit_before.json`.

## 1. FeatureBuilder

- **Pas de classe FeatureBuilder unique** : contrat dupliqué dans `pipelines/build_features.py:36` (`observed_result_*`), `pipelines/train_gap_model.py:39`, `app/infrastructure/ml/predictor.py:170`, et le schéma servi `data/models/feature_schema.json` (`current_level_*`).
- **29 features**, cible **`gap_next_3m`**.
- **Interdites dans X** : `gap_next_3m`, `required_level`, `required_level_t`, `knowledge_difficulty_level`.
- `knowledge_difficulty_level` = difficulté pédagogique du savoir (structural), **jamais une mesure de maîtrise de l'enseignant** ; utilisé seulement pour le gap structural à l'inférence (`predictor.py:800`).

## 2. Modèle GAP actif (à ne pas toucher)

| Champ | Valeur |
|---|---|
| model_name / version | gap_predictor_temporal / **v1.0.0** |
| Algorithme | GradientBoostingRegressor (120 est., depth 3, lr 0.08) |
| Statut | ACTIVE / APPROVED (ml-engineer, 2026-08-19) |
| Métriques | RMSE 0.9883, MAE 0.6388, R² 0.1897 |
| SHA-256 artefact | `6bbb396c…b35bbe` |
| synthetic_share_pct | 0.0 (107 lignes réelles) |

SHA-256 captés avant modification (non-régression) :

| Fichier | SHA-256 |
|---|---|
| model_registry.json | `74f33553…21eec` |
| temporal_training_metadata.json | `708110a5…245ff` |
| gap_predictor_temporal.joblib | `6bbb396c…b35bbe` |
| gap_predictor_temporal.joblib.sha256 | `9b12a972…750ea` |
| feature_schema.json | `d88dca3c…73a8c` |
| training_corpus_from_db.csv | `da863b23…68fe1` |

## 3. Registre

`app/infrastructure/ml/model_registry.py` : `register()` force **CANDIDATE**, ACTIVE seulement via `approve(actor)` explicite ; `requires_demo()` = True dès `synthetic_share_pct > 0`. **Aucune promotion automatique.** Entrées actuelles : v1.0.0 ACTIVE/APPROVED, v1.1.0 CANDIDATE/PENDING.

## 4. Modèle risque

- Entraîneur : `train_risk_classifier.py` (RandomForest, 4 classes) — dernier entraînement **rejeté** (macro-F1 0.2847 < 0.45), artefact absent ⇒ serving par règles.
- Moteur heuristique 6 facteurs actif : `app/domain/services/risk_calculator.py` (poids 0.25/0.20/0.20/0.15/0.10/0.10), explicabilité conservée (facteurs normalisés, contributions, niveau).

## 5. Recommandation

- Ranking heuristique actif : `app/domain/services/ranking_service.py` — `0,70*contenu + 0,20*qualité + 0,10*fraîcheur`.
- Modèle de pertinence entraîné **rejeté** (lift −0.0081). Aucun label de pertinence réel ⇒ `N/A — aucun label de pertinence` par défaut.

## 6. Mode fallback / serving

- `app/core/ml_status.py` : PRODUCTION_ML / DEMO_ML / HEURISTIC_FALLBACK.
- `_decide_mode()` (`predictor.py:281-382`) fail-closed ; **DEMO_ML déjà câblé** (registre non approuvé ou part synthétique > 0).

## 7. Format données application

- `data/clean/training_corpus_from_db.csv` : 107 lignes réelles, granularité **teacher × competence × date_t** (historique t−3..t embarqué), colonnes provenance `source_type/source_id/is_synthetic/created_at/dataset_version`.
- `data_origin` / `institutional_verified` : absents des datasets existants (ajoutés uniquement au dataset démo, valeurs `SYNTHETIC` / `false`).

## 8. Artefacts & environment

- joblib + sidecar SHA-256 (`artifact_integrity.py`), hash dataset canonique (lignes triées, UTF-8) via `dataset_provenance.file_hash`.
- .venv : Python 3.13.2, scikit-learn 1.8.0, pandas 2.2.3, numpy 2.1.3, xgboost 2.1.3, pytest 9.1.1.

## 9. Choix de conception démo

1. **Granularité** : le contrat réel impose `teacher_id + competence_id + ref_month` par ligne (la cible `gap_next_3m` est mesurée à chaque mois observable). Le dataset démo respecte ce contrat : chaque mois observable porte le snapshot historique t−3..t `current_level_*` aligné sur `date_t`.
2. **Contrat de features** : `pipelines/demo_feature_builder.py` devient le FeatureBuilder canonique unique du pipeline démo (29 features `current_level_*` du schéma 1.0 servi).
3. **Registre** : nouvelle entrée `demo-gap-synthetic-v1.0.0`, statut `DEMO_ONLY`, jamais ACTIVE ; artéfact séparé `data/models/demo/demo-gap-synthetic-v1.0.0.joblib`. v1.0.0 intact.
4. **Colonne `current_observation`** : observation pédagogique mesurée (0–5) à `ref_month`, conservée en métadonnée + alternative de contrôle anti-fuite (jamais utilisée comme proxy de la cible).
