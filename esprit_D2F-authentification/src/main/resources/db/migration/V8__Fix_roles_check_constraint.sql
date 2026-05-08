-- =============================================================================
-- V8__Fix_roles_check_constraint.sql
-- Description: Update roles_name_check constraint to match Java ERole enum (uppercase)
--              and include all required roles.
-- =============================================================================

-- 1. Drop existing check constraint
ALTER TABLE roles DROP CONSTRAINT IF EXISTS roles_name_check;

-- 2. Update existing data to uppercase to avoid violation of the new constraint
UPDATE roles SET name = 'ADMIN' WHERE name = 'admin';
UPDATE roles SET name = 'ENSEIGNANT' WHERE name = 'Enseignant';
UPDATE roles SET name = 'FORMATEUR' WHERE name = 'Formateur';

-- 3. Add new check constraint with all roles in uppercase to match ERole
ALTER TABLE roles 
ADD CONSTRAINT roles_name_check 
CHECK (name IN ('ADMIN', 'CUP', 'ENSEIGNANT', 'FORMATEUR', 'CHEF_DEPARTEMENT', 'RESPONSABLE_DOSSIER'));
