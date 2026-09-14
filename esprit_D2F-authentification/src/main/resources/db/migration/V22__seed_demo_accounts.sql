-- =============================================================================
-- V22__seed_demo_accounts.sql
-- Comptes de démonstration réalistes pour tous les rôles métier D2F :
--   ANIMATEUR (x2), CUP (2e compte), CHEF_DEPARTEMENT (2e compte),
--   RESPONSABLE_DOSSIER, ENSEIGNANT (x4).
--
-- Mot de passe : même politique que V21 — placeholder ${d2fSeedPassword}
--   (env D2F_SEED_PASSWORD) :
--   - renseigné  -> bcrypt de la valeur fournie (dev/QA uniquement) ;
--   - vide (prod) -> mot de passe aléatoire inutilisable : comptes démo
--                    inaccessibles par mot de passe.
--
-- Idempotent : WHERE NOT EXISTS sur chaque INSERT.
-- Ces comptes sont liés aux fiches enseignants ENS007..ENS013 du service
-- formation (V41__seed_real_data.sql) via le champ user_id.
-- =============================================================================

-- ── Rôles (sécurisation base neuve, déjà couverts par V14/V18) ────────────────
INSERT INTO roles (name) SELECT 'CUP'
WHERE NOT EXISTS (SELECT 1 FROM roles WHERE name = 'CUP');

INSERT INTO roles (name) SELECT 'ENSEIGNANT'
WHERE NOT EXISTS (SELECT 1 FROM roles WHERE name = 'ENSEIGNANT');

INSERT INTO roles (name) SELECT 'ANIMATEUR'
WHERE NOT EXISTS (SELECT 1 FROM roles WHERE name = 'ANIMATEUR');

INSERT INTO roles (name) SELECT 'CHEF_DEPARTEMENT'
WHERE NOT EXISTS (SELECT 1 FROM roles WHERE name = 'CHEF_DEPARTEMENT');

INSERT INTO roles (name) SELECT 'RESPONSABLE_DOSSIER'
WHERE NOT EXISTS (SELECT 1 FROM roles WHERE name = 'RESPONSABLE_DOSSIER');

-- ── Animateur 1 — Nadia CHEBBI (interne, Génie Logiciel) ──────────────────────
INSERT INTO users (id, username, first_name, last_name, email, password, phone_number, disabled, has_subscription)
SELECT '00000000-0000-0000-0000-000000ani001',
       'nchebbi',
       'Nadia',
       'CHEBBI',
       'n.chebbi@esprit.tn',
       crypt(
           CASE
               WHEN '${d2fSeedPassword}' = '' THEN gen_random_uuid()::text
               ELSE '${d2fSeedPassword}'
           END,
           gen_salt('bf', 10)
       ),
       '+21671234601',
       false,
       true
WHERE NOT EXISTS (SELECT 1 FROM users WHERE email = 'n.chebbi@esprit.tn');

INSERT INTO user_roles (user_id, role_id)
SELECT u.id, r.id FROM users u, roles r
WHERE u.username = 'nchebbi' AND r.name = 'ANIMATEUR'
  AND NOT EXISTS (SELECT 1 FROM user_roles ur WHERE ur.user_id = u.id AND ur.role_id = r.id);

-- ── Animateur 2 — Ahmed BOUZID (interne, Réseaux & Télécoms) ──────────────────
INSERT INTO users (id, username, first_name, last_name, email, password, phone_number, disabled, has_subscription)
SELECT '00000000-0000-0000-0000-000000ani002',
       'abouzid',
       'Ahmed',
       'BOUZID',
       'a.bouzid@esprit.tn',
       crypt(
           CASE
               WHEN '${d2fSeedPassword}' = '' THEN gen_random_uuid()::text
               ELSE '${d2fSeedPassword}'
           END,
           gen_salt('bf', 10)
       ),
       '+21671234602',
       false,
       true
WHERE NOT EXISTS (SELECT 1 FROM users WHERE email = 'a.bouzid@esprit.tn');

