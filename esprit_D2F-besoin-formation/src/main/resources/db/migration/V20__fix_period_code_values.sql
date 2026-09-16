-- V20 : Correction des valeurs period_code obsolètes (P1, P2)
-- V17 avait converti vers P1/P2 qui sont maintenant eux-mêmes invalides.
-- Enum actuel : WINTER, SUMMER, SPRINT, WORKSHOP, OTHER
-- P1 = premier semestre (hiver) → WINTER
-- P2 = deuxième semestre (été)  → SUMMER
UPDATE besoin_formation SET period_code = 'WINTER' WHERE period_code = 'P1';
UPDATE besoin_formation SET period_code = 'SUMMER' WHERE period_code = 'P2';
-- Sécurité : toute autre valeur inconnue → OTHER
UPDATE besoin_formation
SET period_code = 'OTHER'
WHERE period_code IS NOT NULL
  AND period_code NOT IN ('WINTER', 'SUMMER', 'SPRINT', 'WORKSHOP', 'OTHER');
