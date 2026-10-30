ALTER TABLE presences
    ADD COLUMN IF NOT EXISTS status VARCHAR(20),
    ADD COLUMN IF NOT EXISTS arrival_time TIME,
    ADD COLUMN IF NOT EXISTS departure_time TIME,
    ADD COLUMN IF NOT EXISTS justification VARCHAR(500),
    ADD COLUMN IF NOT EXISTS recorded_by VARCHAR(150),
    ADD COLUMN IF NOT EXISTS recorded_at TIMESTAMP;

UPDATE presences
SET status = CASE WHEN presence = TRUE THEN 'PRESENT' ELSE 'ABSENT' END
WHERE status IS NULL;

ALTER TABLE presences
    ALTER COLUMN status SET DEFAULT 'ABSENT';

-- Dé-duplication : une seule présence par couple (séance, participant).
-- On garde l'enregistrement le plus récent (id_participation maximal).
DELETE FROM presences p
USING presences keep
WHERE p.seance_id = keep.seance_id
  AND p.enseignant_id = keep.enseignant_id
  AND p.id_participation < keep.id_participation;

CREATE UNIQUE INDEX IF NOT EXISTS uq_presence_session_participant
    ON presences (seance_id, enseignant_id);