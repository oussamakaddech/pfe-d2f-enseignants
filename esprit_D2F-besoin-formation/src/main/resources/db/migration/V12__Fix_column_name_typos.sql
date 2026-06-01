-- Fix typos in column names introduced in baseline migration
-- Issue: id_besion_formation should be id_besoin_formation
-- Issue: approuvecup should be approuve_cup for consistency
-- Note: This migration is idempotent - it safely handles if columns were already renamed

DO $$
BEGIN
    -- Rename id_besion_formation to id_besoin_formation (if it exists)
    IF EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'besoin_formation' AND column_name = 'id_besion_formation'
    ) THEN
        ALTER TABLE besoin_formation RENAME COLUMN id_besion_formation TO id_besoin_formation;
    END IF;
    
    -- Rename approuvecup to approuve_cup (if it exists)
    IF EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'besoin_formation' AND column_name = 'approuvecup'
    ) THEN
        ALTER TABLE besoin_formation RENAME COLUMN approuvecup TO approuve_cup;
    END IF;
END $$;
