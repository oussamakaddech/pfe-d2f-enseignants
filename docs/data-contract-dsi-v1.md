# Spécification de données — API de consultation ESPRIT
## Data Contract v1.0 — Plateforme D2F (Développement De Formations)

---

**Document :** Data Contract – Endpoints GET exposés à la DSI  
**Version :** 1.0  
**Date :** 20 mai 2026  
**Émetteur :** Équipe PFE D2F — ESPRIT  
**Destinataire :** DSI ESPRIT  

---

## Objet

Afin de permettre la mise en place de l'API de consultation, nous définissons ci-dessous la **spécification de données (data contract)** de la plateforme D2F. Ce document présente les entités métier, leurs champs, les relations entre elles, les règles de gestion associées, ainsi que les endpoints GET proposés pour exposition derrière l'API Gateway.

Seules des **opérations en lecture (GET)** sont couvertes dans ce contrat.

---

## 1. Architecture d'accès

Tous les appels transitent par un point d'entrée unique :

```
DSI / Applications externes
         │
         ▼
  API Gateway  —  https://<host>/api/v1/...
  ├── Validation JWT (Bearer Token)
  ├── Rate Limiting
  └── Circuit Breaker
         │
         ├── /api/v1/account/**              → Service Authentification
         ├── /api/v1/besoins-formations/**   → Service Besoin de Formation
         ├── /api/v1/formations/**           → Service Formation
         ├── /api/v1/seances/**              → Service Formation
         ├── /api/v1/domaines/**             → Service Compétence
         ├── /api/v1/competences/**          → Service Compétence
         ├── /api/v1/evaluations/**          → Service Évaluation
         └── /api/v1/certificates/**         → Service Certificat
```

---

## 2. Entités métier et champs

---

### 2.1 Utilisateur (`User`)

| Champ | Type | Description |
|-------|------|-------------|
| `id` | `String` (UUID) | Identifiant unique |
| `username` | `String` | Login institutionnel (max 20, unique) |
| `firstName` | `String` | Prénom |
| `lastName` | `String` | Nom de famille |
| `email` | `String` | Adresse e-mail (max 50, unique) |
| `roles` | `List<String>` | Rôles attribués |
| `disabled` | `Boolean` | Compte actif (`false`) ou désactivé (`true`) |

**Rôles disponibles (`ERole`) :**

| Valeur | Description |
|--------|-------------|
| `ADMIN` | Administrateur plateforme |
| `CUP` | Coordinateur Unité Pédagogique |
| `D2F` | Gestionnaire D2F |
| `ENSEIGNANT` | Enseignant |
| `ANIMATEUR` | Animateur de formation (interne ou externe) |
| `CHEF_DEPARTEMENT` | Chef de département |
| `RESPONSABLE_DOSSIER` | Responsable dossier RH |

---

### 2.2 Besoin de formation (`BesoinFormation`)

| Champ | Type | Description |
|-------|------|-------------|
| `idBesoinFormation` | `Long` | Identifiant unique |
| `username` | `String` | Identifiant du demandeur |
| `typeBesoin` | `Enum` | `INDIVIDUEL`, `COLLECTIF`, `ANIMER_UNE_FORMATION` |
| `titre` | `String` | Intitulé du besoin |
| `theme` | `String` | Thème pédagogique |
| `objectifFormation` | `String` | Objectif général |
| `objectifsOperationnels` | `String` | Objectifs opérationnels |
| `objectifsPedagogiques` | `String` | Objectifs pédagogiques |
| `publicCible` | `String` | Population visée |
| `nbMaxParticipants` | `Integer` | Nombre maximum de participants |
| `dureeFormation` | `Integer` | Durée en heures |
| `priorite` | `Enum` | `BASSE`, `MOYENNE`, `HAUTE`, `CRITIQUE` |
| `impactStrategique` | `String` | Justification stratégique |
| `up` | `String` | Code unité pédagogique |
| `departement` | `String` | Code département |
| `periodCode` | `Enum` | `P1`, `P2`, `P3`, `P4`, `SUMMER`, `WINTER`, `OTHER` |
| `approuveCUP` | `Boolean` | Validation CUP (`null` = en attente) |
| `approuveChefDep` | `Boolean` | Validation Chef Département (`null` = en attente) |
| `approuveAdmin` | `Boolean` | Validation Administrateur (`null` = en attente) |
| `estOuverte` | `Boolean` | Besoin visible par les candidats |
| `lastRefreshDate` | `LocalDateTime` | Date de dernière mise à jour |

---

### 2.3 Formation (`Formation`)

