# Service d'Analyse — Skill Passport & Pilotage

## 📋 Description

Microservice Spring Boot **sans base de données** de l'écosystème D2F. Il agrège les données des autres microservices via des clients REST résilients (circuit breaker) pour générer le **Passeport de Compétences** (PDF) et exposer les vues consolidées de pilotage analytique consommées par le frontend.

## 🚀 Fonctionnalités Principales

### 🎓 Skill Passport
- **Génération du Passeport de Compétences PDF** : compilation des formations, évaluations, certificats et compétences d'un enseignant
- Agrégation temps réel depuis authentification, formation, évaluation, certificat, compétence et besoin-formation

### 📊 Analyse prédictive (BFF)
- Exposition des vues consolidées `/api/v1/analyse-predictive` et `/api/v2/analytics`
- Relais vers le service Python `predictive-analytics` avec tolérance aux pannes

### 🛡️ Résilience
- `ResilientCaller` + circuit breakers par service appelé (fallback gracieux si un service est indisponible)

## 🛠️ Stack Technique

- **Spring Boot 3.x** / Java 17
- Spring Security OAuth2 Resource Server (JWT)
- Clients REST légers (`AuthClient`, `FormationClient`, `EvaluationClient`, `CompetenceClient`, `NeedsClient`, `PredictiveAnalyticsClient`)
- OpenAPI/Swagger (springdoc)

## 🔌 Endpoints principaux

| Route | Rôle |
|---|---|
| `GET /api/v1/skill-passports/**` | Passeport de compétences (PDF) |
| `/api/v1/analyse-predictive/**` | BFF analyse prédictive |
| `/api/v2/analytics/**` | Vues analytics v2 |
| `GET /actuator/health` | Healthcheck |

> Accès : ADMIN/CUP/Chef de département pour le pilotage ; matrice complète gérée par l'API Gateway.

## ▶️ Démarrage

```bash
mvn spring-boot:run   # port 8089
```

Variables requises : `JWT_SECRET`, URLs des services appelés (`AUTH_SERVICE_URL`, `CERTIFICAT_SERVICE_URL`, `SERVICES_*_URL`, `SERVICES_PREDICTIVE_URL`).

## ✅ Tests

```bash
mvn test    # ~344 tests unitaires/intégration
```
