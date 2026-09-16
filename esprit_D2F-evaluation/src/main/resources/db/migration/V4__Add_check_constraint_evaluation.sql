ALTER TABLE evaluation_formateur ADD CONSTRAINT chk_formation_id CHECK (formation_id IS NOT NULL AND formation_id > 0);
