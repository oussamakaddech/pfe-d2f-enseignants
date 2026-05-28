-- V27__rename_chefdepartement_to_chef_departement.sql
-- Rename column chefdepartement to chef_departement to match JPA entity mapping

ALTER TABLE enseignants RENAME COLUMN chefdepartement TO chef_departement;
