-- Migration V24 : acteurs proposés du besoin de formation
-- Ajoute les listes d'animateurs et d'enseignants participants sélectionnés
-- depuis la base enseignants (stockées en texte, une ligne "Nom Prénom <email>" par acteur).

ALTER TABLE besoin_formation ADD COLUMN IF NOT EXISTS animateurs  TEXT;
ALTER TABLE besoin_formation ADD COLUMN IF NOT EXISTS enseignants TEXT;

COMMENT ON COLUMN besoin_formation.animateurs  IS 'Animateurs proposés (une ligne "Nom Prénom <email>" par animateur)';
COMMENT ON COLUMN besoin_formation.enseignants IS 'Enseignants participants proposés (une ligne "Nom Prénom <email>" par enseignant)';
