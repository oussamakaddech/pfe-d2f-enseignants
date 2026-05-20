-- V7__fix_savoir_type.sql
-- Corrige les valeurs de savoirs.type insérées par V6 avec des noms d'enum invalides.
-- L'enum TypeSavoir n'accepte que THEORIQUE | PRATIQUE.
-- Mapping :
--   SAVOIR        → THEORIQUE   (connaissance théorique)
--   SAVOIR_FAIRE  → PRATIQUE    (savoir-faire pratique)
--   SAVOIR_ETRE   → THEORIQUE   (savoir-être, par défaut théorique)

UPDATE savoirs SET type = 'PRATIQUE'  WHERE type = 'SAVOIR_FAIRE';
UPDATE savoirs SET type = 'THEORIQUE' WHERE type = 'SAVOIR';
UPDATE savoirs SET type = 'THEORIQUE' WHERE type = 'SAVOIR_ETRE';

-- Filet de sécurité : toute valeur résiduelle inconnue → THEORIQUE
UPDATE savoirs
SET type = 'THEORIQUE'
WHERE type IS NOT NULL
  AND type NOT IN ('THEORIQUE', 'PRATIQUE');
