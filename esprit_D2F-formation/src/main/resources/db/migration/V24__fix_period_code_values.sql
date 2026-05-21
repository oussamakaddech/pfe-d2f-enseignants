-- V24 : Correction des valeurs period_code obsolètes (P1, P2, P3)
-- L'enum PeriodCode a été refactorisé : WINTER, SUMMER, SPRINT, WORKSHOP, OTHER.
-- P1 = premier semestre (hiver) → WINTER
-- P2 = deuxième semestre (été) → SUMMER
-- P3 = troisième période       → OTHER
UPDATE formation.formations SET period_code = 'WINTER' WHERE period_code = 'P1';
UPDATE formation.formations SET period_code = 'SUMMER' WHERE period_code = 'P2';
UPDATE formation.formations SET period_code = 'OTHER'  WHERE period_code = 'P3';
-- Toute autre valeur inconnue → OTHER (sécurité)
UPDATE formation.formations
SET period_code = 'OTHER'
WHERE period_code IS NOT NULL
  AND period_code NOT IN ('WINTER', 'SUMMER', 'SPRINT', 'WORKSHOP', 'OTHER');
