SELECT enseignant_id, score_risque, facteurs_risque->>'factors' as factors_raw
FROM "analyse".teacher_risk_profiles
WHERE enseignant_id = 'ENS014';