INSERT INTO user_roles (user_id, role_id)
SELECT u.id, r.id FROM users u, roles r
WHERE u.username = 'abouzid' AND r.name = 'ANIMATEUR'
  AND NOT EXISTS (SELECT 1 FROM user_roles ur WHERE ur.user_id = u.id AND ur.role_id = r.id);

-- ── CUP 2 — Mohamed JEBARI (Commission Universitaire de Pédagogie) ────────────
INSERT INTO users (id, username, first_name, last_name, email, password, phone_number, disabled, has_subscription)
SELECT '00000000-0000-0000-0000-000000cup002',
       'mjebari',
       'Mohamed',
       'JEBARI',
       'm.jebari@esprit.tn',
       crypt(
           CASE
               WHEN '${d2fSeedPassword}' = '' THEN gen_random_uuid()::text
               ELSE '${d2fSeedPassword}'
           END,
           gen_salt('bf', 10)
       ),
       '+21671234603',
       false,
       true
WHERE NOT EXISTS (SELECT 1 FROM users WHERE email = 'm.jebari@esprit.tn');

INSERT INTO user_roles (user_id, role_id)
SELECT u.id, r.id FROM users u, roles r
WHERE u.username = 'mjebari' AND r.name = 'CUP'
  AND NOT EXISTS (SELECT 1 FROM user_roles ur WHERE ur.user_id = u.id AND ur.role_id = r.id);

-- ── Chef de département 2 — Samir BOUAZIZI (Département Web) ──────────────────
INSERT INTO users (id, username, first_name, last_name, email, password, phone_number, disabled, has_subscription)
SELECT '00000000-0000-0000-0000-000000chd002',
       'sbouazizi',
       'Samir',
       'BOUAZIZI',
       's.bouazizi@esprit.tn',
       crypt(
           CASE
               WHEN '${d2fSeedPassword}' = '' THEN gen_random_uuid()::text
               ELSE '${d2fSeedPassword}'
           END,
           gen_salt('bf', 10)
       ),
       '+21671234604',
       false,
       true
WHERE NOT EXISTS (SELECT 1 FROM users WHERE email = 's.bouazizi@esprit.tn');

INSERT INTO user_roles (user_id, role_id)
SELECT u.id, r.id FROM users u, roles r
WHERE u.username = 'sbouazizi' AND r.name = 'CHEF_DEPARTEMENT'
  AND NOT EXISTS (SELECT 1 FROM user_roles ur WHERE ur.user_id = u.id AND ur.role_id = r.id);

-- ── Responsable de dossier — Nabil DRIDI (scolarité / dossiers enseignants) ──
INSERT INTO users (id, username, first_name, last_name, email, password, phone_number, disabled, has_subscription)
SELECT '00000000-0000-0000-0000-000000rsp001',
       'ndridi',
       'Nabil',
       'DRIDI',
       'n.dridi@esprit.tn',
       crypt(
           CASE
               WHEN '${d2fSeedPassword}' = '' THEN gen_random_uuid()::text
               ELSE '${d2fSeedPassword}'
           END,
           gen_salt('bf', 10)
       ),
       '+21671234605',
       false,
       true
WHERE NOT EXISTS (SELECT 1 FROM users WHERE email = 'n.dridi@esprit.tn');

INSERT INTO user_roles (user_id, role_id)
SELECT u.id, r.id FROM users u, roles r
WHERE u.username = 'ndridi' AND r.name = 'RESPONSABLE_DOSSIER'
  AND NOT EXISTS (SELECT 1 FROM user_roles ur WHERE ur.user_id = u.id AND ur.role_id = r.id);

-- ── Enseignante — Hela KHELIFI (Informatique) ─────────────────────────────────
INSERT INTO users (id, username, first_name, last_name, email, password, phone_number, disabled, has_subscription)
SELECT '00000000-0000-0000-0000-00000ens0010',
       'hkhelifi',
       'Hela',
       'KHELIFI',
       'h.khelifi@esprit.tn',
       crypt(
           CASE
               WHEN '${d2fSeedPassword}' = '' THEN gen_random_uuid()::text
               ELSE '${d2fSeedPassword}'
           END,
           gen_salt('bf', 10)
       ),
       '+21671234606',
       false,
       true
