-- V15__seed_ups_departements.sql
-- Données de référence : UPs et Départements ESPRIT
-- ON CONFLICT DO NOTHING : idempotent — aucune erreur si l'enregistrement existe déjà

-- ── UPs (Unités Pédagogiques) ──────────────────────────────────────────────────
INSERT INTO ups (id, libelle) VALUES
    ('UP_INFO',   'Informatique'),
    ('UP_GL',     'Génie Logiciel'),
    ('UP_RT',     'Réseaux & Télécommunications'),
    ('UP_GC',     'Génie Civil'),
    ('UP_WEB',    'Développement Web'),
    ('UP_IA',     'Intelligence Artificielle & Data')
ON CONFLICT (id) DO NOTHING;

-- ── Départements ──────────────────────────────────────────────────────────────
INSERT INTO departements (id, libelle) VALUES
    ('DEPT_INFO',  'Département Informatique'),
    ('DEPT_GL',    'Département Génie Logiciel'),
    ('DEPT_RT',    'Département Réseaux & Télécommunications'),
    ('DEPT_GC',    'Département Génie Civil'),
    ('DEPT_WEB',   'Département Développement Web'),
    ('DEPT_IA',    'Département Intelligence Artificielle & Data')
ON CONFLICT (id) DO NOTHING;
