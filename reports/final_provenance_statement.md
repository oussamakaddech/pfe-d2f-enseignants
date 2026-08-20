# Déclaration de provenance — corpus ML du service `esprit_D2F-predictive-analytics`

> Date : 2026-08-20. Déclaration établie par vérification directe des corpus,
> des registres et des rapports d'audit. **Principe : aucune ligne n'est
> qualifiée d'`INSTITUTIONAL_RECORD` sans preuve d'origine institutionnelle
> ESPRIT.**

## 1. Corpus v1.0.0 et v1.1.0 (« production ») — 107 / 172 lignes

- **Source** : base PostgreSQL locale `postgresql_d2f` (`postgresql://d2f:d2f@localhost:7432/d2f`), base de développement de la machine de travail, peuplée par des seed/mock du développeur.
- **Identifiants** : enseignants `ENS001`–`ENS042` (40 enseignants), 11 compétences (v1.0.0) / 13 (v1.1.0) — **nomenclature de mock**, aucune preuve de rattachement à un référentiel institutionnel ESPRIT.
- **Colonnes de provenance présentes** : `source_type`, `source_id`, `is_synthetic`, `created_at`, `dataset_version` ; `source_type = postgresql_d2f`, `is_synthetic = false`.
- **Reclassement opéré** : `INSTITUTIONAL_RECORD` → **`DEMO_SEED`**. La valeur `is_synthetic=false` signifie uniquement « non généré par le générateur synthétique », pas « vérifié institutionnellement ». La validation `reports/final_production_dataset_validation.json` (module ML) qualifie à tort ces lignes d'`INSTITUTIONAL_RECORD` — **cette classification est corrigée ici**.
- **Cible** : `reports/target_coverage_report.json` (module ML) → **0/172 lignes avec observation de niveau réelle à `ref_month + 3 mois`**. La cible `gap_next_3m` présente dans les corpus v1.0.0/v1.1.0 a été calculée par **extrapolation de tendance** (`cur_t + rolling`) — **méthode interdite**. La cible n'est donc pas une observation.
- **Répertoires vérifiés** : `data/clean/training_corpus_from_db.csv` (107), `training_corpus_from_db_v110.csv` (172), `training_corpus_provenanced.csv` / `_v110.csv`.

## 2. Corpus de démonstration — 1 000 lignes

- **Source** : générateur synthétique (`synthetic_generator`), seed 42, 100 enseignants, 13 compétences, 18 mois (2025-01 → 2026-06).
- **Classification** : 1 000/1 000 `DEMO_SEED`, `is_synthetic=true`, `data_origin=SYNTHETIC`, `institutional_verified=false` — **étiquetage correct** (`reports/final_demo_dataset_validation.json`).
- **Fichier** : `data/synthetic/demo_dataset_synthetic-v1.0.0_clean.csv`.

## 3. Provenance exposée par l'API

- L'API sert l'artefact enregistré `gap_predictor_temporal.joblib` **v1.0.0** (`ACTIVE / APPROVED`, mode config `PRODUCTION_ML`). La provenance API = **modèle réellement servi** = v1.0.0.
- Compte tenu du point 1, la présentation honnête de ce modèle est **DEMO_ONLY** (le mode `PRODUCTION_ML` de la config ne reflète pas une validation institutionnelle du corpus).

## 4. Registres de référence

| Registre | Version | Statut | Remarque |
|---|---|---|---|
| `data/models/model_registry.json` | v1.0.0 | ACTIVE / APPROVED | corpus rétroclassé DEMO_SEED |
| `data/models/model_registry.json` | v1.1.0 | CANDIDATE / PENDING | NOT_PROMOTED |
| `data/models/demo/model_registry_demo.json` | demo-gap-synthetic-v1.0.0 | DEMO_ONLY | `institutional_verified=false` |

## 5. Conclusion

Aucun corpus du dépôt ne provient d'un système institutionnel ESPRIT vérifié.
Les corpus « production » sont des **seeds développeur** (base de dev locale)
et leur cible est **fabriquée** ; le corpus de démonstration est **synthétique**
et correctement étiqueté. Toute affirmation de performance sur des enseignants
réels d'ESPRIT est donc **non fondée** jusqu'à l'obtention de données
longitudinales institutionnelles vérifiées.