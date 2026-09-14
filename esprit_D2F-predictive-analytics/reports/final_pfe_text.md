# Texte final PFE — Validation ML du service `esprit_D2F-predictive-analytics`

> Document final honnête, reproductible et chiffré (section 21 de la mission).
> Commit audité : `6cc11176` (branche `oussama`).
> Rapports sources : `reports/final_*.{json,md,csv}` produits par
> `pipelines/final_*.py` (seed 42, bootstrap 1 000) et la suite de tests
> `pytest tests/` (315 tests).

---

## 1. Périmètre et méthode

La validation porte sur la chaîne ML du service `esprit_D2F-predictive-analytics`
du monorepo `pfe-d2f-enseignants` : corpus d'entraînement, nettoyage, provenance,
contrat de features, anti-fuite, splits temporels, entraînement, registre de
modèles, artefacts, serving API (JWT), pipeline de démonstration synthétique et
emballage Docker.

Méthode : aucun chiffre n'est inventé. Chaque métrique est recalculée depuis les
fichiers du dépôt avec les mêmes fonctions de pipeline que la production,
les mêmes splits temporels stricts (80/20 et 3-way 60/20/20, sans shuffle),
la même seed (`42`), une stabilité multi-seed (10, 20, 42, 99, 2026) et des
intervalles de confiance par bootstrap (1 000 réplications, percentile 2,5-97,5).

## 2. Données production : provenance vérifiée, zéro synthèse

| Version | Lignes | Enseignants | Compétences | Période | % réel | % synthétique |
|---|---|---|---|---|---|---|
| v1.0.0 (servie) | 107 | 40 | 11 | 2016-03-01 → 2026-07-22 | 100 % | 0 % |
| v1.1.0 (candidate) | 172 | 40 | 13 | 2016-03-01 → 2026-07-22 | 100 % | 0 % |

- Toutes les lignes portent les colonnes de provenance obligatoires
  (`source_type`, `source_id`, `is_synthetic`, `created_at`, `dataset_version`) ;
  `source_type` est `postgresql_d2f` sur les 172 lignes v1.1.0. Aucune ligne
  `DEMO_SEED` (synthétique) dans le corpus de production ; 100 % de lignes
  `INSTITUTIONAL_RECORD`.
- Les 107 lignes v1.0.0 sont toutes contenues dans v1.1.0 (107/107) ; v1.1.0
  ajoute 65 nouvelles lignes. Aucune duplication, aucune donnée synthétique.
- Validation consolidée : `reports/final_production_dataset_validation.json/.md`
  (5 critères tous vérifiés).

## 3. Nettoyage et qualité

- Nettoyage traçable : types stricts, dédoublonnage, imputation médiane
  documentée, clipping hors-plage, quarantaine des dates invalides
  (`reports/dataset_cleaning_report.json`, `reports/demo_cleaning_report.json`).
- Distribution cible (`gap_next_3m`) : bornes 0-5 respectées, aucune valeur
  plafonnée artificiellement.

## 4. Contrat de features

- **29 features temporelles** (schéma v1.0), cible `gap_next_3m` ; features
  interdites dans X : `required_level`, `required_level_t`,
  `knowledge_difficulty_level`, `gap_next_3m`, `future_level_*`.
- Anti-fuite vérifiée (statique + temporelle) : aucune colonne interdite dans
  les 29 features ; `source_time <= ref_month` pour toutes les features ;
  split temporel strict sans shuffle (max du train ≤ min du test).
- Cohérence train/serve : `feature_ranges` (29) présents dans la metadata et
  utilisés pour la normalisation au serving.
- Validation consolidée : `reports/final_feature_validation.json/.md`.

## 5. Reproductibilité de l'entraînement (production)

Réentraînement avec le même pipeline (split temporel strict 80/20, CV interne
KFold 5 × shuffle seed 42, normalisation min-max capturée sur train) :

| Version | Meilleur candidat | RMSE test | MAE | R² |
|---|---|---|---|---|
| v1.0.0 | gradient_boosting | 0,9883 | 0,6388 | 0,1897 |
| v1.1.0 | xgboost | 1,0625 | 0,7595 | 0,0527 |

Les métriques du registre sont reproduites à la 4e décimale près : la chaîne
d'entraînement est déterministe et reproductible.

## 6. Comparaison commune et bootstrap

