# Décision finale — validation ML du service `esprit_D2F-predictive-analytics`

**Décision finale : VALIDÉ POUR DÉMONSTRATION**

> Analyse honnête fondée sur la vérification directe des fichiers du dépôt
> (registres, métadonnées, corpus, rapports d'audit) et l'exécution réelle des
> suites de tests. Aucune affirmation non vérifiée.

| Composant | Statut |
|---|---|
| GAP production | **DEMO_ONLY** (rétroclassé) — v1.0.0 reste le modèle servi (`ACTIVE` dans le registre), mais son corpus d'entraînement est un seed développeur (`postgresql_d2f` locale, enseignants ENS001-ENS042), non vérifié institutionnellement |
| GAP v1.1.0 (candidat) | **NOT_PROMOTED** |
| BEST_DEMO_MODEL | **mlp** (DEMO_ONLY, jamais présenté comme performance ESPRIT) |
| RISQUE ML | **NOT_AVAILABLE** |
| RISQUE heuristique | **KEEP_AS_BASELINE** (6 facteurs, normalisé, documenté) |
| RANKING | **KEEP_AS_BASELINE** (pas de labels réels) |
| GLOBAL | **VALIDÉ POUR DÉMONSTRATION** |

## Vérifications effectuées

- **pytest backend** : 315 passed / 0 failed (`esprit_D2F-predictive-analytics`, venv Python 3.13.2).
- **vitest frontend** : 193 fichiers, 1425 tests passed (2 fichiers / 6 tests skipped) ; `tsc --noEmit` : 0 erreur.
- **Split temporel démo (664/154/182)** : `max(train)=2025-12-31 < min(val)=2026-01-31 < min(test)=2026-04-30` → **strict, OK**.
- **Split temporel production v1.0.0 (86/21) et v1.1.0 (138/34)** : `max(train)=2026-07-22 == min(test)=2026-07-22` → **non strict** (overlap sur le bloc du 2026-07-22). La condition exigée `max(train) < min(test)` **échoue**.
- **Cible observée** : `reports/target_coverage_report.json` → **0/172 lignes** avec observation réelle à `ref_month+3 mois`. La cible `gap_next_3m` de v1.0.0/v1.1.0 a été calculée par extrapolation de tendance (`cur_t + rolling`) — **méthode interdite**.
- **Provenance** : corpus v1.0.0 (107 lignes) et v1.1.0 (172 lignes) issus de la base locale de développement `postgresql_d2f` (`localhost:7432`, `d2f:d2f`), peuplée par seed/mock du développeur (enseignants `ENS001`-`ENS042`, 11-13 compétences). **Aucune preuve d'origine institutionnelle ESPRIT** → ces lignes sont reclassées **DEMO_SEED** (la validation `final_production_dataset_validation.json` les qualifie à tort d'`INSTITUTIONAL_RECORD`).

## Pourquoi « VALIDÉ POUR DÉMONSTRATION »

1. Le corpus « production » v1.0.0/v1.1.0 est un seed développeur, sa cible est fabriquée (extrapolation interdite) et son split temporel n'est pas strict : **aucune performance ne peut être affirmée pour la production**.
2. Le pipeline de démonstration est, lui, entièrement valide et reproductible (split strict, seed 42, bootstrap IC95 du gain strictement positif [18,8 % ; 43,4 %], registre séparé, anti-promotion `DemoPromotionRefused` testé).
3. Risque ML non disponible, risque heuristique et ranking maintenus comme baselines documentées.
4. La validation institutionnelle réelle exige des données longitudinales institutionnelles (aucune cible observée aujourd'hui) et une QA DSI en environnement dédié.

## Réserves

- Enrichir le corpus avec de vraies observations institutionnelles longitudinales (0 ligne avec cible observée).
- Rétablir un split temporel strict (`max(train) < min(test)`) avant toute validation de production.
- Corriger la classification de provenance : `postgresql_d2f` (base dev) ≠ `INSTITUTIONAL_RECORD` sans preuve d'origine institutionnelle.
- QA DSI en environnement dédié (recette, runbook) — base non jointe depuis le conteneur de validation locale.
- Ne jamais présenter les métriques du pipeline démo (ni celles de v1.0.0/v1.1.0, rétroclassées démo) comme des performances sur les enseignants réels d'ESPRIT.

## Sources

- `esprit_D2F-predictive-analytics/data/models/model_registry.json` (v1.0.0 ACTIVE/APPROVED RMSE 0.9883 MAE 0.6388 R² 0.1897 ; v1.1.0 CANDIDATE/PENDING RMSE 1.0625 MAE 0.7595 R² 0.0527).
- `esprit_D2F-predictive-analytics/data/models/demo/model_registry_demo.json` (demo-gap-synthetic-v1.0.0, SYNTHETIC, DEMO_ONLY, `institutional_verified=false`).
- `esprit_D2F-predictive-analytics/data/models/temporal_training_metadata.json` (features `current_level_*`, split `temporal_strict_cutoff_2026-07-22`, n_train 86 / n_test 21).
- `esprit_D2F-predictive-analytics/reports/target_coverage_report.json` (0 cible observée, extrapolation interdite).
- `esprit_D2F-predictive-analytics/reports/final_model_choice.json` (MLP RMSE 0.7402 MAE 0.4316 R² 0.3495, gain 33,9 % vs persistance).
- `esprit_D2F-predictive-analytics/reports/final_provenance_report.json`, `final_demo_dataset_validation.json`, `final_production_dataset_validation.json`.