-- V13__add_last_refresh_date_to_formations.sql
ALTER TABLE formations ADD COLUMN IF NOT EXISTS last_refresh_date TIMESTAMP WITH TIME ZONE;
