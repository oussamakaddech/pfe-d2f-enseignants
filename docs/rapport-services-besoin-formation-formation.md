# Rapport Technique: Microservices Besoin-Formation et Formation

**Projet:** PFE D2F Enseignants  
**Date:** 23 Mai 2026  
**Version:** 1.0

---

## Table des Matières
1. Vue d'Ensemble
2. Microservice Besoin-Formation
3. Microservice Formation
4. Comparaison des Architectures
5. Communication Inter-Services
6. Sécurité
7. Base de Données
8. Conclusions

---

## 1. Vue d'Ensemble

L'application PFE D2F Enseignants est une architecture microservices composée de deux services principaux pour la gestion des besoins et formations :

| Aspect | Besoin-Formation | Formation |
|--------|------------------|-----------|
| **Package Base** | `tn.esprit.d2f` | `esprit.pfe.serviceformation` |
| **Artefact** | `BesoinsFormation` | `service-formation` |
| **BDD** | PostgreSQL | PostgreSQL |

---

## 2. Microservice Besoin-Formation

### 2.1 Structure du Projet

```
esprit_D2F-besoin-formation/
├── src/main/java/tn/esprit/d2f/
│   ├── BesoinsFormationApplication.java
│   ├── config/ (SecurityConfig, RabbitMqConfig, etc.)
│   ├── controller/
│   │   ├── AdminController.java
│   │   ├── BesoinCompetenceController.java
│   │   └── BesoinFormationController.java
│   ├── dto/ (BesoinFormationRequest, Response, Events)
│   ├── entity/ (BesoinFormation, BesoinCompetence, Notification)
│   ├── exception/ (GlobalExceptionHandler, ResourceNotFoundException)
│   ├── mapper/ (BesoinFormationMapper)
│   ├── repository/ (BesoinFormationRepository, etc.)
│   └── service/ (IBesoinFormationService, Impl)
```

### 2.2 Entité Principale: BesoinFormation

Champs principaux:
- **Identifiants:** idBesoinFormation, username
- **Type et description:** typeBesoin, titre, theme, objectifFormation
- **Détails pédagogiques:** objectifsOperationnels, objectifsPedagogiques, methodesPedagogiques
- **Cible:** publicCible, nbMaxParticipants, prerequis
- **Planification:** dureeFormation, dateDebut, dateFin, periodCode
- **Organisation:** up, departement
- **Workflow:** approuveCUP, approuveChefDep, approuveAdmin
- **Priorité:** priorite, impactStrategique

### 2.3 Interface Service: IBesoinFormationService

```java
public interface IBesoinFormationService {
    Page<BesoinFormationResponse> retrieveAllBesoinFormations(Pageable pageable);
    BesoinFormationResponse retrieveBesoinFormation(long id);
    BesoinFormationResponse addBesoinFormation(BesoinFormationRequest b);
    void removeBesoinFormation(long id);
    BesoinFormationResponse modifyBesoinFormation(BesoinFormationRequest request);
    BesoinFormationResponse approuverBesoin(Long id);
    Page<BesoinFormationResponse> retrieveApprovedBesoinFormations(Pageable pageable);
    Page<BesoinFormationResponse> retrieveByUp(String up, Pageable pageable);
    Page<BesoinFormationResponse> retrieveByDepartement(String departement, Pageable pageable);
    Page<BesoinFormationResponse> retrieveAllByPriorite(Pageable pageable);
    Page<BesoinFormationResponse> retrieveByPriorite(Priorite priorite, Pageable pageable);
}
```

### 2.4 Endpoints

| Méthode | Endpoint | Description |
|---------|----------|-------------|
| GET | `/api/v1/besoins-formations` | Liste paginée |
| GET | `/api/v1/besoins-formations/{id}` | Détail |
| POST | `/api/v1/besoins-formations` | Créer |
| PUT | `/api/v1/besoins-formations` | Modifier |
| DELETE | `/api/v1/besoins-formations/{id}` | Supprimer |
| PUT | `/api/v1/besoins-formations/{id}/approve` | Approuver |
| GET | `/api/v1/besoins-formations/approved` | Besoins approuvés |
| GET | `/api/v1/besoins-formations/by-up/{up}` | Filtrer par UP |
| GET | `/api/v1/besoins-formations/by-departement/{departement}` | Filtrer par département |
| GET | `/api/v1/besoins-formations/by-priorite` | Tri par priorité |

---

## 3. Microservice Formation

### 3.1 Structure du Projet

