-- Allow savoir to be attached either to a sous-competence or directly to a competence.

ALTER TABLE savoirs
    ADD COLUMN IF NOT EXISTS competence_id BIGINT;

ALTER TABLE savoirs
    ALTER COLUMN sous_competence_id DROP NOT NULL;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1
        FROM pg_constraint
        WHERE conname = 'fk_savoirs_competence'
    ) THEN
        ALTER TABLE savoirs
            ADD CONSTRAINT fk_savoirs_competence
                FOREIGN KEY (competence_id)
                REFERENCES competences(id)
                ON DELETE CASCADE;
    END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_savoir_competence ON savoirs(competence_id);

ALTER TABLE savoirs
    DROP CONSTRAINT IF EXISTS chk_savoir_single_parent;

ALTER TABLE savoirs
    ADD CONSTRAINT chk_savoir_single_parent
    CHECK (
        (sous_competence_id IS NOT NULL AND competence_id IS NULL)
        OR
        (sous_competence_id IS NULL AND competence_id IS NOT NULL)
    );
