# Texte final PFE — Validation ML du service `esprit_D2F-predictive-analytics`

> Version honnête et vérifiée (2026-08-20). Tous les chiffres cités ont été
> recalculés depuis les fichiers du dépôt et les suites de tests réelles
> (`pytest` 315 tests, `vitest` 1425 tests, `tsc --noEmit` 0 erreur).
> Décision globale : **VALIDÉ POUR DÉMONSTRATION**.

---

## 1. Périmètre et méthode

La validation porte sur la chaîne ML du service `esprit_D2F-predictive-analytics`
du monorepo `pfe-d2f-enseignants` : corpus, provenance, contrat de features,
anti-fuite, splits temporels, entraînement, registre, artefact, serving API,
pipeline de démonstration synthétique, emballage Docker et cohérence du
frontend webapp (DTO `observed_result` / `knowledge_difficulty_level`).

Méthode : aucun chiffre n'est inventé. Les métriques proviennent des registres
et des rapports du pipeline (seed 42, bootstrap 1 000), vérifiés par relecture
directe des fichiers et par l'exécution réelle des tests.

## 2. Données et provenance : le point le plus critique

- **Corpus « production » v1.0.0 (107 lignes) et v1.1.0 (172 lignes)** : issus
  de la base locale de développement `postgresql_d2f` (`localhost:7432`,
  `d2f:d2f`), peuplée par seed/mock du développeur (enseignants `ENS001`–`ENS042`).
  Aucune preuve d'origine institutionnelle ESPRIT. **Ces lignes ne sont pas des
  `INSTITUTIONAL_RECORD`** : la validation `final_production_dataset_validation.json`
  (module ML) est corrigée ici — classification **`DEMO_SEED`**.
- **Cible** : `reports/target_coverage_report.json` montre **0/172 lignes** avec
  une observation réelle à `ref_month + 3 mois`. La cible `gap_next_3m` des
  corpus v1.0.0/v1.1.0 a été calculée par **extrapolation de tendance**
  (`cur_t + rolling`) — **méthode interdite**. La cible d'entraînement n'est pas
  une observation.
- **Corpus démo (1 000 lignes)** : générateur synthétique, seed 42,
  `is_synthetic=true`, `institutional_verified=false`, 100 % `DEMO_SEED` —
  étiquetage correct.

## 3. Contrat de features et anti-fuite

- **29 features temporelles**, cible `gap_next_3m` ; features interdites dans X
  exclues (`required_level`, `knowledge_difficulty_level`, `gap_next_3m`).
- Anti-fuite vérifiée sur la pipeline démo (aucune colonne interdite dans les
  29 features ; `source_time <= ref_month`).
- **Écart constaté** : l'artefact servi utilise `current_level_*` alors que le
  code actuel `train_gap_model.py` déclare `observed_result_*` — la reproduction
  exacte de l'artefact n'est pas garantie avec le code actuel (limite §5).

## 4. Splits temporels : vérification stricte

- **Démo (664/154/182)** : `max(train)=2025-12-31 < min(val)=2026-01-31 <
  min(test)=2026-04-30` → **strict, conforme**.
- **Production v1.0.0 (86/21) et v1.1.0 (138/34)** : `max(train)=2026-07-22 ==
  min(test)=2026-07-22` → **condition `max(train) < min(test)` échouée**
  (overlap sur le bloc du 2026-07-22). La garantie temporelle de la production
  n'est pas satisfaite.

## 5. Modèles et résultats

| Famille | Modèle | Version | RMSE | MAE | R² | Gain vs persistance |
|---|---|---|---|---|---|---|
| Production (servi) | gradient_boosting | v1.0.0 | 0,9883 | 0,6388 | 0,1897 | +1,56 (bootstrap) |
| Production (candidat) | xgboost | v1.1.0 | 1,0625 | 0,7595 | 0,0527 | — |
| Démo | mlp | demo-gap-synthetic-v1.0.0 | **0,7402** | 0,4316 | 0,3495 | **+33,9 %** |
| Démo | gradient_boosting | — | 0,7490 | 0,4642 | 0,3348 | +33,1 % |
| Démo | xgboost | — | 0,7632 | 0,4700 | 0,3092 | +31,9 % |
| Démo | baseline persistence | — | 1,1203 | 0,6808 | −0,49 | 0,0 |
| Démo | baseline mean | — | 0,9531 | 0,7838 | −0,08 | +14,9 % |

- **MLP démo** : stabilité multi-seed (std RMSE 0,031), bootstrap IC95 du gain
  **strictement positif [18,8 % ; 43,4 %]** → retenu comme `BEST_DEMO_MODEL`,
  servi exclusivement en `DEMO_ONLY`.
- **v1.1.0 non promu** : métriques inférieures à v1.0.0 sur un corpus dont la
  cible est fabriquée.

## 6. Risque et ranking

- **Risque ML** : classifieur absent → **NOT_AVAILABLE**. Le risque servi est
  le moteur heuristique (6 facteurs : gaps critiques 0,50, gaps élevés 0,12,
  profondeur moyenne 0,40, caps documentés) → **KEEP_AS_BASELINE**.
- **Ranking** : pondération 0,70/0,20/0,10, évalué sur labels de pertinence
  synthétiques uniquement → **KEEP_AS_BASELINE** en production.

