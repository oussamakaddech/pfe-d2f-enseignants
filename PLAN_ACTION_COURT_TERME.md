# 📋 Plan d'Action - Court Terme (1-2 mois)

> Date : 25 Avril 2026
> Objectif : Implémenter les recommandations prioritaires P0

---

## 1. Configuration JWT_SECRET

### 1.1 État actuel
- Le fichier `.env.example` existe avec la variable `JWT_SECRET=` vide
- Le fichier `.env` n'existe pas (non commité dans Git)
- Le `docker-compose.yml` référence `${JWT_SECRET}` dans tous les services

### 1.2 Actions à réaliser
1. Créer un script PowerShell pour générer un JWT_SECRET sécurisé
2. Créer le fichier `.env` à partir de `.env.example`
3. Remplir toutes les variables d'environnement requises
4. Ajouter `.env` au `.gitignore` (si ce n'est pas déjà fait)
5. Documenter la procédure dans le README

### 1.3 Livrables
- `scripts/generate-jwt-secret.ps1` - Script de génération
- `.env` - Fichier de configuration (non versionné)
- Documentation mise à jour

---

## 2. Implémentation CI/CD

### 2.1 État actuel
- Fichiers `.drone-*.yml` présents mais non fonctionnels
- Aucun pipeline GitHub Actions
- Pas de tests automatisés dans le pipeline
- Pas de scan SonarQube automatisé

### 2.2 Actions à réaliser

#### 2.2.1 GitHub Actions - Pipeline CI
1. Créer `.github/workflows/ci.yml` avec :
   - Build des services Java (Maven)
   - Build du frontend (Vite)
   - Exécution des tests unitaires
   - Analyse SonarQube
   - Build des images Docker

2. Créer `.github/workflows/cd.yml` avec :
   - Déploiement automatique sur environnement de test
   - Validation des health checks
   - Rollback automatique en cas d'échec

#### 2.2.2 Configuration SonarQube
1. Configurer le serveur SonarQube (déjà dans `infra/sonarqube`)
2. Mettre à jour les fichiers `sonar-project.properties` dans chaque service
3. Intégrer SonarQube dans le pipeline GitHub Actions

### 2.3 Livrables
- `.github/workflows/ci.yml` - Pipeline CI
- `.github/workflows/cd.yml` - Pipeline CD
- `scripts/setup-sonarqube.ps1` - Script de configuration SonarQube
- Documentation mise à jour

---

## 3. Ajout de Tests

### 3.1 État actuel
- Service competence : 9 tests (controller, service, repository)
- Autres services : 1 test auto-généré vide (`ApplicationTests.java`)
- Frontend : Tests limités (seulement besoin/)

### 3.2 Actions à réaliser

#### 3.2.1 Tests Backend

**Services prioritaires** (dans l'ordre) :
1. **Formation Service** (8088)
   - Tests CRUD formations
   - Tests workflow formation
   - Tests inscriptions
   - Tests séances

2. **Evaluation Service** (8087)
   - Tests évaluations globales
   - Tests évaluations formateurs

3. **Authentification Service** (8085)
   - Tests authentification
   - Tests génération JWT
   - Tests rôles et permissions

4. **Besoin Formation Service** (8004)
   - Tests création besoins
   - Tests workflow approbation
   - Tests événements JMS

#### 3.2.2 Tests Frontend

**Composants prioritaires** (dans l'ordre) :
1. Authentification (Login, Register)
2. Formation (CRUD, Workflow)
3. Compétence (RICE, Matchmaking)
4. Besoin (Création, Approbation)

### 3.3 Livrables
- Tests unitaires pour les services prioritaires
- Tests d'intégration pour les workflows critiques
- Tests frontend avec React Testing Library
- Couverture de tests > 70% pour les services critiques

---

## 4. Nettoyage Frontend

### 4.1 État actuel
- 3 UI libraries : Ant Design + MUI + Bootstrap
- 50+ dépendances dans package.json
- Fichiers `.tsx` et `.jsx` mélangés
- CSS modules + inline + Bootstrap + Ant Design

### 4.2 Actions à réaliser

#### 4.2.1 Standardisation UI
1. **Conserver uniquement Ant Design** comme UI library principale
2. **Supprimer MUI** (`@mui/material`, `@mui/icons-material`, `@mui/x-data-grid`)
3. **Supprimer Bootstrap** (`bootstrap`, `react-bootstrap`)
4. **Remplacer les composants MUI/Bootstrap** par des composants Ant Design équivalents

#### 4.2.2 Nettoyage des dépendances
1. Identifier et supprimer les dépendances inutilisées
2. Consolidation des bibliothèques similaires (ex: plusieurs calendriers)
3. Optimisation du bundle size

#### 4.2.3 Standardisation TypeScript
1. Convertir tous les fichiers `.jsx` en `.tsx`
2. Ajouter les types manquants
3. Activer le mode strict TypeScript

#### 4.2.4 Standardisation CSS
1. Utiliser uniquement Ant Design + CSS modules
2. Supprimer le CSS inline
3. Organiser les styles par composant

### 4.3 Livrables
- `package.json` nettoyé et optimisé
- Tous les fichiers convertis en TypeScript
- CSS standardisé (Ant Design + CSS modules)
- Bundle size réduit de ~30%

---

## 5. Calendrier

### Semaine 1-2 : Configuration JWT_SECRET
- Jour 1-2 : Création scripts et documentation
- Jour 3-4 : Tests et validation
- Jour 5 : Documentation finale

### Semaine 3-4 : CI/CD
- Jour 1-3 : Configuration GitHub Actions CI
- Jour 4-5 : Configuration GitHub Actions CD
- Jour 6-7 : Tests et validation

### Semaine 5-8 : Tests
- Semaine 5-6 : Tests Backend (Formation, Evaluation)
- Semaine 7 : Tests Backend (Auth, Besoin)
- Semaine 8 : Tests Frontend

### Semaine 9-12 : Nettoyage Frontend
- Semaine 9-10 : Standardisation UI (Ant Design uniquement)
- Semaine 11 : Nettoyage dépendances et TypeScript
- Semaine 12 : Standardisation CSS et optimisation

---

## 6. Critères de Succès

### Configuration JWT_SECRET
- ✅ JWT_SECRET généré et configuré
- ✅ Tous les services démarrés avec succès
- ✅ Authentification fonctionnelle
- ✅ Documentation complète

### CI/CD
- ✅ Pipeline CI fonctionnel
- ✅ Pipeline CD fonctionnel
- ✅ Tests automatisés exécutés
- ✅ SonarQube intégré
- ✅ Déploiement automatique

### Tests
- ✅ Couverture > 70% pour services critiques
- ✅ Tests frontend pour composants clés
- ✅ Tests d'intégration workflows
- ✅ Documentation des tests

### Nettoyage Frontend
- ✅ Une seule UI library (Ant Design)
- ✅ Tous les fichiers en TypeScript
- ✅ CSS standardisé
- ✅ Bundle size réduit de ~30%

---

## 7. Risques et Mitigations

### Risque 1 : Interruption de service pendant le nettoyage frontend
**Mitigation** : Effectuer les changements sur une branche de développement, tester exhaustivement avant de fusionner

### Risque 2 : Tests insuffisants pour couvrir tous les cas
**Mitigation** : Prioriser les tests sur les fonctionnalités critiques et les workflows les plus utilisés

### Risque 3 : Dépendances incompatibles lors du nettoyage
**Mitigation** : Tester chaque suppression de dépendance individuellement, vérifier les effets de bord

### Risque 4 : Pipeline CI/CD complexe à maintenir
**Mitigation** : Documenter chaque étape, utiliser des templates réutilisables, simplifier autant que possible

---

## 8. Ressources Nécessaires

### Humaines
- 1 Développeur Backend (Tests, CI/CD)
- 1 Développeur Frontend (Nettoyage, Tests)
- 1 DevOps (CI/CD, Infrastructure)

### Techniques
- Serveur SonarQube (disponible dans `infra/sonarqube`)
- Repository GitHub Actions
- Environnement de test Docker

---

## 9. Suivi et Rapportage

### Rapports hebdomadaires
- Avancement par tâche
- Blocages et risques
- Mesures de succès (couverture tests, bundle size, etc.)

### Indicateurs clés
- Couverture de tests (%)
- Nombre de tests ajoutés
- Taille du bundle frontend (KB)
- Temps d'exécution pipeline CI/CD (min)
- Nombre de bugs détectés en production

---

## 10. Prochaines Étapes

Une fois les objectifs à court terme atteints :
1. Évaluer l'impact des changements
2. Planifier les améliorations à moyen terme (DB-per-service, circuit breaker, monitoring)
3. Documenter les leçons apprises
4. Ajuster le plan en fonction des retours

---

**Fin du Plan d'Action - Court Terme**
