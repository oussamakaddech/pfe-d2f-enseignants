-- Numérotation de séance « Séance X/Y » + statut de diffusion, importés depuis
-- le calendrier des ateliers (.xlsx).
ALTER TABLE formation.seances
    ADD COLUMN IF NOT EXISTS session_number  INTEGER,
    ADD COLUMN IF NOT EXISTS total_sessions  INTEGER,
    ADD COLUMN IF NOT EXISTS session_status  VARCHAR(30);

COMMENT ON COLUMN formation.seances.session_number IS 'Numéro de séance X dans « Séance X/Y »';
COMMENT ON COLUMN formation.seances.total_sessions IS 'Nombre total de séances Y dans « Séance X/Y »';
COMMENT ON COLUMN formation.seances.session_status IS 'Statut de diffusion : TEAMS, OPEN ou CLOSED';
