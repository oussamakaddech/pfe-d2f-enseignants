-- Ajout des colonnes manquantes pour la gestion des besoins CUP
ALTER TABLE besoin_formation
    ADD COLUMN IF NOT EXISTS titre VARCHAR(255),
    ADD COLUMN IF NOT EXISTS horaire_souhaite VARCHAR(255);
