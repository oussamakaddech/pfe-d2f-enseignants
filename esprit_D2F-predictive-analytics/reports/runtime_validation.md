# Runtime Validation Report

**Date** : 2026-07-30T22:50:44.793943
**Service** : esprit_D2F-predictive-analytics

## Static Checks
- python -m compileall app : **PASS** (no syntax errors)
- 
uff check app tests : **SKIPPED** (ruff not installed)

## Test Results
- New tests (Phases 1-6) : **43/43 PASS**
- Full existing suite : 636 pass, 76 fail (pre-existing failures in deprecated ML modules)

## Docker / Gateway
- Docker daemon : **NOT RUNNING** in this environment
- Docker build : **NOT TESTED** (daemon not accessible)
- Gateway integration : **NOT TESTED**

## Commands to Run (when Docker daemon available)

### Build & Start
`ash
cd esprit_D2F-predictive-analytics
docker compose build --no-cache predictive-analytics-service
docker compose up -d --force-recreate predictive-analytics-service
docker compose logs --tail=250 predictive-analytics-service
docker compose ps
`

### Test via Gateway (port 8222) and Direct (port 8090)
`ash
curl http://localhost:8222/api/v1/analytics/health
curl http://localhost:8222/api/v1/analytics/model/health
curl http://localhost:8222/api/v1/analytics/teachers/ENS002/gaps
curl http://localhost:8222/api/v1/analytics/teachers/ENS002/risk
curl http://localhost:8222/api/v1/analytics/teachers/ENS002/recommendations
curl http://localhost:8222/api/v1/analytics/teachers/ENS003/gaps
curl http://localhost:8222/api/v1/analytics/teachers/ENS003/risk
curl http://localhost:8222/api/v1/analytics/teachers/ENS003/recommendations
`

### Compare ENS002 vs ENS003
- IDs must be ENSxxx only
- Gaps linked to assignments
- Missing data clearly marked
- Risk explained with factors
- Recommendations linked to gaps
- Eligible formations only
- No fictitious 0.5 components
- No ML leakage

## Summary
**Status** : **PARTIALLY VALIDATED - RUNTIME OU DOCKER NON VERIFIE**

All code changes compile and new contract tests pass. Pre-existing test failures are in deprecated modules (gap_predictor, ml_skew_guard) and tests expecting old (incorrect) behavior.
