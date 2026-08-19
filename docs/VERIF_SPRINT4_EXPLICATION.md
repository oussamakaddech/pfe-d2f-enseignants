# Service analyse prédictive — du zéro au résultat

## 1. Qu'est-ce que le service ?
`esprit_D2F-predictive-analytics` est un microservice Python (FastAPI) qui **lit en lecture seule** les données métier des schémas `formation`, `competence`, `evaluation`, `besoin`, puis calcule des écarts, risques, besoins et recommandations. Il n'écrit que dans le schéma `analyse` (`save_skill_gaps`, `save_risk_snapshot`, etc.).

Fichier racine : `app/main.py` (ligne 18 : `create_app()`).

---

## 2. Architecture en 4 couches

```
Route FastAPI  (api/v1/gaps.py, risk.py, dashboards.py, alerts.py, needs.py)
      ↓
Use case applicatif  (application/use_cases/analyze_teacher.py, compute_gaps.py, build_dashboard.py)
      ↓
Services de domaine  (domain/services/gap_calculator.py, risk_calculator.py, ranking_service.py, need_detector.py, dashboard_aggregator.py)
      ↓
Infrastructure  (repositories SQL, ModelPort ML, scheduler, message broker)
```

Le conteneur (`infrastructure/container.py`) injecte toutes les dépendances (DB, sources, modèle ML, repos) au démarrage (`main.py:21`).

---

## 3. Source des données (lecture seule)
Le service se connecte via SQLAlchemy (`infrastructure/db/database.py`) aux schémas existants :
- `competence.enseignant_competences` (niveaux)
- `competence.competences` + `savoirs`
- `formation.formations` + `inscriptions` + `presences` + `formation_competences`
- `evaluation.evaluation_formateur`
- `besoin.besoin_formation`

Chaque `repository` fait des requêtes `SELECT` sur ces tables (`infrastructure/repositories/`). Aucune modification des données métier.

---

## 4. Chaque « modèle » / moteur — du zéro au résultat

### A. Écart actuel (`gap`)
**Données d'entrée** : `current_level` (niveau observé) et `target_level` (niveau requis) par compétence, lus depuis `competence.enseignant_competences` et `competence.niveau_savoir_requis`.

**Formule** (`domain/services/gap_calculator.py:4-9`) :
- `raw_gap = max(0, target - current)`
- `gap_score = min(1, raw_gap / 4)` (car niveaux sur 1–5, écart max = 4)
- Sévérité : configurable (`seuil_gap_critique`, `seuil_gap_haute`, `seuil_gap_moyenne` dans `core/config`)

**Résultat** : `SkillGap` (code, nom, `gap_score`, `severity`, `trend`, `as_of`).

**ML futur (`gap_next_3m`)** : le `ModelPort` (`predictor.py`) charge `gap_predictor_temporal.joblib`. **Mais** (`predictor.py:82-86`) : `_gap_model_enabled = False` (audit DSI, corpus 98% synthétique > seuil 50%). Donc `predict_gaps()` retourne `None`, et le `ComputeGaps` (`compute_gaps.py:42`) bascule sur `HEURISTIC_FALLBACK`. Le résultat final du service contient toujours `mode="HEURISTIC_FALLBACK"` et `model_version=null` (`gaps.py:34-47`).

---

### B. Score de risque (`risk`)
**Données d'entrée** : `stagnation` (mois depuis dernière acquisition), `declined` (baisse de niveau), `attendance_rate` (taux présence), `avg_eval_score`, `repeated_need_count`, `days_since_last_activity`.

**Formule** (`domain/services/risk_calculator.py:55-68`) :
- 6 sous-scores bornés dans [0,1] : `stagnation`, `decline`, `attendance` (1 - taux), `low_eval`, `repeated_need`, `low_engagement`
- `weighted = sum(sub_score * weight) / sum(weights)` (poids externes dans la config)
- `score = min(100, 100 * weighted)` (sur 100)
- Facteurs triés par contribution décroissante (`sorted(..., reverse=True)`)

**ML (`RandomForest`)** : `predictor.py:613-703` charge `risk_classifier.joblib`. Mais le modèle est sous-représenté (1 seul exemple `CRITICAL`, F1=0). Une règle métier de sécurité (`predictor.py:671`) écrase le ML si `n_crit >= 3` → `CRITICAL`. Le résultat final est un `RiskProfile` (score, niveau, facteurs ordonnés, `model_mode` via `status()`).

---

### C. Classement des formations (`ranking`)
**Données d'entrée** : formations éligibles (`formation.formations` + `formation_competences`) + profil enseignant (`savoirs` manquants).

**Formule** (`domain/services/ranking_service.py:55-60`) :
- `content_match` = proportion des savoirs manquants couverts par la formation (`len(intersection) / len(missing)`)
- `quality_score` = `min(1, avg_eval / 5)`
- `recency_score` = `1 - (days_since_end / 365)` (favorise récentes/non expirées)
- `rank_score = 0.70 * content + 0.20 * quality + 0.10 * recency`
- Filtre : non expirée, non déjà suivie, couvre compétence avec écart (`not c.already_completed` : ligne 69).