```
esprit_D2F-formation/
├── src/main/java/esprit/pfe/serviceformation/
│   ├── ServiceFormationApplication.java
│   ├── config/ (AuditorAwareConfig, FlywayConfig, OpenApiConfig)
│   ├── controllers/ (17+ contrôleurs)
│   │   ├── FormationController.java (CRUD principal)
│   │   ├── FormationWorkflowController.java
│   │   ├── FormationReportController.java
│   │   ├── FormationExportController.java
│   │   ├── InscriptionController.java
│   │   ├── SeanceController.java
│   │   ├── KPIController.java
│   │   ├── EnseignantController.java
│   │   ├── UpController.java, DeptController.java
│   │   └── autres...
│   ├── dto/ (45+ DTOs)
│   ├── entities/ (Formation, Enseignant, Inscription, Seance, etc.)
│   ├── messaging/ (Event listeners et publishers)
│   ├── microsoft/ (OneDrive, Outlook, Graph API)
│   ├── repositories/
│   └── services/
```

### 3.2 Entité Principale: Formation

Champs principaux:
- **Identifiants:** idFormation, idBesoinFormation (lien vers besoin)
- **Informations:** titreFormation, domaine, competence, populationCible
- **Objectifs:** objectifs, objectifsPedago, evalMethods
- **Type:** typeFormation (INTERNE/EXTERNE), externeFormateurNom/Prenom/Email
- **Dates:** dateDebut, dateFin
- **État:** etatFormation (PLANIFIEE, EN_COURS, ANNULEE, ACHEVEE)
- **Budget:** coutTransport, coutHebergement, coutRepas, coutFormation
- **Relations:** seances, animateurs, up, departement, inscriptions

### 3.3 Contrôleurs

| Contrôleur | Fonction |
|------------|----------|
| FormationController | CRUD de base |
| FormationWorkflowController | Workflow formation |
| FormationReportController | Rapports |
| FormationExportController | Export Excel/PDF |
| InscriptionController | Gestion inscriptions |
| SeanceController | Gestion séances |
| KPIController | Indicateurs performance |
| EnseignantController | Gestion enseignants |
| UpController/DeptController | Unités/Départements |

---

## 4. Comparaison des Architectures

### Points Communs

| Aspect | Besoin-Formation | Formation |
|--------|------------------|-----------|
| Framework | Spring Boot 3.4.2 | Spring Boot 3.4.2 |
| Java | 17 | 17 |
| Sécurité | OAuth2 + JWT | OAuth2 + JWT |
| BDD | PostgreSQL + H2 | PostgreSQL + H2 |
| Migration | Flyway | Flyway |
| Documentation | SpringDoc OpenAPI 2.1.0 | SpringDoc OpenAPI 2.1.0 |
| Messaging | RabbitMQ | RabbitMQ |
| Résilience | Resilience4j | Resilience4j |

### Différences

| Aspect | Besoin-Formation | Formation |
|--------|------------------|-----------|
| Contrôleurs | 3 | 17+ |
| Communication | Publish events | Listen + Publish |
| Intégrations | Aucune | Microsoft Graph, OneDrive |
| Feign Clients | Non | Oui |
| Export | Non | Oui (Excel/PDF) |
| Soft Delete | Non | Oui |

---

## 5. Communication Inter-Services

```
Besoin-Formation ──► RabbitMQ ──► Formation
     │                  Event        │
     │ BesoinApprovedEvent          │ Crée Formation
     │                              │ avec idBesoinFormation
     ▼                              ▼
Approval: CUP, ChefDep, Admin
```

**Événements:**
- BesoinFormationApprovedEvent (Besoin → Formation)
- CertificateBatchMessage (Formation → Certificat)
- EvaluationBatchMessage (Formation → Evaluation)

---

## 6. Sécurité

**Rôles:** ROLE_ADMIN, ROLE_CUP, ROLE_D2F, ROLE_RESPONSABLE_DOSSIER

**Autorisations Besoin-Formation:**
- BESOIN_FORMATION_READ_ALL
- BESOIN_FORMATION_CREATE
- BESOIN_FORMATION_UPDATE
- BESOIN_FORMATION_DELETE
- BESOIN_FORMATION_APPROVE

**Autorisations Formation:**
- FORMATION_READ
- FORMATION_CREATE
- FORMATION_UPDATE
- FORMATION_DELETE

---

## 7. Base de Données

### Tables Besoin-Formation
- besoins_formations
- besoins_competences
- notifications

### Tables Formation
- formations
- seances_formations
- inscriptions
- presences
- documents
- formation_competences
- ups, departements, bureaux
- enseignants
- formation_animateur

---

## 8. Conclusions

**Points forts:**
- Architecture modulaire claire
- Communication asynchrone via RabbitMQ
- Sécurité OAuth2/JWT robuste
- Documentation Swagger
- Observabilité (Prometheus, Circuit Breaker)

**Points d'amélioration:**
- Standardiser les packages Java
- Renforcer la couverture de tests
- Implémenter monitoring centralisé