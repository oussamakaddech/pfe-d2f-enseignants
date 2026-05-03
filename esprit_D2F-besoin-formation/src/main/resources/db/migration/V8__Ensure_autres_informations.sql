-- Migration V8: Assurer la présence des colonnes est_ouverte et autres_informations
-- Nécessaire car la version de schéma était désynchronisée (7) alors que V4 n'était pas appliquée.

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='besoin_formation' AND column_name='est_ouverte') THEN
        ALTER TABLE besoin_formation ADD COLUMN est_ouverte BOOLEAN DEFAULT false;
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='besoin_formation' AND column_name='autres_informations') THEN
        ALTER TABLE besoin_formation ADD COLUMN autres_informations TEXT;
    END IF;
END $$;
