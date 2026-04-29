# 📊 Analyse Complète — Plateforme D2F (Teacher Professional Development)

> Date : 25 Avril 2026 | Auteur : Analyse Architecturale IA

---

## 1. Vue d'ensemble de l'Architecture

La plateforme **D2F** (Développement Des Formateurs) est une application **microservices** destinée à la gestion du développement professionnel des enseignants à l'ESPRIT University. Elle couvre le cycle complet : compétences → besoins → formations → évaluations → certificats.

### Architecture globale

```
┌─────────────────────────────────────────────────────────────────────────┐
│                              FRONTEND                                    │
│  React 19 + Vite + Ant Design + TypeScript (Port 3000)                  │
└─────────────────────────────────────────────────────────────────────────┘
                                    │
                                    ▼
┌─────────────────────────────────────────────────────────────────────────┐
│                            API GATEWAY                                   │
│  Spring Cloud Gateway (Port 8222) — JWT, CORS, Routing                  │
└─────────────────────────────────────────────────────────────────────────┘
                                    │
        ┌───────────┬───────────┬───────────┬───────────┬───────────┐
        ▼           ▼           ▼           ▼           ▼           ▼
   ┌────────┐  ┌────────┐  ┌────────┐  ┌────────┐  ┌────────┐  ┌────────┐
   │  Auth  │  │Compet. │  │Besoin  │  │Formation│  │Eval.   │  │Certif. │
   │ 8085   │  │ 8005   │  │ 8004   │  │ 8088   │  │ 8087   │  │ 8086   │
   └────────┘  └────────┘  └────────┘  └────────┘  └────────┘  └────────┘
        │           │           │           │           │           │
        └───────────┴───────────┴───────────┴───────────┴───────────┘
                                    │
                        ┌───────────┴───────────┐
                        ▼                       ▼
                ┌──────────────┐      ┌──────────────┐
                │  PostgreSQL  │      │ActiveMQ Art. │
                │   Port 7432  │      │   Port 61616 │
                └──────────────┘      └──────────────┘
                        │                       │
                        └───────────┬───────────┘
                                    ▼
                        ┌──────────────────────┐
                        │   Analyse Service    │
                        │      Port 8089       │
                        └──────────────────────┘
                                    │
                        ┌───────────┴───────────┐
                        ▼                       ▼
                ┌──────────────┐      ┌──────────────────────┐
                │ RICE Service │      │Predictive Analytics  │
                │  Port 8001   │      │      Port 8090       │
                │    (Python)  │      │    (Python/FastAPI)  │
                └──────────────┘      └──────────────────────┘
```

---

## 2. Backend — Microservices Spring Boot

### 2.1 Inventaire des services

| Service | Port | Tech | Responsabilité | Tests |
|---------|------|------|----------------|-------|
| **api-gateway** | 8222 | Spring Cloud Gateway | Routage, JWT, CORS | ❌ Aucun |
| **authentification** | 8085 | Spring Boot 3.4.2 | Users, JWT, roles, audit | ❌ 1 test auto-généré |
| **competence** | 8005 | Spring Boot 3.4.2 | Référentiel RICE, compétences, niveaux | ✅ 9 tests (controller, service, repo) |
| **besoin-formation** | 8004 | Spring Boot 3.4.2 | Demandes, workflow approbation | ❌ 1 test auto-généré |
| **formation** | 8088 | Spring Boot 3.4.2 | CRUD formations, inscriptions, séances | ❌ 1 test auto-généré |
| **evaluation** | 8087 | Spring Boot 3.4.2 | Évaluations globales/formateurs | ❌ 1 test auto-généré |
| **certificat** | 8086 | Spring Boot 3.4.2 | Génération PDF certificats | ❌ 1 test auto-généré |
| **analyse** | 8089 | Spring Boot 3.4.2 | Agrégation données, appels REST | ❌ Aucun |
| **recommandation-formateur** | — | Python/FastAPI | IA recommandation formateurs | ❌ Aucun |
| **rice** | 8001 | Python | Import/analyse référentiel RICE | ✅ Tests pytest |
| **predictive-analytics** | 8090 | Python/FastAPI | **Nouveau** — ML prédictif | ✅ Tests pytest |

### 2.2 Stack technique Backend

