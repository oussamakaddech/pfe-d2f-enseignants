# Guide de démarrage — Tests D2F

> **Document à destination de la testeuse** — Plateforme D2F (Développement Professionnel des Enseignants)
> Ce guide vous accompagne pas à pas pour installer, configurer et vérifier la plateforme avant de démarrer les tests fonctionnels.
> Aucune compétence de développement n'est requise : toutes les commandes sont fournies et expliquées.

---

## Sommaire

1. [Prérequis techniques](#1-prérequis-techniques)
2. [Structure du projet](#2-structure-du-projet)
3. [Configuration de l'environnement](#3-configuration-de-lenvironnement)
4. [Étapes d'installation et d'exécution](#4-étapes-dinstallation-et-dexécution)
5. [Comptes de test disponibles dans le dump](#5-comptes-de-test-disponibles-dans-le-dump)
6. [Recommandations particulières](#6-recommandations-particulières)
7. [Vérification du bon fonctionnement](#7-vérification-du-bon-fonctionnement)

---

## 1. Prérequis techniques

### 1.1 Logiciels requis (versions minimales)

| Logiciel | Version minimale | Vérification | Lien de téléchargement |
|---|---|---|---|
| **Docker Desktop** | 4.34+ (moteur 27.x) | `docker --version` | <https://www.docker.com/products/docker-desktop> |
| **Docker Compose** | v2.29+ (intégré à Docker Desktop) | `docker compose version` | Inclus avec Docker Desktop |
| **Git** | 2.40+ | `git --version` | <https://git-scm.com/downloads> |
| **PostgreSQL Client** *(optionnel, pour import du dump)* | 15+ | `psql --version` | <https://www.postgresql.org/download/> |
| **Navigateur web** | Chrome / Edge / Firefox (récent) | — | — |
| **WSL 2** *(Windows uniquement)* | Activé par défaut avec Docker Desktop | `wsl --status` | — |

> **Note JDK / Node.js :** Non requis pour les tests. Les services Java (JDK 17) et le frontend (Node.js 20) sont **compilés à l'intérieur des conteneurs Docker**. Vous n'avez rien à installer sur votre machine.

### 1.2 Configuration machine recommandée

| Ressource | Minimum | Recommandé |
|---|---|---|
| Processeur | 4 cœurs | 8 cœurs |
| Mémoire vive (RAM) | 8 Go | **16 Go** |
| Disque libre | 10 Go | 20 Go (images Docker + dump) |
| Système | Windows 10/11, macOS 12+, Linux | — |
| Accès réseau | Internet (1er build) puis local | — |

### 1.3 Ports à libérer sur la machine de test

La plateforme expose plusieurs ports. **Aucun autre programme ne doit les occuper** au démarrage. Si un port est occupé, le conteneur correspondant refusera de démarrer.

| Port | Service | URL d'accès |
|---|---|---|
| **3000** | Frontend React (Nginx) | <http://localhost:3000> |
| **8080** | API Gateway | <http://localhost:8080> |
| **8085** | Service Authentification | <http://localhost:8085> |
| **8086** | Service Certificat | <http://localhost:8086> |
| **8087** | Service Évaluation | <http://localhost:8087> |
| **8088** | Service Formation | <http://localhost:8088> |
| **8089** | Service Analyse (Skill Passport) | <http://localhost:8089> |
| **8004** | Service Besoin-Formation | <http://localhost:8004> |
| **8005** | Service Compétences | <http://localhost:8005> |
| **7432** | PostgreSQL *(exposé pour debug)* | `localhost:7432` |
| **5672** | RabbitMQ (AMQP) | — |
| **15672** | RabbitMQ Management UI | <http://localhost:15672> |
| **6379** | Redis | — |
| **5050** | PgAdmin *(profil debug uniquement)* | <http://localhost:5050> |

**Pour vérifier qu'un port est libre (Windows / PowerShell) :**

```powershell
# Remplacer 8080 par le port à vérifier
netstat -ano | findstr :8080
# Aucune ligne = port libre
```

**Pour libérer un port occupé (Windows / PowerShell, en administrateur) :**

```powershell
# 1. Identifier le PID du programme occupant le port 8080
netstat -ano | findstr :8080
# 2. Tuer le processus (remplacer <PID>)
taskkill /PID <PID> /F
```

---

## 2. Structure du projet

### 2.1 Arborescence des dossiers principaux

```
pfe-d2f-enseignants/
├── esprit_D2F-api-gateway/           # API Gateway (Spring Cloud Gateway)
├── esprit_D2F-authentification/      # Auth & Users (JWT HS512)
├── esprit_D2F-competence/            # Compétences & hiérarchie
├── esprit_D2F-formation/             # Formations, séances, présences
├── esprit_D2F-besoin-formation/      # Besoins de formation & workflow d'approbation
├── esprit_D2F-evaluation/            # Évaluations des formations
├── esprit_D2F-certificat/            # Certificats PDF
├── esprit_D2F-analyse/               # Passeport de compétences (agrégation REST)
├── esprit_D2F-rice/                  # RICE — Référentiel Intelligent (Python)
├── esprit_D2F-predictive-analytics/  # Analyse Prédictive (Python)
├── esprit_D2F-common-security/       # Bibliothèque commune sécurité (RBAC, JWT)
├── esprit_D2F-webapp/                # Frontend React 19 + Vite
├── infra/                            # Scripts d'initialisation PostgreSQL
│   └── postgres/
│       ├── init/                     # Scripts exécutés au 1er démarrage DB
│       └── sql/                      # Templates SQL (rôles, schémas, extensions)
├── docs/                             # Documentation technique
├── docker-compose.yml                # Orchestration locale (dev / QA)
├── docker-compose.prod.yml           # Orchestration production
├── .env.example                      # Modèle de configuration (À COPIER en .env)
└── .gitignore
```

### 2.2 Description de chaque service

| Service | Technologie | Port | Rôle fonctionnel |
|---|---|---|---|
| **API Gateway** | Java / Spring Cloud Gateway | 8080 | Point d'entrée unique du frontend. Route les requêtes vers les microservices, applique le rate limiting (Redis) et la validation JWT. |
| **Authentification** | Java / Spring Boot 3 | 8085 | Gère les comptes utilisateurs, l'authentification (login / refresh / logout), les rôles RBAC, la confirmation par e-mail et le verrouillage après échecs. |
| **Compétences** | Java / Spring Boot 3 | 8005 | Référentiel des domaines, compétences, sous-compétences et savoirs (niveaux N1→N5). Source du référentiel RICE. |
| **Formation** | Java / Spring Boot 3 | 8088 | Catalogue de formations, séances, présences, inscriptions, salles, et notifications calendrier. |
| **Besoin-Formation** | Java / Spring Boot 3 | 8004 | Workflow de collecte et d'approbation des besoins de formation (enseignant → chef de département → CUP → admin). |
| **Évaluation** | Java / Spring Boot 3 | 8087 | Évaluations des formations par les participants (à chaud / à froid). |
| **Certificat** | Java / Spring Boot 3 | 8086 | Génération des certificats PDF à l'issue des formations. |
| **Analyse** | Java / Spring Boot 3 | 8089 | Passeport de compétences : agrège les données des autres services via REST. |
| **RICE** | Python / FastAPI | 8001 | Référentiel Intelligent de Compétences et Évaluation — calcul des niveaux et recommandations. **Accessible uniquement via l'API Gateway** (aucun port exposé). |
| **Predictive Analytics** | Python / FastAPI | 8000 (interne) | Détection des gaps de compétences et analyse prédictive. **Accessible uniquement via l'API Gateway** (aucun port exposé). |
| **Frontend React** | React 19 + Vite + Nginx | 3000 | Interface utilisateur web. |
| **PostgreSQL** | 15-alpine | 7432 | Base de données relationnelle unique, avec un **schéma dédié par service** (`auth`, `formation`, `besoin`, `evaluation`, `certificat`, `competence`, `analyse`). |
| **RabbitMQ** | 3.13-management | 5672 / 15672 | Broker de messages pour la communication asynchrone interservices. |
| **Redis** | 7-alpine | 6379 | Cache et rate limiting côté API Gateway. |

---

## 3. Configuration de l'environnement

### 3.1 Création du fichier `.env` à partir du `.env.example`

Le fichier `.env` contient toutes les variables d'environnement de la plateforme. **Il ne doit jamais être commité dans Git** (déjà exclu via `.gitignore`).

**Étape 1 — Copier le modèle :**

```bash
# Depuis la racine du projet
cp .env.example .env
```

> Sur **Windows PowerShell** :
> ```powershell
> Copy-Item .env.example .env
> ```

**Étape 2 — Ouvrir le fichier `.env` dans un éditeur de texte** (VS Code, Notepad++, Bloc-notes) et renseigner les variables sensibles (voir §3.2).

### 3.2 Variables d'environnement obligatoires à renseigner

| Variable | Description | Comment l'obtenir |
|---|---|---|
| `JWT_SECRET` | Clé de signature des tokens JWT (HS512). **Min. 64 caractères.** | Générer avec : `openssl rand -base64 64` |
| `DB_PASSWORD` | Mot de passe PostgreSQL (utilisateur `d2f`). | Mot de passe fort personnel |
| `POSTGRES_PASSWORD` | Identique à `DB_PASSWORD`. | Identique à ci-dessus |
| `RABBITMQ_PASSWORD` | Mot de passe RabbitMQ. | Mot de passe fort personnel |
| `REDIS_PASSWORD` | Mot de passe Redis (rate limiting). | Mot de passe fort personnel |
| `MAIL_USERNAME` | Adresse SMTP pour les notifications. | Fournie par la DSI |
| `MAIL_PASSWORD` | Mot de passe du compte SMTP. | Fourni par la DSI |
| `APP_SECURITY_DEFAULT_ADMIN_PASSWORD` | Mot de passe du compte admin bootstrap. | À redéfinir (voir §5) |

**Génération de la clé JWT (exécuter une fois, puis copier le résultat dans `.env`) :**

```bash
openssl rand -base64 64
```

> Sur Windows, `openssl` est inclus avec **Git Bash**. Sinon, ouvrir Git Bash et exécuter la commande ci-dessus.

### 3.3 Variables sensibles à ne JAMAIS laisser vides

Les variables suivantes, **si elles sont vides**, empêchent le démarrage ou compromettent la sécurité :

| Variable | Conséquence si vide |
|---|---|
| `JWT_SECRET` | Les services ne démarrent pas (erreur au boot Spring). |
| `DB_PASSWORD` | `docker compose up` échoue (variable `REDIS_PASSWORD:?` déclenche un arrêt). |
| `RABBITMQ_PASSWORD` | Échec de connexion RabbitMQ → services formation / besoin / certificat / évaluation en boucle de redémarrage. |
| `REDIS_PASSWORD` | `redis` refuse de démarrer → API Gateway en échec. |
| `MAIL_USERNAME` / `MAIL_PASSWORD` | Notifications de formation non envoyées (tests e-mail impossibles). |
| `APP_SECURITY_DEFAULT_ADMIN_PASSWORD` | Compte admin par défaut vulnérable (valeur par défaut `admin`). |

> ⚠️ **Règle DSI §1.1 — Aucune valeur sensible en dur dans les scripts ou le code source.** Toutes les valeurs ci-dessus doivent provenir du fichier `.env` ou de variables d'environnement.

### 3.4 Configuration Docker par service

Le fichier `docker-compose.yml` orchestre 13 conteneurs. Voici la synthèse des ports, volumes et healthchecks par service :

| Service | Ports exposés | Volume persistant | Healthcheck |
|---|---|---|---|
| `postgres` | 7432→5432 | `d2f_postgres_data` | `pg_isready -U d2f -d d2f` (10s / 5 retries) |
| `rabbitmq` | 5672, 15672 | `d2f_rabbitmq_data` | `rabbitmq-diagnostics -q ping` (30s / 5 retries) |
| `redis` | 6379 | `d2f_redis_data` | `redis-cli ping` (10s / 5 retries) |
| `pgadmin` *(debug)* | 5050→80 | `d2f_pgadmin_data` | — |
| `auth-service` | 8085 | — | `wget /actuator/health` (30s / 3 retries, start 60s) |
| `competence-service` | 8005 | — | `wget /actuator/health` |
| `formation-service` | 8088 | — | `wget /actuator/health` |
| `besoin-formation-service` | 8004 | — | `wget /actuator/health` |
| `evaluation-service` | 8087 | — | `wget /actuator/health` |
| `certificat-service` | 8086 | — | `wget /actuator/health` |
| `analyse-service` | 8089 | — | `curl /actuator/health` |
| `rice-service` | *(non exposé)* | — | `urlopen /health` |
| `predictive-analytics-service` | *(non exposé)* | — | `curl /api/v1/analytics/health` |
| `api-gateway` | 8080 | — | `wget /actuator/health` |
| `webapp` | 3000→80 | — | `wget /` |

> **Volumes persistants :** Les données PostgreSQL, RabbitMQ et Redis survivent à un `docker compose down`. Pour repartir d'une base vierge, voir §6.3.

---

## 4. Étapes d'installation et d'exécution

### Étape 1 — Cloner le dépôt

```bash
git clone <url-du-depot-git>
cd pfe-d2f-enseignants
```

> Si vous avez déjà le dépôt en local, mettre à jour avec la branche de test :
> ```bash
> git fetch origin
> git checkout oussama     # branche de test courante
> git pull origin oussama
> ```

### Étape 2 — Configurer le `.env`

```bash
cp .env.example .env
# Éditer le fichier .env et renseigner les variables sensibles (voir §3.2)
```

**Vérification rapide — liste des variables obligatoirement non vides :**

```bash
# Linux / macOS / Git Bash
grep -E "^(JWT_SECRET|DB_PASSWORD|RABBITMQ_PASSWORD|REDIS_PASSWORD|MAIL_USERNAME|MAIL_PASSWORD)=" .env | grep -E "=$"
# → aucune ligne ne doit s'afficher (sinon, compléter le .env)

# Windows PowerShell
Select-String -Path .env -Pattern "^(JWT_SECRET|DB_PASSWORD|RABBITMQ_PASSWORD|REDIS_PASSWORD|MAIL_USERNAME|MAIL_PASSWORD)=$"
# → aucune ligne ne doit s'afficher
```

### Étape 3 — Importer le dump PostgreSQL

Le dump contient le schéma complet et les données de test (utilisateurs, hiérarchie de compétences, formations, besoins). Voir le **Livrable 2** pour le script complet.

**Procédure recommandée (le schéma et les données sont créés par le dump, pas par les conteneurs) :**

```bash
# 1. S'assurer que PostgreSQL tourne
docker compose up -d postgres

# 2. Attendre que PostgreSQL soit prêt (status = healthy)
docker compose ps postgres

# 3. Importer le dump dans le conteneur
docker exec -i d2f-postgres psql -U d2f -d d2f < dump_d2f_test.sql

# 4. Vérifier le compte admin
docker exec -it d2f-postgres psql -U d2f -d d2f -c \
  "SELECT username, email FROM auth.users WHERE email='admin@esprit.tn';"
```

> 💡 **Alternative (depuis l'hôte) :** si un client `psql` est installé sur la machine :
> ```bash
> psql -h localhost -p 7432 -U d2f -d d2f -f dump_d2f_test.sql
> ```

### Étape 4 — Lancer l'application

```bash
# Build des images + démarrage de tous les services
docker compose up -d --build
```

> ⏱️ **Durée estimée du 1er build :** 15 à 30 minutes (téléchargement des dépendances Maven/npm).
> Les builds suivants sont mis en cache : ~2 minutes.

**Si vous rencontrez des erreurs de build, démarrer service par service :**

```bash
# 1. Infrastructure d'abord
docker compose up -d postgres rabbitmq redis

# 2. Attendre le status healthy (~30s)
docker compose ps

# 3. Services backend
docker compose up -d auth-service competence-service besoin-formation-service \
                   evaluation-service certificat-service formation-service \
                   analyse-service rice-service predictive-analytics-service

# 4. API Gateway puis Frontend
docker compose up -d api-gateway webapp
```

### Étape 5 — Vérifier le démarrage de chaque service

```bash
# Vue synthétique de l'état de la stack
docker compose ps
```

**Résultat attendu :** tous les services doivent afficher `Up (healthy)`.

| Colne | Signification |
|---|---|
| `Up` | Le conteneur est démarré. |
| `Up (healthy)` | Le healthcheck a réussi — service pleinement opérationnel. |
| `Up (health: starting)` | Le service démarre encore — patienter 1 à 2 minutes. |
| `Restarting` | ⚠️ Le service plante en boucle — voir §6.2. |
| `Exit` | ❌ Le service s'est arrêté — consulter ses logs. |

**Suivre les logs en temps réel :**

```bash
# Tous les services
docker compose logs -f

# Un service précis
docker compose logs -f auth-service
docker compose logs -f competence-service
docker compose logs -f api-gateway
```

### Étape 6 — Accéder à l'application et aux interfaces Swagger

#### Application web (frontend)

| URL | Description |
|---|---|
| <http://localhost:3000> | Frontend React (page de connexion) |

#### API Gateway (point d'entrée unique)

| URL | Description |
|---|---|
| <http://localhost:8080> | API Gateway |
| <http://localhost:8080/actuator/health> | État de santé de la gateway |

#### Swagger / OpenAPI par service

| Service | URL Swagger UI |
|---|---|
| Authentification | <http://localhost:8085/swagger-ui.html> |
| Compétences | <http://localhost:8005/swagger-ui.html> |
| Formation | <http://localhost:8088/swagger-ui.html> |
| Besoin-Formation | <http://localhost:8004/swagger-ui.html> |
| Évaluation | <http://localhost:8087/swagger-ui.html> |
| Certificat | <http://localhost:8086/swagger-ui.html> |
| Analyse | <http://localhost:8089/swagger-ui.html> |

#### Outils d'infrastructure

| Outil | URL | Identifiants par défaut |
|---|---|---|
| RabbitMQ Management | <http://localhost:15672> | `d2f` / valeur de `RABBITMQ_PASSWORD` |
| PgAdmin *(profil debug)* | <http://localhost:5050> | `admin@d2f.tn` / valeur de `PGADMIN_PASSWORD` |

> Pour activer PgAdmin, démarrer avec le profil debug :
> ```bash
> docker compose --profile debug up -d pgadmin
> ```

---

## 5. Comptes de test disponibles dans le dump

Tous les comptes de test ci-dessous sont créés par le script de dump (Livrable 2). **Les mots de passe respectent la politique de sécurité** (min. 8 caractères, majuscule + chiffre + caractère spécial).

> ⚠️ Les mots de passe sont stockés **hachés (BCrypt)** dans la base. Les valeurs en clair ci-dessous sont les seules à saisir sur l'écran de connexion.

### 5.1 Compte ADMIN — Administrateur de la plateforme

| Champ | Valeur |
|---|---|
| Email | `admin@esprit.tn` |
| Mot de passe | `Admin@1234` |
| Rôle | `ADMIN` |

**Droits :** Accès total à la plateforme. Gestion des utilisateurs, des rôles, validation finale des besoins de formation, accès à tous les dashboards et exports.

### 5.2 Compte CUP — Chargé de la Formation Continue

| Champ | Valeur |
|---|---|
| Email | `cup@esprit.tn` |
| Mot de passe | `Cup@1234` |
| Rôle | `CUP` |

**Droits :** Suivi des besoins de formation de son périmètre, validation intermédiaire dans le workflow d'approbation, suivi des inscriptions et présences, consultation des bilans.

### 5.3 Compte ENSEIGNANT — Enseignant

| Champ | Valeur |
|---|---|
| Email | `enseignant@esprit.tn` |
| Mot de passe | `Ens@1234` |
| Rôle | `ENSEIGNANT` |

**Droits :** Consultation et saisie de son passeport de compétences, expression de besoins de formation, inscription aux formations, accès à ses évaluations et certificats.

### 5.4 Comptes additionnels issus du seed existant

Les migrations Flyway de référence (`V14__seed_sample_users.sql`) créent en outre les comptes suivants (mot de passe `D2F@2025` pour tous) :

| Email | Username | Rôle(s) | Usage typique |
|---|---|---|---|
| `f.benhassen@esprit.tn` | `fbenhassen` | CUP | Test workflow d'approbation côté CUP |
| `k.trabelsi@esprit.tn` | `ktrabelsi` | ENSEIGNANT | Test expression de besoins |
| `s.mansouri@esprit.tn` | `smansouri` | ENSEIGNANT | Test inscriptions / évaluations |
| `a.gharbi@esprit.tn` | `agharbi` | ENSEIGNANT | Test passeport de compétences |
| `m.hamdi@esprit.tn` | `mhamdi` | CHEF_DEPARTEMENT | Validation niveau département |
| `l.bensalem@esprit.tn` | `lbensalem` | ENSEIGNANT | Test variantes |
| `j.dupont@formation-pro.tn` | `jdupont` | FORMATEUR / ANIMATEUR | Test côté animateur de formation |
| `admin@d2f.tn` | `admin` | ADMIN | Admin bootstrap historique (mot de passe `admin`) — à éviter en test |

---

## 6. Recommandations particulières

### 6.1 Ordre de démarrage recommandé des services

Les dépendances `depends_on` du `docker-compose.yml` gèrent automatiquement l'ordre, mais en cas de démarrage manuel ou de redémarrage partiel, respecter cet ordre :

```
1. postgres  ─┐
2. rabbitmq  ─┤  Infrastructure (doivent être healthy avant tout le reste)
3. redis     ─┘
        │
        ▼
4. auth-service          ─┐
5. competence-service    ─┤
6. besoin-formation-service ─┤  Microservices indépendants (épendent de PG/RabbitMQ)
7. evaluation-service    ─┤
8. certificat-service    ─┤
9. formation-service     ─┤
10. rice-service         ─┤
11. predictive-analytics ─┘
        │
        ▼
12. analyse-service      (dépend de auth, certificat, evaluation, formation, competence, besoin)
13. api-gateway          (dépend de auth, competence, redis)
14. webapp               (dépend de api-gateway)
```

### 6.2 Erreurs fréquentes et solutions

| Symptôme | Cause probable | Solution |
|---|---|---|
| `Bind for 0.0.0.0:8080 failed: port already allocated` | Un autre programme occupe le port. | Libérer le port (voir §1.3) ou modifier le mapping dans `docker-compose.yml`. |
| `REDIS_PASSWORD is required` au `docker compose up` | `REDIS_PASSWORD` est vide dans `.env`. | Renseigner `REDIS_PASSWORD` dans `.env`. |
| `auth-service` boucle en `Restarting` | `JWT_SECRET` vide ou < 64 caractères. | Générer : `openssl rand -base64 64`, copier dans `.env`, puis `docker compose up -d --force-recreate auth-service`. |
| `formation-service` ne se connecte pas à RabbitMQ | RabbitMQ pas encore `healthy`. | Attendre 30s puis `docker compose restart formation-service`. |
| 401 Unauthorized sur toutes les API | Clé `JWT_SECRET` différente entre services (typiquement après édition partielle du `.env`). | Recréer tous les services : `docker compose up -d --force-recreate`. |
| 502 Bad Gateway depuis le frontend | API Gateway pas encore `healthy` ou un service backend en panne. | Vérifier `docker compose ps` et les logs du gateway. |
| `psql: FATAL: role "d2f" does not exist` | Base non initialisée (volume vierge) ou dump importé dans la mauvaise BDD. | Vérifier `POSTGRES_USER=d2f` et `POSTGRES_DB=d2f` dans `.env`. |
| Page blanche sur <http://localhost:3000> | Frontend buildé avec un `VITE_API_URL` incorrect. | Vérifier `VITE_API_URL=http://localhost:8080/api` dans `.env`, puis `docker compose up -d --build webapp`. |
| Migration Flyway bloquée | Dump partiellement importé (table `flyway_schema_history` incohérente). | Réinitialiser la base (voir §6.3) et réimporter le dump complet. |

### 6.3 Comment réinitialiser la base de données proprement

```bash
# 1. Arrêter tous les conteneurs ET supprimer le volume PostgreSQL
docker compose down -v

# 2. (Optionnel) Nettoyer les images pour repartir d'un build neuf
docker compose build --no-cache postgres

# 3. Relancer l'infrastructure seule
docker compose up -d postgres rabbitmq redis

# 4. Attendre que postgres soit healthy
docker compose ps postgres

# 5. Réimporter le dump
docker exec -i d2f-postgres psql -U d2f -d d2f < dump_d2f_test.sql

# 6. Relancer le reste de la stack
docker compose up -d
```

> ⚠️ `docker compose down -v` **efface définitivement** les volumes `d2f_postgres_data`, `d2f_rabbitmq_data`, `d2f_redis_data`. À n'utiliser que pour repartir d'un état vierge.

### 6.4 Comment relancer un seul service sans tout redémarrer

```bash
# Redémarrer un service (en gardant sa config)
docker compose restart auth-service

# Recréer un service (après modification du .env ou du code)
docker compose up -d --force-recreate --build competence-service

# Voir les logs d'un service spécifique en continu
docker compose logs -f --tail=100 formation-service

# Entrer dans un conteneur pour debug
docker exec -it d2f-competence sh
```

### 6.5 Liens utiles

| Ressource | URL |
|---|---|
| Frontend | <http://localhost:3000> |
| API Gateway — santé | <http://localhost:8080/actuator/health> |
| Swagger Auth | <http://localhost:8085/swagger-ui.html> |
| Swagger Compétences | <http://localhost:8005/swagger-ui.html> |
| Swagger Formation | <http://localhost:8088/swagger-ui.html> |
| Swagger Besoin-Formation | <http://localhost:8004/swagger-ui.html> |
| Swagger Évaluation | <http://localhost:8087/swagger-ui.html> |
| Swagger Certificat | <http://localhost:8086/swagger-ui.html> |
| Swagger Analyse | <http://localhost:8089/swagger-ui.html> |
| RabbitMQ Management | <http://localhost:15672> |
| PgAdmin (debug) | <http://localhost:5050> |

**Commandes logs Docker indispensales :**

```bash
# État global
docker compose ps

# Logs en direct (tous services)
docker compose logs -f

# Logs d'un service précis (dernières 200 lignes)
docker compose logs --tail=200 auth-service

# Statut des healthchecks
docker inspect --format='{{.State.Health.Status}}' d2f-auth
```

---

## 7. Vérification du bon fonctionnement

### 7.1 Checklist de santé des services

Avant tout test fonctionnel, parcourir cette checklist :

- [ ] `docker compose ps` → tous les services `Up (healthy)`
- [ ] <http://localhost:8080/actuator/health> → renvoie `{"status":"UP"}`
- [ ] <http://localhost:3000> → page de connexion D2F s'affiche
- [ ] <http://localhost:8085/swagger-ui.html> → Swagger Auth accessible
- [ ] Connexion réussie avec `admin@esprit.tn` / `Admin@1234`
- [ ] Déconnexion / reconnexion fonctionnelle
- [ ] <http://localhost:15672> → interface RabbitMQ accessible

### 7.2 Smoke tests manuels à effectuer en premier

| # | Test | Étapes | Résultat attendu |
|---|---|---|---|
| 1 | **Connexion Admin** | Aller sur <http://localhost:3000>, saisir `admin@esprit.tn` / `Admin@1234`. | Tableau de bord ADMIN s'affiche. |
| 2 | **Liste des utilisateurs** | Menu *Administration → Utilisateurs*. | Liste des comptes (≥ 8 utilisateurs). |
| 3 | **Connexion Enseignant** | Se déconnecter, se reconnecter en `enseignant@esprit.tn` / `Ens@1234`. | Tableau de bord enseignant s'affiche. |
| 4 | **Consultation du référentiel** | Menu *Compétences*. | ≥ 3 domaines (DEV, RESEAU, AI, PEDAG) et ≥ 5 compétences. |
| 5 | **Catalogue des formations** | Menu *Formations*. | ≥ 2 formations visibles (Spring Boot 3, Sécurité Web). |
| 6 | **Liste des besoins** | Menu *Besoins de formation*. | Au moins 1 besoin visible avec statut d'approbation. |
| 7 | **Healthcheck API** | `curl http://localhost:8080/actuator/health` | `{"status":"UP"}` |
| 8 | **Healthcheck RICE (via gateway)** | `curl http://localhost:8080/api/v1/rice/health` *(selon routage)* | Réponse 200 OK |

### 7.3 Endpoints clés à tester pour chaque module

> 💡 Remplacer `<TOKEN>` par le JWT obtenu après login (endpoint `/api/v1/auth/login`).

#### Authentification

```bash
# Login — récupérer un JWT
curl -X POST http://localhost:8080/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{"username":"admin@esprit.tn","password":"Admin@1234"}'

# Profil de l'utilisateur connecté
curl http://localhost:8080/api/v1/account/profile \
  -H "Authorization: Bearer <TOKEN>"
```

#### Compétences

```bash
# Lister les domaines
curl http://localhost:8080/api/v1/domaines -H "Authorization: Bearer <TOKEN>"

# Lister les compétences
curl http://localhost:8080/api/v1/competences -H "Authorization: Bearer <TOKEN>"

# Hiérarchie complète (domaine → compétence → sous-compétence → savoir)
curl http://localhost:8080/api/v1/competences/tree -H "Authorization: Bearer <TOKEN>"
```

#### Formation

```bash
# Catalogue des formations
curl http://localhost:8080/api/v1/formations -H "Authorization: Bearer <TOKEN>"

# Détail d'une formation
curl http://localhost:8080/api/v1/formations/1 -H "Authorization: Bearer <TOKEN>"
```

#### Besoin-Formation

```bash
# Liste des besoins (tous statuts)
curl http://localhost:8080/api/v1/besoins -H "Authorization: Bearer <TOKEN>"

# Besoins en attente d'approbation
curl "http://localhost:8080/api/v1/besoins?statut=EN_ATTENTE" -H "Authorization: Bearer <TOKEN>"
```

#### Évaluation

```bash
# Évaluations disponibles pour l'utilisateur connecté
curl http://localhost:8080/api/v1/evaluations -H "Authorization: Bearer <TOKEN>"
```

#### Certificat

```bash
# Certificats de l'utilisateur connecté
curl http://localhost:8080/api/v1/certificats -H "Authorization: Bearer <TOKEN>"
```

#### Passeport de compétences (Analyse)

```bash
# Passeport de l'utilisateur connecté
curl http://localhost:8080/api/v1/skill-passports/me -H "Authorization: Bearer <TOKEN>"
```

---

## 📌 Récapitulatif express pour la testeuse

```bash
# 1. Préparer l'environnement
cp .env.example .env             # puis éditer et renseigner JWT_SECRET, DB_PASSWORD, etc.

# 2. Démarrer PostgreSQL + importer le dump
docker compose up -d postgres rabbitmq redis
docker exec -i d2f-postgres psql -U d2f -d d2f < dump_d2f_test.sql

# 3. Démarrer toute la stack
docker compose up -d --build

# 4. Vérifier
docker compose ps                # tous les services doivent être Up (healthy)

# 5. Tester
# → http://localhost:3000 avec admin@esprit.tn / Admin@1234
```

---

*Document généré pour la campagne de tests D2F — conforme aux conventions DSI §1.1 (aucun secret en dur), §2 (PostgreSQL / RabbitMQ standards), §3.2 (migrations versionnées).*
