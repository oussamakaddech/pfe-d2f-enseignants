# Rapport explicatif — Analyse Prédictive, Formation & Dashboard

Ce rapport présente trois composants clés de la plateforme **D2F** (Gestion des compétences des enseignants, ESPRIT) : le service **d'analyse prédictive**, le service **de formation** et le **dashboard** frontal.

---

## 1. Service d'Analyse Prédictive (`esprit_D2F-predictive-analytics`)

Microservice **Python / FastAPI** (module 8 de la plateforme D2F). Il fournit l'intelligence de la plateforme : analyse des écarts de compétences, évaluation du risque, recommandation de formations et tableaux de bord analytiques.

### Fonctionnalités principales
- **Prédiction des écarts de compétences** (`POST /api/predict/gaps/{teacherId}`) — score d'écart par compétence avec sévérité (LOW / MEDIUM / HIGH / CRITICAL).
- **Recommandation de parcours de formation** (`POST /api/recommend/path`) — parcours personnalisés avec probabilité de succès.
- **Détection des enseignants à risque** (`GET /api/detect/at-risk-teachers`) — score de risque 0-100 (dropout / désengagement / stagnation).
- **Dashboard prédictif** (`GET /api/v1/analytics/dashboard/*`), besoins de formation individuels et collectifs, alertes.