- **Spring Boot 3.4.2** + Java 17
- **Spring Cloud 2024.0.0** (Gateway)
- **Spring Data JPA** + **PostgreSQL 15**
- **Spring Security** + **OAuth2 Resource Server** + JWT
- **Flyway** — Migrations SQL obligatoires
- **ActiveMQ Artemis 2.31.2** — Messaging JMS
- **Lombok** + **MapStruct 1.6.3** — DTO mapping
- **Caffeine** — Cache haute performance
- **OpenAPI (SpringDoc)** — Documentation API

### 2.3 Patterns architecturaux

| Pattern | Utilisation | Évaluation |
|---------|-------------|------------|
| **Microservices** | 8+ services indépendants | ✅ Bon |
| **API Gateway** | Spring Cloud Gateway | ✅ Bon |
| **Event-Driven** | ActiveMQ JMS entre services | ⚠️ Partiel |
| **CQRS** | Non implémenté | ❌ Manquant |
| **Saga Pattern** | Non implémenté | ❌ Manquant |
| **Repository Pattern** | Spring Data JPA | ✅ Bon |
| **DTO Pattern** | MapStruct + Lombok | ✅ Bon |
| **Audit Trail** | BaseAuditEntity (created_at, updated_at, created_by) | ✅ Excellent |

### 2.4 Qualité du code Backend

- **Competence Service** : Le meilleur — 9 tests unitaires, structure propre (controller/service/repository), MapStruct, DTOs complets
- **Autres services** : Majoritairement des tests auto-générés vides (`ApplicationTests.java`)
- **SonarQube** : Fichiers `sonar-project.properties` présents mais pas de pipeline CI/CD active
- **Conventions** : Packages inconsistants (`tn.esprit.d2f` vs `esprit.pfe`)

### 2.5 Gestion des besoins en formation

Le service `besoin-formation` couvre déjà la logique fonctionnelle attendue pour la section §2.2.2, avec une séparation claire entre la couche métier, l’exposition REST et l’UI de consultation.

#### Fonctionnalités couvertes

- **Besoins individuels** : création d’une demande par enseignant pour développer une compétence ou un savoir précis.
- **Besoins collectifs** : création d’une demande portée par un CUP pour une équipe ou une unité pédagogique.
- **CRUD complet** : ajout, modification, suppression et consultation des besoins.
- **Consultation ciblée** : filtrage des besoins par **UP** ou par **département**.
- **Priorisation** : tri et filtrage des besoins selon la **priorité** et l’**impact stratégique**.

#### Exposition technique

- **Backend** : `BesoinFormationController` expose `/add-BesoinFormation`, `/modify-BesoinFormation`, `/remove-BesoinFormation/{id}`, `/by-up/{up}`, `/by-departement/{departement}` et `/by-priorite`.
- **Repository** : requêtes Spring Data dédiées au filtrage par UP, département et priorité.
- **Frontend** : `BesoinList` et `BesoinForm` permettent de créer, modifier, supprimer, approuver et filtrer les besoins.

#### Lecture fonctionnelle

- La **priorité** reste le critère principal de tri opérationnel, avec une visibilité distincte pour `BASSE`, `MOYENNE`, `HAUTE` et `CRITIQUE`.
- L’**impact stratégique** sert à qualifier les besoins qui ont un effet direct sur la feuille de route D2F ou sur les compétences critiques.
- Les besoins approuvés alimentent ensuite le workflow de création de formation via l’événement `BesoinFormationApprovedEvent`.

---

## 3. Frontend — React 19 + Vite

### 3.1 Stack technique

| Technologie | Version | Usage |
|-------------|---------|-------|
| React | 19.0.0 | UI Framework |
| Vite | 6.1.0 | Build tool (remplace CRA) |
| TypeScript | 5.9.3 | Typage |
| Ant Design | 5.24.9 | UI Components principal |
| React Router DOM | 7.1.5 | Routing |
| Axios | 1.7.9 | HTTP Client |
| Chart.js + Recharts | 4.4.8 / 2.15.3 | Visualisations |
| Framer Motion | 12.34.5 | Animations |
| MUI | 6.4.6 | UI Components secondaire |
| Bootstrap | 5.3.3 | CSS Framework (legacy) |
| FullCalendar | 6.1.15 | Calendrier |
| JSPDF | 3.0.1 | Export PDF |
| React Hook Form + Yup | 7.56.1 / 1.6.1 | Formulaires |
| Vitest | 3.2.4 | Tests |

### 3.2 Structure du projet

