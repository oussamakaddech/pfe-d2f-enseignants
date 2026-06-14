-- Rendre cout_formation et charge_horaire_global nullable avec valeurs par défaut
-- V1 les déclarait NOT NULL DEFAULT, mais l'import calendar ne les renseigne pas toujours.
ALTER TABLE formation.formations
  ALTER COLUMN cout_formation DROP NOT NULL,
  ALTER COLUMN cout_formation SET DEFAULT 0.0;

ALTER TABLE formation.formations
  ALTER COLUMN charge_horaire_global DROP NOT NULL,
  ALTER COLUMN charge_horaire_global SET DEFAULT 0;

-- Corriger les lignes existantes où la valeur est NULL
UPDATE formation.formations SET cout_formation = 0.0 WHERE cout_formation IS NULL;
UPDATE formation.formations SET charge_horaire_global = 0 WHERE charge_horaire_global IS NULL;