### Architecture technique
- **Architecture hexagonale / DDD** : `app/api/v1/` (routes), `app/application/use_cases/` (logique métier), `app/domain/` (entités + règles métier), `app/infrastructure/` (adaptateurs DB, ML, messagerie), `app/core/` (config, sécurité). Un `app_legacy/` coexiste pour la rétro-compatibilité front.
- **Modèles ML** (scikit-learn, artifacts en `ml/artifacts`/`MODELS_DIR`) :
  - *Gap predictor* — GradientBoostingRegressor, **désactivé après audit DSI** (corpus d'entraînement ~98% synthétique → fallback sur heuristique déterministe `gap_score = (cible − actuel)/4`).
  - *Risk classifier* — RandomForestClassifier + règle métier (≥3 écarts critiques ⇒ CRITICAL).
  - *Relevance model* — GradientBoostingRegressor (mélange 70% heuristique + 30% ML).
  - Intégrité des artifacts (SHA-256/HMAC), détection de dérive, kill switch global `ML_ENABLED`.
- **Persistance** : PostgreSQL. Lecture des schémas source (`formation`, `competence`, `evaluation`, `besoin`), écriture dans le schéma `analyse` (gaps, risques, recommandations, alertes, snapshots dashboard).
- **Intégrations** : exposé uniquement via l'**API Gateway** (rewrite `/api/analyse/**` → port 8000). Messagerie **RabbitMQ** optionnelle (`d2f.events`, clé `analyse.#`) : `analyse.requested`, `enseignant.created`, `besoin.formation`, `besoin.approuve`. Planificateur **APScheduler** optionnel.
- **Sécurité** : JWT HS512, rôles ADMIN/CUP/CHEF_DEPARTEMENT/ENSEIGNANT avec restriction de portée côté serveur (CUP limité à son département/UP).

### Configuration clé
Seuils métier (`SEUIL_GAP_CRITIQUE=0.75`, `RISK_THRESHOLD_HIGH=70`, …), `DATABASE_URL`, `JWT_SECRET`, `MODELS_DIR`, `SCHEDULER_*`, `MESSAGE_BROKER_TYPE`.

---

## 2. Service de Formation (`esprit_D2F-formation`)

Microservice **Java 17 / Spring Boot 3.5.16** gérant tout le cycle de vie des formations : catalogue, sessions, inscriptions, présences, certificats et statistiques.

### Fonctionnalités principales
- **Formations** : CRUD complet, cycle de vie via machine à états (`NOUVEAU → ENREGISTRE → PLANIFIE → EN_COURS → ACHEVE / ANNULE`, transitions automatisées), gestion des conflits de salles, clonage, recherche avancée.
- **Inscriptions** : demande → validation (PENDING / APPROVED / REJECTED) avec traitement individuel ou massif.
- **Enseignants** : CRUD + import Excel, rôles Animateur/Participant, suivi des présences.
- **Séances & présences** : sessions, présences par séance (CRUD, batch, statistiques).
- **Certificats** : génération automatique et asynchrone (RabbitMQ) pour les participants à présence complète à la clôture de la formation.
- **KPIs & reporting** : formations, heures, participants, répartition par état/domaine/compétence, top participants, export Excel/ICS.
- **Intégration Microsoft 365** : OneDrive (documents), Outlook Calendar (synchronisation séances, invitations `.ics`), Outlook Mail (notifications, rappels J-7/J-3/J-1).

### Architecture technique
- **Spring Data JPA + PostgreSQL** (schéma `formation`, migrations **Flyway** V1→V40), H2 pour dev/tests.
- **Sécurité** : Spring Security OAuth2 Resource Server (JWT HS512), RBAC *deny-by-default* via `@PreAuthorize` et la librairie partagée `d2f-common-security` (AuthorizationMatrix).
- **Messagerie** : **RabbitMQ** — consomme `besoin-formation.approved` (convertit un besoin approuvé en formation, avec idempotence + DLQ), publie `certificateQueue`, `evaluation.*.queue`, `d2f.analytics.trigger`.
- **Clients Feign** : `auth-account-service` (création de compte + profils unifiés), `evaluation-service` (envoi d'évaluations en lot).
- **Eléments transverses** : Resilience4j (retry/circuit-breaker), cache Caffeine, auditing JPA, soft-delete, log sans PII (`PiiSafeLogger`), logs d'audit/idempotence (`EmailAuditLog`, `ImportLog`, `RoomConflictLog`).

### API
Toutes sous `/api/v1/` : `formations`, `formations-workflow`, `inscription`, `seances`, `enseignants`, `unified-profiles`, `kpi` (+ `kpi/participants`), `calendar`, `exports`, `documents`, `formation-competences`, `formation-report`, référentiels (`ups`, `departements`, `bureaux`). Swagger : `/swagger-ui.html`. Port 8088.

---

## 3. Dashboard (`esprit_D2F-webapp`)

Frontend **React 19 + Vite 6 + TypeScript 5.9**, UI **Ant Design**, données via **TanStack React Query**, graphiques **Chart.js** et SVG custom, authentification par cookie JWT HttpOnly.

### Pages principales
- **`/home` → CupDashboardPage** — page d'accueil réelle (rôle CUP) : bannière d'actions prioritaires, tuiles KPI (formations actives, inscriptions en attente, taux de complétion, couverture avec delta), activité des formations, répartition par domaine/compétence, jauge de couverture + top 5 compétences, CTA vers l'analyse prédictive.
- **`/home/AnalysePredictive` & `/home/analytics/dashboard` → AnalyticsDashboardPage** — « Tableau de bord analytique » sur données PostgreSQL réelles : 8 cartes KPI, enseignants à risque, impact des formations, carte de chaleur gaps (département × compétence) avec modal de drill-down, offre/demande, centre d'alertes, tendance de risque mensuelle, formations recommandées, actions prioritaires, filtres + export CSV/PDF.
- **Autres** : `PilotageDashboardPage` (forecast, benchmark départements, anomalies, corrélation besoin↔gap), `D2FDashboard`, `PersonalDashboard`, `AlertsCenterPage`, `HeatmapPage`, `EnseignantsInactifsPage`, `ModelMonitoringPage`.

### Widgets & composants
- `components/dashboard/` (17 widgets) : `DashboardKpiGrid`, `DashboardHealthCard`, `DashboardAlerts`, `DashboardTimelineChart`, `DashboardPredictiveInsights` (prévision de demande + signaux), `DashboardTopCompetencies`, etc.
- `components/analytics/` (22 composants) : `AtRiskTeachersTable`, `Heatmap`, `AlertCenter`, `RiskScoreCard`, `RiskHistoryChart`, `RecommendationsList`, `GapsTable`, `D2FDashboard`.

### Services consommés (via Gateway, préfixe `/api/analyse/**`)
| Service front | Backend cible |
|---|---|
| `AnalyticsService` | analyse `/v1/analytics/*` (reporting Excel/PDF, pilotage) |
| `analyticsApi` | analyse `/v1/analytics/dashboard/real/impact`, alertes, heatmap, at-risk, recommandations |
| `KPIService` | formation `/kpi/*` |
| `AnalysePredictiveService` | analyse (overview, demand-forecast, risk-distribution…) |
| `D2FService` | dataset legacy `/api/v1/d2f/*` |
| `FormationService` / `InscriptionService` | formation (formations à venir, inscriptions) |
| `BesoinFormationService` | besoin-formation (besoins affichés sur le dashboard CUP) |

---

## 4. Synthèse (flux de bout en bout)

1. Le service **formation** gère le catalogue, les inscriptions, les présences et **publie** des événements (certificats, évaluations, analytics trigger).
2. Le service **analyse prédictive** lit les données source (formation, compétence, évaluation, besoin) pour calculer gaps, risques et recommandations, et expose des dashboards / alertes.
3. Le **dashboard** (webapp) agrège toutes ces données via l'API Gateway et les présente selon le rôle (CUP, département, enseignant), avec vue analytique détaillée et export.

Ce trio forme la boucle : *formation → analyse prédictive → pilotage* de la performance des compétences enseignantes.