```
src/
├── components/          # Composants réutilisables
│   ├── AppLayout.jsx    # Layout principal (sidebar + content)
│   ├── PrivateRoute.tsx # Guard authentification
│   ├── RoleGuard.tsx    # Guard autorisation RBAC
│   └── SideMenu.jsx     # Menu latéral conditionnel
├── pages/               # ~30+ pages par domaine
│   ├── auth/            # Login, Register, Profile
│   ├── formation/       # CRUD + Consultation
│   ├── competence/      # RICE, Matchmaking, Affectations
│   ├── besoin/          # Besoins formation
│   ├── evaluation/      # Évaluations
│   ├── inscription/     # Inscriptions formations
│   ├── analyse/         # Analyse prédictive
│   └── ...
├── context/             # Context API (AuthProvider)
├── services/            # Couche API (Axios instances)
├── routes/              # AppRoutes.tsx
├── types/               # Types TypeScript
└── utils/               # Utilitaires
```

### 3.3 Routage

- **~40 routes** définies dans `AppRoutes.tsx`
- Guards : `PrivateRoute` (auth) + `RoleGuard` (RBAC)
- Rôles : `admin`, `D2F`, `CUP`, `Enseignant`, `Formateur`
- Navigation programmatique via `setNavigate` utility

### 3.4 Points critiques Frontend

| Aspect | État | Commentaire |
|--------|------|-------------|
| **Dual UI Libraries** | ⚠️ | Ant Design + MUI + Bootstrap = conflit potentiel |
| **Tests** | ⚠️ | Très peu de tests (seulement besoin/ a été amélioré) |
| **TypeScript** | ⚠️ | Fichiers `.tsx` et `.jsx` mélangés |
| **State Management** | ⚠️ | Context API uniquement (pas de Redux/Zustand) |
| **CSS** | ⚠️ | CSS modules + inline + Bootstrap + Ant Design |
| **Bundle Size** | 🔴 | 50+ dépendances, risque de bundle lourd |

---

## 4. Base de Données — PostgreSQL

### 4.1 Schéma

Une **base unique** `d2f` partagée par tous les microservices (pattern Database-per-service partiellement respecté via utilisateurs dédiés).

### 4.2 Tables principales par domaine

**Compétences (competence-service)**
| Table | Description |
|-------|-------------|
| `domaines` | Domaines d'expertise |
| `competences` | Compétences par domaine |
| `sous_competences` | Sous-compétences |
| `savoirs` | Savoirs théoriques/pratiques |
| `enseignant_competences` | Niveaux par enseignant/savoir |
| `niveau_savoir_requis` | Référentiel exigences |
| `competence_prerequisite` | Graphe de pré-requis |

**Formations (formation-service)**
| Table | Description |
|-------|-------------|
| `formations` | Catalogue formations |
| `formation_competences` | Lien formation ↔ compétence |
| `inscriptions` | Inscriptions enseignants |
| `presences` | Présences aux séances |
| `seances` | Séances de formation |
| `enseignants` | Profils enseignants |

**Évaluations (evaluation-service)**
| Table | Description |
|-------|-------------|
| `evaluation_globale` | Évaluation globale formation |
| `evaluation_formateur` | Évaluation par participant |

**Besoins (besoin-formation-service)**
| Table | Description |
|-------|-------------|
| `besoin_formation` | Demandes de formation |

### 4.3 Audit

Toutes les tables héritent de `BaseAuditEntity` avec :
- `created_at` / `updated_at` (timestamps)
- `created_by` / `updated_by` (utilisateur JWT)
- `version` (optimistic locking)

---

## 5. Communication Inter-Services

### 5.1 Patterns de communication

| Pattern | Utilisé par | Description |
|---------|-------------|-------------|
| **Synchronous REST** | Analyse → tous les services | Appels HTTP directs |
| **Async JMS (ActiveMQ)** | Besoin → Formation, Evaluation → Certificat | Events pub/sub |
| **Database Sharing** | Tous | Base PostgreSQL commune |

### 5.2 Events JMS identifiés

| Event | Publisher | Listener | Action |
|-------|-----------|----------|--------|
| `BesoinFormationApprovedEvent` | Besoin Service | Formation Service | Créer formation |
| `EvaluationBatchMessage` | Formation Service | Evaluation Service | Créer évaluations |

### 5.3 Flux de données clés

```
Enseignant crée besoin
        │
        ▼
Besoin Service (validation workflow : CUP → Chef Dept → Admin)
        │
        ├──► JMS Event ──► Formation Service (création formation)
        │
        ├──► Notification Service (email)
        │
        └──► Analyse Service (mise à jour KPIs)

Formation terminée
        │
        ├──► Evaluation Service (évaluation globale)
        │
        ├──► Certificat Service (génération PDF)
        │
        └──► Analyse Service (mise à jour stats)
```