**Résultat** : liste `Recommendation` (`ranking_service.py:63-88`), limitée (`limit`). Le `relevance_model` (`predictor.py:722-767`) existe (`relevance_model.joblib`) mais le service conserve la formule heuristique comme source de vérité (`ranking_service.py`).

---

### D. Détection des besoins (`needs`)
**Données d'entrée** : `SkillGap` par enseignant (calculés par A).

**Formule** (`domain/services/need_detector.py`) :
- Individuel (`detect_individual_needs`) : `gap.gap_score >= threshold` (seuil paramétrable) → `TrainingNeed` (`need_type=NeedTypeIndividual`).
- Collectif (`detect_collective_needs`) : même seuil, puis `count < min_teachers` (paramètre, généralement 30% du périmètre). Si suffisamment d'enseignants dans le même périmètre (`scope_type` = département/UP) partagent le même écart, besoin collectif émis.

**Résultat** : `TrainingNeed` (individuel ou collectif, `scope_type`, `scope_id`, `teachers_count`).

---

### E. Tableau de bord (`dashboard`)
**Données d'entrée** : agrégation pré-calculée (pas de calcul lourd à la volée, `build_dashboard.py`).

Le `DashboardRepository` (`infrastructure/repositories/`) lit des `snapshot` persistées dans le schéma `analyse`. Les KPIs sont : nombre d'enseignants à risque, compétences en tension, répartition par unité/département, alertes ouvertes par sévérité (`alerts.py:16-39` applique le filtre périmètre : `ADMIN/CUP` → global ; `CHEF_DEPARTEMENT` → son département ; `ENSEIGNANT` → ses propres résultats).

Le `build_dashboards.execute()` (`application/use_cases/build_dashboard.py`) agrège ces données et retourne un dict (`core/envelope.py` : `ok(kpis)`).

---

## 5. Pipeline ML (hors ligne, non actif en production)

**Corpus** : `pipelines/generate_training_corpus.py` (graine 42) → `training_corpus.csv` (5 000 lignes, 29 features temporelles).
**Anti-fuite** : `required_level` et `gap_next_3m` exclus (`predictor.py:8-10`).
**Split** : temporel (`build_features.py`) : 3 332 train / 1 668 test.
**Modèles évalués** (`validate_model_metrics.py`, `train_gap_model.py`) : Gradient Boosting (`CV-RMSE=0.9726`), XGBoost (0.9759), MLP (0.9935), persistance (`RMSE=1.7888`). Le GB améliore (`lift = 0.787`).
**Artefact** : `data/models/gap_predictor_temporal.joblib` + `temporal_training_metadata.json`.
**Gouvernance** : registre (`predictor.py:65`) vérifie `ACTIVE`, SHA-256 (`load_with_integrity_check`), `feature_ranges`, `synthetic_share_pct`. Si l'une échoue → `HEURISTIC_FALLBACK`.

---

## 6. Résumé du flux complet (exemple : analyse d'un enseignant)

```
1. Requête HTTP : GET /teachers/{id}/gaps  (gaps.py)
2. Auth + périmètre : require_roles + enforce_teacher_access
3. Container → ComputeGaps.execute()
   a. _scoped_competencies() (périmètre département/UP)
   b. model_port.predict_gaps()
      - Charge X depuis DB (savoirs, formations, évaluations, besoins, présences)
      - Si ML désactivé (synthetic > 50%) → return None
   c. Fallback heuristique (compute_gap + severity + trend)
   d. Sauvegarde dans analyse.save_skill_gaps()
4. Réponse JSON : gaps + {model_mode: "HEURISTIC_FALLBACK", model_version: null}
```

Pour `/dashboard` (`dashboards.py`) : le `build_dashboards.execute()` lit le `snapshot` de `analyse` et retourne des KPIs pré-calculés, filtrés par `scope` (`GLOBAL` ou `DEPARTEMENT` selon le rôle `CUP`/`CHEF_DEPARTEMENT`).

Pour `/alerts` (`alerts.py`) : `list_alerts()` applique `_scope_alerts()` selon le rôle (`ADMIN/CUP` → global, `CHEF` → `dept_id`, `ENSEIGNANT` → `teacher_id`).

---

## 7. Points clés du code vérifiés
- `HEURISTIC_FALLBACK` toujours exposé (`predictor.py:124`, `compute_gaps.py:42`)
- `required_level` jamais dans X (`predictor.py:8`)
- `gap_predictor_temporal` présent mais non chargé (`_gap_model_enabled = False`) (`predictor.py:85`)
- `relevance_model` existe (`relevance_artifact_path`) mais le ranking reste heuristique (`ranking_service.py`)
- `risk_classifier` (`random_forest_classifier`) chargé si présent, mais la règle métier (`critical_gaps >= 3`) écrase (`predictor.py:671`)
- Intégrité : `ArtifactIntegrityError` rejeté au chargement (`predictor.py:214`)
- Périmètre : `scoped_competencies()` (`compute_gaps.py:52`) + `teacher_access` (`domain/services/teacher_access.py`)