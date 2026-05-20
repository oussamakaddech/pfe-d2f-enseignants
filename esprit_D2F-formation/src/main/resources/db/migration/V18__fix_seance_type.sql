-- V18__fix_seance_type.sql
-- Corrige les valeurs de type_seance insérées par V16 avec des libellés invalides.
-- L'enum TypeSeanceEnum n'accepte que THEORIQUE | PRATIQUE | MIXTE.
-- Les libellés PRESENTIEL/HYBRIDE/DISTANCIEL (mode de diffusion) sont remappés sur MIXTE.

UPDATE seances
SET type_seance = 'MIXTE'
WHERE type_seance IS NOT NULL
  AND type_seance NOT IN ('THEORIQUE', 'PRATIQUE', 'MIXTE');
