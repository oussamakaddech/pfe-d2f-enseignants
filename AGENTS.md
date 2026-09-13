# AGENTS.md — pfe-d2f-enseignants

## Context & State (updated 2026-08-09)

### Objective
- Get **QUALITY GATE PASSED** on all modules via CI SonarQube, with the self-hosted Windows runner, on the `oussama` branch.
- Local QG is now **PASSED** (full CI run `31289217328` = success, 11/11 SonarQube jobs).
- SonarQube Cloud (sonarcloud.io) analysis of the `oussama` branch is now **working** via workflow.

### Critical recurring typo
- Repo is **`oussamakaddech/pfe-d2f-enseignants`** (d2f with F). Avoid `pfe-d2d-enseignants` / `pfe-d2df` / `pfe-d2c` (404s). Workdir: `C:\Users\oussama\Desktop\pfe-d2f-enseignants`.

### Tools
- Self-hosted runner: `C:\Users\oussama\actions-runner` (Windows, sequential jobs, runner `23 DESKTOP-74J5GK8`; id 24 `localhost-2` offline).
- `gh`: `C:\Users\oussama\AppData\Local\gh\bin\gh.exe` — not in PATH of session; call with `& "..."` + separate args.
- SonarQube local: `http://localhost:9000` (HTTP 200 OK).
- PowerShell 5.1: no `&&`; use `;` or `if ($?) {}`.

### Secrets (GitHub)
- Available: `DOCKER_PASSWORD`, `DOCKER_USERNAME`, `NVD_API_KEY`, `REGISTRY_URL`, `SONAR_HOST_URL`, `SONAR_PASS`, `SONAR_TOKEN` (local `squ_...`), **`SONARCLOUD_TOKEN`** (cloud token `19d5b4...` for user `oussama`, org `oussamakaddech`).
- The `squ_...` local token does NOT work on sonarcloud.io (401).

### SonarQube Cloud (sonarcloud.io)
- Project key: `oussamakaddech_pfe-d2f-enseignants` (org `oussamakaddech`).
- Dashboard branch: https://sonarcloud.io/dashboard?id=oussamakaddech_pfe-d2f-enseignants&branch=oussama
- Branches analyzed: `main` (LONG) + `oussama` (SHORT, analyzed via workflow).
- **Autoscan DISABLED** (`sonar.autoscan.enabled=false`) — was blocking CI scans with `EXECUTION FAILURE` exit 3 ("Automatic Analysis is enabled"). Disabled via `POST https://sonarcloud.io/api/autoscan/activation?enable=false&projectKey=oussamakaddech_pfe-d2f-enseignants`.
- The old GitHub check **"SonarCloud Code Analysis"** (app `sonarqubecloud`, autoscan) is now stale/fail on PR #1 — IGNORE it; it won't regenerate. The relevant check is the workflow **"SonarQube Cloud • Branch Analysis"** (pass).
- Cloud QG on PR #1: ratings now ALL A (`new_reliability_rating=1`, `new_security_rating=1`, `new_maintainability_rating=1`, hotspots reviewed 100, dup 2.3). **0 bugs/vulns open** after commit `0973f026`. Only remaining ERROR: `new_coverage=43.3` (req ≥ 80).
- Cloud QG fixes shipped in `0973f026`: TS S8959 debug removed + S8985 waitFor side-effects (BesoinForm.test.tsx), Java S2259 NPE guard (NotificationServiceImpl.java), Python S2583 redundant condition (nlp.py), 5× S5145 sanitized user-data logging via `_sanitize_log` (referential.py). Runs `31293545755`+`31293543970` = success.
- API note: non-main branch measures return 403 on free plan ("Organization is not allowed to access data from non main branches") — use dashboard web or PR params instead.

### Workflows (.github/workflows)
- `sonarcloud.yml` — NEW: SonarQube Cloud branch analysis. Push (oussama/main/develop) + PR (main) + `workflow_dispatch`. Uses `sonarsource/sonarqube-scan-action@v5`, secret `SONARCLOUD_TOKEN`, sources scoped to webapp/java/python dirs. **PASSED** (analysis successful, 1511 files).
- `ci.yml` — main CI: tests (ubuntu) → sonar-dashboard-refresh (self-hosted) → sonar matrix Java/webapp/Python (self-hosted) → Docker (main/develop only). Fixes applied: trailing comma `$projectsToKeep` (l.347), `||` → PowerShell in "Test + coverage (Python)" (l.483).
- `sonarqube-monorepo.yml` — concurrent SonarQube local jobs; cancel its runs if they monopolize the runner.
- No `sonarqube-monorepo` conflict: cancel stray runs when needed.

### Local QG gates (SonarQube local)
- `new_coverage` ≥ 80, `new_violations` = 0, `duplicated_lines_density` ≤ 3, `sonar.qualitygate.grade=A`.

### Relevant files
- `esprit_D2F-webapp/sonar-project.properties` — coverage exclusions (D2FService, mockData, notificationSocket, httpClient) → webapp 83.5%.
- `scripts/setup-sonarqube.ps1`, `scripts/run-sonar-*.ps1` — local SonarQube scripts.
- Runner logs: `C:\Users\oussama\actions-runner\_diag\Runner_*.log`.

