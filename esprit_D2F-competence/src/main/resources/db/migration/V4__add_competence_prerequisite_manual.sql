ALTER TABLE competences
    ADD COLUMN IF NOT EXISTS prerequisite_manual TEXT;
