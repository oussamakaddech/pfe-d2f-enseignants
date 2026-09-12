# Rapport final — Pipeline démo ML (DEMO_ML)

> **Avertissement global** : ce rapport est une **démonstration technique** sur des 
> données **100 % synthétiques**. Les métriques n'engagent pas les enseignants réels 
> d'ESPRIT et ne constituent en aucun cas une validation institutionnelle.

## Dataset

| Caractéristique | Valeur |
|---|---:|
| Lignes | 1000 |
| Enseignants synthétiques | 100 |
| Compétences | 13 |
| Périodes (mois) | 18 |
| Seed | 42 |
| Hash canonique | `f56dd8c49005734a...` |
| Origine | SYNTHETIC |
| Institutionnel vérifié | False |

## Nettoyage (traçable)

| Mesure | Valeur |
|---|---:|
| Avant | 1013 |
| Après | 1000 |
| Corrigées | 25 |
| Imputées | 12 |
| Supprimées | 8 |
| Quarantaine | 5 |

## Pipeline

- **Features** : 29 (`current_level_*`), FeatureBuilder partagé `pipelines/demo_feature_builder.py`.
- **Cible** : `gap_next_3m` (gap à +3 mois, échelle 0..5).
- **Anti-fuite** : True (aucune colonne interdite dans X ; `source_time <= ref_month`).
- **Split temporel** : 664 / 154 / 182 lignes (train/validation/test).
- **Seeds** : [42, 43, 44, 45].

## Résultats GAP

| Modèle | RMSE | MAE | R² | Tolérance ±0,10 | Tolérance ±0,20 | Gain vs baseline (%) | Temps inférence (ms) | Décision |
|---|---:|---:|---:|---:|---:|---:|---:|---|
| baseline_persistence | 1.1203 | 0.6808 | -0.4882 | 0.3901 | 0.456 | 0.0 | 0.0 | baseline |
| baseline_mean | 0.9531 | 0.7838 | -0.0772 | 0.0769 | 0.1758 | 14.9246 | 0.0 | baseline |
| gradient_boosting | 0.749 | 0.4642 | 0.3348 | 0.2967 | 0.4066 | 33.1474 | 1.7 | retenu_demo |
| xgboost | 0.7632 | 0.47 | 0.3092 | 0.3132 | 0.4176 | 31.8754 | 9.0425 | retenu_demo |
| mlp | 0.7402 | 0.4316 | 0.3495 | 0.3626 | 0.4725 | 33.9329 | 1.69 | retenu_demo |

- **Meilleur modèle** : **mlp** (RMSE moyen multi-seed 1.1203).
- **Bootstrap** (1000 réplications, seed 2026) : IC95 RMSE [0.5846, 0.9618], IC95 MAE [0.3708, 0.5533], IC95 gain vs baseline [18.7605, 43.4197] %.
- **Multi-seed** (42, 43, 44, 45) : modèle retenu uniquement si le gain est positif sur plusieurs seeds — jamais sur une seule seed.

## Résultats RISQUE (labels synthétiques)

| Modèle | Accuracy | Balanced accuracy | Precision macro | Recall macro | F1 macro | AUC | Décision |
|---|---:|---:|---:|---:|---:|---:|---|
| heuristic_six_factors | 1.0 | 1.0 | 1.0 | 1.0 | 1.0 | 0.9952 | démonstration |
| random_forest | 0.8242 | 0.581 | 0.5336 | 0.581 | 0.5547 | 0.9463 | démonstration |

> `risk_labels_origin = SYNTHETIC`. L'accuracy de l'heuristique (~1.0) est un contrôle de cohérence interne (les labels dérivent de son score) ; le RandomForest entraîné sur les 6 facteurs normalisés fournit l'évaluation discriminative.

## Résultats RANKING (labels de pertinence synthétiques)

| Méthode | Precision@3 | Recall@3 | NDCG@3 | MAP@3 | Décision |
|---|---:|---:|---:|---:|---|
| heuristique 0,70/0,20/0,10 | 0.8167 | 0.7623 | 0.9833 | 0.9833 | démonstration |

> `relevance_labels_origin = SYNTHETIC`.

## Inférence sur données de l'application

- **Lignes testées** : 107 (data/clean/training_corpus_from_db.csv).
- **Domain shift** (Wasserstein moyen) : 0.2486.
- **Prédictions** : mean 4.658, median 5.0, [0.0, 5.0].
- **Avertissements** :
  - Le modèle a été entraîné sur des données synthétiques.
  - Les prédictions sur données application sont une démonstration technique, PAS une validation institutionnelle.

## Serving

| Champ | Valeur |
|---|---|
| Model mode | **DEMO_ML** |
| Version | `demo-gap-synthetic-v1.0.0` |
| Origine | SYNTHETIC |
| Hash dataset | `f56dd8c49005734a...` |
| Hash artefact | `09228ab2e99cd8fa...` |
| Institutionnel vérifié | False |
| Promotion PRODUCTION_ML | refusée (True) |

## Limites

- Données 100 % synthétiques — aucune donnée réelle d'ESPRIT utilisée.
- Absence de validation institutionnelle (institutional_verified=false).
- Nécessité de données réelles longitudinales pour toute conclusion sur les enseignants réels.

## Conclusion

> Le corpus synthétique de 1 000 lignes a permis de tester le nettoyage, le contrat de features, l'anti-fuite, l'entraînement, la comparaison des modèles, la stabilité et l'inférence sur les données de l'application. Les métriques obtenues sont valides pour une démonstration technique du pipeline. Elles ne constituent pas une preuve de performance sur les enseignants réels d'ESPRIT. Le modèle généré est donc servi en mode DEMO_ML, tandis que le modèle PRODUCTION_ML reste séparé et soumis à une validation sur des données institutionnelles vérifiées.
