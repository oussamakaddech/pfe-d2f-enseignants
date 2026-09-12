-- V12 : corrige le nom d'une compétence issue d'un import manuel
-- (modèle non résolu : "Acquis d'apprentissage – : Web Sémantique").
-- Le libellé propre est dérivé du code GC_MT-34-C1 (UE "Web Sémantique").
-- Idempotent : ne touche que la ligne au nom non résolu.

UPDATE competence.competences
SET nom = 'Web Sémantique',
    updated_at = NOW(),
    updated_by = 'flyway-V12'
WHERE code = 'GC_MT-34-C1'
  AND nom LIKE 'Acquis d''apprentissage%';
