# 🚀 Guide de Configuration CI/CD - D2F Platform

> **Date** : 25 Avril 2026
> **Objectif** : Configuration des pipelines CI/CD et de SonarQube

---

## 📊 Table des Matières

1. [Vue d'ensemble](#vue-densemble)
2. [Configuration GitHub Actions](#configuration-github-actions)
3. [Configuration SonarQube](#configuration-sonarqube)
4. [Secrets GitHub](#secrets-github)
5. [Déploiement](#déploiement)

---

## Vue d'ensemble

### Architecture CI/CD

```
┌─────────────┐
│   GitHub    │
│  Repository │
└──────┬──────┘
       │
       ├──────────────┐
       │              │
       ▼              ▼
┌─────────────┐  ┌─────────────┐
│ Pipeline CI │  │ Pipeline CD │
└──────┬──────┘  └──────┬──────┘
       │                │
       ├────────────────┤
       │                │
       ▼                ▼
┌─────────────┐  ┌─────────────┐
│   Tests     │  │  Déploiement│
│ SonarQube   │  │  Test/Prod  │
└─────────────┘  └─────────────┘
```

### Pipelines

- **CI Pipeline** (`.github/workflows/ci.yml`) : Tests, analyse SonarQube, build Docker
- **CD Pipeline** (`.github/workflows/cd.yml`) : Déploiement test/production avec rollback

---

## Configuration GitHub Actions

### Pipeline CI

Le pipeline CI exécute les étapes suivantes :

1. **Tests Backend**
   - Build Maven
   - Exécution des tests unitaires
   - Génération des rapports de couverture
   - Analyse SonarQube

2. **Tests Python**
   - Installation des dépendances
   - Exécution des tests pytest
   - Génération des rapports de couverture

3. **Tests Frontend**
   - Installation des dépendances npm
   - Linting avec ESLint
   - Vérification des types TypeScript
   - Exécution des tests avec couverture
   - Analyse SonarQube

4. **Build Docker**
   - Build des images Docker
   - Push vers Docker Hub

### Déclenchement

Le pipeline CI est déclenché sur :
- Push sur les branches `main` et `develop`
- Pull Request vers les branches `main` et `develop`

### Pipeline CD

Le pipeline CD exécute les étapes suivantes :

1. **Déploiement Test**
   - Connexion SSH au serveur de test
   - Pull du code
   - Pull des images Docker
   - Démarrage des services
   - Health checks
   - Smoke tests
   - Rollback automatique en cas d'échec

2. **Déploiement Production** (manuel)
   - Backup de la base de données
   - Connexion SSH au serveur de production
   - Pull du code
   - Pull des images Docker
   - Démarrage des services
   - Health checks
   - Smoke tests
   - Rollback automatique en cas d'échec

### Déclenchement

Le pipeline CD est déclenché sur :
- Push sur la branche `main`
- Déclenchement manuel (workflow_dispatch)

---

## Configuration SonarQube

### Démarrage de SonarQube

```bash
cd infra/sonarqube
docker compose up -d
```

### Configuration Initiale

Utilisez le script PowerShell pour configurer SonarQube :

```powershell
.\scripts\setup-sonarqube.ps1
```

Ce script effectue les actions suivantes :
- Démarre SonarQube
- Change le mot de passe admin
- Génère un token d'authentification
- Crée les projets dans SonarQube

### Accès SonarQube

- **URL** : http://localhost:9000
- **Login** : admin
- **Password** : d2f_admin_2026! (après configuration)

### Projets SonarQube

Les projets suivants sont créés automatiquement :

- d2f_authentification
- d2f_competence
- d2f_besoin_formation
- d2f_certificat
- d2f_evaluation
- d2f_formation
- d2f_api_gateway
- d2f_analyse
- d2f_webapp

### Quality Gates

Les Quality Gates sont configurés avec les seuils suivants :

- **Coverage on New Code** : ≥ 70%
- **Duplicated Lines on New Code** : ≤ 3%
- **Maintainability Rating** : A
- **Reliability Rating** : A
- **Security Rating** : A

---

## Secrets GitHub

### Secrets Requis

Ajoutez les secrets suivants dans votre repository GitHub :

#### Secrets CI/CD

| Nom | Description | Exemple |
|-----|-------------|---------|
| `SONAR_TOKEN` | Token d'authentification SonarQube | `sqp_xxxxxxxxxxxxxxxx` |
| `SONAR_HOST_URL` | URL du serveur SonarQube | `http://your-sonar-server.com` |
| `DOCKER_USERNAME` | Nom d'utilisateur Docker Hub | `your-dockerhub-username` |
| `DOCKER_PASSWORD` | Mot de passe Docker Hub | `your-dockerhub-password` |

#### Secrets Déploiement

| Nom | Description | Exemple |
|-----|-------------|---------|
| `SSH_PRIVATE_KEY` | Clé privée SSH pour les serveurs | `-----BEGIN RSA PRIVATE KEY-----...` |
| `TEST_SERVER_HOST` | Hôte du serveur de test | `test.d2f.esprit.tn` |
| `TEST_SERVER_USER` | Utilisateur SSH serveur de test | `deploy` |
| `PROD_SERVER_HOST` | Hôte du serveur de production | `d2f.esprit.tn` |
| `PROD_SERVER_USER` | Utilisateur SSH serveur de production | `deploy` |

### Ajouter des Secrets

1. Allez dans votre repository GitHub
2. Cliquez sur **Settings** > **Secrets and variables** > **Actions**
3. Cliquez sur **New repository secret**
4. Ajoutez chaque secret avec son nom et sa valeur

---

## Déploiement

### Déploiement Automatique

Le déploiement automatique est configuré pour :
- **Environnement de test** : À chaque push sur `main`
- **Environnement de production** : Après approbation manuelle

### Déploiement Manuel

Pour déployer manuellement :

1. Allez dans l'onglet **Actions** de votre repository
2. Sélectionnez le workflow **D2F CD Pipeline**
3. Cliquez sur **Run workflow**
4. Sélectionnez la branche `main`
5. Cliquez sur **Run workflow**

### Rollback

En cas d'échec du déploiement, un rollback automatique est effectué :
- Retour à la version précédente du code
- Redémarrage des services
- Notification de l'équipe

### Health Checks

Les health checks vérifient :
- API Gateway : `http://host:8222/actuator/health`
- Auth Service : `http://host:8085/actuator/health`
- Competence Service : `http://host:8005/actuator/health`
- Frontend : `http://host:3000/`

### Smoke Tests

Les smoke tests vérifient :
- Réponse des endpoints principaux
- Accessibilité du frontend
- Intégrité des services critiques

---

## 🚀 Commandes Utiles

```bash
# Exécuter le pipeline CI localement
docker compose build
docker compose up -d

# Vérifier les logs
docker compose logs -f

# Vérifier les health checks
docker compose ps

# Analyser avec SonarQube
mvn sonar:sonar

# Déployer sur test
git push origin main

# Déployer sur production
# Via l'interface GitHub Actions
```

---

## 📚 Ressources

- [GitHub Actions Documentation](https://docs.github.com/en/actions)
- [SonarQube Documentation](https://docs.sonarqube.org/)
- [Docker Compose Documentation](https://docs.docker.com/compose/)

---

## 🔍 Dépannage

### Problème : Le pipeline CI échoue

**Solution** :
1. Vérifiez les logs du workflow
2. Vérifiez que tous les secrets sont configurés
3. Vérifiez que les tests passent localement

### Problème : SonarQube n'est pas accessible

**Solution** :
1. Vérifiez que le conteneur SonarQube est démarré
2. Vérifiez les logs : `docker logs sonarqube`
3. Vérifiez le port 9000

### Problème : Le déploiement échoue

**Solution** :
1. Vérifiez la connexion SSH
2. Vérifiez les health checks
3. Vérifiez les logs des services
4. Le rollback automatique devrait être déclenché

---

**Fin du Guide de Configuration CI/CD**
