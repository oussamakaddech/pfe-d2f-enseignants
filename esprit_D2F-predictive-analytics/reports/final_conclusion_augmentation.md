# Conclusion — Mission augmentation du corpus réel

**« Aucune augmentation réelle possible sans nouvelles données métier. »**

| Rubrique | Valeur |
|---|---|
| Ancien corpus | v1.0.0 (107 lignes) / v1.1.0 (172 lignes) |
| Nouveau corpus | v1.2.0 — **non créé** (0 ligne avec vraie cible) |
| Nouvelles lignes réelles | 0 |
| Enseignants | 40 (base : 40 enseignants actifs seulement) |
| Compétences | 13 |
| Mois | 36 (2016-03, 2019-06, 2021-01, 2021-03, 2022-02, 2022-06, 2022-09, 2022-10, 2023-01, 2023-03, 2023-06, 2023-07, 2023-08, 2023-09, 2023-11, 2023-12, 2024-01, 2024-02, 2024-03, 2024-04, 2024-05, 2024-06, 2024-07, 2024-08, 2024-09, 2025-01, 2025-02, 2025-03, 2025-04, 2025-05, 2025-06, 2025-08, 2025-09, 2026-01, 2026-02, 2026-07) |
| Provenance | postgresql_d2f (audit 20 tables) |
| Modèle actif | v1.0.0 (GBR) — inchangé |
| Modèle candidat | aucun (v1.2.0 inexistant) |
| RMSE | inchangé v1.0.0 : 0.9883 (test) / 1.2161 (commun) |
| MAE | inchangé v1.0.0 : 0.6388 |
| R² | inchangé v1.0.0 : 0.1897 |
| IC95 | inchangé v1.0.0 : [0.91 ; 1.54] |
| Décision | AUCUNE_AUGMENTATION_REALISEE — pas de promotion, registre intact |
| Tests | 285 passed (suite existante) ; 0 test ajouté pour un modèle inexistant |
| Limites | Pas d'historique (0 paire dupliquée enseignant/savoir), pas de niveau observé à +3 mois, 263/363 lignes importées en masse au 2026-07-22, niveaux 0 dans skill_gaps (182/271) et coverage (272/272), 40 enseignants max. La cible `gap_next_3m` des corpus actuels est une extrapolation de tendance (documentée comme limitation) |

## Détail des causes

1. **Aucune observation future réelle** : chaque paire (enseignant, savoir)
   n'apparaît qu'une seule fois dans `competence.enseignant_competences`
   (0 paire dupliquée, `version > 1` = 0). Une cible `gap_next_3m` honnête
   exige une observation de niveau à `ref_month + 3 mois` : aucune n'existe.
2. **Import en masse** : 263/363 lignes portent `date_acquisition =
   2026-07-22` (un seul snapshot, pas de série temporelle).
3. **Tables `analyse.*`** : `teacher_competence_coverage` = 272/272 lignes
   à `current_level = 0`, toutes au 2026-07-30 ; `skill_gaps` = 182/271 à
   `niveau_actuel = 0`, dates 2026-07-30→08-20 ; `teacher_risk_snapshots`
   = agrégats par enseignant sans dimension compétence ; 5 enseignants de
   `skill_gaps` et 6 de `coverage` n'existent pas dans `formation.enseignants`.
4. **Effectif plafonné** : 40 enseignants actifs (objectif 50+ impossible).
5. **Tables métier restantes** (inscriptions 22, présences 71, évaluations
   10, besoins 14, certificats 4) : volumes trop faibles et sans niveau
   observé par (enseignant, compétence) — inexploitables pour la cible.

## Conséquences

- Aucun `training_corpus_v1_2_0.csv` généré ; aucun modèle v1.2.0 entraîné ;
  aucune modification du registre ni du modèle actif (v1.0.0).
- Le corpus brut réel (`data/clean/corpus_brut_real_raw.csv`, 172 lignes)
  est conservé avec cible vide : il documente l'état réel sans rien inventer.
- L'extracteur corrigé (`pipelines/extract_real_observations.py`) ne fabrique
  plus de cible : il renvoie NaN et déclenche l'arrêt explicite.
- Prochaine étape nécessaire : collecter de nouvelles données métier
  (réévaluations périodiques des compétences, observatoire à +3 mois).
