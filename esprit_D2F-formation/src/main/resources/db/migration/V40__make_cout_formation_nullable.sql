-- Rendre cout_formation nullable avec valeur par défaut 0.0
-- et corriger les lignes existantes où la valeur est NULL
ALTER TABLE formation.formations
  ALTER COLUMN cout_formation DROP NOT NULL,
  ALTER COLUMN cout_formation SET DEFAULT 0.0;

UPDATE formation.formations
  SET cout_formation = 0.0
  WHERE cout_formation IS NULL;
