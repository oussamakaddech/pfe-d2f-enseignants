ALTER TABLE domaines ADD COLUMN IF NOT EXISTS up_id          BIGINT;
ALTER TABLE domaines ADD COLUMN IF NOT EXISTS departement_id BIGINT;

CREATE INDEX IF NOT EXISTS idx_domaine_up         ON domaines(up_id);
CREATE INDEX IF NOT EXISTS idx_domaine_departement ON domaines(departement_id);
