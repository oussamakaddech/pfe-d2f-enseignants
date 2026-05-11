-- This script adds the missing last_refresh_date column to the formations table
-- Execute this directly on your PostgreSQL database

ALTER TABLE formations ADD COLUMN IF NOT EXISTS last_refresh_date TIMESTAMP WITH TIME ZONE;