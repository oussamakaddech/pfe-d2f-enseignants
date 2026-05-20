-- V17__fix_formation_etat.sql
-- Corrige les valeurs insérées par V16 avec des noms d'enum invalides.
-- etat_formation : TERMINEE → ACHEVE  |  PLANIFIEE → PLANIFIE
-- period_code    : 2025-2026-S2 → P2  |  2026-2027-S1 → P1

UPDATE formations SET etat_formation = 'ACHEVE'  WHERE etat_formation = 'TERMINEE';
UPDATE formations SET etat_formation = 'PLANIFIE' WHERE etat_formation = 'PLANIFIEE';
UPDATE formations SET period_code    = 'P2'       WHERE period_code    = '2025-2026-S2';
UPDATE formations SET period_code    = 'P1'       WHERE period_code    = '2026-2027-S1';
