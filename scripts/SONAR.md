# SonarQube — Analyse one-command du monorepo D2F

Lance build + tests + scan + Quality Gate pour les **12 modules** du monorepo (8 Java + 1 Web + 3 Python) avec une seule commande.

## Pré-requis

| Outil | Pourquoi |
|---|---|
| `python` 3.11+ | Parsing JSON Sonar |
| `mvn` ou `./mvnw` | Build/test des 8 modules Java |
| `node` + `npm` | Tests Vitest du webapp |
| `sonar-scanner` (`npm i -g sonarqube-scanner`) | Scan Web + Python |
| SonarQube UP sur `localhost:9000` | `docker compose -f infra/sonarqube/docker-compose.yml up -d` |

## Bash (Linux / macOS / WSL / Git Bash)

```bash
# Tout (12 modules)
SONAR_TOKEN=squ_xxx bash scripts/sonar-full.sh

# Bootstrap token via admin/password
SONAR_PASS=monMotDePasse bash scripts/sonar-full.sh

# Un seul module (par projectKey Sonar)
SONAR_TOKEN=squ_xxx bash scripts/sonar-full.sh --only d2f_webapp
SONAR_TOKEN=squ_xxx bash scripts/sonar-full.sh --only d2f_rice,d2f_webapp

# Filtre par langue
bash scripts/sonar-full.sh --java-only
bash scripts/sonar-full.sh --python-only
bash scripts/sonar-full.sh --web-only

# Re-scan sans relancer les tests
bash scripts/sonar-full.sh --skip-tests

# Juste les tests (pas de scan)
bash scripts/sonar-full.sh --skip-scan

# Help
bash scripts/sonar-full.sh --help
```

## PowerShell (Windows natif)

```powershell
# Tout
powershell scripts/sonar-full.ps1 -SonarToken squ_xxx

# Bootstrap token
powershell scripts/sonar-full.ps1 -SonarPass monMotDePasse

# Un seul module
powershell scripts/sonar-full.ps1 -SonarToken squ_xxx -Only d2f_webapp
powershell scripts/sonar-full.ps1 -SonarToken squ_xxx -Only "d2f_rice,d2f_webapp"

# Filtres
powershell scripts/sonar-full.ps1 -JavaOnly
powershell scripts/sonar-full.ps1 -PythonOnly
powershell scripts/sonar-full.ps1 -WebOnly

# Modes rapides
powershell scripts/sonar-full.ps1 -SkipTests
powershell scripts/sonar-full.ps1 -SkipScan
```

## Sortie

Chaque module imprime `[OK]` ou `[FAIL]`. À la fin, tableau de synthèse :

```
Project                          | QG   Rel Sec Mai HotRev | Bugs Vulns Smells Cov%
-----------------------------------------------------------------------------------------------
OK  d2f_api_gateway                | OK    A   A   A     A  |    0     0      0   93.5
OK  d2f_authentification           | OK    A   A   A     A  |    0     0      0   90.0
... 12 lignes ...

[OK]   All Quality Gates PASS
Dashboard: http://localhost:9000/projects?gate=OK
```

Codes de sortie :
- `0` — tous les Quality Gates passent
- `1` — au moins un QG en ERROR (le détail est dans le tableau)
- `2` — pré-requis manquants (curl/python/maven absents)
- `3` — SonarQube injoignable
- `4` — token introuvable / impossible à générer

## Logs

Chaque module écrit dans `scripts/.sonar-logs/<projectKey>.log` (compilation, tests, scan). Le tableau de synthèse pointe vers le fichier en cas de FAIL.

## Catalogue des 12 modules

| Type | Module | Sonar projectKey |
|---|---|---|
| Java | `esprit_D2F-api-gateway` | `d2f_api_gateway` |
| Java | `esprit_D2F-authentification` | `d2f_authentification` |
| Java | `esprit_D2F-besoin-formation` | `d2f_besoin_formation` |
| Java | `esprit_D2F-certificat` | `d2f_certificat` |
| Java | `esprit_D2F-competence` | `d2f_competence` |
| Java | `esprit_D2F-evaluation` | `d2f_evaluation` |
| Java | `esprit_D2F-formation` | `d2f_formation` |
| Java | `esprit_D2F-analyse` | `d2f_analyse` |
| Web (Vite+TS) | `esprit_D2F-webapp` | `d2f_webapp` |
| Python | `esprit_D2F-rice` | `d2f_rice` |
| Python | `esprit_D2F-predictive-analytics` | `d2f_predictive_analytics` |
| Python | `esprit_D2F-recommandation-formateur` | `d2f_recommandation_formateur` |

## CI / GitHub Actions

L'orchestrateur CI équivalent est `.github/workflows/sonarqube-monorepo.yml` (matrix de jobs).

Les scripts locaux servent à :
- **Pré-PR** : valider QG localement avant push (`bash scripts/sonar-full.sh`)
- **Debug** : itérer sur un module unique (`--only`)
- **Démos** : reproduire l'analyse complète sans CI
