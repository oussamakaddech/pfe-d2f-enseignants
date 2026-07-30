SELECT 'recommendations_ens014' as tbl, COUNT(*) FROM "analyse".recommendations WHERE enseignant_id = 'ENS014';
SELECT 'alerts_ens014' as tbl, COUNT(*) FROM "analyse".alert_events WHERE enseignant_id = 'ENS014';
SELECT 'history_ens014' as tbl, COUNT(*) FROM "analyse".teacher_risk_snapshots WHERE enseignant_id = 'ENS014';
SELECT 'gaps_ens014' as tbl, COUNT(*) FROM "analyse".skill_gaps WHERE enseignant_id = 'ENS014';
