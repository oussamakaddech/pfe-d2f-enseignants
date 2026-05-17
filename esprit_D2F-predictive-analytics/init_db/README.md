# init_db — Seeds & schema reference for predictive-analytics

Ces scripts SQL sont des **références** pour le schéma analytics et des jeux
de données de test. Ils ne sont pas chargés automatiquement par
docker-compose : le service utilise la base `d2f` partagée, peuplée par les
migrations Flyway des autres microservices Java + `seed.sql` à la racine.

## Fichiers

| Fichier | Rôle |
|---|---|
| `V1__baseline.sql`              | Tables analytics (skill_gaps, alert_events, etc.) — créées au démarrage par `Base.metadata.create_all()` |
| `V2__indexes_and_constraints.sql` | Index et FK additionnels |
| `V3__seed_test_data.sql`        | Données de test pour les tables analytics (skill_gaps, alertes…) |
| `V4__seed_shared_data.sql`      | Données partagées de base : 15 enseignants, 20 compétences, ~10 formations |
| `V5__seed_real_data.sql`        | **Seed réaliste complet** — 30 enseignants, 25 compétences, 25 formations, inscriptions, présences, séances, évaluations, certificats, besoins |

## Charger V5 dans la base locale

### Option 1 — Container Postgres en marche

```bash
# Depuis la racine du projet
docker exec -i d2f-postgres psql -U d2f -d d2f < esprit_D2F-predictive-analytics/init_db/V5__seed_real_data.sql
```

### Option 2 — psql local

```bash
psql -h localhost -p 7432 -U d2f -d d2f -f esprit_D2F-predictive-analytics/init_db/V5__seed_real_data.sql
```

### Option 3 — depuis pgAdmin

Ouvrir Query Tool sur la DB `d2f` et exécuter le fichier.

## Vérifier que le seed a bien été chargé

```sql
SELECT 'enseignants'             AS table_name, COUNT(*) FROM enseignants
UNION ALL SELECT 'competences',            COUNT(*) FROM competences
UNION ALL SELECT 'savoirs',                COUNT(*) FROM savoirs
UNION ALL SELECT 'enseignant_competences', COUNT(*) FROM enseignant_competences
UNION ALL SELECT 'niveau_savoir_requis',   COUNT(*) FROM niveau_savoir_requis
UNION ALL SELECT 'formations',             COUNT(*) FROM formations
UNION ALL SELECT 'formation_competences',  COUNT(*) FROM formation_competences
UNION ALL SELECT 'inscriptions',           COUNT(*) FROM inscriptions
UNION ALL SELECT 'seances',                COUNT(*) FROM seances
UNION ALL SELECT 'presences',              COUNT(*) FROM presences
UNION ALL SELECT 'besoin_formation',       COUNT(*) FROM besoin_formation
UNION ALL SELECT 'evaluation_formateur',   COUNT(*) FROM evaluation_formateur
UNION ALL SELECT 'evaluation_globale',     COUNT(*) FROM evaluation_globale
UNION ALL SELECT 'certificates',           COUNT(*) FROM certificates;
```

Comptes attendus après V4 + V5 :

| Table                  | Comptes ~ |
|------------------------|-----------|
| enseignants            | 30        |
| competences            | 25        |
| savoirs                | 40        |
| enseignant_competences | 150+      |
| niveau_savoir_requis   | 40+       |
| formations             | 25        |
| formation_competences  | 30+       |
| inscriptions           | 50+       |
| seances                | 11        |
| presences              | 45+       |
| besoin_formation       | 35+       |
| evaluation_formateur   | 25+       |
| certificates           | 20+       |

## Entraîner le modèle ML après chargement

```bash
# Si JWT activé : récupérer un token ADMIN au préalable
curl -X POST http://localhost:8222/api/predict/train \
     -H "Authorization: Bearer $TOKEN"
```

Le seed V5 fournit assez de couples `(enseignant × savoir × niveau_requis)`
pour atteindre le seuil `MIN_TRAINING_SAMPLES=50`. Pour un seuil plus bas,
positionner `MIN_TRAINING_SAMPLES=10` dans `.env`.

## Scénarios analytics couverts

Après chargement, ces règles métier doivent se déclencher :

| Règle                          | Déclenchée par |
|--------------------------------|----------------|
| R1 — GAP_CRITIQUE              | E00013, E00018, E00015 (niveaux bas vs requis élevés) |
| R2 — STAGNATION                | E00012, E00014 (acquisitions > 12 mois) |
| R3 — REGRESSION                | Détectée par historique skill_gaps |
| R4 — COMPLETION_FAIBLE         | E00014 (1 APPROVED / 2 PENDING) |
| R5 — TENDANCE_DEPARTEMENT      | Dept 1 sur compétences MLOps/NLP |
| R6 — BESOIN_NON_COUVERT        | Besoins CRITIQUE/HAUTE non approuvés CUP > 30j |
