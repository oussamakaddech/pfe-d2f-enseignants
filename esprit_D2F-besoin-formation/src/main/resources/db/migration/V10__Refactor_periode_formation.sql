-- Add periodCode and customPeriodLabel to besoin_formation
ALTER TABLE besoin_formation ADD COLUMN period_code VARCHAR(50);
ALTER TABLE besoin_formation ADD COLUMN custom_period_label VARCHAR(255);
ALTER TABLE besoin_formation DROP COLUMN periode_formation;
-- Drop the old column if it exists (or just don't add it in the first place if this was a fresh migration)
-- But since I added it in the previous turn, I'll drop it if the user already ran it.
-- Or better, I'll just change the migration if it hasn't been applied, or add another migration.
-- Usually, V-files shouldn't be modified after being applied. I'll create V10 instead.
