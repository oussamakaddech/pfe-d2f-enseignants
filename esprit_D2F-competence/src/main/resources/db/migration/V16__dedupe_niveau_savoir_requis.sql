-- V16__dedupe_niveau_savoir_requis.sql
-- Déduplique competence.niveau_savoir_requis.
--
-- Contexte : certains savoirs ont jusqu'à 3 lignes de niveau requis avec des
-- niveaux CONTRADICTOIRES (ex : S.ML.SKLEARN → N3_INTERMEDIAIRE migration-seed,
-- N5_EXPERT seed, N3_INTERMEDIAIRE seed-script). L'agrégation par MAX
-- (competency_source.LIST_SAVOIRS_QUERY / predictor._teacher_feature_bundle)
-- retenait N5_EXPERT → cible 4/5 → gaps à 100 % (1.0) pour TOUT enseignant
-- sans niveau enregistré, d'où des profils indistinguables ("gaps similaires
-- pour tous les profils") et un taux de risque artificiellement gonflé.
--
-- Politique (alignée sur V11, la référence officielle du service compétence) :
-- 1) suppression des lignes N5_EXPERT issues des seeds de test ('seed') qui
--    gonflaient la cible au-delà du N3/N2 prévu par V11 ;
-- 2) suppression des doublons de niveaux identiques (migration-seed +
--    seed-script) en conservant la plus ancienne ligne (id minimal) — le niveau
--    étant identique, le comportement MAX est inchangé.
-- Idempotent : les suppressions sont directionnelles (aucune ligne recréée).

-- 1) Lignes N5_EXPERT des seeds de test (cible V11 = N3/N2)
DELETE FROM niveau_savoir_requis
WHERE created_by = 'seed' AND niveau = 'N5_EXPERT';

-- 2) Doublons de niveau identique par savoir (garde l'id minimal)
DELETE FROM niveau_savoir_requis a USING niveau_savoir_requis b
WHERE a.savoir_id = b.savoir_id AND a.niveau = b.niveau AND a.id > b.id;

-- 3) Doublons de niveaux DIFFÉRENTS d'une même source (seed) : on garde le
--    niveau le plus exigeant (cohérent avec l'agrégation MAX de l'application).
--    Cas observé : S.PED.VIDEO (N2 + N3, créé par 'seed').
DELETE FROM niveau_savoir_requis nsr
USING niveau_savoir_requis autre
WHERE nsr.savoir_id = autre.savoir_id
  AND nsr.niveau = 'N2_ELEMENTAIRE'
  AND autre.niveau = 'N3_INTERMEDIAIRE'
  AND nsr.id < autre.id
  AND nsr.created_by = 'seed'
  AND autre.created_by = 'seed'
  AND nsr.savoir_id = (SELECT id FROM savoirs WHERE code = 'S.PED.VIDEO');

-- Resynchronisation de la séquence (convention V13/V15)
SELECT setval('competence.niveau_savoir_requis_id_seq', (SELECT max(id) FROM competence.niveau_savoir_requis))
WHERE EXISTS (SELECT 1 FROM competence.niveau_savoir_requis);