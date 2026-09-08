# 📘 Explication des services RICE et Analyse Prédictive

> Document de synthèse pour comprendre le rôle, les fichiers et les fonctions principales
> des deux microservices Python (FastAPI) du projet PFE D2F.
> Des commentaires en français ont été ajoutés avant chaque fonction dans le code source.

---

## 1️⃣ Service RICE — `esprit_D2F-rice/`

### 🎯 À quoi il sert

**RICE = Référentiel Intelligent de Compétences Enseignants.**

C'est le moteur d'IA d'extraction de compétences : on lui envoie des **fiches modules ESPRIT
(PDF/DOCX)**, il en extrait automatiquement un **arbre de compétences structuré**
`Domaine → Compétence → Sous-compétence → Savoir` avec :
- le **niveau** de chaque savoir (taxonomie de Bloom → N1_DÉBUTANT … N5_EXPERT) ;
- le **type** (PRATIQUE / THÉORIQUE) selon le vocabulaire du département ;
- les **enseignants suggérés** pour chaque savoir (matching par nom, par module, par référentiel) ;
- les **codes du référentiel officiel** correspondants (ex : `S2a`, `INFO-A1`).

Supporte les **5 départements** : GC, INFO, GE, MÉCA, TELECOM.
L'enseignant humain relit ensuite le résultat dans le frontend et le **valide** →
persistance en PostgreSQL (`/rice/validate`).

### 🔌 Endpoints principaux

| Méthode | Endpoint | Rôle |
|---|---|---|
| POST | `/rice/analyze` | Analyse des fiches → arbre de compétences (cœur du service) |
| GET | `/rice/referential/{dept}` | Référentiel d'un département + affectations enseignants |
| POST | `/rice/match` | Matcher un texte libre contre le référentiel |
| POST | `/rice/refresh-cache` | Vider les caches (référentiel + affectations) |
| POST | `/rice/export-csv` | Export de l'arbre en CSV (1 ligne/savoir) |
| POST | `/rice/validate` | Persister l'arbre validé par l'humain en base |
| GET | `/health`, `/metrics` | Healthcheck / monitoring |

### 📁 Fichiers principaux

