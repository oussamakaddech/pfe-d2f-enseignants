# 📄 Récap d'entretien — Plateforme D2F

> Relecture rapide avant l'entretien technique. 3 axes : **Architecture microservices**, **Sécurité (JWT/RBAC/Auth)**, **Backend Java/Spring Boot**.

---

## 0. Le pitch (30 secondes)

Plateforme **D2F** : développement professionnel des enseignants ESPRIT (gestion des compétences, besoins/formations, évaluations, certificats PDF, analyse prédictive ML).

- **12 services** : 9 Spring Boot (JDK 17) + 2 FastAPI/Python (ML) + 1 frontend React 19/Vite.
- **API Gateway** Spring Cloud Gateway = point d'entrée unique (port 8080). Le frontend ne parle jamais directement aux services.
- **Sync** : REST via la gateway. **Async** : RabbitMQ (événements). **Persistance** : PostgreSQL partagé, **un rôle DB par service**. **Redis** : rate-limiting.
- Tout est dockerisé (`docker-compose.yml`), avec healthchecks et dépendances ordonnées.

---

## 1. Architecture microservices

### Schéma mental du flux d'une requête

```
Navigateur → :3000 (nginx)
  → GET http://localhost:8080/api/competence/...
  → GATEWAY (Spring Cloud Gateway, WebFlux)
      1. SecurityConfig (WebFlux)   → deny-by-default, JWT requis
      2. AuthorizationFilter        → valide JWT + matrice rôles/chemins (→ 401/403)
      3. RequestRateLimiter (Redis) → 429 si trop de requêtes / IP
      4. CircuitBreaker             → fallback si service en aval down
      5. RewritePath                → /api/competence/** → /api/v1/** (service interne)
  → competence-service:8005
      - Revalide le JWT (OAuth2 resource server) — ne fait PAS confiance aux headers
      - @PreAuthorize(AuthorizationMatrix.*) sur la méthode
      - Controller → Service (@Transactional) → Repository (Spring Data JPA) → PostgreSQL
  → Réponse : DTO → JSON → gateway → navigateur
```

### Fichiers de référence

| Rôle | Fichier |
|---|---|
| Orchestration/ports/healthchecks | `docker-compose.yml` |
| Routes gateway (path → service) | `esprit_D2F-api-gateway/src/main/resources/routes.yml` |
| Filtre JWT + matrice d'autorisation gateway | `esprit_D2F-api-gateway/.../security/AuthorizationFilter.java` |
| Sécurité deny-by-default gateway | `esprit_D2F-api-gateway/.../security/SecurityConfig.java` |
| Rate limiting (résolveur IP) | `esprit_D2F-api-gateway/.../security/RateLimitConfig.java` |

### Points clés à savoir raconter

1. **Gateway = unique entrée.** Chaque service a une route déclarée : `Path=/api/competence/**` → `uri=${COMPETENCE_SERVICE_URL}` (routes.yml). Filtres appliqués à chaque route : `AuthorizationFilter`, `CircuitBreaker`, `RequestRateLimiter`, `DedupeResponseHeader`.
2. **Synchrone inter-services (pattern aggregator/BFF)** : le service `analyse` (8089) **n'a pas de DB** — il agrège les données d'auth, certificat, evaluation, formation, competence, besoin via clients REST (docker-compose.yml). Le frontend appelle `/api/v1/analyse-predictive/**` → gateway → service-analyse → autres services.
3. **Asynchrone (event-driven / RabbitMQ)** : le service formation publie (`RabbitTemplate.convertAndSend("certificateQueue", ...)`), le service notification consomme (`@RabbitListener(queues = "d2f.notifications.events")`). Intérêt à citer : **découplage, résilience (retry/dead-letter), scalabilité**.
4. **Config externalisée** : secrets via `.env`, variables par conteneur. Aucun secret en dur.
5. **Démarrage ordonné** : `depends_on: condition: service_healthy` (healthchecks `/actuator/health`).

### Q/R probables

- **Pourquoi microservices ?** → indépendance de déploiement, technos adaptées (Java vs Python ML), couplage faible (contrat HTTP/RabbitMQ).
- **Inconvénients ?** → complexité réseau, débogage distribué, cohérence éventuelle des données, surface de déploiement.
- **DB partagée ?** → PostgreSQL commun mais **un rôle dédié par service** (`app_user_auth`, `app_user_competence`...) → chaque service ne touche que ses tables. Compromis pragmatique vs database-per-service.
- **Sync vs async ?** → REST pour requête/réponse immédiate ; RabbitMQ pour fire-and-forget (notification après création de formation).

