-- =============================================================================
-- V2__Add_admin_user.sql
-- Description: Ajout du compte administrateur par défaut
-- =============================================================================

-- Activation de l'extension pgcrypto pour le hachage BCrypt
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- 1. Insertion du rôle admin s'il n'existe pas
INSERT INTO roles (name)
SELECT 'admin'
WHERE NOT EXISTS (SELECT 1 FROM roles WHERE name = 'admin');

-- 2. Insertion de l'utilisateur admin par défaut (mot de passe: admin)
INSERT INTO users (id, username, first_name, last_name, email, password, phone_number, disabled, has_subscription)
SELECT '00000000-0000-0000-0000-admin0000000', 
       'admin', 
       'Super', 
       'Admin', 
       'admin@d2f.tn', 
       crypt('admin', gen_salt('bf', 10)), 
       '00000000', 
       false, 
       true
WHERE NOT EXISTS (SELECT 1 FROM users WHERE username = 'admin');

-- 3. Association du rôle admin à l'utilisateur admin
INSERT INTO user_roles (user_id, role_id)
SELECT u.id, r.id
FROM users u, roles r
WHERE u.username = 'admin' AND r.name = 'admin'
AND NOT EXISTS (
    SELECT 1 FROM user_roles ur
    WHERE ur.user_id = u.id AND ur.role_id = r.id
);
