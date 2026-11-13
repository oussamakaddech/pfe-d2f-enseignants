-- Rattrapage des calendriers anciens déjà importés (page « Gestion du calendrier »).
--
-- L'import pose désormais l'état calculé à partir des dates, avec la règle unique
-- du planificateur (FormationStateScheduler.computeNextState : avant le début →
-- PLANIFIE, du début à la fin inclus → EN_COURS, après la fin → ACHEVE).
-- Les classeurs importés AVANT ce correctif sont restés dans leur état d'origine
-- (PLANIFIE par défaut, ou l'état de la formation réutilisée par titre) : on les
-- archive ici, sans attendre le prochain passage du planificateur.
--
-- Ciblage strict :
--   * source_calendrier = TRUE  → seules les formations issues d'un fichier .xlsx
--                                 (une formation saisie dans l'application n'est
--                                 jamais touchée, même si elle a des séances) ;
--   * deleted_at IS NULL        → les formations supprimées restent telles quelles ;
--   * état encore « ouvert »    → ACHEVE et ANNULE sont définitifs : jamais écrasés ;
--   * date_fin < aujourd'hui    → une formation en cours ou future n'est pas archivée.
--
-- « Aujourd'hui » est lu en Africa/Tunis, comme le planificateur, et non dans le
-- fuseau de la session Flyway (UTC) : une formation qui se termine aujourd'hui en
-- Tunisie ne doit pas être archivée avec un jour d'avance.
--
-- Idempotent : la liste d'états d'origine exclut les lignes déjà mises à jour, donc
-- un rejeu ne modifie plus rien.
--
-- Retour arrière (approximatif, l'état d'origine n'est pas mémorisé) :
--   UPDATE formation.formations SET etat_formation = 'PLANIFIE'
--   WHERE source_calendrier = TRUE AND etat_formation = 'ACHEVE';
UPDATE formation.formations
SET etat_formation = 'ACHEVE'
WHERE source_calendrier = TRUE
  AND deleted_at IS NULL
  AND etat_formation IN ('NOUVEAU', 'ENREGISTRE', 'PLANIFIE', 'VISIBLE', 'EN_COURS')
  AND date_fin < (now() AT TIME ZONE 'Africa/Tunis')::date;
