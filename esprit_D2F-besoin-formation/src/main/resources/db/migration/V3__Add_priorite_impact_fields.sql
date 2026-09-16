-- §2.2.2 — Ajout des champs de priorité et impact stratégique
-- Permet de prioriser les besoins en fonction de l'urgence et de l'impact.

ALTER TABLE besoin_formation
    ADD COLUMN IF NOT EXISTS priorite VARCHAR(20) DEFAULT NULL,
    ADD COLUMN IF NOT EXISTS impact_strategique TEXT DEFAULT NULL;
