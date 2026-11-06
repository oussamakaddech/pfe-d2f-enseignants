-- Trace l'origine de chaque ligne de gap : valeur de Trend au moment du calcul.
-- DECLARED_ML / WORSENING => produit par le modèle ML ;
-- IMPROVING / STABLE / DECLINING => produit par le moteur heuristique.
-- Permet à l'API d'exposer un model_mode honnête pour les lignes servies.
ALTER TABLE "analyse".skill_gaps
    ADD COLUMN IF NOT EXISTS tendance VARCHAR(20);
