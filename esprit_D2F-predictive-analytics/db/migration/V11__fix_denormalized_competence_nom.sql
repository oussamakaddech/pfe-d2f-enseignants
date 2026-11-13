-- V11 : réaligne les noms dénormalisés dans analyse.skill_gaps après le
-- renommage de la compétence GC_MT-34-C1 (modèle d'import non résolu
-- "Acquis d'apprentissage – : Web Sémantique" -> "Web Sémantique").
-- Sans ce correctif, heatmap / offre-demande affichent l'ancien libellé
-- jusqu'au prochain recalcul du pipeline. (recommendations n'étant PAS
-- dénormalisée — le nom est joint à la volée depuis competence.competences —
-- aucune autre table analyse n'est à corriger.)
-- Idempotent : ne touche que les lignes portant l'ancien libellé.

UPDATE "analyse".skill_gaps
SET competence_nom = 'Web Sémantique'
WHERE competence_id IN (
    SELECT id FROM competence.competences WHERE code = 'GC_MT-34-C1'
)
AND competence_nom LIKE 'Acquis d''apprentissage%';