Corpus union = v1.1.0 (172 lignes), split temporel 3-way, baselines persistance
et moyenne, bootstrap 1 000 : les IC95 des modèles se chevauchent largement →
**aucune différence statistiquement significative** entre les versions.
Le gain vs persistance est significatif (> 0) pour tous les modèles.
**Décision : ne pas promouvoir v1.1.0 ; conserver v1.0.0 ACTIVE.**

## 7. Pipeline de démonstration (données 100 % synthétiques)

Un pipeline complet de démonstration (`pipelines/run_demo_pipeline.py`,
8 étapes) valide le savoir-faire technique sur un corpus 100 % synthétique
(1 000 lignes, seed 42) clairement étiqueté :

| Étape | Résultat |
|---|---|
| Audit + nettoyage | 1 013 → 1 000 lignes, corrections tracées |
| Features (29) + anti-fuite + split | 664/154/182, `leakage_ok=true` |
| 5 modèles GAP + bootstrap + multi-seed | voir §8 |
| Risque heuristique + RandomForest | `reports/demo_risk_report.json` |
| Ranking (0,70/0,20/0,10) | P@K, NDCG@K sur labels synthétiques |
| Inférence sur données application | 107 lignes, schéma OK |
| Domain shift (Wasserstein) | moyenne **0,2486** (faible/modéré) |
| Registre + serving | `DEMO_ML`, anti-promotion actif |

Validation consolidée : `reports/final_demo_dataset_validation.json/.md`,
`reports/demo_final_validation.json/.md`.

## 8. Choix final du modèle de démonstration

| Modèle | RMSE | MAE | R² | Gain vs persistance (%) |
|---|---|---|---|---|
| baseline persistence | 1,1203 | 0,6808 | −0,49 | 0,0 |
| baseline mean | 0,9531 | 0,7838 | −0,08 | 14,9 |
| gradient_boosting | 0,7490 | 0,4642 | 0,33 | 33,1 |
| xgboost | 0,7632 | 0,4700 | 0,31 | 31,9 |
| **mlp** | **0,7402** | **0,4316** | **0,35** | **33,9** |

- **Stabilité multi-seed (mlp)** : std RMSE 0,031 (min 0,7033, max 0,7706).
- **Bootstrap IC95 (mlp, n=182)** : RMSE [0,5846 ; 0,9618] ; gain vs persistance
  **[18,8 % ; 43,4 %]** → strictement positif → stabilité confirmée.
- **BEST_DEMO_MODEL = `mlp`**, servi exclusivement en **DEMO_ML** (jamais
  présenté comme performance ESPRIT). Décision documentée :
  `reports/final_model_choice.json/.md`.

## 9. Risque et ranking

- **Risque ML** : `risk_classifier.joblib` absent, métadonnées d'un prototype
  non déployable → **NOT_AVAILABLE**. Aucun mode ne prétend servir un risque ML.
- **Risque heuristique** (servi) : règles à base de poids
  {critical_gaps 0,50 ; high_gaps 0,12 ; avg_gap_score 0,40} avec caps
  (critical 2,0 ; high 1,0), moteur de profil complémentaire (6 facteurs) et
  normalisation documentée (`rapport_normalisation_score_risque.md`).
  Le scope du facteur est cohérent (`scope_type` = TEACHER / DEPARTMENT / UP).
- **Ranking** : 0,70 contenu + 0,20 qualité + 0,10 fraîcheur (365 j) ; évalué
  sur labels de pertinence synthétiques (P@1/3/5, R@3, NDCG@3, MAP@3) ;
  pas de labels réels → **KEEP_AS_BASELINE** en production.
- Consolidé : `reports/final_service_validation.json/.md`.

## 10. Registre et intégrité des artefacts

- **Production** : `gap_predictor_temporal.joblib` v1.0.0 **ACTIVE / APPROVED**,
  SHA-256 `6bbb396c…` vérifié (fichier = sidecar = registre), provenant de 107
  lignes réelles (0 % synthétique), `dataset_hash` renseigné.
- **Démo** : `demo-gap-synthetic-v1.0.0.joblib` enregistré dans un registre
  **séparé** (`data/models/demo/model_registry_demo.json`), mode **DEMO_ML**,
  `institutional_verified=false`, **garde anti-promotion active**
  (`DemoPromotionRefused`, test unitaire) ; le registre production v1.0.0 est
  inchangé après l'enregistrement démo.
- Les artefacts sont chargés avec contrôle de hachage ; un artefact corrompu ou
  absent force `HEURISTIC_FALLBACK` (testé en unitaire).

## 11. Serving en conditions réelles