---

## 6. Sécurité

### 6.1 Architecture de sécurité

```
Frontend ──► Gateway ──► JWT Validation ──► Service
                  │
                  └──► CORS (localhost:3000, 8222)
```

### 6.2 Mécanismes de sécurité

| Mécanisme | Implémentation | État |
|-----------|----------------|------|
| **Authentification** | JWT (HS256) | ✅ |
| **Autorisation RBAC** | RoleGuard (React) + Spring Security | ✅ |
| **CORS** | Gateway + FastAPI | ✅ |
| **Input Validation** | Jakarta Validation (@NotNull, etc.) | ✅ |
| **SQL Injection** | JPA/Prepared Statements | ✅ Protégé |
| **Audit** | BaseAuditEntity | ✅ |

### 6.3 Vulnérabilités identifiées

| Sévérité | Problème | Localisation |
|----------|----------|--------------|
| 🔴 **Critique** | `JWT_SECRET` non défini dans .env | docker-compose.yml |
| 🟡 **Majeur** | Pas de rate limiting | Gateway |
| 🟡 **Majeur** | Pas de HTTPS en dev | Tous les services |
| 🟢 **Mineur** | CORS permissif (`allow_origins: [*]`) | FastAPI |

---

## 7. DevOps & CI/CD

### 7.1 Conteneurisation

| Aspect | État | Commentaire |
|--------|------|-------------|
| **Docker** | ✅ | Dockerfile par service |
| **Docker Compose** | ✅ | Orchestration complète |
| **Multi-stage builds** | ⚠️ | Uniquement predictive-analytics |
| **Health checks** | ✅ | Tous les services |
| **Non-root user** | ⚠️ | Uniquement predictive-analytics |

### 7.2 CI/CD

| Aspect | État |
|--------|------|
| **Pipeline CI/CD** | ❌ Absente (fichiers .drone-*.yml présents mais non fonctionnels) |
| **SonarQube** | ⚠️ Fichiers config présents mais pas de scan automatisé |
| **Tests automatisés** | ❌ Pas de pipeline de test |
| **Déploiement** | ❌ Manuel uniquement |

### 7.3 Infrastructure

```yaml
# Services exposés
postgres:     7432  # PostgreSQL
artemis:      61616 # JMS + 8161 Console Web
auth:         8085
competence:   8005
besoin:       8004
certificat:   8086
evaluation:   8087
formation:    8088
analyse:      8089
predictive:   8090  # NOUVEAU
gateway:      8222
webapp:       3000
```

---

## 8. Dette Technique & Axes d'Amélioration

### 8.1 Priorité P0 — Bloquant

| # | Problème | Impact | Action |
|---|----------|--------|--------|
| 1 | **Aucune pipeline CI/CD** | Risque déploiement manuel, pas de tests automatisés | Implémenter GitHub Actions ou Drone CI |
| 2 | **Couverture tests Backend** | ~90% des services n'ont que des tests auto-générés vides | Ajouter tests unitaires et d'intégration |
| 3 | **JWT_SECRET non configuré** | L'application ne démarre pas correctement | Définir dans .env |

### 8.2 Priorité P1 — Majeur

| # | Problème | Impact | Action |
|---|----------|--------|--------|
| 4 | **Database unique partagée** | Couplage fort entre services | Migrer vers schema-per-service ou DB-per-service |
| 5 | **Inconsistance packages Java** | `tn.esprit.d2f` vs `esprit.pfe` | Unifier sous `tn.esprit.d2f` |
| 6 | **Pas de circuit breaker** | Cascading failures possibles | Ajouter Resilience4j |
| 7 | **Frontend : 3 UI libraries** | Bundle lourd, conflits CSS | Migrer entièrement vers Ant Design |
| 8 | **Pas de rate limiting** | Risque DoS | Ajouter bucket4j ou nginx rate limit |

### 8.3 Priorité P2 — Amélioration

| # | Problème | Impact | Action |
|---|----------|--------|--------|
| 9 | **Pas de CQRS/Saga** | Transactions longues non gérées | Implémenter Saga pattern pour workflow approbation |
| 10 | **Pas de monitoring** | Pas d'observabilité | Ajouter Prometheus + Grafana + ELK |
| 11 | **Tests frontend limités** | ~2% couverture | Ajouter tests Vitest + React Testing Library |
| 12 | **Documentation API incomplète** | Intégration difficile | Compléter OpenAPI/Swagger sur tous les services |
| 13 | **Pas de cache distribué** | Redis absent | Ajouter Redis pour cache et sessions |
| 14 | **Dockerfiles sans multi-stage** | Images trop lourdes | Optimiser tous les Dockerfiles |

