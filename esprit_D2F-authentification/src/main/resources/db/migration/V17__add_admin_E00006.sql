-- =============================================================================
-- V17__add_admin_E00006.sql
-- Description: Ajout du compte administrateur E00006 (résout les 404 sur
--              GET /api/v1/account/profile/E00006 quand un JWT existant porte
--              ce sub mais que le user n'a jamais été seedé en DB).
-- Mot de passe : D2F@2025  (aligné avec V14__seed_sample_users.sql)
-- Idempotent : WHERE NOT EXISTS sur chaque INSERT.
-- =============================================================================

-- 1) Utilisateur E00006
INSERT INTO users (id, username, first_name, last_name, email, password, phone_number, disabled, has_subscription)
SELECT '00000000-0000-0000-0000-000000e00006',
       'E00006',
       'Admin',
       'E00006',
       'admin.e00006@d2f.tn',
       crypt('D2F@2025', gen_salt('bf', 10)),
       '+21600000006',
       false,
       true
WHERE NOT EXISTS (SELECT 1 FROM users WHERE username = 'E00006');

-- 2) Liaison user ↔ rôle ADMIN
INSERT INTO user_roles (user_id, role_id)
SELECT u.id, r.id
FROM users u, roles r
WHERE u.username = 'E00006' AND r.name = 'ADMIN'
  AND NOT EXISTS (
    SELECT 1 FROM user_roles ur
    WHERE ur.user_id = u.id AND ur.role_id = r.id
  );