| Champ | Type | Description |
|-------|------|-------------|
| `idFormation` | `Long` | Identifiant unique |
| `titreFormation` | `String` | Titre de la formation |
| `typeFormation` | `Enum` | `INTERNE`, `EXTERNE`, `EN_LIGNE` |
| `etatFormation` | `Enum` | État de la formation (voir tableau `EtatFormation`) |
| `dateDebut` | `Date` | Date de début |
| `dateFin` | `Date` | Date de fin |
| `objectifs` | `String` | Objectifs généraux (max 2000) |
| `objectifsPedago` | `String` | Objectifs pédagogiques (max 2000) |
| `populationCible` | `String` | Audience visée |
| `chargeHoraireGlobal` | `Integer` | Durée totale en heures |
| `prerequis` | `String` | Prérequis (max 2000) |
| `acquis` | `String` | Acquis attendus (max 2000) |
| `animateurs` | `List<EnseignantRef>` | Animateurs internes ESPRIT (id, nom, prénom, UP) |
| `organismeRefExterne` | `String` | Organisme prestataire (si externe) |
| `inscriptionsOuvertes` | `Boolean` | Inscriptions ouvertes |
| `certifGenerated` | `Boolean` | Attestations générées |
| `periodCode` | `Enum` | Période académique |
| `up` | `Object` | Unité pédagogique (id, libelle) |
| `departement` | `Object` | Département (id, libelle) |
| `idBesoinFormation` | `Long` | Référence au besoin d'origine |

#### Types d'animateurs

La plateforme D2F distingue deux types d'animateurs selon la valeur de `typeFormation` :

| Type | `typeFormation` | Champs utilisés | Description |
|------|----------------|-----------------|-------------|
| **Interne** | `INTERNE` ou `EN_LIGNE` | `animateurs` (List) | Enseignant(e)s ESPRIT identifiés par leur matricule. Relation ManyToMany avec la formation. |
| **Externe** | `EXTERNE` | `externeFormateurNom`, `externeFormateurPrenom`, `externeFormateurEmail`, `organismeRefExterne` | Intervenant extérieur à ESPRIT. Données stockées en clair dans la formation. |

> Les champs `externeFormateurNom`, `externeFormateurPrenom` sont accessibles aux rôles ADMIN et D2F uniquement. `externeFormateurEmail` est masqué (RGPD).

**États de la formation (`EtatFormation`) :**

| Valeur | Description |
|--------|-------------|
| `NOUVEAU` | Saisie initiale |
| `ENREGISTRE` | Validé, non planifié |
| `PLANIFIE` | Dates définies |
| `EN_COURS` | En déroulement |
| `ACHEVE` | Terminée |
| `ANNULE` | Annulée |
| `VISIBLE` | Publiée et accessible aux enseignants |

---

### 2.4 Séance (`SeanceFormation`)

| Champ | Type | Description |
|-------|------|-------------|
| `idSeance` | `Long` | Identifiant unique |
| `idFormation` | `Long` | Formation parente |
| `dateSeance` | `Date` | Date de la séance |
| `heureDebut` | `Time` | Heure de début |
| `heureFin` | `Time` | Heure de fin |
| `typeSeance` | `Enum` | `THEORIQUE`, `PRATIQUE`, `MIXTE` |
| `contenus` | `String` | Contenus de la séance (max 2000) |
| `methodes` | `String` | Méthodes pédagogiques (max 2000) |
| `dureeTheorique` | `Float` | Heures théoriques |
| `dureePratique` | `Float` | Heures pratiques |
| `salle` | `String` | Salle ou lieu |

---

### 2.5 Domaine de compétence (`Domaine`)

| Champ | Type | Description |
|-------|------|-------------|
| `id` | `Long` | Identifiant unique |
| `code` | `String` | Code unique du domaine |
| `nom` | `String` | Libellé |
| `description` | `String` | Description |
| `actif` | `Boolean` | Domaine actif dans le référentiel |
| `nbCompetences` | `Integer` | Nombre de compétences associées |

---

### 2.6 Compétence (`Competence`)

| Champ | Type | Description |
|-------|------|-------------|
| `id` | `Long` | Identifiant unique |
| `code` | `String` | Code unique |
| `nom` | `String` | Libellé |
| `description` | `String` | Description |
| `prerequisiteManual` | `String` | Prérequis textuels |
| `ordre` | `Integer` | Ordre d'affichage |
| `domaineId` | `Long` | Domaine parent |
| `domaineNom` | `String` | Libellé du domaine parent |

---

### 2.7 Sous-compétence (`SousCompetence`)