---

## 2. Sécurité : JWT, RBAC, Auth

### La thèse : defense in depth, 3 couches

### Couche 1 — Émission du token (auth-service :8085)

Login → `SecurityController.login()` → `AuthService.login()` (AuthService.java):
1. Compte **verrouillé ?** (`lockUntil`, anti brute-force).
2. `authenticationManager.authenticate(...)` → mot de passe vérifié par **BCrypt** (`DaoAuthenticationProvider`).
3. Construction du **JWT HS512** : claims `sub`(username), `scope`(rôles), `email`, `userId` (`generateJwt`).
4. Token dans un **cookie `d2f_auth_token` HttpOnly + Secure + SameSite**.

Bonus sécurité à citer :
- **Anti brute-force applicatif** : 5 échecs → verrouillage 15 min (configurable `auth.lockout.*`).
- **Anti-énumération email** : réponse identique que l'email existe ou non.
- **Tokens de reset stockés hashés** (SHA-256) en base.
- **Signup = rôle ENSEIGNANT par défaut** : impossible de s'auto-attribuer un rôle privilégié.
- **Logs PII-safe** (`PiiSafeLogger`) : pas d'email/IP en clair dans les logs.
- **Rate limiting** `/login` : 5 req/min par IP (gateway + Redis).

### Couche 2 — Gateway (défense n°1)

- `SecurityConfig` (WebFlux) : **deny-by-default** — toute route non publique exige un JWT valide. Impossible d'"oublier" une route.
- `AuthorizationFilter` :
  1. Extrait le token : header `Authorization: Bearer` (mobile) OU cookie HttpOnly (web).
  2. Valide signature + expiration (HS512, `JwtTokenProvider`).
  3. Matrice rôles ↔ chemin+méthode (`determineAllowedRoles`). Ex : DELETE → ADMIN only ; `/api/rice/**` → ADMIN only ; `/api/analyse/predict/train` → ADMIN only.
  4. 403 si rôle non autorisé.
  5. **Forwarde l'identité** : headers `X-User-Id`, `X-User-Role`, `X-User-Email`.

### Couche 3 — RBAC dans chaque service (défense n°2)

- Chaque service **revalide le JWT lui-même** (OAuth2 resource server) et ne fait pas confiance aux headers.
- Rôles extraits du claim `scope` → authorities (`JwtAuthenticationConverter`).
- **`@PreAuthorize` déclaratif** avec constantes centralisées dans le module partagé **`common-security` → `AuthorizationMatrix`** :
  ```java
  @PreAuthorize(AuthorizationMatrix.COMPETENCE_DELETE) // = hasAnyRole('ROLE_ADMIN')
  ```

### Pourquoi 2 vérifications ? (à dire en entretien)