WHERE NOT EXISTS (SELECT 1 FROM users WHERE email = 'h.khelifi@esprit.tn');

INSERT INTO user_roles (user_id, role_id)
SELECT u.id, r.id FROM users u, roles r
WHERE u.username = 'hkhelifi' AND r.name = 'ENSEIGNANT'
  AND NOT EXISTS (SELECT 1 FROM user_roles ur WHERE ur.user_id = u.id AND ur.role_id = r.id);

-- ── Enseignant — Rami MEZGHANI (Génie Logiciel) ───────────────────────────────
INSERT INTO users (id, username, first_name, last_name, email, password, phone_number, disabled, has_subscription)
SELECT '00000000-0000-0000-0000-00000ens0011',
       'rmezghani',
       'Rami',
       'MEZGHANI',
       'r.mezghani@esprit.tn',
       crypt(
           CASE
               WHEN '${d2fSeedPassword}' = '' THEN gen_random_uuid()::text
               ELSE '${d2fSeedPassword}'
           END,
           gen_salt('bf', 10)
       ),
       '+21671234607',
       false,
       true
WHERE NOT EXISTS (SELECT 1 FROM users WHERE email = 'r.mezghani@esprit.tn');

INSERT INTO user_roles (user_id, role_id)
SELECT u.id, r.id FROM users u, roles r
WHERE u.username = 'rmezghani' AND r.name = 'ENSEIGNANT'
  AND NOT EXISTS (SELECT 1 FROM user_roles ur WHERE ur.user_id = u.id AND ur.role_id = r.id);

-- ── Enseignante — Ines AYARI (IA & Data) ──────────────────────────────────────
INSERT INTO users (id, username, first_name, last_name, email, password, phone_number, disabled, has_subscription)
SELECT '00000000-0000-0000-0000-00000ens0012',
       'iayari',
       'Ines',
       'AYARI',
       'i.ayari@esprit.tn',
       crypt(
           CASE
               WHEN '${d2fSeedPassword}' = '' THEN gen_random_uuid()::text
               ELSE '${d2fSeedPassword}'
           END,
           gen_salt('bf', 10)
       ),
       '+21671234608',
       false,
       true
WHERE NOT EXISTS (SELECT 1 FROM users WHERE email = 'i.ayari@esprit.tn');

INSERT INTO user_roles (user_id, role_id)
SELECT u.id, r.id FROM users u, roles r
WHERE u.username = 'iayari' AND r.name = 'ENSEIGNANT'
  AND NOT EXISTS (SELECT 1 FROM user_roles ur WHERE ur.user_id = u.id AND ur.role_id = r.id);

-- ── Enseignant vacataire — Tarek ZOUARI (consultant DevOps) ──────────────────
INSERT INTO users (id, username, first_name, last_name, email, password, phone_number, disabled, has_subscription)
SELECT '00000000-0000-0000-0000-00000ens0013',
       'tzouari',
       'Tarek',
       'ZOUARI',
       't.zouari@esprit.tn',
       crypt(
           CASE
               WHEN '${d2fSeedPassword}' = '' THEN gen_random_uuid()::text
               ELSE '${d2fSeedPassword}'
           END,
           gen_salt('bf', 10)
       ),
       '+21671234609',
       false,
       true
WHERE NOT EXISTS (SELECT 1 FROM users WHERE email = 't.zouari@esprit.tn');

INSERT INTO user_roles (user_id, role_id)
SELECT u.id, r.id FROM users u, roles r
WHERE u.username = 'tzouari' AND r.name = 'ENSEIGNANT'
  AND NOT EXISTS (SELECT 1 FROM user_roles ur WHERE ur.user_id = u.id AND ur.role_id = r.id);
