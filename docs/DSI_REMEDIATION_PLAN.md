# Plan de Remediation DSI (D2F)

Date: 2026-04-26

## Statut global

- Fait immediatement (configuration): secrets JWT en variables d'environnement, suppression des fallback secrets QA, remplacement des defaults Gmail.
- Partiellement prepare: variables RabbitMQ ajoutees dans `.env`/`.env.example`.
- A faire (changement applicatif): migration complete ActiveMQ/Artemis -> RabbitMQ, retrait Azure AD/Graph, annuaire local (LDAP/AD interne).

## 1) Secrets et configuration (P1)

### Actions appliquees

- `jwt.secret` passe a `${JWT_SECRET}` dans les services qui avaient une valeur en dur.
- Suppression des fallback QA du type `${JWT_SECRET:...}`.
- SMTP par defaut remplace par `smtp.internal.dsi.local`.

### Controle

- Rechercher toute occurence de secret en dur:
  - `jwt.secret=` (hors `${JWT_SECRET}`)
  - credentials dans `application*.properties`

## 2) Broker RabbitMQ (P1)

### Ecart actuel

- Le code et la config utilisent encore `spring.artemis` et dependances Artemis/JMS.

### Cible DSI

- Broker: `broker.dsi.local:5672`
- Config Spring: `spring.rabbitmq.host`, `spring.rabbitmq.port`, `spring.rabbitmq.username`, `spring.rabbitmq.password`
- Messaging: `RabbitTemplate`, exchanges/queues/bindings, listeners `@RabbitListener`

### Plan de migration

1. Remplacer dependances Artemis par `spring-boot-starter-amqp` dans:
   - `esprit_D2F-besoin-formation`
   - `esprit_D2F-certificat`
   - `esprit_D2F-evaluation`
   - `esprit_D2F-formation`
2. Migrer producteurs/consommateurs JMS vers RabbitMQ (payloads inchanges si possible).
3. Mettre a jour `application*.properties` vers `spring.rabbitmq.*`.
4. Adapter `docker-compose.yml` pour un service RabbitMQ (ou endpoint externe DSI).
5. Executer tests d'integration inter-services (publishing/consuming, retries, DLQ).

## 3) Souverainete cloud (P1)

### Mail

- Etat cible: SMTP interne uniquement.
- Deja applique sur defaults de configuration.

### Azure AD / Graph

- Ecart: code et dependances Azure/Graph encore presentes dans `esprit_D2F-formation`.
- Options:
  - Migration vers LDAP/AD interne.
  - Ou derogation ecrite officielle DSI (tracee dans la documentation projet).

## 4) Qualite et architecture (P2)

- SonarQube: gate A obligatoire avant livraison.
- DDD: verifier aggregate boundaries, invariants, couche domaine sans fuite infra.
- Pagination: tous les endpoints GET liste doivent supporter `page` et `size`.

## 5) IA locale (P2)

- Interdire toute API IA publique.
- Valider que tous les appels IA sont locaux/internes (services Python dockerises).

## 6) Docker et livrables (P3)

- Dockerfiles: verifier images slim et minimisation surface.
- Compose: une commande de lancement platforme complete.
- Swagger: `/swagger-ui.html` operationnel sur chaque microservice.
- README: procedure de lancement + variables d'environnement requises.

## Commandes de verification conseillees

- `rg "jwt.secret=" esprit_D2F-*/*/main/resources/*.properties`
- `rg "smtp.gmail.com|graph.microsoft.com|spring.artemis|activemq|artemis"`
- `mvn -q -DskipTests verify` (par service)
- Scan SonarQube CI/CD puis verification du quality gate.
