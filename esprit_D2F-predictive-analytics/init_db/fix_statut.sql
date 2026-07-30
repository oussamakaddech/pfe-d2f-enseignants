-- Fix: update ACTIVE to PROPOSEE so the API returns them
UPDATE "analyse".recommendations SET statut = 'PROPOSEE' WHERE statut = 'ACTIVE';

-- Verify
SELECT statut, COUNT(*) FROM "analyse".recommendations GROUP BY statut;
SELECT enseignant_id, COUNT(*) as rec_count FROM "analyse".recommendations WHERE enseignant_id = 'ENS014' GROUP BY enseignant_id;
