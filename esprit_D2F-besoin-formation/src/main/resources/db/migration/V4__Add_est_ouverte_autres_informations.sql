-- Migration V4: Ajouter les champs type ouvert/fermé et autres informations
-- § 2.2.3 — Amélioration du modèle de besoins en formations

ALTER TABLE besoin_formation
ADD COLUMN est_ouverte BOOLEAN DEFAULT false,
ADD COLUMN autres_informations TEXT;

-- Commentaire pour la documentation
COMMENT ON COLUMN besoin_formation.est_ouverte IS 'Indique si la formation est ouverte (true) ou fermée (false) à d''autres UPs';
COMMENT ON COLUMN besoin_formation.autres_informations IS 'Informations additionnelles ou spéciales pour la formation';
