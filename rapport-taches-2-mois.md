# Rapport des Tâches Effectuées — Services Formation & Besoin-Formation

**Période** : Avril — Juin 2026  
**Projet** : D2F — Développement Professionnel des Enseignants (ESPRIT)  
**Auteur** : Oussama KADDECH  
**Services concernés** : `esprit_D2F-formation` & `esprit_D2F-besoin-formation`

---

## 1. Résumé Exécutif

Ce rapport détaille l'ensemble des travaux réalisés sur les deux microservices **Formation** et **Besoins de Formation** durant les deux derniers mois. Au total, **~100 commits** ont été effectués, couvrant le développement de fonctionnalités, la conformité DSI, la sécurité, les tests et la documentation.

---

## 2. Service Besoin-Formation (`esprit_D2F-besoin-formation`)

### 2.1 Architecture

| Composant | Détails |
|-----------|---------|
| Framework | Spring Boot 3.4.2 / Java 17 |
| Base de données | PostgreSQL 15 |
| Messagerie | RabbitMQ |
| Migrations | Flyway V1 → V24 |
| Contrôleurs | 3 (BesoinFormation, BesoinCompetence, Admin) |
| Couverture de tests | **91%** |

### 2.2 Fonctionnalités Développées

#### Workflow de Validation à 3 Niveaux
- **Niveau 1** : CUP (Coordination des Unités Pédagogiques) valide le besoin
- **Niveau 2** : Chef de Département approuve
- **Niveau 3** : Admin finalise la décision

#### Endpoints Principaux
- `POST /besoins` — Création d'un besoin de formation
- `PUT /besoins/{id}/validate/{level}` — Validation par niveau hiérarchique
- `PUT /besoins/{id}/reject/{level}` — Rejet avec motif
- `GET /besoins` — Liste paginée avec `PageResponse` DTO
- `GET /besoins/{id}` — Détail d'un besoin
- `DELETE /besoins/{id}` — Suppression logique (soft delete)
- `POST /besoins/{id}/refresh` — Rafraîchissement des données

#### Entités
- `BesoinFormation` — 30+ champs, soft delete, audit columns
- `BesoinCompetence` — Association besoins-compétences
- `Notification` — Notifications par rôle
- Énumérations : `TypeBesoin`, `Priorite`, `PeriodCode`

### 2.3 Conformité DSI & Sécurité

| Tâche | Statut | Détails |
|-------|--------|---------|
| RBAC avec `@PreAuthorize` | ✅ | Contrôle d'accès par rôle sur chaque endpoint |
| Soft delete | ✅ | Suppression logique avec colonne `deleted` |
| Pagination `PageResponse` | ✅ | Format standardisé de réponse paginée |
| Logs sans PII | ✅ | Aucune donnée personnelle dans les logs |
| RabbitMQ event publishing | ✅ | Événement `BesoinApprovedEvent` vers Formation |
| Migrations Flyway | ✅ | V1 à V24 (baselines, schema, indexes, audit) |
| Dockerfile optimisé | ✅ | Image Docker production-ready |

### 2.4 Événements RabbitMQ

Lorsqu'un besoin est approuvé au niveau 3, un événement `BesoinApprovedEvent` est publié sur RabbitMQ. Ce consommé par le microservice **Formation** pour créer automatiquement la formation correspondante.

---

## 3. Service Formation (`esprit_D2F-formation`)

### 3.1 Architecture

| Composant | Détails |
|-----------|---------|
| Framework | Spring Boot 3.4.2 / Java 17 |
| Base de données | PostgreSQL 15 |
| Messagerie | RabbitMQ |
| Intégrations | Microsoft 365 (OneDrive, Outlook, Mail) |
| Migrations | Flyway V1 → V40+ |
| Contrôleurs | **17+** |
| DTOs | **45+** |
| Couverture de tests | **83.5%** (1107+ tests verts) |

### 3.2 Fonctionnalités Développées

#### A. Gestion des Formations

| Fonctionnalité | Description |
|----------------|-------------|
| CRUD complet | Création, modification, suppression logique |
| Workflow state machine | États : BROUILLON → VALIDÉE → EN_COURS → TERMINÉE |
| Clonage | Duplication rapide d'une formation existante |
| Recherche avancée | Filtres multi-critères (date, département, compétence) |
| Récupération soft delete | Restauration de formations supprimées |
| Import Excel | Import en masse depuis fichiers Excel |
| Export Excel | Export des données de formation |
| Validation fichier | Sécurité renforcée sur les uploads (defense-in-depth) |

#### B. Gestion du Calendrier

| Fonctionnalité | Description |
|----------------|-------------|
| Import calendrier Excel | Import des ateliers depuis fichier Excel |
| Détection de conflits | Vérification des chevauchements de salles/dates |
| Export .ics (iCal) | Génération de fichiers iCal pour Outlook/Google Calendar |
| Invitations Outlook | Envoi d'invitations via Microsoft Graph API |
| Bouton « Ajouter à Outlook » | Export direct par formation dans le tableau |

#### C. Gestion des Inscriptions

| Fonctionnalité | Description |
|----------------|-------------|
| Écosystème P0/P1/P2/P3 | Niveaux de priorité d'inscription |
| Page unifiée avec onglets | Vue admin et enseignant dans une même page |
| Bouton « S'inscrire au catalogue » | Inscription directe depuis le tableau |
| Rôle FORMATEUR consolidé | Gestion du formateur dans le workflow |
| Force import | Import en ignorant les doublons |
| Présences enseignant | Page « Mes Présences » + endpoint backend |

