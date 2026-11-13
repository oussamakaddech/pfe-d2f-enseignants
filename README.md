# 🎓 Plateforme D2F — Développement professionnel des enseignants

Plateforme de gestion des compétences et de développement professionnel des enseignants ESPRIT, avec **analyse prédictive** des besoins en formation.

## 📦 Architecture

Architecture **microservices** (Spring Boot 3.x / JDK 17 + FastAPI Python) orchestrée derrière une API Gateway, avec RabbitMQ et PostgreSQL. Tous les services métiers sont exposés au frontend via l'API Gateway (`http://localhost:8080`).

```
pfe-d2f-enseignants/
├── esprit_D2F-api-gateway/           # API Gateway (Spring Cloud Gateway) — :8080
├── esprit_D2F-authentification/      # Auth & Users (JWT HS512) — :8085
├── esprit_D2F-competence/            # Compétences & référentiel — :8005
├── esprit_D2F-formation/             # Formations & documents — :8088
├── esprit_D2F-besoin-formation/      # Besoins de formation — :8004
├── esprit_D2F-evaluation/            # Évaluations — :8087
├── esprit_D2F-certificat/            # Certificats PDF — :8086
├── esprit_D2F-analyse/               # Analyse transverse — :8089
├── esprit_D2F-notification/          # Notifications — :9009
├── esprit_D2F-rice/                  # RICE — Référentiel Intelligent (FastAPI)
├── esprit_D2F-predictive-analytics/  # Analyse prédictive (FastAPI / ML)
├── esprit_D2F-common-security/       # Bibliothèque partagée (sécurité, JWT)
├── esprit_D2F-webapp/                # Frontend React 19 + Vite — :3000
├── docker-compose.yml                # Orchestration locale
├── docker-compose.prod.yml           # Orchestration production
├── .env.example                      # Variables d'environnement (template)
└── .github/workflows/                # CI/CD GitHub Actions + SonarQube
```

### 🔌 Services & ports

| Service | Techno | Port direct | Accès frontend |
|---|---|---|---|
| API Gateway | Spring Cloud Gateway | `8080` | point d'entrée (`/api`) |
| Authentification | Spring Boot | `8085` | via Gateway |
| Compétence | Spring Boot | `8005` | via Gateway |
| Besoin-Formation | Spring Boot | `8004` | via Gateway |
| Évaluation | Spring Boot | `8087` | via Gateway |
| Certificat | Spring Boot | `8086` | via Gateway |
| Formation | Spring Boot | `8088` | via Gateway |
| Analyse | Spring Boot | `8089` | via Gateway |
| Notification | Spring Boot | `9009` | via Gateway |
| RICE | FastAPI | interne | via Gateway |
| Analyse Prédictive | FastAPI / ML | interne | via Gateway |
| Webapp | React 19 / Vite | `3000` (nginx) | navigateur |

## 🚀 Démarrage rapide

### Prérequis
- Docker & Docker Compose v2+
- JDK 17+ (développement backend hors Docker)
- Node.js 20+ (développement frontend)
- PostgreSQL 15 (fourni via Docker)

### Installation (Docker)

```bash
# 1. Cloner le dépôt
git clone <url> && cd pfe-d2f-enseignants

# 2. Configurer les variables d'environnement
cp .env.example .env
# → Renseigner JWT_SECRET (min 64 chars), DB_PASSWORD, MAIL_*, RABBITMQ_*, etc.

# 3. Démarrer la stack complète
docker compose up -d --build

# 4. Vérifier l'état des services
docker compose ps
```

L'application est accessible sur **http://localhost:3000** (frontend) et l'API sur **http://localhost:8080/api**.

### Développement local (sans Docker)

```bash
# Backend (par service)
cd esprit_D2F-competence && ./mvnw spring-boot:run

# Frontend
cd esprit_D2F-webapp && npm install && npm run dev   # http://localhost:5173
```

## 🧭 Fonctionnalités principales

