SET search_path TO "analyse", public;
SELECT COUNT(*) FROM teacher_id_mapping;
SELECT canonical_id, legacy_id, verified FROM teacher_id_mapping LIMIT 5;