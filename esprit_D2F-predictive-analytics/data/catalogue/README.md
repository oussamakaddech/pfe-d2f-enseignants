# Catalogue de formations D2F — jeu de données de démonstration

Référentiel compressé (**mini-référentiel 12 compétences**, 4 domaines) et catalogue
de **30 formations** destinés à personnaliser les recommandations du service
`predictive-analytics` (composite V1), reproductibles via le seed SQL idempotent.

## Fichiers

| Fichier | Contenu |
|---------|---------|
| `domaines.csv` | 4 domaines (`DOM01`…`DOM04`) |
| `competences.csv` | 12 compétences (`COMP01`…`COMP12`, `prerequis` 3–4, domaine_id) |
| `savoirs.csv` | 24 savoirs (`SAV01`…`SAV24`, 2 par compétence, SAVOIR / SAVOIR_FAIRE) |
| `formations.csv` | 30 formations (id 1001+, code `FOR-…`, états PLANIFIE/EN_COURS/ACHEVE) |
| `formation_competences.csv` | 52 lignes de liaison formation ↔ compétence/savoir (1–3/formation) |
| `inscriptions_sample.csv` | 40 inscriptions d'échantillon (ENS001…ENS030) |
| `recos_oracle.md` | Oracle : 5 profils, Top-3 attendus (éligibilité + composite V1) |
| `seed_catalogue.sql` | Seed idempotent compatible `formation.*` (ON CONFLICT DO NOTHING) |
| `validate_catalogue.py` | Script de contrôle de la checklist (30 règles) |

## Schéma cible (extrait réel)

- `formation.formations` : `id_formation BIGSERIAL`, `titre_formation`,
  `date_debut`, `date_fin`, `etat_formation` (PLANIFIE / EN_COURS / ACHEVE / ANNULE),
  `period_code` (WINTER / SUMMER / SPRINT / WORKSHOP / OTHER), `inscriptions_ouvertes`,
  `ouverte`, `prerequis`, … (`deleted_at` via V22).
- `formation.inscriptions` : `(formation_id, enseignant_id)` uniques, `etat` = APPROVED / PENDING / REJECTED.
- `formation.formation_competences` : `competence_id`, `savoir_id`, `niveau_prerequis`, `niveau_vise`.
- Candidats du service prédictif : `WHERE etat_formation IN ('PLANIFIE','EN_COURS','ACHEVE') AND deleted_at IS NULL`.

## Cohérences garanties

- **Expirée** ⇒ `date_fin < 2026-08-01` (6/30 = 20 %).
- **PLANIFIÉE / ouverte** ⇒ `date_debut ≥ 2026-09-01`.
- **TERMINÉE (ACHEVE)** ⇒ passé avec inscriptions.
- IDs enseignants `ENS001`…`ENS030` (jamais de préfixe `T`).
- Sessions `WINTER` / `SUMMER` / `SPRINT` / `WORKSHOP` / `OTHER`.
- Composite reco V1 : `0.45·couverture + 0.25·sévérité + 0.15·fraîcheur + 0.10·complétion + 0.05·proximité`.
- Éligibilité : non expirée, non déjà suivie, couvre ≥ 1 gap, prérequis satisfait.

## Checklist (validée 30/30)

| # | Contrainte | Résultat |
|---|-----------|----------|
| B | ≥ 24 formations | 30 ✅ |
| A | ≥ 10 compétences couvertes | 12 ✅ |
| — | ≥ 3 formations par compétence tendue | ✅ |
| — | 10–20 % de formations expirées | 20 % ✅ |
| E | Recouvrement Top-3 ≤ 25 % | 0 % (disjoints) ✅ |
| — | 0 ID `Txxx` | ✅ |
| — | 0 formation sans compétence | ✅ |
| — | 0 compétence orpheline | ✅ |

Re-exécution : `.venv\Scripts\python.exe data\catalogue\validate_catalogue.py` → `30/30`.

## Utilisation du seed

```bash
psql "$CONNECTION_STRING" -f data/catalogue/seed_catalogue.sql
```

Rejouable : chaque `INSERT` porte `ON CONFLICT DO NOTHING` (PK ou `(formation_id, enseignant_id)`),
et les tables du référentiel sont créées avec `CREATE TABLE IF NOT EXISTS`.