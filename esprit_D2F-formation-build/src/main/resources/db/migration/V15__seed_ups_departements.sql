-- V15__seed_ups_departements.sql
-- Données de référence : UPs et Départements ESPRIT
-- ON CONFLICT DO NOTHING : idempotent — aucune erreur si l'enregistrement existe déjà

-- ── UPs (Unités Pédagogiques) ──────────────────────────────────────────────────
INSERT INTO ups (id, libelle) VALUES
    ('UP_INFO',     'Informatique'),
    ('UP_GL',       'Génie Logiciel'),
    ('UP_RT',       'Réseaux & Télécoms'),
    ('UP_GC',       'Génie Civil'),
    ('UP_INF2',     'UP Informatique'),
    ('UP_TECH_WEB', 'UP Technologie Web')
ON CONFLICT (id) DO NOTHING;

-- ── Départements ──────────────────────────────────────────────────────────────
INSERT INTO departements (id, libelle) VALUES
    ('DEPT_INFO',    'Département Informatique'),
    ('DEPT_GL',      'Département Génie Logiciel'),
    ('DEPT_RT',      'Département Réseaux'),
    ('DEPT_GC',      'Département Génie Civil'),
    ('DEPT_GLS',     'Génie Logiciel'),
    ('DEPT_DEV_WEB', 'Développement Web')
ON CONFLICT (id) DO NOTHING;