| Champ | Type | Description |
|-------|------|-------------|
| `id` | `Long` | Identifiant unique |
| `code` | `String` | Code unique |
| `nom` | `String` | Libellé |
| `description` | `String` | Description |
| `niveau` | `Integer` | Niveau hiérarchique (1 = premier niveau) |
| `competenceId` | `Long` | Compétence parente |
| `parentId` | `Long` | Sous-compétence parente (hiérarchie) |

---

### 2.8 Savoir (`Savoir`)

| Champ | Type | Description |
|-------|------|-------------|
| `id` | `Long` | Identifiant unique |
| `code` | `String` | Code unique |
| `nom` | `String` | Libellé |
| `description` | `String` | Description |
| `type` | `Enum` | `THEORIQUE` ou `PRATIQUE` |
| `niveau` | `NiveauMaitrise` | Niveau de référence (N1 à N5) |
| `competenceId` | `Long` | Compétence parente (exclusif avec sousCompetenceId) |
| `sousCompetenceId` | `Long` | Sous-compétence parente (exclusif avec competenceId) |

**Niveaux de maîtrise (`NiveauMaitrise`) :**

| Valeur | Libellé |
|--------|---------|
| `N1_DEBUTANT` | Débutant |
| `N2_ELEMENTAIRE` | Élémentaire |
| `N3_INTERMEDIAIRE` | Intermédiaire |
| `N4_AVANCE` | Avancé |
| `N5_EXPERT` | Expert |

---

### 2.9 Compétence d'un enseignant (`EnseignantCompetence`)

| Champ | Type | Description |
|-------|------|-------------|
| `id` | `Long` | Identifiant unique |
| `enseignantId` | `String` | Identifiant de l'enseignant |
| `savoirId` | `Long` | Savoir concerné |
| `savoirNom` | `String` | Libellé du savoir |
| `niveau` | `NiveauMaitrise` | Niveau déclaré (N1 à N5) |
| `dateAcquisition` | `LocalDate` | Date d'acquisition |
| `commentaire` | `String` | Commentaire libre |

---

### 2.10 Évaluation formateur (`EvaluationFormateur`)

| Champ | Type | Description |
|-------|------|-------------|
| `idEvalParticipant` | `Long` | Identifiant unique |
| `formationId` | `Long` | Formation évaluée |
| `enseignantId` | `String` | Évaluateur |
| `note` | `Float` | Note attribuée |
| `satisfaisant` | `Boolean` | Appréciation globale |

---

### 2.11 Évaluation globale (`EvaluationGlobale`)

| Champ | Type | Description |
|-------|------|-------------|
| `idEvalGlobale` | `Long` | Identifiant unique |
| `formationId` | `Long` | Formation concernée (unique) |
| `noteGlobale` | `Float` | Note globale calculée |
| `recommandation` | `String` | Recommandation (max 100) |
| `dateEvaluation` | `LocalDate` | Date de l'évaluation |

---

### 2.12 Certificat (`Certificate`)

| Champ | Type | Description |
|-------|------|-------------|
| `idCertificate` | `Long` | Identifiant unique |
| `formationId` | `Long` | Formation concernée |
| `titreFormation` | `String` | Titre de la formation |
| `typeCertif` | `String` | Type : `CERTIF`, `BADGE`, `ATTESTATION` |
| `dateDebutFormation` | `LocalDate` | Date de début formation |
| `dateFinFormation` | `LocalDate` | Date de fin formation |
| `chargeHoraireGlobal` | `Integer` | Durée totale en heures |
| `enseignantId` | `String` | Bénéficiaire |
| `nomEnseignant` | `String` | Nom |
| `prenomEnseignant` | `String` | Prénom |
| `deptEnseignant` | `String` | Département de l'enseignant |
| `roleEnFormation` | `String` | Rôle tenu (ex. `ANIMATEUR`) |
| `delivered` | `Boolean` | Attestation remise |

---

## 3. Relations entre entités

