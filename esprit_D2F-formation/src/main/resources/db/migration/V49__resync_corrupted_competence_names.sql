-- V49__resync_corrupted_competence_names.sql
-- formation_competences recopie les libellés du référentiel (competence_nom,
-- savoir_nom). Neuf copies ont perdu leurs lettres accentuées lors d'un import
-- (« Ing??nierie des Donn??es », « Vid??os & Micro-learning »…), alors que le
-- référentiel porte le libellé correct. Ces copies sont affichées dans la fiche
-- formation et les recommandations.
--
-- Correction : on recopie le libellé depuis la source (schéma competence), en
-- ne touchant QUE les lignes dont la copie contient encore « ?? ». Aucune
-- donnée inventée ; idempotent (un rejeu ne trouve plus de ligne corrompue).

UPDATE formation.formation_competences fc
SET competence_nom = c.nom
FROM competence.competences c
WHERE c.id = fc.competence_id
  AND fc.competence_nom LIKE '%??%'
  AND c.nom NOT LIKE '%??%';

UPDATE formation.formation_competences fc
SET savoir_nom = s.nom
FROM competence.savoirs s
WHERE s.id = fc.savoir_id
  AND fc.savoir_nom LIKE '%??%'
  AND s.nom NOT LIKE '%??%';