| Endpoint | Résultat |
|---|---|
| `/api/v1/analytics/health`, `/ready` | 200, `model=PRODUCTION_ML` |
| `/teachers/{id}/gaps`, `/risk`, `/alerts` | 200, `PRODUCTION_ML`, v1.0.0, `fallback_reason=null` |
| `/dashboard?scope=GLOBAL` | **200 — corrigé** (bug de câblage `compute_gaps` tuple→liste résolu dans `container.py`) |
| Routes sans JWT | **401** (protection JWT vérifiée dans le conteneur) |

En `DEMO_ML`, la réponse API expose explicitement le mode démo (jamais
`PRODUCTION_ML`). En `HEURISTIC_FALLBACK`, l'appelant bascule sur la méthode
métier. Consolidé : `reports/final_serving_validation.json`,
`reports/demo_serving_validation.json`.

## 12. Refactor et cohérence du domaine

Le renommage `current_level → observed_result` / `target_level →
knowledge_difficulty_level` a été **terminé** dans les entités et use cases
(`SkillGap`, `TeacherCompetencyState`, `Savoir`, compute_gaps,
analyze_teacher_scope, build_dashboards, recommend_trainings,
analysis_repository, ranking_service). Le contrat de features ML (colonnes
internes, jamais exposées au frontend) reste `current_level_*` pour coïncider
avec les artefacts entraînés et la pipeline de démonstration. Les routes et le
schéma `GapOut` exposent `observed_result` / `knowledge_difficulty_level`.

## 13. Tests automatisés

`pytest tests/` : **315 passed, 0 failed, 0 skipped, 2 warnings** en 190,69 s
(49 integration + 266 unit). Rapport : `reports/final_test_results.txt/.json`.
Tests clés : registre/intégrité, anti-promotion démo, contrat de features,
anti-fuite, modes ML (PRODUCTION/DEMO/FALLBACK), dashboard, RBAC/scopes.

## 14. Docker / DSI

- Image `d2f-predictive-analytics:final` : **build OK** (multi-stage
  Python 3.11-slim, non-root `appuser`, HEALTHCHECK).
- Conteneur : démarrage OK, `/health` 200 avec `model=PRODUCTION_ML`,
  routes protégées → 401 sans JWT.
- Limites : la base PostgreSQL n'est pas jointe depuis le conteneur de
  validation locale (`database=unreachable`) ; la validation QA DSI dédiée
  (environnement de recette, runbook) n'a pas été réalisée.
- Rapport : `reports/final_docker_validation.json/.md`.

## 15. Limites assumées

1. Échantillons petits (107 / 172 lignes) → IC95 larges, pouvoir statistique
   faible pour la comparaison de versions.
2. Bloc de lignes datées du 2026-07-22 : ordre intra-jour du split dépend du
   tri du fichier (garantie temporelle faible sur ce bloc).
3. Hash de dataset dépendant de CRLF/LF (plateforme) — documenté.
4. Pas de labels réels pour le ranking ; risque ML non déployé.
5. Métriques du pipeline démo non transférables aux enseignants réels d'ESPRIT.
6. 2 warnings pytest (à l'installation, non bloquants).

## 16. Décision finale

| Composant | Statut |
|---|---|
| GAP production v1.0.0 | **ACTIVE / PRODUCTION_ML** |
| GAP v1.1.0 | **NOT_PROMOTED** |
| BEST_DEMO_MODEL | **mlp** (DEMO_ML, jamais présenté comme ESPRIT) |
| RISQUE ML | **NOT_AVAILABLE** |
| RISQUE heuristique | **KEEP_AS_BASELINE** (normalisé, documenté) |
| RANKING | **KEEP_AS_BASELINE** |
| DASHBOARD `scope=GLOBAL` | **FIXED** (200, tests OK) |
| PIPELINE | **VALIDATED** |
| SERVING | **PRODUCTION_ML** (vérifié API + conteneur) |
| DOCKER | **VALIDATED** (build + démarrage + JWT) |
| TESTS | **315 passed / 0 failed** |
| **GLOBAL** | **VALIDÉ** (réserves : enrichissement du corpus, QA DSI) |

Le service ML est honnête, reproductible et servi en `PRODUCTION_ML` avec des
données 100 % réelles et tracées ; le pipeline de démonstration prouve le
savoir-faire sur données synthétiques clairement étiquetées, sans jamais
présenter celles-ci comme une preuve de performance sur les enseignants réels
d'ESPRIT. Les réserves restantes sont l'enrichissement du corpus et la
validation QA DSI en environnement dédié.