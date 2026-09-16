-- Add recursive hierarchy support for sous_competences
ALTER TABLE sous_competences
    ADD COLUMN IF NOT EXISTS parent_id BIGINT,
    ADD COLUMN IF NOT EXISTS niveau INTEGER;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1
        FROM pg_constraint
        WHERE conname = 'fk_sous_competences_parent'
    ) THEN
        ALTER TABLE sous_competences
            ADD CONSTRAINT fk_sous_competences_parent
            FOREIGN KEY (parent_id) REFERENCES sous_competences(id) ON DELETE CASCADE;
    END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_sc_parent ON sous_competences(parent_id);
CREATE INDEX IF NOT EXISTS idx_sc_niveau ON sous_competences(niveau);

-- Initialize levels with 1 by default, then recompute using tree depth.
UPDATE sous_competences SET niveau = 1 WHERE niveau IS NULL;

WITH RECURSIVE sc_tree AS (
    SELECT id, parent_id, 1 AS lvl
    FROM sous_competences
    WHERE parent_id IS NULL
    UNION ALL
    SELECT child.id, child.parent_id, sc_tree.lvl + 1
    FROM sous_competences child
    JOIN sc_tree ON child.parent_id = sc_tree.id
)
UPDATE sous_competences sc
SET niveau = sc_tree.lvl
FROM sc_tree
WHERE sc.id = sc_tree.id;

ALTER TABLE sous_competences
    ALTER COLUMN niveau SET NOT NULL;
