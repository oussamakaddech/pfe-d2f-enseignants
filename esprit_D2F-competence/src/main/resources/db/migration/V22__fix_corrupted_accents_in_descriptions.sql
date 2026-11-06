-- V22__fix_corrupted_accents_in_descriptions.sql
-- Répare 6 descriptions du référentiel dont les lettres accentuées ont été
-- remplacées par « ?? » lors d'un import (octets UTF-8 perdus). Ces textes sont
-- affichés tels quels dans les pages Référentiel / RICE et servent au
-- rapprochement sémantique de RICE (un mot tronqué y dégrade la similarité).
--
-- Chaque correction remplace UNIQUEMENT le fragment corrompu par le mot
-- français dont il est la trace (la lettre perdue est toujours é) :
--
--   competences 9  (DATA.ENG)  donn??es        → données
--   competences 11 (PED.NUM)   num??riques     → numériques
--   savoirs 25                 agr??gation     → agrégation
--   savoirs 27                 Mod??lisation   → Modélisation
--   savoirs 30                 sc??narisation  → scénarisation
--   savoirs 31                 p??dagogiques   → pédagogiques
--
-- Idempotent : les UPDATE ne ciblent que les lignes qui contiennent encore
-- le fragment corrompu ; un rejeu ne modifie rien.

UPDATE competence.competences
SET description = replace(description, 'donn??es', 'données')
WHERE code = 'DATA.ENG' AND description LIKE '%donn??es%';

UPDATE competence.competences
SET description = replace(description, 'num??riques', 'numériques')
WHERE code = 'PED.NUM' AND description LIKE '%num??riques%';

UPDATE competence.savoirs
SET description = replace(description, 'agr??gation', 'agrégation')
WHERE description LIKE '%agr??gation%';

UPDATE competence.savoirs
SET description = replace(description, 'Mod??lisation', 'Modélisation')
WHERE description LIKE '%Mod??lisation%';

UPDATE competence.savoirs
SET description = replace(description, 'sc??narisation', 'scénarisation')
WHERE description LIKE '%sc??narisation%';

UPDATE competence.savoirs
SET description = replace(description, 'p??dagogiques', 'pédagogiques')
WHERE description LIKE '%p??dagogiques%';