- **Tableau de bord** : vue synthétique (KPIs, couverture des compétences par département, enseignants à risque, cartographie des écarts, alertes récentes).
- **Analyse prédictive** : scoring de risque des enseignants, prévision de la demande de formation, distribution des risques, tendances et performance des modèles ML.
- **Gestion des compétences & RICE** : référentiel de compétences, priorisation RICE.
- **Formations & besoins** : collecte des besoins, planification, inscriptions, certificats.
- **Authentification & rôles** : JWT HS512, RBAC via `@PreAuthorize`, rôles (Admin, Animateur, Enseignant…).

## 🔑 Variables d'environnement requises

| Variable | Description | Exemple |
|---|---|---|
| `JWT_SECRET` | Clé HS512 (min 64 chars) | `openssl rand -base64 64` |
| `DB_PASSWORD` | Mot de passe PostgreSQL | `<mot de passe fort>` |
| `VITE_API_URL` | URL API Gateway (frontend) | `http://localhost:8080/api` |
| `MAIL_USERNAME` / `MAIL_PASSWORD` | SMTP | — |
| `RABBITMQ_USERNAME` / `RABBITMQ_PASSWORD` | RabbitMQ | `<mot de passe fort>` |

Voir `.env.example` pour la liste complète.

## 🛡️ Sécurité

- **JWT HS512** pour l'authentification stateless (cookie HttpOnly `d2f_auth_token`)
- **RBAC** via `@PreAuthorize(AuthorizationMatrix.*)` côté backend
- **CORS** restreint aux origines internes
- **BCrypt** pour le hachage des mots de passe
- **Aucun secret dans le code source** — tout via `.env`
- **RabbitMQ** pour la communication asynchrone interservices
- **Nginx** avec en-têtes de sécurité (CSP, HSTS, X-Frame-Options)

## 🧪 Tests

```bash
# Backend Java
cd esprit_D2F-competence && ./mvnw test

# Frontend
cd esprit_D2F-webapp && npm run test:coverage
```

## 🏗️ Architecture Frontend — État et gestion des données (DSI §5 / §7)

Le frontend suit la stack prescrite par le CDC DSI : **React 19 + Vite + React Context + Axios + React Query (TanStack)**.

| Mécanisme | Usage | Justification DSI |
|---|---|---|
| **React Context** | État applicatif global : session utilisateur, rôles JWT, thème UI | CDC §5 — `hooks/auth/useAuth.ts` |
| **React Query (TanStack)** | Cache du state serveur : dé-duplication, invalidation auto, état de chargement | Bibliothèque complémentaire — ne remplace pas React Context |

React Query gère exclusivement le **cache des données distantes**. Les appels HTTP sont centralisés dans `src/services/`. React Context gère l'authentification et les préférences.

## 🌐 Infrastructure DSI (§2)

| Ressource DSI | Hostname standard | Résolution Docker (local) |
|---|---|---|
| PostgreSQL | `db.dsi.local:5432` | `d2f-postgres` |
| RabbitMQ | `broker.dsi.local:5672` | `d2f-rabbitmq` |
| API Gateway | `api-gateway.dsi.local:8080` | `d2f-gateway` |

En DSI, les DNS `*.dsi.local` résolvent vers l'infrastructure Esprit. En local, les alias Docker assurent la même résolution.

## 🔒 Azure AD / Microsoft 365 (DÉSACTIVÉ par défaut)

L'intégration Microsoft Graph (Outlook, Teams, OneDrive) est **désactivée par défaut** (`AZURE_AD_ENABLED=false`) et activable uniquement sur décision explicite de la DSI. Par défaut : SMTP interne et stockage local des documents.

## 📊 Qualité (SonarQube)

Le pipeline CI exécute SonarQube avec Quality Gate bloquant sur chaque push / PR. Les rapports (`coverage.xml`, `junit-results.xml`, `sonar_*.json`) sont générés en CI et ne sont pas suivis par Git.
