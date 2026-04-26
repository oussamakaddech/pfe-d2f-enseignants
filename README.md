# 🎓 Plateforme D2F — Développement professionnel des enseignants

Plateforme de gestion des compétences et de développement professionnel des enseignants ESPRIT, avec analyse prédictive et recommandation de formateurs.

## 📦 Architecture

Architecture **microservices** (Spring Boot 3.x / JDK 17 + FastAPI Python) :

```
pfe-d2f-enseignants/
├── esprit_D2F-api-gateway/           # API Gateway (Spring Cloud Gateway, port 8222)
├── esprit_D2F-authentification/      # Auth & Users (JWT HS512, port 8085)
├── esprit_D2F-competence/            # Gestion compétences & RICE (port 8005)
├── esprit_D2F-formation/             # Formations & OneDrive (port 8088)
├── esprit_D2F-besoin-formation/      # Besoins de formation (port 8004)
├── esprit_D2F-evaluation/            # Évaluations (port 8087)
├── esprit_D2F-certificat/            # Certificats PDF (port 8086)
├── esprit_D2F-analyse/               # Analyse transverse (port 8089)
├── esprit_D2F-rice/                  # RICE — Référentiel Intelligent (FastAPI, port 8001)
├── esprit_D2F-recommandation-formateur/ # IA Recommandation (FastAPI, port 8000)
├── esprit_D2F-predictive-analytics/  # Analyse Prédictive (FastAPI, port 8080)
├── esprit_D2F-webapp/                # Frontend React 19 + Vite (port 3000/5173)
├── docker-compose.yml                # Orchestration locale
├── .env.example                      # Variables d'environnement (template)
└── .github/workflows/                # CI/CD GitHub Actions + SonarQube
```

## 🚀 Démarrage rapide

### Prérequis
- Docker & Docker Compose v2+
- JDK 17+ (développement local)
- Node.js 20+ (développement frontend)
- PostgreSQL 15 (via Docker)

### Installation

```bash
# 1. Cloner le dépôt
git clone <url> && cd pfe-d2f-enseignants

# 2. Copier et remplir les variables d'environnement
cp .env.example .env
# → Remplir JWT_SECRET (min 64 chars), DB_PASSWORD, etc.

# 3. Démarrer toute la stack
docker compose up -d

# 4. Vérifier la santé des services
docker compose ps
```

### Développement local (sans Docker)

```bash
# Backend (chaque service)
cd esprit_D2F-competence && ./mvnw spring-boot:run

# Frontend
cd esprit_D2F-webapp && npm install && npm run dev
```

## 🔑 Variables d'environnement requises

| Variable | Description | Exemple |
|---|---|---|
| `JWT_SECRET` | Clé HS512 (min 64 chars) | `<générer via openssl rand -base64 64>` |
| `DB_PASSWORD` | Mot de passe PostgreSQL | `<mot de passe fort>` |
| `VITE_API_URL` | URL API Gateway (frontend) | `http://localhost:8222/api` |
| `MAIL_USERNAME` | SMTP utilisateur | — |
| `MAIL_PASSWORD` | SMTP mot de passe | — |

Voir `.env.example` pour la liste complète.

## 🛡️ Sécurité

- **JWT HS512** pour l'authentification stateless
- **RBAC** via `@PreAuthorize(AuthorizationMatrix.*)` côté backend
- **CORS** restreint aux origines internes
- **BCrypt** pour le hachage des mots de passe
- **Aucun secret dans le code source** — tout via `.env` / variables d'environnement

## 🧪 Tests

```bash
# Backend Java
cd esprit_D2F-competence && ./mvnw test

# Frontend
cd esprit_D2F-webapp && npm run test:coverage
```

## 📊 Qualité (SonarQube)

Pipeline CI exécute SonarQube avec Quality Gate bloquant sur chaque push/PR.


