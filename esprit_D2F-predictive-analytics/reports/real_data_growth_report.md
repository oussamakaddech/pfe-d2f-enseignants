# Rapport de croissance du corpus réel — mission augmentation

_Généré le 2026-08-20T02:20:15.845737+00:00 — `v1.2.0`_

## Décision

**Aucune augmentation réelle possible sans nouvelles données métier.**

Le dataset `training_corpus_v1_2_0.csv` n'a **pas** été créé : aucune
observation de la base ne possède une cible `gap_next_3m` réellement
observée à `ref_month + 3 mois`.

## Chiffres

| Indicateur | Valeur |
|---|---|
| Nouvelles lignes réelles ajoutées | 0 |
| Observations brutes réelles auditées | 172 |
| Enseignants distincts | 40 |
| Compétences distinctes | 13 |
| Mois couverts | 36 (2016-03, 2019-06, 2021-01, 2021-03, 2022-02, 2022-06, 2022-09, 2022-10, 2023-01, 2023-03, 2023-06, 2023-07, 2023-08, 2023-09, 2023-11, 2023-12, 2024-01, 2024-02, 2024-03, 2024-04, 2024-05, 2024-06, 2024-07, 2024-08, 2024-09, 2025-01, 2025-02, 2025-03, 2025-04, 2025-05, 2025-06, 2025-08, 2025-09, 2026-01, 2026-02, 2026-07) |
| Doublons | 0 |
| Conflits | 0 |

## Cause bloquante

La base ne contient qu'une seule ligne par paire (enseignant, savoir) dans competence.enseignant_competences (0 paire dupliquée). Aucune observation de niveau n'existe à ref_month + 3 mois pour quelconque observation : la cible gap_next_3m observée est donc incalculable. Le corpus actuel v1.0.0/v1.1.0 a calculé cette cible par extrapolation de tendance (cur_t + rolling), ce qui est interdit.

## Sources auditées

| Table | Lignes | Avec date | Enseignants | Compétences | Date min | Date max |
|---|---|---|---|---|---|---|
| `competence.enseignant_competences` | 363 | 363 | 40 | 35 | 2015-09-01 | 2026-07-22 |
| `competence.savoirs` | 42 | 42 | None | None | 2026-01-01 08:00:00 | 2026-08-02 04:03:40.313216 |
| `competence.sous_competences` | 20 | 20 | None | None | 2026-01-01 08:00:00 | 2026-08-01 22:19:47.764357 |
| `competence.competences` | 15 | 15 | None | None | 2026-01-01 08:00:00 | 2026-08-02 04:03:40.313216 |
| `competence.niveau_savoir_requis` | 77 | 77 | None | None | 2026-01-01 08:00:00 | 2026-08-02 04:03:40.313216 |
| `formation.enseignants` | 40 | 12 | None | None | 2026-08-01 22:19:47.764357 | 2026-08-02 04:03:40.313216 |
| `formation.formations` | 11 | 11 | None | None | 2026-01-15 | 2026-11-02 |
| `formation.inscriptions` | 22 | 22 | 12 | None | 2025-12-10 09:00:00+00 | 2026-08-05 00:00:00+00 |
| `formation.presences` | 71 | 62 | 5 | None | 2026-01-15 00:00:00 | 2026-07-21 05:03:29.610265 |
| `formation.seances` | 9 | 9 | None | None | 2026-01-15 | 2026-09-29 |
| `formation.formation_competences` | 18 | 15 | None | 13 | 2026-07-21 05:03:48.399201 | 2026-08-02 04:03:40.313216 |
| `evaluation.evaluation_formateur` | 10 | 6 | 6 | None | 2026-02-28 00:00:00 | 2026-06-30 00:00:00 |
| `evaluation.evaluation_globale` | 2 | 2 | None | None | 2026-02-28 | 2026-05-01 |
| `besoin.besoin_formation` | 14 | 10 | None | None | 2026-01-10 00:00:00 | 2026-04-15 00:00:00 |
| `besoin.besoin_competences` | 5 | 5 | None | None | 2026-07-21 05:03:48.389187 | 2026-07-21 05:04:13.245145 |
| `certificat.certificates` | 4 | 0 | 4 | None | None | None |
| `analyse.skill_gaps` | 0 | 0 | None | None | None | None |
| `analyse.teacher_competence_coverage` | 0 | 0 | None | None | None | None |
| `analyse.feature_snapshots` | 0 | 0 | None | None | None | None |
| `analyse.teacher_risk_snapshots` | 0 | 0 | None | None | None | None |
| `analyse.prediction_results` | 0 | 0 | None | None | None | None |