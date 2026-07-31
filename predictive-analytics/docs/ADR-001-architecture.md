# ADR-001 — Architecture de la reconstruction D2F Predictive Analytics

Statut: Accepted
Date: 2026-07-31
Décisioneur: Principal Engineer / ML Engineer

## 1. Contexte

Le service `esprit_D2F-predictive-analytics` existant est une machine à règles ad-hoc
(coverage-based gap detection) couplée à la DB, sans moteurs purs, sans contrats de données,
sans pipeline ML reproductible et avec des IDs mixtes (Txxx/ENSxxx/E00001).

On reconstruit un package autonome `predictive-analytics/` avec:

- des **moteurs déterministes purs** (aucune dépendance API/DB)
- un **pipeline ML supervisé temporel** séparé
- des **contrats de données explicites**
- un **frontend analytique** React + TypeScript

## 2. Décisions

### 2.1 Identité canonique
- Seul format accepté: `ENS` suivi de 3 à 6 chiffres (`^ENS\d{3,6}$`).
- Les IDs `Txxx` sont **rejetés** sauf si une table d'alias
  `data/raw/id_aliases.csv` (legacy_id, canonical_id) fournit la correspondance.
- Les IDs `E00001` (formation-service) doivent être mappés côté BFF avant d'atteindre
  ce service; le service refuse `E\d{5}` par défaut (configurable pour migration).

### 2.2 Niveaux
- Interne: `int 1..5` correspondant à `N1..N5`.
- Frontière API: exposé sous forme `N1..N5` pour la lisibilité métier.
- Les valeurs hors plage sont des erreurs de validation (rejet de ligne).

### 2.3 Modèle de référence
`Domaine -> Compétence -> Sous-compétence -> Savoir`
- `Knowledge.knowledge_type` ∈ {THEORETICAL, PRACTICAL}
- `Knowledge.required_level` = niveau requis du référentiel (référence, pas un paramètre d'apprentissage)

### 2.4 Gap Engine — déterministe
- `gap_level = max(required_level - current_level, 0)` (règle de base)
- Types de gaps: `LEVEL_DEFICIT`, `MISSING_ASSIGNMENT`, `MISSING_PREREQUISITE`,
  `STALE_ASSESSMENT`, `ACTIVE_TRAINING_NEED`, `INCOMPLETE_PROFILE`
- Sévérité: `LOW|MEDIUM|HIGH|CRITICAL` (mapping gap_level + escalations documentées)
- Aucun enregistrement de compétence ⇒ `DATA_INCOMPLETE` / `MISSING_COMPETENCIES`, jamais "aucun gap".
- Agréation: Savoir -> Sous-compétence -> Compétence -> Domaine -> Enseignant.

### 2.5 Machine Learning — périmètre strict
- **Interdiction**: prédire un gap directement calculable (target leakage).
- Cibles autorisées:
  1. `completion_probability` (classification binaire)
  2. `training_effectiveness_score` (régression bornée 0..1)
  3. `stagnation_risk_future` (classification binaire)
  4. `future_need_probability` (classification binaire)
- Split **temporel** obligatoire; jamais de mélange passé/futur.
- Modèles: LogisticRegression (baseline), RandomForest, GradientBoosting.
  XGBoost/LightGBM/CatBoost optionnels (importation conditionnelle).
- Export: artifact joblib + preprocessor + feature schema + model card + metrics report + drift baseline.

### 2.6 Couches applicatives
```
api/routers  ->  application/use_cases  ->  engines (purs)
                                      \->  infrastructure/repositories (lecture datasets)
```
- Les moteurs prennent des **entités de domaine** et retournent des **DTO**.
- Les repositories lisent les datasets `curated` (CSV/JSON) en mémoire.
- Aucun moteur ne touche la base de données (testable à 100% sans infra).

### 2.7 Contrats de données
- 12 datasets définis dans `data/contracts/*.json` (data dictionary machine-readable).
- Pipeline: `raw -> staging -> curated -> features` avec rapports CSV/JSON/Markdown.
- Règles: normalisation IDs, validation schéma, déduplication, validation métier,
  gestion des missing data (jamais d'imputation silencieuse des niveaux critiques),
  cohérence temporelle.

### 2.8 API
- FastAPI + Pydantic v2, préfixe `/api/v1`.
- Validation `teacher_id`, RBAC minimal, cache TTL par enseignant, observabilité (request-id).
- Réponses enveloppées: `{data, meta, errors[]}`.

### 2.9 Frontend
- React 18 + TypeScript strict + Vite + TanStack Query.
- Pages: TeacherAnalytics, GapAnalysis, Recommendations, LearningPath, PredictiveDashboard.
- États obligatoires: loading / error / empty / DATA_INCOMPLETE / NO_ELIGIBLE_TRAINING / INSUFFICIENT_HISTORICAL_DATA.
- Charting SVG maison (aucune dépendance lourde), accessibilité ARIA.

## 3. Conséquences
- Les moteurs sont purs ⇒ tests unitaires rapides et déterministes.
- Les datasets curated sont la source de vérité offline; l'API lit les mêmes contrats.
- ML indépendant de l'API (batch training + inference service versionné).

## 4. Non-objectifs (v1)
- Pas d'intégration RabbitMQ en v1 (les events existent mais sont hors périmètre).
- Pas de persistance DB; repositories en mémoire sur datasets curated.
- Pas de collaborative filtering actif en v1 (placeholder explicite, désactivé par défaut).
