-- V14__add_last_refresh_date_to_besoins.sql
ALTER TABLE besoin_formation ADD COLUMN IF NOT EXISTS last_refresh_date TIMESTAMP WITHOUT TIME ZONE;
