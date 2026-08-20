# Limites assumées — module ML `esprit_D2F-predictive-analytics`

> Date : 2026-08-20. Limites constatées par vérification directe, sans complaisance.

## 1. Corpus « production » = seed développeur, non institutionnel

- Les corpus v1.0.0 (107 lignes) et v1.1.0 (172 lignes) proviennent de la base de développement locale `postgresql_d2f` (`localhost:7432`), peuplée par seed/mock (enseignants `ENS001`–`ENS042`). Aucune preuve d'origine institutionnelle ESPRIT.
- La classification `INSTITUTIONAL_RECORD` de `reports/final_production_dataset_validation.json` (module ML) est **incorrecte** ; ces lignes sont reclassées **DEMO_SEED**.

## 2. Cible fabriquée (extrapolation interdite)

- `reports/target_coverage_report.json` : **0/172 lignes** avec observation de niveau réelle à `ref_month + 3 mois`.
- La cible `gap_next_3m` de v1.0.0/v1.1.0 a été calculée par extrapolation de tendance (`cur_t + rolling`) — **méthode interdite**. Les métriques d'entraînement/évaluation reposent donc sur une cible non observée.

## 3. Split temporel de production non strict

- v1.0.0 : train 86 / test 21, `max(train)=2026-07-22 == min(test)=2026-07-22` → **overlap**, condition `max(train) < min(test)` **échoue**.
- v1.1.0 : train 138 / test 34, même overlap sur le bloc du 2026-07-22.
- Le split démo (664/154/182) est, lui, **strict et vérifié** : `2025-12-31 < 2026-01-31 < 2026-04-30`.

## 4. Échantillons très petits

- 107 / 172 lignes → IC95 larges, pouvoir statistique faible ; la comparaison v1.0.0 vs v1.1.0 n'est pas discriminante.

## 5. Non-reproductibilité source ↔ artefact (noms de features)

- L'artefact servi et la métadonnée `temporal_training_metadata.json` utilisent les features `current_level_t3…engagement_score` ; le code actuel `pipelines/train_gap_model.py` déclare des features `observed_result_*`. **Rejouer le pipeline actuel ne reproduit pas l'artefact enregistré.** Le renommage `current_level → observed_result` n'aurait pas dû toucher le contrat interne des features ML (colonnes non exposées au frontend).

## 6. Registre démo : métriques du best vs de l'artefact

- Meilleur modèle démo (`final_model_choice.json`) : MLP RMSE 0,7402. L'artefact du registre démo porte RMSE 0,7706 (run multi-seed extrême / agrégé). Écart documenté, à ne pas confondre.

## 7. Risque ML et ranking non validés sur données réelles

- `risk_classifier.joblib` absent → **NOT_AVAILABLE** ; le risque servi est le moteur heuristique (6 facteurs) → **KEEP_AS_BASELINE**.
- Ranking (0,70/0,20/0,10) évalué sur labels synthétiques uniquement → **KEEP_AS_BASELINE** en production.

## 8. Docker / QA DSI

- Build et démarrage conteneur validés localement ; la base PostgreSQL **n'est pas jointe** depuis le conteneur de validation locale (`database=unreachable`). La QA DSI (environnement de recette, runbook) n'a pas été réalisée.

## 9. Hash de dataset dépendant de la plateforme

- `dataset_hash` canonique varie CRLF/LF selon la plateforme (documenté dans le registre : variantes Windows/Linux).

## 10. Tests

- Backend : **315 passed / 0 failed**. Frontend : **1425 passed / 6 skipped / 2 fichiers skip** (BesoinForm, BesoinList), `tsc --noEmit` : 0 erreur. Les tests skip sont pré-existants et hors périmètre ML.

## 11. Conséquence

Le module est opérationnel pour **démonstration** (pipeline synthétique reproductible, anti-fuite, anti-promotion, registres séparés). Aucune performance ne peut être affirmée pour la production institutionnelle ESPRIT tant que des données longitudinales institutionnelles vérifiées ne sont pas disponibles et qu'un split temporel strict n'est pas rétabli.