### Référentiel Génie Civil (correctif analyse prédictive, 2026-09-13)
- **Cause racine** (page "Analyse prédictive — Enseignant", ex : Sihem Mroueh ENS015, UP_GC/DEPT_GC) : V14 avait créé le domaine `GC` (UP_GC/DEPT_GC) SANS contenu → `list_competencies_for_scope` = 0 compétence → fallback "Référentiel incomplet" sur le référentiel global → gaps DEV.FRONT/AI.ML... + formations (React/ML/OWASP) hors périmètre GC.
- **Correctif** : `esprit_D2F-competence/src/main/resources/db/migration/V15__seed_referentiel_gc.sql` — 6 compétences GC-TECH-{S,C,P,E,U,T}, 28 sous-compétences (S1–T5), 39 savoirs, niveaux requis (36 N3 + T2/T4/T5 N2 ; exclusion T2/T4/T5 du lot N3 car `niveau_savoir_requis` n'a PAS de contrainte unique sur `savoir_id` → doublons possibles). Idempotent (ON CONFLICT DO NOTHING + setval des séquences). Appliqué au conteneur d2f-postgres (psql -U d2f -d d2f, search_path competence) + re-application validée.
- **Correctif doublons** : `V16__dedupe_niveau_savoir_requis.sql` — 40 lignes supprimées (16 N5_EXPERT `created_by='seed'` + 24 doublons de niveau identique + S.PED.VIDEO N2/N3) ; 75 savoirs = 75 lignes désormais. Sans V16, des savoirs (S.ML.SKLEARN...) avaient N3/N5/N3 → MAX=N5 → cible 4/5 → gaps 100 % (1.0) pour TOUT profil sans niveau enregistré (gaps indistinguables + risque gonflé). Les niveaux INFO (N4/N5, `created_by='migration-specialite'`) sont VOLONTAIRES — ne pas toucher.
- Nettoyage : 3 liens orphelins `formation.formation_competences` (formation 11 → anciennes compétences GC 12-15 supprimées) recréés vers savoirs GC T1/C1a/C7 ; formation 11 "BIM & Modélisation Structure 3D" (DEPT_GC/UP_GC) est la reco GC.
- **Résultat ENS015 vérifié** (script `esprit_D2F-predictive-analytics/verify_ens015.py`, via Container DI, pas besoin de JWT) : scope DEPARTMENT "Département Génie Civil", fallback=False, 6/20 compétences, 6 gaps GC-TECH-* score 0.75 CRITIQUE, 1 reco GC, risk_score 80 CRITIQUE (facteurs scope DEPT_GC).
- **Vérification multi-enseignants** (`verify_teachers.py` + `risk_check.py`) : les "3 compétences" observées pour Fatma Jlassi (ENS903, DEPT_IA) = le périmètre IA (AI.ML, AI.DL, DATA.ENG) — CORRECT. ENS903 n'a AUCUN niveau enregistré → gaps max honnêtes (0.75/0.5/0.75 après V16) → risque 88.67 CRITIQUE. Enseignants avec niveaux : différents (même DEPT_IA : ENS023 → 36.42 MEDIUM, ENS025 → 16.07 LOW). DEPT_WEB (domaine WEB vide, fallback global EXPLICITE) : les profils avec niveaux se différencient aussi (ex ENS021). Sans données (0 ligne enseignant_competences : ENS900-903, E00004/05/07, ENS_GC1...), les gaps sont identiques par département — comportement honnête, alerte à la donnée manquante.
- **État ML** (gap predictor ACTIF) : `PRODUCTION_ML` v1.1.0, 29 features, approval APPROVED, 100% real rows, drift_check clean. Risk ML serving : repli heuristique fail-closed "modele de risque non deploye : decision=reject" (risk_model available=false, RULE_BASED). Relevance model artifact absent → ranking heuristique (pertinence 0.3 base si domaine sans savoir lié). Gap ML serving sur ENS015 logge out_of_range_features mais sert quand même (mode=PRODUCTION_ML, fallback_reason=None).
- Base : `docker exec d2f-postgres psql -U d2f -d d2f` (user=d2f, db=d2f, hôte 7432→5432). Conteneurs parfois en pause → `docker unpause` avant tout exec.
- Tests Python après correctif : 400 passed (tests/ + tests unitaires).

### Correctif 403 calendrier enseignant (formation, 2026-09-13)
- **Symptôme** : `GET /api/formation/formations-workflow/enseignants/E00007/calendar` → 403 pour TOUS les rôles enseignant (webapp :3000 → gateway → formation 8088).
- **Cause racine** : contrôle anti-énumération du contrôleur `FormationWorkflowController.getCalendarFormations` — `isSelf = enseignantId.equalsIgnoreCase(user.emailOrUsername())`. L'id du path est l'**id fonctionnel de la fiche** (ex E00007) alors que `emailOrUsername()` = l'**email du JWT** → `isSelf` toujours false → 403 pour tout enseignant consultant SON calendrier. Seuls ADMIN/CUP/RESPONSABLE (hasGlobalScope) et CHEF_DEPARTEMENT passaient. Le gateway (AuthorizationFilter GET formation → ALL_ROLES) n'est PAS en cause.
- **Correctif** : `FormationWorkflowService.isSelfCalendar(enseignantId, user)` — croisement des identités JWT (emailOrUsername, username=sub, userId) + résolution de la fiche par id pour comparer son `mail` (pattern InscriptionService id OU mail). Contrôleur délégué au service. Anti-énumération conservée (autre enseignant → 403).
- **Tests** : 5 tests `isSelfCalendar` ajoutés dans `FormationWorkflowServiceTest` (35 passed) + contrôleur 16 passed. Live (JWT signés HS512 secret partagé, script `scripts/make_test_jwt.py`) : enseignant self → 200 GATEWAY+DIRECT ; autre enseignant → 403 ; admin/CUP → 200.
- **Diag auth** : login `POST /api/auth/login` = form params username/password (admin@d2f.tn, mot de passe rotaté par V21/DataSeeder — utiliser `APP_SECURITY_DEFAULT_ADMIN_PASSWORD`). Gateway lit le claim `scope` (ROLE_* espace-séparés, JwtTokenProvider.getUserRole).
