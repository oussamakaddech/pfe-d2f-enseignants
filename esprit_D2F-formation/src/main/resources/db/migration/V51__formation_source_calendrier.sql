-- Formations créées par l'import du calendrier des ateliers (.xlsx).
-- La page « Gestion du calendrier » ne liste que celles-ci, pas les formations
-- saisies dans l'application (même lorsqu'elles ont des séances).
ALTER TABLE formation.formations
    ADD COLUMN IF NOT EXISTS source_calendrier BOOLEAN NOT NULL DEFAULT FALSE;
