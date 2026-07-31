SET search_path TO "analyse", public;
SELECT canonical_id, legacy_id, verified FROM teacher_id_mapping ORDER BY canonical_id LIMIT 5;