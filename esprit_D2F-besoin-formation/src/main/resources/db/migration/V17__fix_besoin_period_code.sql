-- V17__fix_besoin_period_code.sql
-- Corrige les valeurs insérées par V16 avec des noms d'enum invalides.
-- period_code  : 2025-2026-S2 → P2  |  2026-2027-S1 → P1
-- type_besoin  : INTERNE → COLLECTIF  |  EXTERNE → INDIVIDUEL

UPDATE besoin_formation SET period_code = 'P2'        WHERE period_code = '2025-2026-S2';
UPDATE besoin_formation SET period_code = 'P1'        WHERE period_code = '2026-2027-S1';
UPDATE besoin_formation SET type_besoin = 'COLLECTIF'  WHERE type_besoin = 'INTERNE';
UPDATE besoin_formation SET type_besoin = 'INDIVIDUEL' WHERE type_besoin = 'EXTERNE';
