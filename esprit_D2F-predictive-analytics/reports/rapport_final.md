# Rapport Final — D2F Predictive Analytics

Généré le : 2026-08-20T01:19:42.623740

## 1. Dataset

- **Version** : `v1.1.0`
- **Hash SHA-256** : `896609dbdd57d98f0e32e971af6a7357be4064c17d74301856db8abf917e2b47`
- **Lignes** : 172
- **Enseignants** : 40
- **Compétences** : 13
- **Périodes** : 2016-03-01 → 2026-07-22
- **Réel** : 172 lignes (100.0%)
- **Synthétique** : 0 lignes (0.0%)

## 2. Audit avant nettoyage

- Lignes initiales : 172
- Enseignants distincts : 40
- Compétences distinctes : 13
- Doublons : 0
- Dates invalides : 0
- Fuites candidates : ['gap_next_3m']

## 3. Nettoyage

- Lignes initiales : 172
- Lignes conservées : 172
- Lignes supprimées : 0
- Lignes corrigées : 0
- Lignes quarantaine : 0
- Granularité valide : True

## 4. Provenance

- Total lignes : 172
- Réelles : 172
- Synthétiques : 0
- Part synthétique : 0.0%
- Source : `postgresql_d2f`

## 5. Features

- Nombre de features : 29
- Cible : `gap_next_3m`
- Fuite détectée : False
- `required_level` dans X : False
- `gap_next_3m` dans X : False

## 6. Split temporel

- Type : temporal_3way_train_2026-07-22_val_2026-07-22
- Train : 104 lignes (30 enseignants)
- Validation : 34 lignes (12 enseignants)
- Test : 34 lignes (12 enseignants)
- Période train : ('2016-03-01', '2026-07-22')
- Période validation : ('2026-07-22', '2026-07-22')
- Période test : ('2026-07-22', '2026-07-22')

## 7. Modèles GAP

| Modèle | RMSE | MAE | R² | Amélioration vs baseline | IC95 amélioration | Décision |
|---|---:|---:|---:|---:|---:|---|
| baseline_persistence | 2.4170790723164326 | 2.0921568627450977 | -3.903040251673791 | N/A% | N/A | KEEP_AS_BASELINE |
| gradient_boosting | 1.0696260222483547 | 0.8221447070327975 | 0.03983103936383037 | 55.75% | [37.33, 70.55] | ACTIVE |
| xgboost | 1.0936831747264815 | 0.8137966435329587 | -0.003845332985124461 | 54.75% | [36.76, 70.06] | KEEP_AS_CHALLENGER |
| mlp | 1.110131213863728 | 0.8332836562647046 | -0.03426629103745582 | 54.07% | [34.24, 69.83] | KEEP_AS_CHALLENGER |
| legacy_gap_predictor | N/A | N/A | N/A | N/A% | N/A | NOT_AVAILABLE |

## 8. Modèles RISQUE

| Modèle | Balanced accuracy | F1 macro | Recall macro | AUC | Décision |
|---|---:|---:|---:|---:|---|
| heuristic_six_factors | N/A | N/A | N/A | N/A | KEEP_AS_BASELINE |
| random_forest | N/A | N/A | N/A | N/A | NOT_AVAILABLE |

## 9. Modèles RANKING

| Méthode | Precision@3 | Recall@3 | NDCG@3 | Statut |
|---|---:|---:|---:|---|
| heuristic_ranking | N/A | N/A | N/A | KEEP_AS_BASELINE |
| relevance_model | N/A | N/A | N/A | NOT_AVAILABLE |

## 10. Registre et promotion

- **Modèle actif** : `gap_predictor_temporal`
- **Version** : `v1.0.0`
- **Statut** : `ACTIVE`
- **Approbation** : `APPROVED`
- **Hash artefact** : `6bbb396c1e28087deeeb402ecf856388510f54a08895dae5415132b08fb35bbe`

## 11. Artefacts

- **Artefact** : `C:\Users\oussama\Desktop\pfe-d2f-enseignants\esprit_D2F-predictive-analytics\data\models\gap_predictor_temporal.joblib`
- **Hash SHA-256** : `6bbb396c1e28087deeeb402ecf856388510f54a08895dae5415132b08fb35bbe`

## 12. Incohérences avec le rapport PFE

- **gradient_boosting** test_rmse : 1.0018 → 1.0696260222483547 (Les deux séries de métriques correspondent à des expériences différentes et ne doivent pas être présentées comme une comparaison directe (dataset, split ou version de features différents).)
- **gradient_boosting** test_r2 : 0.3145 → 0.03983103936383037 (Les deux séries de métriques correspondent à des expériences différentes et ne doivent pas être présentées comme une comparaison directe (dataset, split ou version de features différents).)

## 13. Conclusion

### Dataset

- Version : `v1.1.0`
- Hash : `896609dbdd57d98f...`
- Lignes : 172
- Enseignants : 40
- Compétences : 13
- Périodes : 2016-03-01 → 2026-07-22
- Réel : 172 (100.0%)
- Synthétique : 0 (0.0%)

### Modèle GAP retenu

- Nom : `gradient_boosting`
- Version : `v1.0.0`
- RMSE : 1.0696260222483547
- MAE : 0.8221447070327975
- R² : 0.03983103936383037
- Amélioration vs baseline : 55.75%
- IC95 : [37.33, 70.55]
- Mode serving : `PRODUCTION_ML`
- **Note** : Le modèle v1.1.0 (dataset nettoyé v1.1.0) a des métriques inférieures (RMSE=1.0696260222483547) au modèle v1.0.0 actif (RMSE=0.9883). Conformément aux règles de promotion, **v1.0.0 reste ACTIVE** et v1.1.0 reste CANDIDATE.

### Risque

- Modèle actif : `heuristic_six_factors` (KEEP_AS_BASELINE)
- Métriques : N/A (pas de labels de classification réels)
- Fallback : `HEURISTIC_FALLBACK` conservé

### Ranking

- Méthode active : `heuristic_weighted_sum` (0.70*contenu + 0.20*qualité + 0.10*fraîcheur)
- Métriques disponibles : N/A — absence de labels de pertinence réels suffisants
- Limites : pas de feedback utilisateur historique

### Limites

- **Volume** : 172 lignes réelles (cible prototype 500-1000) — volume insuffisant pour une généralisation institutionnelle
- **Généralisation** : 40 enseignants, 13 compétences — couverture limitée
- **Période** : 2016-03-01 → 2026-07-22 — historique hétérogène
- **Labels manquants** : pas de labels de pertinence ranking, pas de labels de risque
- **Validation DSI** : requise avant toute mise en production élargie

### Note de comparabilité

Les expériences ne sont pas directement comparables. Seules les métriques recalculées avec le protocole commun servent à la décision de promotion.