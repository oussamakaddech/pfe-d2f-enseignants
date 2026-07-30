SELECT 'risk_profile' as tbl, score_risque, niveau_risque, tendance FROM "analyse".teacher_risk_profiles WHERE enseignant_id = 'ENS014';
SELECT 'recommendations' as tbl, COUNT(*) FROM "analyse".recommendations WHERE enseignant_id = 'ENS014';
SELECT 'alert_events' as tbl, COUNT(*) FROM "analyse".alert_events WHERE enseignant_id = 'ENS014';
SELECT 'risk_snapshots' as tbl, COUNT(*) FROM "analyse".teacher_risk_snapshots WHERE enseignant_id = 'ENS014';
SELECT 'training_paths' as tbl, COUNT(*) FROM "analyse".training_paths WHERE enseignant_id = 'ENS014';
