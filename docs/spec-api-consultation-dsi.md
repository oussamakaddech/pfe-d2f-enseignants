# Spécification de données – API de consultation ESPRIT
## Data Contract v1.0 — Projet D2F (Développement De Formations)

---

**Document :** Spécification technique des endpoints GET exposés à la DSI  
**Version :** 1.0.0  
**Date :** 20 mai 2026  
**Auteur :** Équipe PFE D2F — ESPRIT  
**Destinataire :** DSI ESPRIT  
**Statut :** Proposition initiale — À valider  

---

## Table des matières

1. [Contexte et périmètre](#1-contexte-et-périmètre)
2. [Architecture technique](#2-architecture-technique)
3. [Conventions générales](#3-conventions-générales)
4. [Entités métier et modèle de données](#4-entités-métier-et-modèle-de-données)
   - 4.1 [Utilisateurs et rôles](#41-utilisateurs-et-rôles)
   - 4.2 [Besoins de formation](#42-besoins-de-formation)
   - 4.3 [Formations](#43-formations)
   - 4.4 [Séances](#44-séances)
   - 4.5 [Compétences et référentiel](#45-compétences-et-référentiel)
   - 4.6 [Compétences par enseignant](#46-compétences-par-enseignant)
   - 4.7 [Évaluations](#47-évaluations)
   - 4.8 [Certificats et attestations](#48-certificats-et-attestations)
   - 4.9 [Passeport de compétences](#49-passeport-de-compétences)
   - 4.10 [Entités organisationnelles](#410-entités-organisationnelles)
5. [Relations inter-entités](#5-relations-inter-entités)
6. [Endpoints GET proposés](#6-endpoints-get-proposés)
   - 6.1 [Annuaire enseignants](#61-annuaire-enseignants)
   - 6.2 [Besoins de formation](#62-besoins-de-formation)
   - 6.3 [Formations](#63-formations)
   - 6.4 [Référentiel de compétences](#64-référentiel-de-compétences)
   - 6.5 [Évaluations](#65-évaluations)
   - 6.6 [Certificats](#66-certificats)
   - 6.7 [Passeport de compétences](#67-passeport-de-compétences)
7. [Règles de gestion](#7-règles-de-gestion)
8. [Sécurité et contrôle d'accès](#8-sécurité-et-contrôle-daccès)
9. [Format standard des erreurs](#9-format-standard-des-erreurs)
10. [Pagination, tri et recherche](#10-pagination-tri-et-recherche)
11. [Données sensibles — politique de masquage](#11-données-sensibles--politique-de-masquage)
12. [Statut de validation des données](#12-statut-de-validation-des-données)

---

## 1. Contexte et périmètre

### 1.1 Objet du document

Ce document formalise le **data contract** entre la plateforme D2F (Développement De Formations) et la DSI ESPRIT, avant la création officielle des endpoints en lecture.

Il vise à :

- Décrire avec précision les **entités métier** réellement implémentées dans le code source du projet,
- Définir les **champs exposables** et ceux qui doivent rester privés,
- Proposer une **API versionnée** cohérente, prête à être publiée derrière l'API Gateway existante,
- Établir un **langage commun** entre l'équipe D2F et la DSI pour éviter toute ambiguïté lors des intégrations futures.

### 1.2 Périmètre fonctionnel

La plateforme D2F couvre le cycle de vie complet du développement des compétences des enseignants ESPRIT :

| Domaine | Description |
|---------|-------------|
| Besoin de formation | Saisie et validation des besoins individuels/collectifs |
| Formation | Planification, exécution et suivi des formations |
| Référentiel de compétences | Domaines, compétences, sous-compétences, savoirs |
| Compétences enseignants | Cartographie des niveaux de maîtrise par enseignant |
| Évaluation | Évaluation des formateurs et satisfaction globale |
| Certificats | Génération d'attestations de participation |
| Passeport de compétences | Vue consolidée par enseignant (PDF + JSON) |
| Authentification | Gestion des comptes, rôles et journaux d'audit |

### 1.3 Périmètre de ce document

Ce document couvre **uniquement les opérations de lecture (GET)**. Aucun endpoint de modification (POST, PUT, PATCH, DELETE) n'est proposé dans ce data contract.

---

## 2. Architecture technique

### 2.1 Microservices

| Service | Port | Base de données | Rôle |
|---------|------|-----------------|------|
| `esprit-api-gateway` | **8080** | — | Point d'entrée unique, JWT, rate limiting, circuit breaker |
| `esprit-authentification` | 8085 | PostgreSQL (`auth`) | Comptes, rôles, audit |
| `esprit-besoin-formation` | 8004 | PostgreSQL (`besoin`) | Saisie et validation des besoins |
| `esprit-formation` | 8088 | PostgreSQL (`formation`) | Formations, séances, inscriptions |
| `esprit-competence` | 8005 | PostgreSQL (`competence`) | Référentiel de compétences |
| `esprit-evaluation` | 8087 | PostgreSQL (`evaluation`) | Évaluations formateurs |
| `esprit-certificat` | 8086 | PostgreSQL (`certificat`) | Attestations PDF |
| `esprit-analyse` | 8089 | — (agrégateur) | Passeport de compétences, IA |

### 2.2 Flux d'appel DSI

```
DSI / Applications externes
         │
         ▼
  API Gateway (8080)
  ┌──── JWT Validation
  ├──── Rate Limiting (Redis)
  └──── Circuit Breaker (Resilience4j)
         │
         ├── /api/v1/account/**        → authentification (8085)
         ├── /api/v1/besoins-formations/**  → besoin-formation (8004)
         ├── /api/v1/formations/**     → formation (8088)
         ├── /api/v1/competences/**    → competence (8005)
         ├── /api/v1/domaines/**       → competence (8005)
         ├── /api/v1/evaluations/**    → evaluation (8087)
         ├── /api/v1/certificates/**   → certificat (8086)
         └── /api/v1/skill-passports/** → analyse (8089)
```

---

## 3. Conventions générales

### 3.1 Versioning

Tous les endpoints sont préfixés `/api/v1/`. Une montée en version (`/api/v2/`) sera effectuée en cas de **rupture de contrat** (suppression ou renommage de champs).

### 3.2 Format des réponses

**Succès (liste paginée) :**

```json
{
  "content": [ /* tableau d'objets */ ],
  "page": {
    "number": 0,
    "size": 20,
    "totalElements": 154,
    "totalPages": 8
  }
}
```

**Succès (objet unique) :**

```json
{
  "data": { /* objet */ },
  "timestamp": "2026-05-20T10:30:00Z"
}
```

> **Note :** Le format exact des enveloppes de réponse est à confirmer avec l'équipe de développement. La structure Spring Page est utilisée en interne.

### 3.3 Dates et heures

| Type | Format | Exemple |
|------|--------|---------|
| Date | ISO 8601 `YYYY-MM-DD` | `2026-05-15` |
| Date + Heure | ISO 8601 avec timezone | `2026-05-15T14:30:00+01:00` |
| Heure | `HH:mm:ss` | `09:00:00` |

### 3.4 Encodage

UTF-8 obligatoire. Content-Type : `application/json`.

### 3.5 Identifiants

| Service | Type d'ID | Exemples |
|---------|-----------|---------|
| Auth (User) | `String` UUID | `"a3f7c2b1-..."` |
| Formation | `Long` auto-incrémenté | `42` |
| Compétence | `Long` auto-incrémenté | `15` |
| Enseignant (formation) | `String` code ESPRIT | `"E12345"` |
| Rôle | `Integer` auto-incrémenté | `3` |

---

## 4. Entités métier et modèle de données

> **Légende des statuts :**
> - ✅ **Confirmé** : présent dans le code source (@Entity, @Column, etc.)
> - 🔶 **Déduit** : cohérence documentaire, non testé en base
> - ❓ **À confirmer** : ambiguïté ou absence dans le code analysé

---

### 4.1 Utilisateurs et rôles

**Source :** `esprit_D2F-authentification` — entité `User` + `Role`

#### Champs exposables — `UserDTO`

| Champ | Type | Contrainte | Statut | Notes |
|-------|------|-----------|--------|-------|
| `id` | `String` (UUID) | PK, NOT NULL | ✅ | Identifiant technique unique |
| `username` | `String` | UNIQUE, max 20 | ✅ | Login ESPRIT |
| `firstName` | `String` | NOT NULL | ✅ | Prénom |
| `lastName` | `String` | NOT NULL | ✅ | Nom de famille |
| `email` | `String` | UNIQUE, max 50 | ✅ | Email institutionnel |
| `roles` | `List<String>` | — | ✅ | Noms des rôles (ERole) |
| `disabled` | `Boolean` | default: false | ✅ | Compte actif/inactif |
| `hasSubscription` | `Boolean` | default: false | ✅ | ❓ Sémantique à préciser avec DSI |

#### Champs masqués (non exposables)

| Champ | Raison |
|-------|--------|
| `password` | Hash bcrypt — confidentiel |
| `failedLoginAttempts` | Donnée sécurité interne |
| `lockUntil` | Donnée sécurité interne |
| `deviceIds` | Données techniques |

#### Enum `ERole`

| Valeur | Description |
|--------|-------------|
| `ADMIN` | Administrateur plateforme |
| `CUP` | Coordinateur Unité Pédagogique |
| `D2F` | Gestionnaire D2F |
| `ENSEIGNANT` | Enseignant (rôle principal) |
| `FORMATEUR` | Formateur interne |
| `CHEF_DEPARTEMENT` | Chef de département |
| `RESPONSABLE_DOSSIER` | Responsable dossier RH |

---

### 4.2 Besoins de formation

**Source :** `esprit_D2F-besoin-formation` — entité `BesoinFormation`

#### Champs exposables

| Champ | Type | Contrainte | Statut | Notes |
|-------|------|-----------|--------|-------|
| `idBesoinFormation` | `Long` | PK | ✅ | |
| `username` | `String` | — | ✅ | Identifiant demandeur |
| `typeBesoin` | `TypeBesoin` | ENUM | ✅ | INDIVIDUEL, COLLECTIF, ANIMER_UNE_FORMATION |
| `titre` | `String` | — | ✅ | Intitulé du besoin |
| `theme` | `String` | — | ✅ | Thème pédagogique |
| `objectifFormation` | `String` | — | ✅ | Objectif général |
| `objectifsOperationnels` | `String` | — | ✅ | |
| `objectifsPedagogiques` | `String` | — | ✅ | |
| `publicCible` | `String` | — | ✅ | Population visée |
| `nbMaxParticipants` | `Integer` | — | ✅ | |
| `dureeFormation` | `Integer` | — | ✅ | En heures |
| `priorite` | `Priorite` | ENUM | ✅ | BASSE, MOYENNE, HAUTE, CRITIQUE |
| `impactStrategique` | `String` | — | ✅ | Justification stratégique |
| `approuveCUP` | `Boolean` | nullable | ✅ | null = en attente |
| `approuveChefDep` | `Boolean` | nullable | ✅ | null = en attente |
| `approuveAdmin` | `Boolean` | nullable | ✅ | null = en attente |
| `up` | `String` | — | ✅ | Code unité pédagogique |
| `departement` | `String` | — | ✅ | Code département |
| `periodCode` | `PeriodCode` | ENUM | ✅ | P1, P2, P3, P4, SUMMER, WINTER, OTHER |
| `estOuverte` | `Boolean` | default: false | ✅ | Visible par les candidats |
| `eventPublished` | `Boolean` | default: false | ✅ | Publié comme événement |
| `lastRefreshDate` | `LocalDateTime` | — | ✅ | Dernière mise à jour |

#### Champs masqués

| Champ | Raison |
|-------|--------|
| `notificationMessage` | Usage interne workflow |
| `profilFormateur` | ❓ À valider si exposable |

---

### 4.3 Formations

**Source :** `esprit_D2F-formation` — entité `Formation`

#### Champs exposables

| Champ | Type | Contrainte | Statut | Notes |
|-------|------|-----------|--------|-------|
| `idFormation` | `Long` | PK | ✅ | |
| `titreFormation` | `String` | NOT NULL | ✅ | |
| `domaine` | `String` | — | ✅ | Domaine textuel libre |
| `typeFormation` | `TypeFormation` | ENUM | ✅ | INTERNE, EXTERNE, EN_LIGNE |
| `etatFormation` | `EtatFormation` | ENUM, NOT NULL | ✅ | Voir tableau états |
| `dateDebut` | `Date` | NOT NULL | ✅ | |
| `dateFin` | `Date` | NOT NULL | ✅ | |
| `objectifs` | `String` | max 2000 | ✅ | |
| `objectifsPedago` | `String` | max 2000 | ✅ | |
| `populationCible` | `String` | — | ✅ | |
| `chargeHoraireGlobal` | `Integer` | — | ✅ | En heures |
| `prerequis` | `String` | max 2000 | ✅ | |
| `acquis` | `String` | max 2000 | ✅ | |
| `coutFormation` | `Float` | — | ✅ | ⚠️ Exposer uniquement aux rôles ADMIN/D2F/DSI |
| `coutTransport` | `Float` | — | ✅ | ⚠️ Idem |
| `coutHebergement` | `Float` | — | ✅ | ⚠️ Idem |
| `coutRepas` | `Float` | — | ✅ | ⚠️ Idem |
| `inscriptionsOuvertes` | `Boolean` | — | ✅ | |
| `ouverte` | `Boolean` | — | ✅ | ❓ Distinction avec inscriptionsOuvertes à clarifier |
| `certifGenerated` | `Boolean` | default: false | ✅ | Attestations générées |
| `periodCode` | `PeriodCode` | ENUM | ✅ | |
| `up` | `UpDTO` | ManyToOne | ✅ | Unité pédagogique |
| `departement` | `DeptDTO` | ManyToOne | ✅ | Département |
| `idBesoinFormation` | `Long` | nullable | ✅ | Référence besoin d'origine |

#### Champs partiellement exposables (selon rôle)

| Champ | Type | Rôle minimum requis |
|-------|------|---------------------|
| `externeFormateurNom` | `String` | ADMIN, D2F |
| `externeFormateurPrenom` | `String` | ADMIN, D2F |
| `externeFormateurEmail` | `String` | ADMIN, D2F — email personnel |
| `organismeRefExterne` | `String` | Tous (public) |

#### Enum `EtatFormation`

| Valeur | Description |
|--------|-------------|
| `NOUVEAU` | Saisie initiale |
| `ENREGISTRE` | Validé, non planifié |
| `PLANIFIE` | Dates définies |
| `EN_COURS` | En déroulement |
| `ACHEVE` | Terminée |
| `ANNULE` | Annulée |
| `VISIBLE` | Publiée (visible enseignants) |

---

### 4.4 Séances

**Source :** `esprit_D2F-formation` — entité `SeanceFormation`

#### Champs exposables

| Champ | Type | Contrainte | Statut | Notes |
|-------|------|-----------|--------|-------|
| `idSeance` | `Long` | PK | ✅ | |
| `idFormation` | `Long` | FK | ✅ | Formation parente |
| `dateSeance` | `Date` | — | ✅ | |
| `heureDebut` | `Time` | — | ✅ | |
| `heureFin` | `Time` | — | ✅ | |
| `typeSeance` | `TypeSeanceEnum` | ENUM | ✅ | THEORIQUE, PRATIQUE, MIXTE |
| `contenus` | `String` | max 2000 | ✅ | |
| `methodes` | `String` | max 2000 | ✅ | |
| `dureeTheorique` | `Float` | — | ✅ | En heures |
| `dureePratique` | `Float` | — | ✅ | En heures |
| `salle` | `String` | max 255 | ✅ | |

#### Champ masqué

| Champ | Raison |
|-------|--------|
| `onlineMeetingUrl` | URL Teams auto-générée — usage interne sécurité |
| `calendarEventId` | Identifiant calendrier interne |

---

### 4.5 Compétences et référentiel

**Source :** `esprit_D2F-competence` — entités `Domaine`, `Competence`, `SousCompetence`, `Savoir`

#### Entité `Domaine`

| Champ | Type | Contrainte | Statut |
|-------|------|-----------|--------|
| `id` | `Long` | PK | ✅ |
| `code` | `String` | UNIQUE, NOT NULL | ✅ |
| `nom` | `String` | NOT NULL | ✅ |
| `description` | `String` | — | ✅ |
| `actif` | `Boolean` | default: true | ✅ |
| `nbCompetences` | `Integer` | calculé | ✅ (cache) |

#### Entité `Competence`

| Champ | Type | Contrainte | Statut |
|-------|------|-----------|--------|
| `id` | `Long` | PK | ✅ |
| `code` | `String` | UNIQUE, NOT NULL | ✅ |
| `nom` | `String` | NOT NULL | ✅ |
| `description` | `String` | — | ✅ |
| `prerequisiteManual` | `String` | TEXT | ✅ |
| `ordre` | `Integer` | — | ✅ |
| `domaineId` | `Long` | FK | ✅ |
| `domaineNom` | `String` | — | 🔶 Déduit (JOIN) |

#### Entité `SousCompetence`

| Champ | Type | Contrainte | Statut |
|-------|------|-----------|--------|
| `id` | `Long` | PK | ✅ |
| `code` | `String` | UNIQUE, NOT NULL | ✅ |
| `nom` | `String` | NOT NULL | ✅ |
| `description` | `String` | — | ✅ |
| `niveau` | `Integer` | default: 1 | ✅ |
| `competenceId` | `Long` | FK | ✅ |
| `parentId` | `Long` | nullable | ✅ |

#### Entité `Savoir`

| Champ | Type | Contrainte | Statut |
|-------|------|-----------|--------|
| `id` | `Long` | PK | ✅ |
| `code` | `String` | UNIQUE, NOT NULL | ✅ |
| `nom` | `String` | NOT NULL | ✅ |
| `description` | `String` | — | ✅ |
| `type` | `TypeSavoir` | ENUM, NOT NULL | ✅ | THEORIQUE, PRATIQUE |
| `niveau` | `NiveauMaitrise` | default: N2 | ✅ |
| `competenceId` | `Long` | nullable | ✅ |
| `sousCompetenceId` | `Long` | nullable | ✅ |

#### Enum `NiveauMaitrise`

| Valeur | Libellé | Description |
|--------|---------|-------------|
| `N1_DEBUTANT` | Débutant | Notions de base |
| `N2_ELEMENTAIRE` | Élémentaire | Compétences élémentaires |
| `N3_INTERMEDIAIRE` | Intermédiaire | Maîtrise partielle |
| `N4_AVANCE` | Avancé | Maîtrise confirmée |
| `N5_EXPERT` | Expert | Maîtrise complète |

---

### 4.6 Compétences par enseignant

**Source :** `esprit_D2F-competence` — entité `EnseignantCompetence`

| Champ | Type | Contrainte | Statut |
|-------|------|-----------|--------|
| `id` | `Long` | PK | ✅ |
| `enseignantId` | `String` | NOT NULL | ✅ |
| `savoirId` | `Long` | FK, NOT NULL | ✅ |
| `savoirNom` | `String` | — | 🔶 Via JOIN |
| `niveau` | `NiveauMaitrise` | NOT NULL | ✅ |
| `dateAcquisition` | `LocalDate` | — | ✅ |
| `commentaire` | `String` | — | ✅ |

**Contrainte unique :** `(enseignantId, savoirId)` — un enseignant ne peut avoir qu'un niveau par savoir.

---

### 4.7 Évaluations

**Source :** `esprit_D2F-evaluation` — entités `EvaluationFormateur`, `EvaluationGlobale`

#### Entité `EvaluationFormateur`

| Champ | Type | Contrainte | Statut |
|-------|------|-----------|--------|
| `idEvalParticipant` | `Long` | PK | ✅ |
| `enseignantId` | `String` | — | ✅ |
| `formationId` | `Long` | — | ✅ |
| `note` | `Float` | — | ✅ |
| `satisfaisant` | `Boolean` | — | ✅ |
| `commentaire` | `String` | — | ✅ |

#### Entité `EvaluationGlobale`

| Champ | Type | Contrainte | Statut |
|-------|------|-----------|--------|
| `idEvalGlobale` | `Long` | PK | ✅ |
| `formationId` | `Long` | UNIQUE | ✅ |
| `noteGlobale` | `Float` | — | ✅ |
| `commentaireGeneral` | `String` | max 3000 | ✅ |
| `recommandation` | `String` | max 100 | ✅ |
| `dateEvaluation` | `LocalDate` | — | ✅ |
| `lastRefreshDate` | `OffsetDateTime` | — | ✅ |

---

### 4.8 Certificats et attestations

**Source :** `esprit_D2F-certificat` — entité `Certificate`

| Champ | Type | Contrainte | Statut | Notes |
|-------|------|-----------|--------|-------|
| `idCertificate` | `Long` | PK | ✅ | |
| `formationId` | `Long` | — | ✅ | |
| `titreFormation` | `String` | — | ✅ | |
| `typeCertif` | `String` | — | ✅ | CERTIF, BADGE, ATTESTATION |
| `dateDebutFormation` | `LocalDate` | — | ✅ | |
| `dateFinFormation` | `LocalDate` | — | ✅ | |
| `chargeHoraireGlobal` | `Integer` | — | ✅ | |
| `enseignantId` | `String` | — | ✅ | |
| `nomEnseignant` | `String` | — | ✅ | |
| `prenomEnseignant` | `String` | — | ✅ | |
| `deptEnseignant` | `String` | — | ✅ | Département |
| `roleEnFormation` | `String` | — | ✅ | ex. ANIMATEUR |
| `delivered` | `Boolean` | — | ✅ | Remis à l'enseignant |

#### Champ masqué

| Champ | Raison |
|-------|--------|
| `mailEnseignant` | Email personnel — RGPD |
| `pdfFilePath` | Chemin serveur interne |

---

### 4.9 Passeport de compétences

**Source :** `esprit_D2F-analyse` — agrégation multi-services (pas de BDD propre)

Le passeport est un objet **calculé dynamiquement** par le service d'analyse à partir des données des services formation, compétence, certificat et authentification.

#### Structure `TeacherSkillPassportDTO`

| Section | Contenu | Source |
|---------|---------|--------|
| `teacherIdentity` | id, nom, prénom, email, UP, département | Auth + Formation |
| `competenceSummary` | Nombre de compétences, répartition par niveau | Compétence |
| `domainSummary` | Compétences par domaine | Compétence |
| `savoirSummary` | Savoirs théoriques vs pratiques | Compétence |
| `trainingHistory` | Historique formations suivies | Formation |
| `certifications` | Attestations obtenues | Certificat |
| `recommendations` | Recommandations IA | Analyse (ML) |
| `skillGaps` | Écarts de compétences | Analyse (calcul) |

> **Note :** La structure exacte des sous-objets (`CompetenceSummaryDTO`, `TrainingHistoryDTO`, etc.) est à confirmer avec l'équipe technique du service analyse.

---

### 4.10 Entités organisationnelles

**Source :** `esprit_D2F-formation` — entités `Up`, `Dept`

#### Entité `Up` (Unité Pédagogique)

| Champ | Type | Statut |
|-------|------|--------|
| `id` | `String` | ✅ |
| `libelle` | `String` | ✅ |

#### Entité `Dept` (Département)

| Champ | Type | Statut |
|-------|------|--------|
| `id` | `String` | ✅ |
| `libelle` | `String` | ✅ |

> ❓ **À confirmer :** Ces référentiels sont-ils synchronisés avec le SI ESPRIT existant ? Quelle est l'autorité de la donnée (D2F ou SI RH ESPRIT) ?

---

## 5. Relations inter-entités

```
User (Auth)
  └── 0..N EnseignantCompetence (via enseignantId)
  └── 0..N Formation (via animateurs ManyToMany)
  └── 0..N Inscription (via enseignantId)
  └── 0..N Certificate (via enseignantId)
  └── 0..N BesoinFormation (via username)

BesoinFormation
  └── 0..1 Formation (idBesoinFormation → besoin d'origine)

Formation
  └── 1..N SeanceFormation (OneToMany)
  └── 0..N Inscription (OneToMany)
  └── 0..N FormationCompetence (OneToMany) → référence Competence service
  └── 0..N Certificate (1 par enseignant inscrit)
  └── 0..1 EvaluationGlobale
  └── 0..N EvaluationFormateur (1 par participant)
  └── 1 Up (ManyToOne)
  └── 1 Dept (ManyToOne)

Domaine
  └── 1..N Competence (OneToMany)

Competence
  └── 0..N SousCompetence (OneToMany, hiérarchique)
  └── 0..N Savoir (direct)
  └── 0..N CompetencePrerequisite

SousCompetence
  └── 0..N Savoir (OneToMany)
  └── 0..N SousCompetence (auto-référence, sous-niveaux)

Savoir
  └── 0..N EnseignantCompetence (via savoir_id)
```

**Dépendances inter-services (via HTTP) :**

```
Formation ──(REST)──► Competence   (validation FormationCompetence)
Analyse   ──(REST)──► Formation    (historique formations)
Analyse   ──(REST)──► Competence   (niveaux enseignant)
Analyse   ──(REST)──► Certificat   (attestations)
Analyse   ──(REST)──► Auth         (identité enseignant)
Formation ──(AMQP)──► Certificat   (génération auto après achèvement)
BesoinFormation ─(AMQP)──► Formation (création après approbation)
```

---

## 6. Endpoints GET proposés

> Tous les endpoints sont accessibles via l'API Gateway : `https://<gateway-host>/api/v1/...`  
> Authentification : Bearer Token JWT dans l'en-tête `Authorization`.

---

### 6.1 Annuaire enseignants

**Service :** `esprit-authentification` (8085)

| # | Endpoint | Description | Rôles autorisés | Pagination |
|---|----------|-------------|-----------------|-----------|
| A-01 | `GET /api/v1/account/list-accounts` | Liste paginée de tous les comptes | ADMIN, D2F, DSI | ✅ |
| A-02 | `GET /api/v1/account/profile` | Profil du compte authentifié | Tous (self) | ✗ |
| A-03 | `GET /api/v1/account/profile/{username}` | Profil d'un compte par username | ADMIN, D2F, CUP, CHEF_DEPARTEMENT | ✗ |

**Paramètres de filtrage — A-01 :**

| Paramètre | Type | Description |
|-----------|------|-------------|
| `role` | `String` | Filtrer par rôle (ex: `ENSEIGNANT`) |
| `disabled` | `Boolean` | Filtrer les comptes actifs/inactifs |
| `page` | `Integer` | Numéro de page (défaut: 0) |
| `size` | `Integer` | Taille de page (défaut: 20, max: 100) |
| `sort` | `String` | Tri (ex: `lastName,asc`) |

---

### 6.2 Besoins de formation

**Service :** `esprit-besoin-formation` (8004)

| # | Endpoint | Description | Rôles autorisés | Pagination |
|---|----------|-------------|-----------------|-----------|
| B-01 | `GET /api/v1/besoins-formations` | Liste paginée de tous les besoins | ADMIN, D2F, CUP, CHEF_DEPARTEMENT | ✅ |
| B-02 | `GET /api/v1/besoins-formations/{id}` | Détail d'un besoin | ADMIN, D2F, CUP, CHEF_DEPARTEMENT, Demandeur | ✗ |
| B-03 | `GET /api/v1/besoins-formations/approved` | Besoins approuvés uniquement | ADMIN, D2F, DSI | ✅ |
| B-04 | `GET /api/v1/besoins-formations/by-up/{up}` | Besoins par unité pédagogique | CUP, ADMIN, D2F | ✅ |
| B-05 | `GET /api/v1/besoins-formations/by-departement/{departement}` | Besoins par département | CHEF_DEPARTEMENT, ADMIN, D2F | ✅ |
| B-06 | `GET /api/v1/besoins-formations/by-priorite` | Besoins triés par priorité | ADMIN, D2F | ✅ |
| B-07 | `GET /api/v1/besoins-formations/by-priorite/{priorite}` | Besoins d'une priorité donnée | ADMIN, D2F | ✅ |

**Paramètres de filtrage — B-01 :**

| Paramètre | Type | Description |
|-----------|------|-------------|
| `typeBesoin` | `TypeBesoin` | INDIVIDUEL, COLLECTIF, ANIMER_UNE_FORMATION |
| `priorite` | `Priorite` | BASSE, MOYENNE, HAUTE, CRITIQUE |
| `periodCode` | `PeriodCode` | P1, P2, P3, P4, SUMMER, WINTER, OTHER |
| `estOuverte` | `Boolean` | Besoins ouverts seulement |
| `up` | `String` | Code UP |
| `departement` | `String` | Code département |
| `page`, `size`, `sort` | — | Pagination standard |

---

### 6.3 Formations

**Service :** `esprit-formation` (8088)

| # | Endpoint | Description | Rôles autorisés | Pagination |
|---|----------|-------------|-----------------|-----------|
| F-01 | `GET /api/v1/formations` | Liste paginée des formations | Tous (authentifiés) | ✅ |
| F-02 | `GET /api/v1/formations/{id}` | Détail d'une formation | Tous (authentifiés) | ✗ |
| F-03 | `GET /api/v1/formations/{id}/seances` | Séances d'une formation | Tous (authentifiés) | ✅ |
| F-04 | `GET /api/v1/formations/{id}/inscriptions` | Liste des inscrits | ADMIN, D2F, Animateur | ✅ |
| F-05 | `GET /api/v1/formations/{id}/competences` | Compétences ciblées | Tous (authentifiés) | ✗ |
| F-06 | `GET /api/v1/seances/{id}` | Détail d'une séance | Tous (authentifiés) | ✗ |
| F-07 | `GET /api/v1/formations/by-etat/{etat}` | Formations par état | Tous (authentifiés) | ✅ |
| F-08 | `GET /api/v1/formations/by-type/{type}` | Par type (INTERNE/EXTERNE/EN_LIGNE) | Tous (authentifiés) | ✅ |

> **Note :** F-07 et F-08 sont des endpoints **proposés** (non encore confirmés dans le code). L'équipe utilise des paramètres de filtrage sur le endpoint principal F-01.

**Paramètres de filtrage — F-01 :**

| Paramètre | Type | Description |
|-----------|------|-------------|
| `etatFormation` | `EtatFormation` | État de la formation |
| `typeFormation` | `TypeFormation` | INTERNE, EXTERNE, EN_LIGNE |
| `periodCode` | `PeriodCode` | Période académique |
| `dateDebutFrom` | `Date` | Date de début >= |
| `dateDebutTo` | `Date` | Date de début <= |
| `upId` | `String` | Unité pédagogique |
| `departementId` | `String` | Département |
| `inscriptionsOuvertes` | `Boolean` | Formations avec inscriptions ouvertes |
| `page`, `size`, `sort` | — | Pagination standard |

---

### 6.4 Référentiel de compétences

**Service :** `esprit-competence` (8005)

| # | Endpoint | Description | Rôles autorisés | Pagination | Cache |
|---|----------|-------------|-----------------|-----------|-------|
| C-01 | `GET /api/v1/domaines` | Liste paginée des domaines | Tous (authentifiés) | ✅ | ✅ 10 min |
| C-02 | `GET /api/v1/domaines/actifs` | Domaines actifs uniquement | Tous (authentifiés) | ✗ | ✅ 10 min |
| C-03 | `GET /api/v1/domaines/{id}` | Détail d'un domaine | Tous (authentifiés) | ✗ | — |
| C-04 | `GET /api/v1/domaines/code/{code}` | Domaine par code | Tous (authentifiés) | ✗ | — |
| C-05 | `GET /api/v1/domaines/search?keyword=` | Recherche domaines | Tous (authentifiés) | ✅ | — |
| C-06 | `GET /api/v1/competences` | Liste paginée des compétences | Tous (authentifiés) | ✅ | — |
| C-07 | `GET /api/v1/competences/{id}` | Détail d'une compétence | Tous (authentifiés) | ✗ | — |
| C-08 | `GET /api/v1/competences/domaine/{domaineId}` | Compétences d'un domaine | Tous (authentifiés) | ✗ | ✅ 5 min |
| C-09 | `GET /api/v1/competences/search?keyword=` | Recherche compétences | Tous (authentifiés) | ✅ | — |
| C-10 | `GET /api/v1/competences/{id}/enseignants` | Enseignants maîtrisant une compétence | ADMIN, D2F, CUP | ✗ | — |

---

### 6.5 Évaluations

**Service :** `esprit-evaluation` (8087)

| # | Endpoint | Description | Rôles autorisés | Pagination |
|---|----------|-------------|-----------------|-----------|
| E-01 | `GET /api/v1/evaluations` | Liste paginée des évaluations | ADMIN, D2F | ✅ |
| E-02 | `GET /api/v1/evaluations/{id}` | Détail d'une évaluation formateur | ADMIN, D2F, Évaluateur | ✗ |
| E-03 | `GET /api/v1/evaluations/formation/{formationId}/enriched` | Évaluations d'une formation (enrichies) | ADMIN, D2F, Animateur | ✗ |

> **Note :** L'anonymisation des évaluations individuelles est à valider avec la DSI (protection identité évaluateur).

---

### 6.6 Certificats

**Service :** `esprit-certificat` (8086)

| # | Endpoint | Description | Rôles autorisés | Pagination |
|---|----------|-------------|-----------------|-----------|
| K-01 | `GET /api/v1/certificates` | Liste paginée de tous les certificats | ADMIN, D2F, DSI | ✅ |
| K-02 | `GET /api/v1/certificates/formation/{formationId}` | Certificats d'une formation | ADMIN, D2F, Animateur | ✗ |
| K-03 | `GET /api/v1/certificates/enseignant/{enseignantId}` | Certificats d'un enseignant | ADMIN, D2F, Enseignant (self) | ✗ |
| K-04 | `GET /api/v1/certificates/email` | Mes certificats (via JWT) | ENSEIGNANT | ✗ |

---

### 6.7 Passeport de compétences

**Service :** `esprit-analyse` (8089)

| # | Endpoint | Description | Rôles autorisés | Format |
|---|----------|-------------|-----------------|--------|
| P-01 | `GET /api/v1/skill-passports/me` | Mon passeport (PDF) | ENSEIGNANT | `application/pdf` |
| P-02 | `GET /api/v1/skill-passports/me/json` | Mon passeport (JSON) | ENSEIGNANT | `application/json` |
| P-03 | `GET /api/v1/skill-passports/teacher/{username}` | Passeport d'un enseignant (PDF) | ADMIN, D2F, CUP | `application/pdf` |
| P-04 | `GET /api/v1/skill-passports/teacher/{username}/json` | Passeport d'un enseignant (JSON) | ADMIN, D2F, CUP | `application/json` |

---

## 7. Règles de gestion

### 7.1 Cycle de vie d'un besoin de formation

```
Saisie (ENSEIGNANT)
  │
  ▼
[approuveChefDep = null] ──► Chef Département approuve/rejette
  │ approuvé
  ▼
[approuveCUP = null] ──► CUP approuve/rejette
  │ approuvé
  ▼
[approuveAdmin = null] ──► Administrateur D2F valide
  │ approuvé
  ▼
Formation créée (eventPublished = true)
```

**Règle :** Un besoin est considéré "approuvé" uniquement si les trois booléens `approuveChefDep`, `approuveCUP` et `approuveAdmin` sont à `true`. Un seul `false` suffit à le rejeter.

### 7.2 Cycle de vie d'une formation

```
NOUVEAU → ENREGISTRE → PLANIFIE → EN_COURS → ACHEVE
                                          └──► ANNULE (depuis tout état)
ENREGISTRE → VISIBLE (publication)
```

**Règles :**
- La transition vers `EN_COURS` nécessite `dateDebut` <= aujourd'hui.
- La transition vers `ACHEVE` déclenche la génération automatique des certificats (`certifGenerated = false → true`).
- Une formation à l'état `VISIBLE` est accessible en lecture par tous les enseignants authentifiés.

### 7.3 Règles sur les savoirs

- Un `Savoir` est attaché **soit** à une `Competence` directement, **soit** à une `SousCompetence` — les deux FK ne peuvent pas être renseignées simultanément (contrainte applicative).
- Un enseignant ne peut avoir qu'un seul niveau par savoir (contrainte UNIQUE sur `(enseignantId, savoirId)`).

### 7.4 Règles sur les certificats

- Un certificat est généré automatiquement pour chaque enseignant avec une inscription `APPROVED` quand la formation passe à l'état `ACHEVE`.
- Le champ `delivered` passe à `true` lors de la remise physique/numérique du document.

### 7.5 Règles de pagination

- Taille de page par défaut : **20**
- Taille maximale autorisée : **100**
- Page par défaut : **0** (indexation zéro)
- Tri par défaut : **`id,desc`** (entités les plus récentes en premier)

---

## 8. Sécurité et contrôle d'accès

### 8.1 Mécanisme d'authentification

| Mécanisme | Détails |
|-----------|---------|
| Protocole | JWT Bearer Token (RFC 7519) |
| En-tête | `Authorization: Bearer <token>` |
| Validation | Effectuée par l'API Gateway avant routage |
| Expiration | À confirmer avec l'équipe sécurité |

### 8.2 Matrice des accès par rôle

| Endpoint | ENSEIGNANT | FORMATEUR | CUP | CHEF_DEP | D2F | ADMIN | DSI (❓) |
|----------|-----------|-----------|-----|----------|-----|-------|---------|
| A-01 Liste comptes | ✗ | ✗ | ✗ | ✗ | ✅ | ✅ | ✅ |
| A-02 Mon profil | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| A-03 Profil tiers | ✗ | ✗ | ✅ | ✅ | ✅ | ✅ | ✅ |
| B-01 Liste besoins | ✗ | ✗ | ✅ | ✅ | ✅ | ✅ | ✅ |
| B-04 Besoins/UP | ✗ | ✗ | ✅ (son UP) | ✗ | ✅ | ✅ | ✅ |
| F-01 Liste formations | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| F-04 Inscrits | ✗ | ✅ (ses formations) | ✗ | ✗ | ✅ | ✅ | ✅ |
| C-01 Domaines | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| C-10 Enseignants/Compétence | ✗ | ✗ | ✅ | ✗ | ✅ | ✅ | ✅ |
| E-01 Évaluations | ✗ | ✗ | ✗ | ✗ | ✅ | ✅ | ✅ |
| K-04 Mes certificats | ✅ | ✅ | ✗ | ✗ | ✗ | ✗ | ✗ |
| P-01/P-02 Mon passeport | ✅ | ✅ | ✗ | ✗ | ✗ | ✗ | ✗ |
| P-03/P-04 Passeport tiers | ✗ | ✗ | ✅ | ✗ | ✅ | ✅ | ✅ |

> ❓ **Le rôle DSI n'existe pas dans le code actuel.** Il est à créer lors de l'intégration. Ses permissions devront être définies avec la DSI ESPRIT.

### 8.3 Rate limiting (API Gateway)

| Endpoint | Limite | Fenêtre |
|----------|--------|---------|
| `POST /api/v1/account/login` | 5 requêtes | 1 minute |
| `POST /api/v1/account/forgot-password` | 3 requêtes | 5 minutes |
| Tous les autres | 20 requêtes | 1 minute |

### 8.4 Circuit Breaker

Le service `esprit-analyse` (passeport) utilise un profil circuit breaker spécifique adapté aux services IA (délai de réponse plus long). En cas de coupure, l'API Gateway retourne une réponse de fallback (`503 Service Unavailable`).

---

## 9. Format standard des erreurs

Toutes les erreurs sont retournées avec le format suivant :

```json
{
  "timestamp": "2026-05-20T10:30:00.000+00:00",
  "status": 404,
  "error": "Not Found",
  "message": "Formation introuvable : id=99",
  "path": "/api/v1/formations/99"
}
```

### 9.1 Codes HTTP utilisés

| Code | Situation |
|------|-----------|
| `200 OK` | Succès |
| `400 Bad Request` | Paramètres invalides (page négative, enum inconnu, etc.) |
| `401 Unauthorized` | Token JWT absent ou expiré |
| `403 Forbidden` | Authentifié mais rôle insuffisant |
| `404 Not Found` | Ressource inexistante |
| `429 Too Many Requests` | Rate limit dépassé |
| `503 Service Unavailable` | Circuit breaker ouvert (service indisponible) |

### 9.2 Erreurs de validation

```json
{
  "timestamp": "2026-05-20T10:30:00.000+00:00",
  "status": 400,
  "error": "Validation Failed",
  "violations": [
    {
      "field": "size",
      "message": "La taille de page ne peut pas dépasser 100"
    }
  ],
  "path": "/api/v1/formations"
}
```

---

## 10. Pagination, tri et recherche

### 10.1 Paramètres de pagination standard (Spring Pageable)

| Paramètre | Type | Valeur par défaut | Description |
|-----------|------|-------------------|-------------|
| `page` | `Integer` | `0` | Numéro de page (0-based) |
| `size` | `Integer` | `20` | Nombre d'éléments par page (max 100) |
| `sort` | `String` | `id,desc` | Tri : `champ,direction` (asc/desc) |

**Exemple :**
```
GET /api/v1/formations?page=2&size=10&sort=dateDebut,desc
```

### 10.2 Tri multi-champs

```
GET /api/v1/formations?sort=etatFormation,asc&sort=dateDebut,desc
```

### 10.3 Recherche textuelle

Pour les endpoints supportant `?keyword=` :

- Recherche insensible à la casse
- Recherche sur les champs `nom`, `code`, `description` (selon l'entité)
- Recherche partielle (contient)

```
GET /api/v1/competences/search?keyword=java&page=0&size=20
GET /api/v1/domaines/search?keyword=informatique
```

### 10.4 Format de réponse paginée

```json
{
  "content": [...],
  "pageable": {
    "sort": { "sorted": true, "unsorted": false },
    "pageNumber": 0,
    "pageSize": 20,
    "offset": 0
  },
  "totalPages": 8,
  "totalElements": 154,
  "last": false,
  "first": true,
  "numberOfElements": 20,
  "empty": false
}
```

---

## 11. Données sensibles — politique de masquage

### 11.1 Champs exclus de l'API publique

| Champ | Entité | Raison d'exclusion |
|-------|--------|-------------------|
| `password` | User | Hash cryptographique — sécurité absolue |
| `failedLoginAttempts` | User | Donnée de sécurité interne |
| `lockUntil` | User | Donnée de sécurité interne |
| `deviceIds` | User | Données techniques, vie privée |
| `mailEnseignant` | Certificate | Email personnel — RGPD |
| `pdfFilePath` | Certificate | Chemin serveur interne |
| `onlineMeetingUrl` | SeanceFormation | URL Teams — usage interne |
| `calendarEventId` | SeanceFormation | Identifiant interne |
| `notificationMessage` | BesoinFormation | Usage interne workflow |

### 11.2 Champs à accès restreint (rôle ADMIN/D2F uniquement)

| Champ | Entité | Justification |
|-------|--------|--------------|
| `coutFormation` | Formation | Données budgétaires |
| `coutTransport` | Formation | Données budgétaires |
| `coutHebergement` | Formation | Données budgétaires |
| `coutRepas` | Formation | Données budgétaires |
| `externeFormateurEmail` | Formation | Email externe — RGPD |
| `commentaire` | EvaluationFormateur | Anonymat évaluateur |

### 11.3 Conformité RGPD

- Les emails (institutionnels et personnels) ne doivent pas être exposés sans justification métier documentée.
- Les données de connexion (tentatives, blocage) ne doivent jamais quitter le service d'authentification.
- ❓ **À valider avec la DSI :** politique de rétention des logs d'audit (`AuditLog`), durée de conservation des évaluations nominatives.

---

## 12. Statut de validation des données

### 12.1 Données confirmées par le code source

| Entité | Service | Fichiers sources |
|--------|---------|-----------------|
| User, Role, AuditLog | esprit-authentification | `User.java`, `Role.java`, `AuditLog.java` |
| BesoinFormation | esprit-besoin-formation | `BesoinFormation.java` |
| Formation, SeanceFormation, Inscription | esprit-formation | `Formation.java`, `SeanceFormation.java` |
| Domaine, Competence, SousCompetence, Savoir | esprit-competence | `Domaine.java`, `Competence.java`, `SousCompetence.java`, `Savoir.java` |
| EnseignantCompetence | esprit-competence | `EnseignantCompetence.java` |
| EvaluationFormateur, EvaluationGlobale | esprit-evaluation | `EvaluationFormateur.java`, `EvaluationGlobale.java` |
| Certificate | esprit-certificat | `Certificate.java` |
| TeacherSkillPassportDTO | esprit-analyse | DTO (pas d'entité JPA) |

---

# Section 2 — Résumé exécutif (pour e-mail)

---

**Objet :** D2F – Data Contract API de consultation — Demande de validation DSI

---

Madame, Monsieur,

Dans le cadre du projet **D2F (Développement De Formations)** porté par ESPRIT, nous avons formalisé le **data contract** des APIs en lecture que nous souhaitons exposer à la DSI.

## Ce qui est proposé

La plateforme D2F expose **7 domaines fonctionnels** via une API REST versionnée (`/api/v1/`) :

| Domaine | Endpoints GET | Accès |
|---------|--------------|-------|
| Annuaire enseignants | 3 endpoints | Rôles administratifs |
| Besoins de formation | 7 endpoints | Selon rôle (CUP, Chef Dep., Admin) |
| Formations | 8 endpoints | Tous les authentifiés |
| Référentiel de compétences | 10 endpoints | Tous les authentifiés |
| Évaluations | 3 endpoints | Administrateurs D2F |
| Certificats | 4 endpoints | Selon rôle / self |
| Passeport de compétences | 4 endpoints (PDF + JSON) | Enseignant (self) + Admin |

**Total : 39 endpoints GET proposés**, tous versionnés, paginés, filtrables, sécurisés par JWT.

## Architecture

Tous les appels transitent par l'**API Gateway** (port 8080) qui assure la validation JWT, le rate limiting et la résilience (circuit breaker). La DSI n'a qu'un seul point d'entrée à intégrer.

## Points nécessitant votre validation

Nous sollicitons votre retour sur **5 points bloquants** :

1. **Rôle DSI** : création d'un rôle technique dédié à la DSI dans l'IAM D2F.
2. **Données budgétaires** : confirmation de l'accès aux coûts de formation pour la DSI.
3. **Référentiel UP/Départements** : synchronisation avec le SI RH ESPRIT (source de vérité).
4. **RGPD** : politique de rétention des logs d'audit et anonymisation des évaluations.
5. **Authentification DSI** : le système de tokens JWT est-il compatible avec le SSO ESPRIT ?

Le document complet de spécification (40 pages, format Markdown/PDF) est disponible sur demande.

Nous restons disponibles pour toute réunion de validation.

Cordialement,  
Équipe PFE D2F — ESPRIT

---

*Fin du document — Spécification de données API de consultation ESPRIT v1.0*  
*Généré le 20 mai 2026 — Équipe PFE D2F*
