# Webapp D2F

## Installation rapide

npm install

## Scripts

- npm run dev
- npm run build
- npm run typecheck
- npm run typecheck:services-strict

## Analyse Sonar locale (Docker)

Commande recommandee:

docker run --rm -e SONAR_HOST_URL="http://host.docker.internal:9000" -e SONAR_TOKEN="<TOKEN>" -e SONAR_USER_HOME="/tmp/.sonar" -v "${PWD}:/usr/src" sonarsource/sonar-scanner-cli:latest --define "sonar.scm.disabled=true" --define "sonar.working.directory=/tmp/.scannerwork"

## Alignement Cahier de Charge (DSI)

- Pas de hard-coding URL API: configuration via VITE_API_URL dans src/config/env.ts
- Interfaces TypeScript centralisees: src/models
- Migration progressive TS active: services critiques migres en .ts
- Typecheck bloquant en CI (Drone): typecheck global + strict scope services

Voir le suivi detaille dans CAHIER_CONFORMITE_WEBAPP.md.

