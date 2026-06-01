-- Migration V9: Ajout de la colonne periode_formation
-- Utilisé pour spécifier la période souhaitée pour la formation (ex: "Semestre 1", "Juin 2024")
-- Conformité DSI §2.2.3 - Extension des champs de planification

ALTER TABLE besoin_formation 
    ADD COLUMN IF NOT EXISTS periode_formation VARCHAR(255) DEFAULT NULL;
