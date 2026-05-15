# Observabilite & Tracing distribue — Plateforme D2F

## Vue d'ensemble

La plateforme D2F est instrumentee pour produire :

1. **Traces distribuees** — correlation des appels inter-services via
   `traceId` et `spanId` propages dans les headers W3C TraceContext
   (`traceparent`, `tracestate`).
2. **Logs structures** — chaque ligne de log inclut le `traceId` du
   contexte courant. Permet de retrouver toutes les operations d'une
   meme requete distribuee.
3. **Healthchecks** — endpoints `/actuator/health` (Java) et
   `/api/v1/analytics/health`, `/health` (Python).

## Activation du tracing en production

Tous les services Spring Boot (Java) sont configures avec :

```properties
management.tracing.sampling.probability=${TRACING_SAMPLING:0.1}
logging.pattern.level=%5p [%X{traceId:-},%X{spanId:-}]
```

10 % des requetes sont tracees par defaut. Ajustable via variable
d'environnement `TRACING_SAMPLING` (0.0 a 1.0).

### Backend de tracing (a installer en infra)

La plateforme suit le standard OpenTelemetry. Compatible avec :

- **Grafana Tempo** (recommande)
- **Jaeger** (UI riche, facile a deployer)
- **Zipkin** (legacy mais stable)

Pour activer l'export OTLP, ajouter au pom.xml de chaque service Spring Boot :

```xml
<dependency>
  <groupId>io.micrometer</groupId>
  <artifactId>micrometer-tracing-bridge-otel</artifactId>
</dependency>
<dependency>
  <groupId>io.opentelemetry</groupId>
  <artifactId>opentelemetry-exporter-otlp</artifactId>
</dependency>
```

Puis configurer l'endpoint via variable d'environnement :

```bash
MANAGEMENT_OTLP_TRACING_ENDPOINT=http://tempo.observability.svc.cluster.local:4318/v1/traces
```

### Services Python (FastAPI)

`predictive-analytics` utilise `structlog` + `TraceIDMiddleware` qui
genere un `X-Trace-Id` par requete et le propage dans les logs
(format DSI standard).

`recommandation-formateur` et `rice` ont des handlers d'erreur qui
propagent le `X-Trace-Id` du header entrant si present, sinon
generent un UUID frais (voir `error_handlers.py`).

Pour brancher l'export OTLP cote Python :

```bash
pip install opentelemetry-distro opentelemetry-exporter-otlp
opentelemetry-bootstrap --action=install
```

Puis lancer avec :

```bash
opentelemetry-instrument \
  --traces_exporter otlp \
  --exporter_otlp_endpoint http://tempo:4318 \
  uvicorn main:app
```

## Centralisation des logs

Format de log recommande : **JSON structure** pousse vers **Loki**
(via Promtail ou Vector) ou **Elasticsearch** (via Filebeat).

Les patterns de log incluent deja `traceId` et `spanId` ; il suffit
d'orienter les flux stdout des conteneurs Docker vers le collecteur.

Exemple Promtail (a deployer en sidecar ou DaemonSet Kubernetes) :

```yaml
clients:
  - url: http://loki.observability.svc.cluster.local:3100/loki/api/v1/push

scrape_configs:
  - job_name: d2f-services
    static_configs:
      - targets: [localhost]
        labels:
          job: d2f
          __path__: /var/lib/docker/containers/*/*-json.log
```

## Healthchecks et monitoring

Tous les services Docker exposent un `HEALTHCHECK` :

| Service                | Healthcheck                                  |
|------------------------|----------------------------------------------|
| auth, gateway, ...     | `wget /actuator/health`                      |
| ai-reco                | `curl /health`                               |
| rice                   | `curl /health`                               |
| predictive-analytics   | `curl /api/v1/analytics/health`              |
| webapp                 | `wget /` (nginx static)                      |

Monitorer la stabilite via les statuts Docker `healthy` / `unhealthy`
ou en branchant Prometheus sur `/actuator/prometheus` (a activer
explicitement via `management.endpoints.web.exposure.include`).

## Procedure de rotation des secrets

### JWT_SECRET (HS512)

1. Generer un nouveau secret >= 64 caracteres aleatoires :
   ```bash
   openssl rand -base64 96
   ```
2. Mettre a jour la variable d'environnement `JWT_SECRET` dans :
   - `.env` (Docker Compose)
   - Kubernetes Secret `d2f-jwt`
   - CI/CD variables (GitHub Actions)
3. Redeployer tous les services Java et Python qui utilisent JWT_SECRET :
   - auth-service, api-gateway
   - besoin-formation, certificat, competence, evaluation, formation, analyse
   - recommandation-formateur, rice, predictive-analytics
4. Pendant la fenetre de bascule, les tokens emis avec l'ancien secret
   restent valides jusqu'a leur expiration (120 min). Aucune action
   utilisateur n'est requise hors reconnexion classique.
5. Verifier les logs : aucune erreur de validation JWT ne doit apparaitre
   apres redeploiement.

### DB_PASSWORD

1. Creer un nouveau mot de passe pour l'utilisateur applicatif PostgreSQL :
   ```sql
   ALTER USER app_user_auth WITH PASSWORD 'nouveau-mot-de-passe';
   ```
2. Mettre a jour `DB_PASSWORD` dans les memes endroits que JWT_SECRET.
3. Redeployer.

### RABBITMQ_PASSWORD

Idem que DB_PASSWORD, sur le compte RabbitMQ applicatif.

### Frequence recommandee

| Secret                  | Frequence rotation | Declencheurs supplementaires      |
|-------------------------|--------------------|-----------------------------------|
| JWT_SECRET              | Tous les 90 jours  | Compromission suspectee            |
| DB_PASSWORD             | Tous les 180 jours | Depart developpeur prive access   |
| RABBITMQ_PASSWORD       | Tous les 180 jours | Idem                              |
| MAIL_PASSWORD           | Tous les 365 jours | Changement IT                     |
| AZURE_AD_CLIENT_SECRET  | Tous les 365 jours | Expiration secret Azure portal    |
