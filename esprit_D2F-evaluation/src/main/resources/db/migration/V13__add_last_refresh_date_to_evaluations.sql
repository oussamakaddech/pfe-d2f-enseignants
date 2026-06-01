-- V13__add_last_refresh_date_to_evaluations.sql
ALTER TABLE evaluation_globale ADD COLUMN IF NOT EXISTS last_refresh_date TIMESTAMP WITH TIME ZONE;
