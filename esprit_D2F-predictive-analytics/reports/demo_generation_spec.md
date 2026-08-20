# Spécification de génération — dataset synthétique démo (synthetic-v1.0.0)

> Documente la formule de génération. **Aucune donnée réelle.** Les performances
> associées ne représentent PAS les enseignants réels d'ESPRIT.

## Granularité
Une ligne = `teacher_id` (`SYN_T0001..`) + `competence_id` (1..13) + `ref_month`
(périodes mensuelles 2025-01 .. 2026-06 pour 18 mois). Chaque ligne embarque le
snapshot historique `current_level_t3..t` conformément au contrat réel du projet
(`data/clean/training_corpus_from_db.csv`, schéma de features 1.0) : la cible
`gap_next_3m` est mesurée à chaque mois observable.

## Processus latent (par enseignant × compétence)
- Aptitude initiale `S0 ~ N(3.0, 0.85)` coupée à [1, 5] ; dérive mensuelle
  `drift ~ N(-0.03, 0.045)` ; bruit mensuel `N(0, 0.07)`.
- Niveau observé `L_m = round(clip(S_m, 1, 5))` ; `gap_now = required - L_m`.
- Niveau requis de la compétence `R_c = 3 + (c mod 3)` ∈ {3,4,5} ;
  `knowledge_difficulty_level = R_c − 2` (difficulté pédagogique du savoir,
  **jamais** une mesure de maîtrise de l'enseignant — jamais feature).
- Formations : événement mensuel de complétion avec probabilité
  `p = clip(0.03 + 0.09·assiduité + 0.02·γ, 0.02, 0.30)` ; une complétion
  améliore `S` de `U(0.2, 0.55)` avec probabilité 0.55 (plafond 5).
  Des formations planifiées (connues à `m`, dues à `m+1..m+2`, complétées à 80 %)
  alimentent `nb_formations_in_progress` → signal apprenable anticipant le futur.

## Cible
`gap_next_3m = clip(R_c − L_{m+3} + N(0, 0.22), 0, 5)`.
Le bruit + les événements de formation futurs **non observables** empêchent une
cible parfaitement calculable par une seule feature ; la persistance
(`gap_now`) reste la prévision naïve à battre.

## Corrélations de domaine (conformes à la spécification)
- faible assiduité → engagement plus faible (`engagement = 0.45·att + 0.25·activité formation + 0.15·eval/5 + 0.15·(1−stagnation/12) + N(0, 0.07)`) ;
- forte stagnation → gap futur généralement plus élevé (absence de bump de niveau) ;
- formations suivies/planifiées → gap futur légèrement plus faible ;
- évaluations faibles → risque plus élevé (utilisé par les labels risque synthétiques).

## Colonnes de provenance (chaque ligne)
`data_origin=SYNTHETIC`, `is_synthetic=true`, `institutional_verified=false`,
`source_type=synthetic_generator`, `source_id=demo_gen_seed42`,
`generation_seed=42`, `generator_version`, `dataset_version=synthetic-v1.0.0`,
`created_at = fin du mois ref_month` (contrôle `source_time <= ref_month`).

## Défauts délibérés (nettoyage traçable, seed 42+777)
Sur les 1 000 lignes cibles : 12 `evaluation_score` manquants ; 6 assiduités
négatives ; 3 assiduités > 1 ; 4 `gap_next_3m` hors plage (5.7) — tous
corrigés/imputés de façon traçable. Lignes SURNUMÉRAIRES non corrigeables :
8 doublons exacts (supprimés), 3 lignes `taux_assiduite="high"` (quarantaine),
2 `ref_month` invalides (quarantaine). → corpus brut = 1 013 lignes ; après
nettoyage = exactement 1 000 lignes.

## Reproductibilité
`np.random.default_rng(seed)`, boucles à ordre déterministe, CSV LF/UTF-8.
seed 42 → dataset et hash identiques ; seed différente → dataset différent.