```
User
  ├── 0..N  EnseignantCompetence    (via enseignantId)
  ├── 0..N  Formation               (comme animateur)
  ├── 0..N  Inscription             (via enseignantId)
  ├── 0..N  Certificate             (via enseignantId)
  └── 0..N  BesoinFormation         (via username)

BesoinFormation
  └── 0..1  Formation               (idBesoinFormation = origine)

Formation
  ├── 1..N  SeanceFormation         (séances)
  ├── 0..N  Inscription             (inscrits)
  ├── 0..N  FormationCompetence     (compétences ciblées)
  ├── 0..N  Certificate             (1 par inscrit)
  ├── 0..1  EvaluationGlobale
  ├── 0..N  EvaluationFormateur     (1 par participant)
  ├── 1     Up                      (unité pédagogique)
  └── 1     Dept                    (département)

Domaine
  └── 1..N  Competence

Competence
  ├── 0..N  SousCompetence          (hiérarchie)
  ├── 0..N  Savoir                  (savoirs directs)
  └── 0..N  CompetencePrerequisite  (prérequis)

SousCompetence
  ├── 0..N  Savoir
  └── 0..N  SousCompetence          (sous-niveaux)

Savoir
  └── 0..N  EnseignantCompetence    (niveaux par enseignant)
```

---

## 4. Règles de gestion

### 4.1 Règle d'unicité — Savoir

Un `Savoir` est rattaché **soit** à une `Competence`, **soit** à une `SousCompetence` — jamais les deux simultanément.

### 4.2 Règle d'unicité — Niveau enseignant

Un enseignant ne peut avoir qu'un seul niveau de maîtrise par savoir. La contrainte `(enseignantId, savoirId)` est unique.

### 4.3 Génération des certificats

Un certificat est créé automatiquement pour chaque enseignant dont l'inscription est à l'état `APPROVED` lorsque la formation passe à l'état `ACHEVE`. Le champ `delivered` est mis à `true` lors de la remise effective.

---

## 5. Endpoints GET proposés

Tous les endpoints sont versionnés `/api/v1/`, paginés, filtrables et sécurisés par JWT.

### 5.1 Annuaire enseignants

| Endpoint | Description | Rôles |
|----------|-------------|-------|
| `GET /api/v1/account/list-accounts` | Liste paginée des comptes | ADMIN, D2F |
| `GET /api/v1/account/profile` | Profil du compte connecté | Tous |
| `GET /api/v1/account/profile/{username}` | Profil d'un compte | ADMIN, D2F, CUP, CHEF_DEPARTEMENT |

### 5.2 Besoins de formation

| Endpoint | Description | Rôles |
|----------|-------------|-------|
| `GET /api/v1/besoins-formations` | Liste paginée | ADMIN, D2F, CUP, CHEF_DEPARTEMENT |
| `GET /api/v1/besoins-formations/{id}` | Détail | ADMIN, D2F, CUP, demandeur |
| `GET /api/v1/besoins-formations/approved` | Besoins approuvés | ADMIN, D2F |
| `GET /api/v1/besoins-formations/by-up/{up}` | Par unité pédagogique | CUP, ADMIN, D2F |
| `GET /api/v1/besoins-formations/by-departement/{dep}` | Par département | CHEF_DEPARTEMENT, ADMIN, D2F |
| `GET /api/v1/besoins-formations/by-priorite/{priorite}` | Par niveau de priorité | ADMIN, D2F |

### 5.3 Formations

| Endpoint | Description | Rôles |
|----------|-------------|-------|
| `GET /api/v1/formations` | Liste paginée | Tous (authentifiés) |
| `GET /api/v1/formations/{id}` | Détail | Tous (authentifiés) |
| `GET /api/v1/formations/{id}/seances` | Séances d'une formation | Tous (authentifiés) |
| `GET /api/v1/formations/{id}/inscriptions` | Liste des inscrits | ADMIN, D2F, Animateur |
| `GET /api/v1/formations/{id}/competences` | Compétences ciblées | Tous (authentifiés) |
| `GET /api/v1/seances/{id}` | Détail d'une séance | Tous (authentifiés) |

### 5.4 Référentiel de compétences

| Endpoint | Description | Rôles | Cache |
|----------|-------------|-------|-------|
| `GET /api/v1/domaines` | Liste paginée des domaines | Tous | 10 min |
| `GET /api/v1/domaines/actifs` | Domaines actifs | Tous | 10 min |
| `GET /api/v1/domaines/{id}` | Détail d'un domaine | Tous | — |
| `GET /api/v1/domaines/code/{code}` | Domaine par code | Tous | — |
| `GET /api/v1/domaines/search?keyword=` | Recherche | Tous | — |
| `GET /api/v1/competences` | Liste paginée | Tous | — |
| `GET /api/v1/competences/{id}` | Détail | Tous | — |
| `GET /api/v1/competences/domaine/{domaineId}` | Par domaine | Tous | 5 min |
| `GET /api/v1/competences/search?keyword=` | Recherche | Tous | — |
| `GET /api/v1/competences/{id}/enseignants` | Enseignants par compétence | ADMIN, D2F, CUP | — |

### 5.5 Évaluations

