# Service de Compétences

## 📋 Description

Microservice Spring Boot de gestion du **référentiel de compétences** de la plateforme D2F : compétences, sous-compétences, savoirs, domaines, niveaux, prérequis et rattachement des compétences aux enseignants. Il constitue le socle sémantique utilisé par les services formation, besoin-formation, évaluation et analyse.

## 🚀 Fonctionnalités Principales

### 🧩 Référentiel de compétences
- **CRUD complet paginé** : compétences, sous-compétences, savoirs, domaines, niveaux
- **Prérequis** : graphe de prérequis entre compétences (validation des parcours)
- **Structure** : consultation de l'arborescence complète du référentiel

### 👨‍🏫 Rattachement enseignants
- **Enseignant-Compétences** : association des compétences validées à chaque enseignant (niveau, preuves)
- Base du Passeport de Compétences (service analyse) et des besoins de formation

### 📥 Import RICE
- `POST /api/v1/rice` : import du référentiel RICE (extraction NLP du service rice), insertion paginée et idempotente

## 🛠️ Stack Technique

- **Spring Boot 3.x** / Java 17
- Spring Data JPA + PostgreSQL + Flyway (schéma `competence`, rôle `app_user_competence`)
- Spring Security OAuth2 Resource Server (JWT) — écritures réservées ADMIN côté gateway
- OpenAPI/Swagger (springdoc)

## 🔌 Endpoints principaux

| Route | Description |
|---|---|
| `/api/v1/competences` | CRUD + recherche paginée |
| `/api/v1/sous-competences` | CRUD paginé |
| `/api/v1/savoirs` | CRUD paginé |
| `/api/v1/domaines` | CRUD paginé |
| `/api/v1/niveaux` | Définitions de niveaux |
| `/api/v1/competences/{id}/prerequisite` | Graphe de prérequis |
| `/api/v1/enseignant-competences` | Rattachement enseignant ↔ compétence |
| `/api/v1/structure` | Arborescence du référentiel |
| `/api/v1/rice` | Import référentiel RICE (ADMIN) |

## ▶️ Démarrage

```bash
mvn spring-boot:run   # port 8005
```

Variables requises : `DB_URL`, `DB_USER_COMPETENCE`, `DB_PASSWORD_COMPETENCE`, `JWT_SECRET`.

## ✅ Tests

```bash
mvn test    # ~307 tests unitaires/intégration
```