---

## 9. Points Forts ✅

1. **Architecture microservices bien structurée** avec séparation claire des domaines
2. **Audit trail complet** sur toutes les entités (created_at, updated_at, created_by)
3. **API Gateway** avec routage et sécurité centralisée
4. **Event-driven messaging** via ActiveMQ Artemis
5. **Référentiel RICE complet** avec hiérarchie Domaine → Compétence → Sous-compétence → Savoir → Niveau
6. **Workflow d'approbation multi-niveaux** (CUP → Chef Dept → Admin)
7. **Génération PDF** pour certificats et rapports
8. **Intégration Microsoft** (OneDrive, Outlook, Azure AD)
9. **Nouveau microservice ML** (Predictive Analytics) ajouté avec FastAPI + scikit-learn
10. **Flyway migrations** pour versioning de la base de données

---

## 10. Recommandations Stratégiques

### Court terme (1-2 mois)
1. ✅ **Configurer JWT_SECRET** dans `.env`
2. ✅ **Implémenter CI/CD** avec GitHub Actions (build, test, SonarQube, Docker push)
3. ✅ **Ajouter tests** sur les services critiques (competence, formation, evaluation)
4. ✅ **Nettoyer le frontend** : standardiser sur Ant Design, retirer Bootstrap/MUI inutilisés

### Moyen terme (3-6 mois)
5. 📋 **Migrer vers DB-per-service** ou schema-per-service
6. 📋 **Ajouter circuit breaker** (Resilience4j) et retry policies
7. 📋 **Implémenter monitoring** (Prometheus + Grafana)
8. 📋 **Ajouter Redis** pour cache distribué et sessions

### Long terme (6-12 mois)
9. 🎯 **Implémenter Saga pattern** pour le workflow de formation
10. 🎯 **Ajouter CQRS** pour les dashboards et rapports
11. 🎯 **Migrer vers Kubernetes** pour orchestration en production
12. 🎯 **Implémenter feature flags** pour déploiement canary

---

## 11. Matrice de Compétences du Projet

| Domaine | Technologie | Niveau | Observations |
|---------|-------------|--------|--------------|
| Backend | Spring Boot 3.4 | ⭐⭐⭐⭐ | Architecture propre, tests à renforcer |
| Backend | JPA/Hibernate | ⭐⭐⭐⭐ | Audit trail, relations bien modélisées |
| Backend | Spring Security | ⭐⭐⭐ | JWT OK, manque rate limiting |
| Backend | ActiveMQ/JMS | ⭐⭐⭐ | Events basiques, peut être étendu |
| Frontend | React 19 | ⭐⭐⭐ | Fonctionnel, dette UI à nettoyer |
| Frontend | TypeScript | ⭐⭐⭐ | Mix tsx/jsx, typage partiel |
| DevOps | Docker | ⭐⭐⭐ | Fonctionnel, optimisations possibles |
| DevOps | CI/CD | ⭐ | Absent — priorité P0 |
| Data | PostgreSQL | ⭐⭐⭐⭐ | Schéma bien conçu, migrations Flyway |
| Data | ML/Analytics | ⭐⭐ | Nouveau microservice, potentiel élevé |
| Sécurité | JWT/OAuth2 | ⭐⭐⭐ | Base solide, config à finaliser |

---

## 12. Conclusion

La plateforme D2F est une **architecture microservices mature et bien pensée** qui couvre le cycle complet du développement professionnel des enseignants. Les points forts résident dans :
- La richesse fonctionnelle (RICE, workflow approbation, évaluations, certificats)
- L'architecture event-driven
- Le référentiel de compétences complet

Les axes prioritaires d'amélioration sont :
1. **CI/CD et tests automatisés** (P0)
2. **Observabilité et monitoring** (P1)
3. **Standardisation du frontend** (P1)
4. **Évolution vers DB-per-service** (P2)

Le nouveau microservice **Predictive Analytics** (Module 8) apporte une couche d'intelligence artificielle locale (scikit-learn) qui complète parfaitement l'écosystème.

---

*Rapport généré automatiquement — Pour toute question, contacter l'équipe architecture D2F.*
