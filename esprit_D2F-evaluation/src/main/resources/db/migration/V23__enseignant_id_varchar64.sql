-- V23 : élargir enseignant_id (VARCHAR(10) -> VARCHAR(64)).
-- Le format canonique court (ENS###) tient toujours, mais rien n'impose
-- ce format côté JPA (String 255 par défaut) : tout identifiant plus long
-- (UUID, email) provoquait un DataIntegrityViolation au persist.
-- Élargissement compatible validate (même type VARCHAR).
ALTER TABLE evaluation_formateur ALTER COLUMN enseignant_id TYPE VARCHAR(64);
ALTER TABLE evaluation_globale ALTER COLUMN enseignant_id TYPE VARCHAR(64);
