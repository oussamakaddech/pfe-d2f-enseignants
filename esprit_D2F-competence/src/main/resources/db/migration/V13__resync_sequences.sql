-- V13 : resynchronise les séquences d'ID du schéma competence.
--
-- Contexte : des scripts de seed / migration manuelle (created_by 'seed',
-- 'migration-seed', 'migration-specialite') ont inséré des lignes avec des IDs
-- explicites sans avancer les séquences. Les séquences accusaient un retard
-- important (ex. savoirs_id_seq à 16 pour un max(id) à 47) et tout INSERT via
-- JPA échouait avec « duplicate key value violates unique constraint
-- "<table>_pkey" » – notamment POST /api/v1/rice/import (HTTP 500).
--
-- Idempotent et réexécutable sans effet de bord : chaque séquence n'est
-- recalée que si sa table contient au moins une ligne (setval(seq, 0) est
-- interdit sur une table vide). À rejouer manuellement après tout import SQL
-- utilisant des IDs explicites :
--   SELECT setval('competence.<table>_id_seq', (SELECT max(id) FROM competence.<table>))
--   WHERE EXISTS (SELECT 1 FROM competence.<table>);

SELECT setval('competence.domaines_id_seq', (SELECT max(id) FROM competence.domaines))
WHERE EXISTS (SELECT 1 FROM competence.domaines);
SELECT setval('competence.competences_id_seq', (SELECT max(id) FROM competence.competences))
WHERE EXISTS (SELECT 1 FROM competence.competences);
SELECT setval('competence.sous_competences_id_seq', (SELECT max(id) FROM competence.sous_competences))
WHERE EXISTS (SELECT 1 FROM competence.sous_competences);
SELECT setval('competence.savoirs_id_seq', (SELECT max(id) FROM competence.savoirs))
WHERE EXISTS (SELECT 1 FROM competence.savoirs);
SELECT setval('competence.enseignant_competences_id_seq', (SELECT max(id) FROM competence.enseignant_competences))
WHERE EXISTS (SELECT 1 FROM competence.enseignant_competences);
SELECT setval('competence.niveau_savoir_requis_id_seq', (SELECT max(id) FROM competence.niveau_savoir_requis))
WHERE EXISTS (SELECT 1 FROM competence.niveau_savoir_requis);
SELECT setval('competence.competence_prerequisite_id_seq', (SELECT max(id) FROM competence.competence_prerequisite))
WHERE EXISTS (SELECT 1 FROM competence.competence_prerequisite);
SELECT setval('competence.rice_import_logs_id_seq', (SELECT max(id) FROM competence.rice_import_logs))
WHERE EXISTS (SELECT 1 FROM competence.rice_import_logs);