La gateway protège le **périmètre** (qui atteint quel service), les services protègent leurs **ressources**. Si un service est exposé accidentellement, la sécurité locale tient. Les headers `X-User-*` servent au contrôle row-level (ex. l'enseignant ne voit que ses données), mais le garde-fou reste le JWT validé localement.

### Q/R probables

- **Cookie HttpOnly ?** → anti-XSS (JS ne peut pas lire le token). `Secure` → HTTPS. `SameSite` → anti-CSRF.
- **HS512 vs RS256 ?** → symétrique, simple pour un PFE (même clé partagée). Limite honnête : pas de rotation de clés ; en prod on préfèrerait RS256 (asymétrique).
- **CSRF ?** → désactivé car stateless + cookie SameSite ; JWT dans header pour les clients API.
- **Headers falsifiés `X-User-Role` ?** → les services valident le JWT eux-mêmes (couche 3).
- **Rate limiting** → `KeyResolver` par IP, tient compte de `X-Forwarded-For` derrière proxy, Redis token bucket.

### Fichiers de référence

| Rôle | Fichier |
|---|---|
| Matrice d'autorisations (constantes partagées) | `esprit_D2F-common-security/.../AuthorizationMatrix.java` |
| Login / anti-brute-force / JWT / reset | `esprit_D2F-authentification/.../services/AuthService.java` |
| Controller HTTP (cookies, IP) | `esprit_D2F-authentification/.../security/SecurityController.java` |
| Config sécurité + BCrypt + encodeur HS512 | `esprit_D2F-authentification/.../security/SecurityConfig.java` |
| Validation JWT + extraction claims | `esprit_D2F-api-gateway/.../security/JwtTokenProvider.java` |
| Sécurité d'un service métier (ex.) | `esprit_D2F-competence/.../config/SecurityConfig.java` |
| Contrôleur avec @PreAuthorize (ex.) | `esprit_D2F-competence/.../controller/CompetenceController.java` |

---

## 3. Backend Java / Spring Boot

### Architecture en couches d'un service (ex. competence)

| Couche | Rôle | Exemple |
|---|---|---|
| **Controller** | Adaptateur HTTP, pas de logique | `CompetenceController` |
| **Service** (interface + impl) | Logique métier + transactions + cache | `CompetenceServiceImpl` |
| **Repository** (Spring Data JPA) | Accès DB, requêtes dérivées/JPQL | `CompetenceRepository` |
| **Entity** | Mapping ORM (JPA/Hibernate) | `Competence` |
| **DTO + Mapper** | Séparation API/persistance | `CompetenceDTO`, `CompetenceMapper` |
| **Exception handler** | Réponses d'erreur uniformes | `GlobalExceptionHandler` |

### Points techniques à mettre en avant

1. **Controller fin** : il délégué tout, ne construit que la réponse (`ResponseEntity`).
2. **Refactor god-controller** : l'auth avait un `SecurityController` de 521 lignes → toute la logique déplacée dans `AuthService` ; le contrôleur ne fait plus que lire la requête (IP), déléguer, construire les cookies. **Argument fort sur ta compréhension des couches.**
3. **Transactions** : `@Transactional(readOnly = true)` en lecture, `@Transactional` en écriture.
4. **Cache** : `@Cacheable` en lecture, `@CacheEvict(allEntries = true)` en écriture (invalidation).
5. **Pagination** : `Pageable` / `Page<DTO>` injectés par Spring.
6. **Validation** : `@Valid @RequestBody`.
7. **Erreurs** : exceptions métier custom → `@ControllerAdvice` (réponses JSON cohérentes).
8. **Lombok** : `@RequiredArgsConstructor` (injection par constructeur, final fields), `@Slf4j`, `@Builder`.
9. **API documentation** : OpenAPI/Swagger (`@Operation`, `@Tag`).

### Q/R probables

- **Pourquoi injection par constructeur ?** → testable, immutable, détecte les dépendances manquantes au démarrage.
- **Pourquoi DTO et pas l'entité ?** → ne pas exposer la couche persistance (sécurité, couplage), maîtrise du contrat API.
- **`@Transactional(readOnly=true)`** → optimisation (pas de dirty-check/flush d'écriture) + sémantique claire.
- **Cache invalidation** → évite les données périmées ; raison de l'`allEntries` : clé par domaine.

---

## 4. Anticiper les questions pièges / scénarios

1. **"Explique-moi l'architecture"** → pitch 30s + flux d'une requête (section 1).
2. **"Comment l'auth marche de bout en bout ?"** → login → cookie → gateway valide → headers → service revalide + `@PreAuthorize`.
3. **"Comment as-tu géré la sécurité ?"** → 3 couches + BCrypt + anti-brute-force + rate limiting + `AuthorizationMatrix`.
4. **"Comment communiquent les services ?"** → REST sync (service analyse) + RabbitMQ async (formation → notification).
5. **"Quels problèmes as-tu rencontrés ?"** → refactor god-controller auth ; autoscan SonarCloud bloquait le CI ; couverture ≥ 80 % exigée par le quality gate ; désactivation de l'autoscan via API.
6. **"Quelle limite/amélioration ?"** → RS256 à la place de HS512 ; service discovery (Eureka) au lieu d'URLs en dur ; API contract tests (Pact) ; observabilité (distributed tracing).

---

## 5. Mots-clés à placer naturellement

- Microservices · API Gateway · BFF/aggregator · REST · **RabbitMQ (event-driven)** · PostgreSQL · Redis · Docker Compose
- **JWT HS512** · **RBAC** · `@PreAuthorize` · **HttpOnly/Secure/SameSite** · BCrypt · **defense in depth** · CORS · rate limiting · anti brute-force
- **Spring Boot 3 / JDK 17** · Spring Cloud Gateway (WebFlux) · Spring Data JPA · Lombok · Maven/Flyway · **Transactional / Cacheable** · OpenAPI · SonarQube · GitHub Actions
