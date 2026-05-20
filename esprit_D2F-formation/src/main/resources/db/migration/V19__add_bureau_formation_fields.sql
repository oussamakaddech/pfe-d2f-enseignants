-- V19: champs bureau de formation externe
ALTER TABLE formation.formations
    ADD COLUMN IF NOT EXISTS bureau_formation_nom         VARCHAR(255),
    ADD COLUMN IF NOT EXISTS bureau_formation_mail        VARCHAR(255),
    ADD COLUMN IF NOT EXISTS bureau_formation_telephone   VARCHAR(50);
