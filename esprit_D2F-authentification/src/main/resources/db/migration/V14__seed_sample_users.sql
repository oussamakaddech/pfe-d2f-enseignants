-- V14__seed_sample_users.sql
-- Données d'exemple : rôles complets + utilisateurs de démonstration
-- Mot de passe de tous les comptes demo : D2F@2025
-- Idempotent : WHERE NOT EXISTS sur chaque INSERT

-- ── Rôles manquants (ADMIN déjà inséré en V6) ─────────────────────────────────
INSERT INTO roles (name)
SELECT 'CUP'
WHERE NOT EXISTS (SELECT 1 FROM roles WHERE name = 'CUP');

INSERT INTO roles (name)
SELECT 'ENSEIGNANT'
WHERE NOT EXISTS (SELECT 1 FROM roles WHERE name = 'ENSEIGNANT');

INSERT INTO roles (name)
SELECT 'FORMATEUR'
WHERE NOT EXISTS (SELECT 1 FROM roles WHERE name = 'FORMATEUR');

INSERT INTO roles (name)
SELECT 'CHEF_DEPARTEMENT'
WHERE NOT EXISTS (SELECT 1 FROM roles WHERE name = 'CHEF_DEPARTEMENT');

INSERT INTO roles (name)
SELECT 'RESPONSABLE_DOSSIER'
WHERE NOT EXISTS (SELECT 1 FROM roles WHERE name = 'RESPONSABLE_DOSSIER');

-- ── CUP ───────────────────────────────────────────────────────────────────────
INSERT INTO users (id, username, first_name, last_name, email, password, phone_number, disabled, has_subscription)
SELECT '00000000-0000-0000-0000-000000cup001',
       'fbenhassen',
       'Fatima',
       'BEN HASSEN',
       'f.benhassen@esprit.tn',
       crypt('D2F@2025', gen_salt('bf', 10)),
       '+21671234501',
       false,
       true
WHERE NOT EXISTS (SELECT 1 FROM users WHERE email = 'f.benhassen@esprit.tn');

INSERT INTO user_roles (user_id, role_id)
SELECT u.id, r.id FROM users u, roles r
WHERE u.username = 'fbenhassen' AND r.name = 'CUP'
  AND NOT EXISTS (
    SELECT 1 FROM user_roles ur
    WHERE ur.user_id = u.id AND ur.role_id = r.id
  );

-- ── Enseignants ───────────────────────────────────────────────────────────────
INSERT INTO users (id, username, first_name, last_name, email, password, phone_number, disabled, has_subscription)
SELECT '00000000-0000-0000-0000-00000ens0001',
       'ktrabelsi',
       'Karim',
       'TRABELSI',
       'k.trabelsi@esprit.tn',
       crypt('D2F@2025', gen_salt('bf', 10)),
       '+21671234502',
       false,
       true
WHERE NOT EXISTS (SELECT 1 FROM users WHERE email = 'k.trabelsi@esprit.tn');

INSERT INTO user_roles (user_id, role_id)
SELECT u.id, r.id FROM users u, roles r
WHERE u.username = 'ktrabelsi' AND r.name = 'ENSEIGNANT'
  AND NOT EXISTS (SELECT 1 FROM user_roles ur WHERE ur.user_id = u.id AND ur.role_id = r.id);

INSERT INTO users (id, username, first_name, last_name, email, password, phone_number, disabled, has_subscription)
SELECT '00000000-0000-0000-0000-00000ens0002',
       'smansouri',
       'Sonia',
       'MANSOURI',
       's.mansouri@esprit.tn',
       crypt('D2F@2025', gen_salt('bf', 10)),
       '+21671234503',
       false,
       true
WHERE NOT EXISTS (SELECT 1 FROM users WHERE email = 's.mansouri@esprit.tn');

INSERT INTO user_roles (user_id, role_id)
SELECT u.id, r.id FROM users u, roles r
WHERE u.username = 'smansouri' AND r.name = 'ENSEIGNANT'
  AND NOT EXISTS (SELECT 1 FROM user_roles ur WHERE ur.user_id = u.id AND ur.role_id = r.id);

INSERT INTO users (id, username, first_name, last_name, email, password, phone_number, disabled, has_subscription)
SELECT '00000000-0000-0000-0000-00000ens0003',
       'agharbi',
       'Amine',
       'GHARBI',
       'a.gharbi@esprit.tn',
       crypt('D2F@2025', gen_salt('bf', 10)),
       '+21671234504',
       false,
       true
WHERE NOT EXISTS (SELECT 1 FROM users WHERE email = 'a.gharbi@esprit.tn');

INSERT INTO user_roles (user_id, role_id)
SELECT u.id, r.id FROM users u, roles r
WHERE u.username = 'agharbi' AND r.name = 'ENSEIGNANT'
  AND NOT EXISTS (SELECT 1 FROM user_roles ur WHERE ur.user_id = u.id AND ur.role_id = r.id);

INSERT INTO users (id, username, first_name, last_name, email, password, phone_number, disabled, has_subscription)
SELECT '00000000-0000-0000-0000-00000ens0004',
       'mhamdi',
       'Mourad',
       'HAMDI',
       'm.hamdi@esprit.tn',
       crypt('D2F@2025', gen_salt('bf', 10)),
       '+21671234505',
       false,
       true
WHERE NOT EXISTS (SELECT 1 FROM users WHERE email = 'm.hamdi@esprit.tn');

INSERT INTO user_roles (user_id, role_id)
SELECT u.id, r.id FROM users u, roles r
WHERE u.username = 'mhamdi' AND r.name = 'CHEF_DEPARTEMENT'
  AND NOT EXISTS (SELECT 1 FROM user_roles ur WHERE ur.user_id = u.id AND ur.role_id = r.id);

INSERT INTO users (id, username, first_name, last_name, email, password, phone_number, disabled, has_subscription)
SELECT '00000000-0000-0000-0000-00000ens0005',
       'lbensalem',
       'Leila',
       'BEN SALEM',
       'l.bensalem@esprit.tn',
       crypt('D2F@2025', gen_salt('bf', 10)),
       '+21671234506',
       false,
       true
WHERE NOT EXISTS (SELECT 1 FROM users WHERE email = 'l.bensalem@esprit.tn');

INSERT INTO user_roles (user_id, role_id)
SELECT u.id, r.id FROM users u, roles r
WHERE u.username = 'lbensalem' AND r.name = 'ENSEIGNANT'
  AND NOT EXISTS (SELECT 1 FROM user_roles ur WHERE ur.user_id = u.id AND ur.role_id = r.id);

-- ── Formateur ─────────────────────────────────────────────────────────────────
INSERT INTO users (id, username, first_name, last_name, email, password, phone_number, disabled, has_subscription)
SELECT '00000000-0000-0000-0000-0000form0001',
       'jdupont',
       'Jean',
       'DUPONT',
       'j.dupont@formation-pro.tn',
       crypt('D2F@2025', gen_salt('bf', 10)),
       '+21671234507',
       false,
       true
WHERE NOT EXISTS (SELECT 1 FROM users WHERE email = 'j.dupont@formation-pro.tn');

INSERT INTO user_roles (user_id, role_id)
SELECT u.id, r.id FROM users u, roles r
WHERE u.username = 'jdupont' AND r.name = 'FORMATEUR'
  AND NOT EXISTS (SELECT 1 FROM user_roles ur WHERE ur.user_id = u.id AND ur.role_id = r.id);
