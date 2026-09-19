-- V18__seed_niveaux_ens_gc1.sql
-- Différenciation du dernier profil GC sans données : niveaux individuels de
-- ENS_GC1 (Sami BEN YOUSSEF, spécialité Structures et Matériaux, Maître
-- Assistant) sur le référentiel GC-TECH-* (V15).
--
-- Contexte : ENS_GC1 n'avait AUCUNE ligne dans enseignant_competences → tous
-- les écarts GC étaient structurels et identiques (6 × 75 % CRITIQUE,
-- aucune différenciation, recommandation unique à pertinence 26/100). Les
-- enseignants ENS014–ENS017 ont été traités par V17 ; cette migration livre
-- les données manquantes du dernier profil GC « sans données ».
--
-- Profil retenu (cohérent avec la fiche métier) : solide en construction et
-- structures (C1a, C1b, C7), en essais géotechniques (S2a, S6), en BIM et
-- normes (T1, T2) ; en construction dans les domaines eau/urbanisme (E, U) et
-- dans les études d'impacts (C5).
--
-- Niveaux : labels texte DEBUTANT/INITIE/CONFIRME/AVANCE (mêmes conventions
-- que les lignes existantes ; mapping 1/2/3/4). Idempotent :
-- ON CONFLICT (enseignant_id, savoir_id) DO NOTHING (uq_enseignant_savoir).
-- Traçabilité : created_by='seed-gc-18'.

INSERT INTO enseignant_competences (enseignant_id, savoir_id, niveau, date_acquisition, commentaire, created_at, created_by, version)
SELECT t.enseignant_id,
       (SELECT id FROM savoirs WHERE code = t.savoir_code),
       t.niveau::text,
       DATE '2026-08-15',
       'Seed différenciation profil GC ENS_GC1 (V18)',
       '2026-01-01 08:00:00'::timestamp,
       'seed-gc-18',
       0
FROM (VALUES
    -- Construction / structures : maîtrise confirmée voire avancée
    ('ENS_GC1', 'C1a', 'AVANCE'),
    ('ENS_GC1', 'C1b', 'CONFIRME'),
    ('ENS_GC1', 'C1c', 'INITIE'),
    ('ENS_GC1', 'C2a', 'INITIE'),
    ('ENS_GC1', 'C5',  'DEBUTANT'),
    ('ENS_GC1', 'C6',  'CONFIRME'),
    ('ENS_GC1', 'C7',  'AVANCE'),
    -- Sols / géotechnique : essais maîtrisés, aléas moins couverts
    ('ENS_GC1', 'S2a', 'CONFIRME'),
    ('ENS_GC1', 'S2b', 'INITIE'),
    ('ENS_GC1', 'S3',  'DEBUTANT'),
    ('ENS_GC1', 'S6',  'CONFIRME'),
    -- Physique du bâtiment : partielle
    ('ENS_GC1', 'P1a', 'INITIE'),
    ('ENS_GC1', 'P2',  'DEBUTANT'),
    -- Eau / urbanisme : points faibles explicites
    ('ENS_GC1', 'E1a', 'DEBUTANT'),
    ('ENS_GC1', 'U1',  'DEBUTANT'),
    -- Transversal : BIM avancé, normes confirmées, communication intermédiaire
    ('ENS_GC1', 'T1',  'AVANCE'),
    ('ENS_GC1', 'T2',  'CONFIRME'),
    ('ENS_GC1', 'T4',  'INITIE')
) AS t(enseignant_id, savoir_code, niveau)
ON CONFLICT (enseignant_id, savoir_id) DO NOTHING;
