-- FIX-C1: Add responsable contact fields to formations table
-- These fields are required by MailForm.jsx to pre-fill the recipient email and salutation.
ALTER TABLE formation.formations ADD COLUMN IF NOT EXISTS responsable_email VARCHAR(255);
ALTER TABLE formation.formations ADD COLUMN IF NOT EXISTS responsable_name  VARCHAR(255);
