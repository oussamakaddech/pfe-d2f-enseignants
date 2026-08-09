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
- Cloud QG on PR #1 was ERROR: `new_coverage=0` (no coverage uploaded), `new_reliability_rating=3`, `new_security_rating=2`. Not blocking (no branch protection on `main`).
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
