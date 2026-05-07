-- Migration V11: Ensure event_published column exists
-- This column is used to track if an approval event has been published to RabbitMQ.
-- Conformité DSI §2.2.3

ALTER TABLE besoin_formation 
    ADD COLUMN IF NOT EXISTS event_published BOOLEAN DEFAULT FALSE NOT NULL;
