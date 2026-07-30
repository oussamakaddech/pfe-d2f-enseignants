-- Vérifier les KPIs du dashboard depuis la table snapshot
SELECT kpis_json FROM "analyse".dashboard_snapshots WHERE scope = 'GLOBAL' ORDER BY snapshot_date DESC LIMIT 1;
