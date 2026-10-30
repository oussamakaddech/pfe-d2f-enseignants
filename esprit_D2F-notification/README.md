# Service de Notifications

## 📋 Description

Microservice Spring Boot du **centre de notifications in-app temps réel** de la plateforme D2F. Il centralise toutes les notifications métier publiées par les autres microservices sur RabbitMQ, les persiste, les expose via une API REST paginée et les pousse instantanément au frontend connecté via WebSocket.

## 🚀 Fonctionnalités Principales

### 🔔 Notifications temps réel
- **Consommateur RabbitMQ** : écoute l'exchange fanout `d2f.notifications` (queue `d2f.notifications.events`) — chaque événement métier (formation, certificat, évaluation…) devient une notification persistée
- **Push WebSocket** : endpoint brut `/ws/notifications` authentifié par cookie JWT HttpOnly (`d2f_auth_token`) ; registre de sessions par destinataire, push à tous les onglets ouverts
- Garde anti-poison-message : un échec de persistance n'interrompt pas la consommation

### 📬 Centre de notifications REST
- Liste paginée (toutes / non lues), compteur total/non-lues
- Marquer une notification lue / tout marquer lu, suppression unitaire et globale
- **Isolation stricte par destinataire** : le JWT authentifié détermine le destinataire (RBAC deny-by-default) ; seul l'endpoint admin de création accepte un destinataire explicite

### 🗄️ Persistance
- PostgreSQL (schéma `notification`, rôle `app_user_notification`), migrations Flyway versionnées
- Audit trail (création/modification tracés)

## 🛠️ Stack Technique

- **Spring Boot 3.x** / Java 17
- Spring Data JPA + PostgreSQL + Flyway
- Spring AMQP (RabbitMQ, Jackson JSON converter)
- WebSocket natif (handler + interceptor JWT)
- Spring Security OAuth2 Resource Server (JWT HS512)
- OpenAPI/Swagger (springdoc), Actuator/Prometheus

## 🔌 Endpoints principaux

| Route | Description |
|---|---|
| `GET /api/v1/notifications` | Liste paginée (`unreadOnly`, `page`, `size`) |
| `GET /api/v1/notifications/count` | Compteurs total / non-lues |
| `PATCH /api/v1/notifications/{id}/read` | Marquer lue |
| `POST /api/v1/notifications/read-all` | Tout marquer lu |
| `DELETE /api/v1/notifications/{id}` | Supprimer |
| `DELETE /api/v1/notifications` | Vider |
| `POST /api/v1/notifications` | Création explicite (ADMIN) |
| `WS /ws/notifications` | Push temps réel (cookie JWT) |

## ▶️ Démarrage

```bash
mvn spring-boot:run   # port 8009
```

Variables requises : `DB_URL`, `DB_USER_NOTIFICATION`, `DB_PASSWORD_NOTIFICATION`, `JWT_SECRET`, `RABBITMQ_HOST/PORT/USER/PASSWORD`, optionnel `CORS_ALLOWED_ORIGINS`.

## ✅ Tests

```bash
mvn test    # 101 tests unitaires/intégration
```
