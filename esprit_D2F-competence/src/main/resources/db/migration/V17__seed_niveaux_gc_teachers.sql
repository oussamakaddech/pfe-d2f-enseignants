-- V17__seed_niveaux_gc_teachers.sql
-- Différenciation des profils GC : niveaux individuels des enseignants du
-- Génie Civil sur le référentiel GC-TECH-* (V15).
--
-- Contexte : les enseignants GC (ENS014–ENS017) portaient des niveaux sur
-- l'ancien référentiel informatique (DEV.*, RES.SEC, AI.ML) mais AUCUN niveau
-- sur les compétences GC-TECH-* → actuel=0.00 partout → gaps/risques identiques
-- (80 CRITIQUE) pour tout le département, indistinguable d'un enseignant sans
-- aucune donnée (ENS_GC1). Le service est honnête (alerte à la donnée
-- manquante) ; cette migration apporte les données manquantes pour rendre les
-- profils GC différenciés et réalistes.
--
-- Niveaux : labels texte (DEBUTANT/INITIE/CONFIRME/AVANCE) — même convention
-- que les lignes existantes (created_by='system'). Idempotent :
-- ON CONFLICT (enseignant_id, savoir_id) DO NOTHING (uq_enseignant_savoir).
-- Traçabilité : created_by='seed-gc-17'.

INSERT INTO enseignant_competences (enseignant_id, savoir_id, niveau, date_acquisition, commentaire, created_at, created_by, version)
SELECT t.enseignant_id,
       (SELECT id FROM savoirs WHERE code = t.savoir_code),
       t.niveau::text,
       DATE '2026-08-01',
       'Seed différenciation profils GC (V17)',
       '2026-01-01 08:00:00'::timestamp,
       'seed-gc-17',
       0
FROM (VALUES
    -- ENS014 : infrastructures routières / fondations / normes
    ('ENS014', 'S6',  'CONFIRME'),
    ('ENS014', 'C3a', 'CONFIRME'),
    ('ENS014', 'C3b', 'INITIE'),
    ('ENS014', 'T2',  'AVANCE'),
    ('ENS014', 'U1',  'DEBUTANT'),
    -- ENS015 : construction / structure BA / santé structurelle
    ('ENS015', 'C1a', 'CONFIRME'),
    ('ENS015', 'C1b', 'CONFIRME'),
    ('ENS015', 'C7',  'AVANCE'),
    ('ENS015', 'S2a', 'INITIE'),
    ('ENS015', 'S3',  'INITIE'),
    ('ENS015', 'T1',  'INITIE'),
    -- ENS016 : physique du bâtiment / impacts / urbanisme
    ('ENS016', 'P2',  'CONFIRME'),
    ('ENS016', 'P1a', 'INITIE'),
    ('ENS016', 'C5',  'INITIE'),
    ('ENS016', 'U1',  'INITIE'),
    ('ENS016', 'S5',  'DEBUTANT'),
    -- ENS017 : hydraulique / eau / risques sols
    ('ENS017', 'E1a', 'CONFIRME'),
    ('ENS017', 'E2',  'INITIE'),
    ('ENS017', 'S4',  'INITIE'),
    ('ENS017', 'P1a', 'INITIE'),
    ('ENS017', 'C3a', 'DEBUTANT')
) AS t(enseignant_id, savoir_code, niveau)
ON CONFLICT (enseignant_id, savoir_id) DO NOTHING;

-- Resynchronisation de la séquence (convention V13/V15).
SELECT setval('competence.enseignant_competences_id_seq', (SELECT max(id) FROM competence.enseignant_competences))
WHERE EXISTS (SELECT 1 FROM competence.enseignant_competences);
