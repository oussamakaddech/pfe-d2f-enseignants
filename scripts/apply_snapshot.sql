DELETE FROM "analyse".dashboard_snapshots;
INSERT INTO "analyse".dashboard_snapshots (scope, scope_id, snapshot_date, kpis_json)
VALUES ('GLOBAL', NULL, CURRENT_DATE, '{
  "enseignants_monitores": 27,
  "indice_risque_moyen": 0.33,
  "gaps_critiques": 14,
  "alertes_nouvelles": 7,
  "taux_couverture": 64.0,
  "en_regression": 0,
  "en_stagnation": 2,
  "alertes_critiques_ouvertes": 3,
  "enseignants_a_risque": 2,
  "repartition": {"CRITIQUE": 0, "ELEVE": 2, "MODERE": 19, "FAIBLE": 6}
}'::jsonb);
