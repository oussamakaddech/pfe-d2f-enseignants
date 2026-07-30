SELECT enseignant_id, score_risque, niveau_risque, facteurs_risque IS NOT NULL as has_factors FROM "analyse".teacher_risk_profiles WHERE enseignant_id IN ('ENS014', 'ENS012', 'ENS022');
