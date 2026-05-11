-- Solution to fix the missing column issue in formations table
-- This script adds the missing last_refresh_date column to the formations table

-- Add the missing column
ALTER TABLE formations ADD COLUMN IF NOT EXISTS last_refresh_date TIMESTAMP WITH TIME ZONE;

-- If the above doesn't work due to the IF NOT EXISTS clause not being supported in some databases,
-- we can also try this more compatible version:
-- ALTER TABLE formations ADD COLUMN last_refresh_date TIMESTAMP WITH TIME ZONE;