## 7. Tests automatisés

- Backend : `pytest tests/` → **315 passed / 0 failed** (49 integration + 266 unit).
- Frontend : `vitest` → **193 fichiers / 1425 tests passed** (6 skipped, 2
  fichiers hors périmètre ML) ; `tsc --noEmit` → **0 erreur**.
- DTO aligné : `analyticsApi.ts`, `ImpactPanel`, `SkillGapCard`, `TeacherAnalyticsPage`
  et fixtures migrés vers `observed_result` / `knowledge_difficulty_level`.

## 8. Docker / QA DSI

- Image `d2f-predictive-analytics:final` : build et démarrage OK, `/health` 200,
  routes protégées (401 sans JWT).
- **Limite** : base PostgreSQL non jointe depuis le conteneur de validation
  locale ; QA DSI (recette, runbook) **non réalisée**.

## 9. Registre et intégrité

- Production : `gap_predictor_temporal.joblib` v1.0.0 `ACTIVE / APPROVED`,
  SHA-256 vérifié, `dataset_hash` renseigné (variante CRLF/LF documentée).
- Démo : registre **séparé** (`model_registry_demo.json`), `DEMO_ONLY`,
  `institutional_verified=false`, garde anti-promotion `DemoPromotionRefused` testée.
- Artefact corrompu/absent → `HEURISTIC_FALLBACK` (testé).

## 10. Les 7 explications exigées

1. **Pourquoi le MLP est meilleur uniquement sur le corpus synthétique** :
   le MLP (RMSE 0,7402) bat les baselines et les autres modèles sur les 1 000
   lignes synthétiques (patterns réguliers, 18 mois). Sur le corpus « production »
   (cible fabriquée, 107 lignes, overlap temporel), le meilleur candidat était le
   gradient boosting (RMSE 0,9883) ; comparer MLP-synthétique et v1.0.0 n'a pas
   de sens car les cibles et les volumes ne sont pas comparables.
2. **Pourquoi v1.0.0 reste le modèle servi** : l'artefact v1.0.0 est le seul
   enregistré `ACTIVE / APPROVED` et l'API le sert ; le candidat v1.1.0 est
   `NOT_PROMOTED` (métriques inférieures). **Mais** son corpus étant un seed
   développeur rétroclassé `DEMO_SEED`, il est servi en pratique comme modèle de
   démonstration (`DEMO_ONLY` honnête), pas comme modèle institutionnellement validé.
3. **Pourquoi le risque et le ranking restent heuristiques** : le classifieur ML
   de risque n'existe pas (`NOT_AVAILABLE`) ; le moteur heuristique (6 facteurs)
   est normalisé et documenté, et le ranking n'a pas de labels réels pour une
   évaluation ML → les deux sont conservés comme baselines (`KEEP_AS_BASELINE`).
4. **Pourquoi les données « réelles » ne sont pas institutionnelles** : elles
   proviennent de la base de dev locale `postgresql_d2f` peuplée par seed/mock
   (enseignants `ENS001`–`ENS042`) ; `is_synthetic=false` signifie seulement
   « non généré par le générateur » et n'atteste d'aucune origine ESPRIT.
5. **Pourquoi la validation institutionnelle exige des données longitudinales
   réelles** : aucune ligne n'a de cible observée à `ref_month + 3 mois`
   (0/172) ; la cible v1.0.0/v1.1.0 a été extrapolée (interdit). Seules des
   observations de niveaux répétées dans le temps permettent une cible `gap_next_3m`
   réelle et un split temporel strict.
6. **Pourquoi une QA DSI est nécessaire** : le conteneur n'accède pas à la base
   réelle, la recette et le runbook n'existent pas ; la validation finale des
   routes et du serving doit être rejouée en environnement dédié.
7. **Pourquoi les tests passent sans désactivation** : 315 pytest + 1425 vitest
   + `tsc --noEmit` 0 erreur ont été obtenus par correction réelle des DTO et des
   fixtures (renommage `current_level/target_level` → `observed_result/
   knowledge_difficulty_level`, adapter `toNewSkillGap`, libellés `Artefact du
   modèle` / `Version de l'artefact`), pas par désactivation.

## 11. Décision finale

| Composant | Statut |
|---|---|
| GAP production | **DEMO_ONLY** (rétroclassé — seed développeur, non institutionnel) |
| GAP v1.1.0 | **NOT_PROMOTED** |
| BEST_DEMO_MODEL | **mlp** (DEMO_ONLY) |
| RISQUE ML | **NOT_AVAILABLE** |
| RISQUE heuristique | **KEEP_AS_BASELINE** |
| RANKING | **KEEP_AS_BASELINE** |
| **GLOBAL** | **VALIDÉ POUR DÉMONSTRATION** |

Le service ML est techniquement solide (pipelines reproductibles sur données
synthétiques, anti-fuite, anti-promotion, registres séparés, tests verts), mais
il ne peut pas être présenté comme validé sur les enseignants réels d'ESPRIT :
le corpus de production est un seed développeur, sa cible est fabriquée et son
split temporel n'est pas strict. L'obtention de données longitudinales
institutionnelles vérifiées et une QA DSI dédiée sont les conditions de passage
à une validation production.