#### D. Intégrations Microsoft 365

| Intégration | Description |
|-------------|-------------|
| OneDrive | Stockage et récupération de documents |
| Outlook Calendar | Synchronisation des événements de formation |
| Outlook Mail | Envoi d'emails de notification |
| Microsoft Graph API | Interface unifiée pour les services Microsoft |

#### E. KPI & Tableau de Bord

| Fonctionnalité | Description |
|----------------|-------------|
| Widgets KPI formation | Visualisation des métriques clés |
| Dashboard exécutif | Indicateurs pour le pilotage |

#### F. Gestion des Enseignants & Animateurs

| Fonctionnalité | Description |
|----------------|-------------|
| Création compte + fiche | Creation en 1 seul appel API |
| Animateurs externes | Ajout d'animateurs non enseignants |
| Participants auto | Résolution automatique des participants |
| Rôle ANIMATEUR | Sécurité et droits d'accès spécifiques |

#### G. Sécurité & Conformité DSI

| Tâche | Statut | Détails |
|-------|--------|---------|
| RBAC `@PreAuthorize` | ✅ | Sur tous les contrôleurs |
| JWT scope validation | ✅ | Validation Feign inter-services |
| CORS configuré | ✅ | Politiques cross-origin sécurisées |
| Swagger désactivé prod | ✅ | Masquage automatique |
| Validation fichier upload | ✅ | Defense-in-depth |
| Soft delete | ✅ | Toutes les entités principales |
| Logs sans PII | ✅ | Conformité RGPD |
| Circuit breaker | ✅ | Fallback sur appels Microsoft |
| Analytics event publishing | ✅ | Événements d'usage |

### 3.3 Contrôleurs Principaux

| Contrôleur | Rôle | Endpoints |
|------------|------|-----------|
| `FormationController` | CRUD formations | 8+ |
| `FormationWorkflowController` | Workflow & présences | 15+ |
| `InscriptionController` | Gestion inscriptions | 6+ |
| `SeanceController` | Séances de formation | 5+ |
| `KPIController` | Métriques | 4+ |
| `CalendarController` | Calendrier & export | 6+ |
| `DocumentController` | Gestion documents | 4+ |
| `MailController` | Envoi emails | 3+ |
| `OneDriveController` | Intégration OneDrive | 3+ |
| `EnseignantController` | Gestion enseignants | 5+ |
| `BureauController` | Salles & bureaux | 3+ |
| `DeptController` | Départements | 2+ |
| `UpController` | Unités pédagogiques | 2+ |

### 3.4 Communication Inter-Services

```
BesoinFormation ──RabbitMQ──▶ Formation (création auto)
         │
         ▼
    NotificationService
```

- **Événement** : `BesoinApprovedEvent`
- **Trigger** : Validation niveau 3 du besoin
- **Action** : Création automatique de la formation dans le catalogue

---

## 4. Statistiques Globales

| Métrique | Besoin-Formation | Formation | Total |
|----------|------------------|-----------|-------|
| Commits | ~30 | ~70 | **~100** |
| Contrôleurs | 3 | 17+ | **20+** |
| Migrations Flyway | V1-V24 | V1-V40+ | **V1-V64+** |
| Couverture tests | 91% | 83.5% | **87%** |
| Tests unitaires | — | 1107+ | **1100+** |
| DTOs | 5+ | 45+ | **50+** |

---

## 5. Évolution sur 2 Mois

### Avril 2026
- Suppression du rôle D2F inutile de tous les services
- Configuration de base RBAC et CORS

### Mai 2026
- Refactoring pour conformité DSI (ValidationUtils, AbstractExcelImportService)
- Ajout des migrations Flyway (V13 formation, soft delete)
- Optimisation couverture de tests à 91% (besoin-formation)
- Validation defense-in-depth sur les uploads
- Recherche avancée, récupération soft delete, clonage
- Correction emails doublon et formatage dates

### Juin 2026
- Refonte design modification formation + correction UI/UX
- Ajout animateurs externes et participants auto
- Écosystème inscriptions P0/P1/P2/P3
- Création compte+fiche en 1 appel
- Gestion calendrier ateliers (import Excel, conflits, export .ics, invitations)
- Widgets KPI formation
- Page « Mes Présences » enseignant
- Inscriptions unifiées avec onglets admin/enseignant
- Conformité CdC DSI (Swagger, soft delete, RabbitMQ)
- Docker stack totalement opérationnelle

---

## 6. Technologies Utilisées

| Catégorie | Technologie |
|-----------|-------------|
| Backend | Spring Boot 3.4.2, Java 17 |
| Frontend | React 19, Vite, TypeScript |
| Base de données | PostgreSQL 15 |
| Messagerie | RabbitMQ |
| Authentification | OAuth2 + JWT HS512 |
| Sécurité | Spring Security, RBAC `@PreAuthorize` |
| Migrations | Flyway |
| Tests | JUnit 5, Mockito, JaCoCo |
| Qualité | SonarQube, SpotBugs |
| CI/CD | GitHub Actions, Docker |
| Intégration | Microsoft Graph API (OneDrive, Outlook, Mail) |

---

*Rapport généré le 16 juin 2026*
