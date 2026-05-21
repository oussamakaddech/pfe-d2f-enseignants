# GitHub Actions — Secrets requis (DSI 2025-2026)

Configurer dans **Settings → Secrets and variables → Actions**.

## Registre Docker

| Secret           | Description                                     | Exemple                      |
|------------------|-------------------------------------------------|------------------------------|
| `REGISTRY_URL`   | URL du registre interne DSI                     | `registry.dsi.local`         |
| `DOCKER_USERNAME`| Compte de push sur le registre                  | `ci-bot`                     |
| `DOCKER_PASSWORD`| Mot de passe / token du compte                  | —                            |

## SonarQube

| Secret           | Description                                     | Exemple                          |
|------------------|-------------------------------------------------|----------------------------------|
| `SONAR_TOKEN`    | Token d'analyse SonarQube                       | —                                |
| `SONAR_HOST_URL` | URL du serveur SonarQube interne                | `http://sonar.dsi.local:9000`    |

## Déploiement — Environnement Test

| Secret              | Description                                  |
|---------------------|----------------------------------------------|
| `SSH_PRIVATE_KEY`   | Clé SSH privée pour le serveur test          |
| `TEST_SERVER_HOST`  | Hostname / IP du serveur test                |
| `TEST_SERVER_USER`  | Utilisateur SSH du serveur test              |

## Déploiement — Environnement Production

| Secret                  | Description                                  |
|-------------------------|----------------------------------------------|
| `PROD_SSH_PRIVATE_KEY`  | Clé SSH privée pour le serveur production    |
| `PROD_SERVER_HOST`      | Hostname / IP du serveur production          |
| `PROD_SERVER_USER`      | Utilisateur SSH du serveur production        |

## Notifications

| Secret        | Description                                               | Exemple                              |
|---------------|-----------------------------------------------------------|--------------------------------------|
| `WEBHOOK_URL` | URL webhook pour notifications (Teams / Slack / custom)   | `https://hooks.slack.com/...`        |

> Si `WEBHOOK_URL` n'est pas configuré, les notifications sont ignorées sans faire échouer le pipeline.

## GitHub Environments requis

Créer dans **Settings → Environments** :

| Environnement     | Protection              | Usage                                         |
|-------------------|-------------------------|-----------------------------------------------|
| `test`            | Aucune                  | Déploiement automatique après CI              |
| `production`      | Approbation manuelle    | Déploiement après validation DSI              |
| `emergency-build` | Approbation manuelle    | Reconstruction d'urgence d'un service isolé   |

## Serveur — prérequis

Chaque serveur cible doit avoir :
- Docker + Docker Compose plugin installés
- Répertoire `/opt/d2f` avec `docker-compose.yml` et `docker-compose.prod.yml`
- Répertoire `/backups/d2f` (production uniquement)
- L'utilisateur SSH doit avoir accès à Docker (groupe `docker`)
- Accès réseau au registre DSI interne
