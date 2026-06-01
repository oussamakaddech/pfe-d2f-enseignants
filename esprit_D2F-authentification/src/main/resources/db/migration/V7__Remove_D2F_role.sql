-- =============================================================================
-- V2__Remove_D2F_role.sql
-- Description: Remove D2F role from database and update roles_name_check constraint
-- =============================================================================

-- 1. Delete D2F role from user_roles junction table
DELETE FROM user_roles WHERE role_id IN (SELECT id FROM roles WHERE name = 'D2F');

-- 2. Delete D2F role from roles table
DELETE FROM roles WHERE name = 'D2F';

-- 3. Drop existing check constraint
ALTER TABLE roles DROP CONSTRAINT IF EXISTS roles_name_check;

-- 4. Add new check constraint without D2F, include Enseignant
ALTER TABLE roles 
ADD CONSTRAINT roles_name_check 
CHECK (name IN ('admin', 'CUP', 'Enseignant', 'Formateur'));