| Fichier | Rôle | Fonctions clés |
|---|---|---|
| `main.py` | App FastAPI, middlewares (JWT, rate-limit, CORS), handlers d'erreur DSI | `lifespan`, `health`, `metrics` |
| `rice_analyzer.py` | Shim de compatibilité → re-exporte tout depuis `rice/` | — |
| `rice/analyzer.py` | **Pipeline d'analyse** d'une fiche | `_analyze_single_fiche`, `_build_competence_from_acquis`, `_build_competences_from_referentiel`, `_fallback_extraction`, `analyze_files` |
| `rice/nlp.py` | **Moteur NLP** : extraction texte/OCR, métadonnées, acquis d'apprentissage, séances, Bloom | `_extract_text`, `_extract_metadata`, `_extract_acquis_apprentissage`, `_extract_seances`, `_extract_referentiel_competences`, `_detect_bloom_level`, `_detect_type` |
| `rice/referential.py` | Référentiels par département (DB + JSON fallback) + matching mots-clés/**sémantique** (sentence-transformers) | `_get_effective_referential`, `_match_gc_savoir`, `_match_gc_competence`, `_suggest_gc_enseignants`, `_detect_departement`, `_build_semantic_corpus` |
| `rice/db.py` | Pool de connexions PostgreSQL + données enseignants (cache 5 min) | `_fetch_enseignant_affectations`, `_fetch_all_enseignants_info`, `_create_enseignant_if_new` |
| `rice/routes.py` | Définition des endpoints FastAPI | `rice_analyze`, `rice_validate`, `match_text`, `get_referential`, `refresh_cache`, `export_csv` |
| `rice/validate_helpers.py` | Helpers de persistance `/validate` (upsert domaine → compétence → savoir → liens) | `_upsert_domaine`, `_upsert_competence`, `_upsert_savoir_row`, `_process_validate_propositions` |
| `rice/enseignants.py` | Matching flou des noms d'enseignants (rapidfuzz) | `_match_enseignants_by_name`, `_match_enseignants_by_module` |
| `rice/models.py` | Modèles Pydantic (requêtes/réponses) | `DomaineProposition`, `SavoirProposition`, `RiceAnalysisResult`, `ValidateRequest` |
| `rice/cache.py` | Cache thread-safe avec TTL | `_ThreadSafeCache` |
| `rice/upload_security.py` | Sécurité uploads (taille, magic bytes, path traversal) | `validate_uploads_batch`, `sanitize_filename` |
| `rice/jwt_middleware.py` | Auth JWT HS512 (défense en profondeur) | `JWTAuthMiddleware.dispatch` |
| `rice/ratelimit.py` | Limitation de débit par IP (fenêtre fixe) | `RateLimitMiddleware.dispatch` |
| `rice/error_handlers.py` | Enveloppe d'erreur normalisée DSI | `register_exception_handlers` |

### 🔁 Flux d'une analyse (`/rice/analyze`)

```
Upload PDF/DOCX
   │  upload_security (taille, magic bytes, path traversal)
   ▼
_extract_text (pdfplumber + tables, DOCX, OCR pytesseract si PDF scanné)
   │
   ▼
_extract_metadata (LLM → tables PDF → regex)   code/nom module, responsable, prérequis…
   │
   ▼
_match_all_enseignants (nom flou + module + référentiel + auto-création DB)
   │
   ▼
Choix de stratégie :
   1. Acquis d'apprentissage (AA) trouvés → _build_competence_from_acquis
   2. Format "référentiel de compétences"  → _build_competences_from_referentiel
   3. Sinon fallback puces + Bloom         → _fallback_extraction
   │  Chaque savoir : match référentiel (sémantique + mots-clés) → refCodes,
   │  niveau Bloom/N1..N5, type PRATIQUE/THEORIQUE, enseignants suggérés
   ▼
analyze_files → RiceAnalysisResult (arbre + stats couverture)
```

---

## 2️⃣ Service Analyse Prédictive — `esprit_D2F-predictive-analytics/`

### 🎯 À quoi il sert

Microservice **d'analyse prédictive des compétences, écarts (gaps), risques et besoins de
formation** des enseignants. Il consomme les données des autres services (évaluations,
compétences, formations, besoins) et produit :

1. **Gaps** : écart entre le niveau actuel d'un enseignant et le niveau cible d'une compétence ;
2. **Score de risque** (0-100) : stagnation, régression, assiduité, évaluations faibles,
   besoins répétés, faible engagement ;
3. **Besoins de formation** : individuels et collectifs (par département/UP) ;
4. **Alertes** priorisées (sévérité × portée) ;
5. **Recommandations de formations** (contenu 70 % + qualité 20 % + récence 10 %) ;
6. **Dashboards** agrégés (compétences en déclin, KPI, ratio à risque).

### 🤖 Le volet ML (machine learning)

Le service embarque un **modèle de prédiction des gaps à 3 mois** avec une gouvernance stricte.
Trois modes **exclusifs** exposés dans chaque réponse (`model_mode`) :

| Mode | Signification |
|---|---|
| `PRODUCTION_ML` | Modèle réel actif (intégrité SHA-256 ✅, provenance données ✅, métriques ✅, registre approuvé ✅) |
| `DEMO_ML` | Artefact présent mais données synthétiques / registre non approuvé |
| `HEURISTIC_FALLBACK` | Moteur de règles explicable (repli **fail-closed**, toujours disponible) |

Anti-fuite garanti : `required_level` et `gap_next_3m` ne sont **jamais** dans les features ;
split temporel strict. Pipeline : préparer dataset → entraîner → valider métriques →
enregistrer CANDIDATE → promouvoir ACTIVE → rollback possible.

### 🔌 Endpoints principaux

| Méthode | Endpoint | Rôle |
|---|---|---|
| GET | `/api/v1/analytics/teachers/{id}/gaps` | Gaps de compétences + mode ML |
| GET | `/api/v1/analytics/teachers/{id}/risk` | Score de risque (règles métier prioritaires sur le ML) |
| GET | `/api/v1/analytics/dashboard` (+ `/latest`, `/declining`) | Dashboards agrégés |
| GET | `/api/v1/analytics/alerts` | Alertes |
| Router legacy sous `/api` | predict / detect / recommend / dashboard | Compat ancien main.py (dashboard CUP) |

### 📁 Fichiers principaux (architecture hexagonale)

| Couche | Fichier | Rôle | Fonctions clés |
|---|---|---|---|
| API | `app/main.py` | App FastAPI + scheduler + consumer RabbitMQ | `create_app`, `lifespan` |
| API | `app/api/v1/*` | Routes REST (gaps, risk, dashboards, alerts, needs…) | routers |
| **Domain** | `domain/services/gap_calculator.py` | Calcul des écarts de compétence | `compute_gap`, `gap_score`, `severity_from_gap`, `trend_from_levels` |
| **Domain** | `domain/services/risk_calculator.py` | Moteur de risque par règles pondérées | `compute_risk`, `compute_sub_scores`, `risk_level` |
| **Domain** | `domain/services/need_detector.py` | Détection des besoins individuels/collectifs | `detect_individual_needs`, `detect_collective_needs` |
| **Domain** | `domain/services/alert_prioritizer.py` | Priorisation des alertes (sévérité × portée) | `priority_score`, `sort_by_priority` |
| **Domain** | `domain/services/dashboard_aggregator.py` | Agrégation KPI + compétences en déclin | `aggregate_declining`, `summarize_kpis` |
| **Domain** | `domain/services/ranking_service.py` | Classement des formations recommandées | `rank_candidates`, `rank_score`, `content_match` |
| **Application** | `application/use_cases/compute_gaps.py` | Gaps d'un enseignant (ML ou heuristique) | `ComputeGaps.execute`, `_heuristic_on` |
| **Application** | `application/use_cases/compute_risk.py` | Risque d'un enseignant (ML → règles → heuristique) | `ComputeRisk.execute_serving`, `_heuristic` |
| **Application** | `application/use_cases/detect_needs.py` | Besoins de formation + persistance | `DetectNeeds.execute`, `_detect_collective` |
| **Application** | `application/use_cases/generate_alerts.py` | Alertes gaps critiques + régression | `GenerateAlerts.generate_all`, `persist_all` |
| **Application** | `application/use_cases/recommend_trainings.py` | Recommandations (blending 70 % heuristique / 30 % ML) | `RecommendTrainings.execute` |
| **Application** | `application/use_cases/build_dashboards.py` | Snapshots dashboard par périmètre | `BuildDashboards.execute` |
| **Application** | `application/use_cases/process_event.py` | Traitement événements RabbitMQ idempotent | `ProcessEvent.execute` |
| **Infra ML** | `infrastructure/ml/predictor.py` | Modèle de gaps (charge artefact, validation, prédiction) | `ArtifactModelPort.predict_gaps`, `status` |
| **Infra ML** | `infrastructure/ml/risk_predictor.py` | Modèle de risque calibré, **fail-closed** | `RiskMLPredictor.predict`, `status` |
| **Infra ML** | `infrastructure/ml/model_registry.py` | Registre : promotion/rollback gouverné | `ModelRegistry.approve`, `rollback` |
| **Infra ML** | `infrastructure/ml/artifact_integrity.py` | Intégrité SHA-256 / HMAC des artefacts joblib | `load_with_integrity_check`, `verify` |
| **Infra ML** | `infrastructure/ml/dataset_provenance.py` | Provenance réelle des données (% synthétique) | `compute_provenance` |
| **Infra ML** | `infrastructure/ml/feature_schema.py` | Validation stricte des features (anti-fuite) | `validate_feature_vector` |
| **Infra ML** | `infrastructure/ml/risk_features.py` | Features de risque train/serving partagées | `build_training_frame`, `build_serving_features` |

### 🔁 Flux d'une requête "risque" (`/teachers/{id}/risk`)

```
GET /risk
   ▼
ComputeRisk.execute_serving
   1. Modèle ML de risque calibré dispo ? (intégrité + decision=accept)
        → OUI : prédiction calibrée + contributions top-3 (SHAP/XGBoost)  → mode "ML"
        → NON : règles sur les gaps (0.50/0.12/0.40) → mode "HEURISTIC"
   2. Rien du tout ? → heuristique comportementale (compute_risk, 6 facteurs)
   ▼
save_risk_snapshot (base analyse)  →  réponse API (profile + mode + fallback_reason)
```

---

## 🔗 Rôle des deux services dans la plateforme D2F

```
Frontend (webapp) ─► API Gateway (Spring)
                        │
    ┌───────────────────┼──────────────────────────────┐
    ▼                   ▼                              ▼
RICE (Python)      Analyse (BFF Java) ──►  Predictive Analytics (Python)
extraction de       vues consolidées        gaps / risque / besoins /
compétences des     de pilotage             alertes / recommandations /
fiches modules      (CUP, chef dépt.)       dashboards ML
```

- **RICE** remplit la base de connaissances (savoirs, compétences, liens enseignant-savoir)
  à partir des fiches modules → alimente les compétences analysées ensuite.
- **Analyse prédictive** exploite ces niveaux + évaluations + formations pour anticiper
  les écarts et recommander des formations.

---

*Document généré le 08/09/2026 — branche `oussama`.*

