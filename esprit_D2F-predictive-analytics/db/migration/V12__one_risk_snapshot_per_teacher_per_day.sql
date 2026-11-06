-- Un instantané de risque par enseignant et par jour (audit 2026-09-24).
--
-- L'analyse horaire ajoutait une ligne à chaque passage : 28 230 lignes pour
-- 1 231 couples (enseignant, jour), soit ~23 par jour. Le tableau de bord ne
-- lit que la dernière ligne, mais l'historique de risque les affichait toutes
-- (jusqu'à 23 points par jour sur le graphique).
--
-- On garde la DERNIÈRE ligne calculée de chaque jour (celle que le tableau de
-- bord affichait déjà), puis une contrainte unique empêche la réapparition des
-- doublons ; l'écriture devient un « upsert » (analysis_repository.INSERT_RISK).

DELETE FROM "analyse".teacher_risk_snapshots s
USING (
    SELECT id,
           ROW_NUMBER() OVER (
               PARTITION BY enseignant_id, snapshot_date
               ORDER BY computed_at DESC NULLS LAST, id DESC
           ) AS rang
    FROM "analyse".teacher_risk_snapshots
) classe
WHERE s.id = classe.id AND classe.rang > 1;

ALTER TABLE "analyse".teacher_risk_snapshots
    ADD CONSTRAINT uq_risk_snapshot_teacher_day UNIQUE (enseignant_id, snapshot_date);
