## Description

<!-- Décrivez brièvement les changements apportés -->

## Type de changement

- [ ] Correction de bug
- [ ] Nouvelle fonctionnalité
- [ ] Refactoring
- [ ] Documentation
- [ ] Dépendance / Build

## Tests effectués

- [ ] Tests unitaires backend (`./mvnw test`)
- [ ] Tests frontend (`npm run test`)
- [ ] Build Docker (`docker compose build`)
- [ ] Qualité SonarQube (Quality Gate A)

## Services impactés

<!-- Ex: auth-service, formation-service, webapp -->

## Branche source (GitFlow DSI §1.5)

- [ ] Branche nommée selon convention GitFlow : `feature/`, `hotfix/`, `release/`, `develop`, `main`
- [ ] Aucune branche nommée par un nom de développeur (ex: `prenom`, `nom-prenom`)

## Checklist

- [ ] Pagination présente sur les endpoints retournant des listes
- [ ] Pas de secret / credential en dur dans le code (pas de `localhost`, IP, email, token en dur)
- [ ] URLs en kebab-case cohérentes
- [ ] Messages d'erreur conformes au standard DSI (timestamp, status, errorCode, message, path, traceId)
- [ ] POST de création retourne HTTP 201 (pas 200)
- [ ] Migrations Flyway ajoutées si modification schéma BD
- [ ] Variables d'environnement utilisées pour toute URL ou paramètre métier
- [ ] Documentation mise à jour (README, OpenAPI)
- [ ] Hostnames DSI utilisés (db.dsi.local, broker.dsi.local, api-gateway.dsi.local)