| Endpoint | Description | Rôles |
|----------|-------------|-------|
| `GET /api/v1/evaluations` | Liste paginée | ADMIN, D2F |
| `GET /api/v1/evaluations/{id}` | Détail | ADMIN, D2F |
| `GET /api/v1/evaluations/formation/{formationId}/enriched` | Évaluations d'une formation | ADMIN, D2F, Animateur |

### 5.6 Certificats

| Endpoint | Description | Rôles |
|----------|-------------|-------|
| `GET /api/v1/certificates` | Liste paginée | ADMIN, D2F |
| `GET /api/v1/certificates/formation/{formationId}` | Par formation | ADMIN, D2F, Animateur |
| `GET /api/v1/certificates/enseignant/{enseignantId}` | Par enseignant | ADMIN, D2F, enseignant (self) |
| `GET /api/v1/certificates/email` | Mes certificats (JWT) | ENSEIGNANT |

---

## 6. Sécurité

### 6.1 Authentification

| Paramètre | Valeur |
|-----------|--------|
| Protocole | JWT Bearer Token (RFC 7519) |
| En-tête | `Authorization: Bearer <token>` |
| Validation | API Gateway (avant tout routage) |

### 6.2 Rate limiting

| Périmètre | Limite |
|-----------|--------|
| Authentification | 5 requêtes / minute |
| Réinitialisation mot de passe | 3 requêtes / 5 minutes |
| Tous les autres endpoints | 20 requêtes / minute |

### 6.3 Données non exposées

Les champs suivants sont exclus de toutes les réponses API :

| Champ | Entité | Motif |
|-------|--------|-------|
| `password` | User | Sécurité — hash cryptographique |
| `failedLoginAttempts` | User | Données de sécurité interne |
| `lockUntil` | User | Données de sécurité interne |
| `mailEnseignant` | Certificate | RGPD — email personnel |
| `onlineMeetingUrl` | SeanceFormation | URL interne (Teams) |
| `pdfFilePath` | Certificate | Chemin serveur interne |

---

## 7. Pagination, tri et recherche

### Paramètres standard (tous les endpoints de liste)

| Paramètre | Type | Défaut | Description |
|-----------|------|--------|-------------|
| `page` | `Integer` | `0` | Numéro de page (0-based) |
| `size` | `Integer` | `20` | Éléments par page (max 100) |
| `sort` | `String` | `id,desc` | Tri : `champ,asc` ou `champ,desc` |

**Exemple :**
```
GET /api/v1/formations?page=0&size=20&sort=dateDebut,desc&etatFormation=PLANIFIE
```

### Format de réponse paginée

```json
{
  "content": [ ... ],
  "totalElements": 154,
  "totalPages": 8,
  "number": 0,
  "size": 20,
  "first": true,
  "last": false
}
```

### Filtres disponibles — Formations

| Paramètre | Type | Description |
|-----------|------|-------------|
| `etatFormation` | `EtatFormation` | État de la formation |
| `typeFormation` | `TypeFormation` | INTERNE, EXTERNE, EN_LIGNE |
| `periodCode` | `PeriodCode` | P1, P2, P3, P4, SUMMER, WINTER, OTHER |
| `inscriptionsOuvertes` | `Boolean` | Inscriptions ouvertes uniquement |
| `upId` | `String` | Filtrer par unité pédagogique |
| `departementId` | `String` | Filtrer par département |

### Filtres disponibles — Besoins de formation

| Paramètre | Type | Description |
|-----------|------|-------------|
| `typeBesoin` | `TypeBesoin` | INDIVIDUEL, COLLECTIF, ANIMER_UNE_FORMATION |
| `priorite` | `Priorite` | BASSE, MOYENNE, HAUTE, CRITIQUE |
| `periodCode` | `PeriodCode` | Période académique |
| `up` | `String` | Unité pédagogique |
| `departement` | `String` | Département |

---

## 8. Format standard des erreurs

```json
{
  "timestamp": "2026-05-20T10:30:00.000+00:00",
  "status": 404,
  "error": "Not Found",
  "message": "Formation introuvable : id=99",
  "path": "/api/v1/formations/99"
}
```

| Code HTTP | Signification |
|-----------|--------------|
| `200` | Succès |
| `400` | Paramètre invalide |
| `401` | Token JWT absent ou expiré |
| `403` | Rôle insuffisant |
| `404` | Ressource introuvable |
| `429` | Trop de requêtes (rate limit) |
| `503` | Service temporairement indisponible |

---

*Document émis par l'équipe PFE D2F — ESPRIT — Mai 2026*
