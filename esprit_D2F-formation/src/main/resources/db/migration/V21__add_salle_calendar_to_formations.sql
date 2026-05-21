-- V21: ajout salle (lieu de formation) et calendar_event_id (Outlook) sur la table formations
ALTER TABLE formation.formations
    ADD COLUMN IF NOT EXISTS salle               VARCHAR(255),
    ADD COLUMN IF NOT EXISTS calendar_event_id   VARCHAR(512);
