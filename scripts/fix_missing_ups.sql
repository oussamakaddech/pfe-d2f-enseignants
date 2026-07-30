-- Add missing UPs and departments to formation schema
INSERT INTO formation.ups (id, libelle, version) VALUES
    ('UP_WEB', 'Developpement Web', 0),
    ('UP_IA',  'Intelligence Artificielle & Data', 0)
ON CONFLICT (id) DO NOTHING;

INSERT INTO formation.departements (id, libelle, version) VALUES
    ('DEPT_WEB', 'Departement Developpement Web', 0),
    ('DEPT_IA',  'Departement Intelligence Artificielle & Data', 0)
ON CONFLICT (id) DO NOTHING;

-- Verify
SELECT id, libelle FROM formation.ups ORDER BY id;
SELECT id, libelle FROM formation.departements ORDER BY id;
