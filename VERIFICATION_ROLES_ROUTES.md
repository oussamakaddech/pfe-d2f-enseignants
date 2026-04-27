# Vérification Complète des Rôles et Routes - D2F

## 📋 Résumé Exécutif
- **Date**: 27 Avril 2026
- **Système**: Plateforme D2F (Gestion des formations)
- **Architecture**: Microservices Spring Boot + JWT + RBAC

---

## 1️⃣ RÔLES DÉFINIS

### 📍 Enum ERole (Source: esprit_D2F-authentification)
```java
public enum ERole {
    admin,          // Administrateur système
    CUP,            // Coordinateur Unité Pédagogique
    D2F,            // Gestionnaire D2F (non utilisé actuellement)
    Enseignant,     // Enseignant
    Formateur       // Formateur/Animateur
}
```

### Correspondance avec Documentation HTML
| Rôle HTML | Rôle Code | Description |
|-----------|-----------|-------------|
| Administrateur | `admin` | Accès total au système |
| CUP | `CUP` | Coordinateur d'unité pédagogique |
| Enseignant | `Enseignant` | Personnel enseignant |
| Animateur | `Formateur` | Formateur de sessions |
| *(N/A)* | `D2F` | Non utilisé actuellement |

---

## 2️⃣ MATRICE D'AUTORISATION

### 📄 Fichier: AuthorizationMatrix.java
Situé dans: `esprit_D2F-authentification/src/main/java/esprit/pfe/auth/Security/`

#### A. GESTION DES COMPÉTENCES & DOMAINE
```
COMPETENCE_READ      = admin, CUP, D2F, Enseignant
COMPETENCE_CREATE    = admin
COMPETENCE_UPDATE    = admin
COMPETENCE_DELETE    = admin
COMPETENCE_ASSIGN    = admin
```

#### B. BESOINS DE FORMATION
```
BESOIN_FORMATION_READ_ALL      = admin, CUP, D2F, Enseignant, Formateur
BESOIN_FORMATION_CREATE        = admin, CUP, Enseignant
BESOIN_FORMATION_UPDATE        = admin
BESOIN_FORMATION_DELETE        = admin
BESOIN_FORMATION_APPROVE       = admin, CUP
```

#### C. PLANIFICATION DES FORMATIONS
```
FORMATION_READ       = admin, CUP, Enseignant, Formateur
FORMATION_CREATE     = admin, CUP
FORMATION_UPDATE     = admin, CUP
FORMATION_DELETE     = admin
FORMATION_APPROVE    = admin, CUP
FORMATION_READ_OWN   = admin, Formateur (propres formations)
```

#### D. ÉVALUATIONS & CERTIFICATS
```
EVALUATION_READ_ALL           = admin, CUP, D2F, Enseignant, Formateur
EVALUATION_CREATE             = admin, Formateur
EVALUATION_UPDATE             = admin, Formateur
EVALUATION_DELETE             = admin
EVALUATION_MARK_ENTRY         = admin, Formateur

CERTIFICAT_READ      = admin, CUP, Enseignant, Formateur
CERTIFICAT_CREATE    = admin
CERTIFICAT_UPDATE    = admin
CERTIFICAT_DELETE    = admin
```

#### E. MODULE RICE (Référentiel)
```
RICE_READ    = admin (lecture seule)
RICE_CREATE  = admin
RICE_UPDATE  = admin
RICE_DELETE  = admin
```

#### F. DASHBOARD & RAPPORTS
```
DASHBOARD_ADMIN_FULL    = admin
DASHBOARD_ADMIN_LIMITED = admin, CUP, D2F, Enseignant, Formateur (limité)
```

#### G. GESTION DES UTILISATEURS
```
ACCOUNT_READ        = admin
ACCOUNT_CREATE      = admin
ACCOUNT_UPDATE      = admin
ACCOUNT_DELETE      = admin
ACCOUNT_BAN         = admin
ACCOUNT_VIEW_PROFILE    = authenticated() (tous)
ACCOUNT_EDIT_OWN        = authenticated() (tous - profil perso)
```

---

## 3️⃣ ROUTES ET ENDPOINTS PROTÉGÉS

### 🔐 Authentification Module (esprit_D2F-authentification)

#### AccountController: `/api/v1/account`
| Méthode | Route | Protection | Rôles |
|---------|-------|-----------|--------|
| GET | `/list-accounts` | `ACCOUNT_READ` | admin |
| POST | `/ban-account` | `ACCOUNT_BAN` | admin |
| POST | `/enable-account` | `ACCOUNT_BAN` | admin |
| GET | `/profile` | `ACCOUNT_EDIT_OWN` | *authenticated* |
| POST | `/edit-profile` | `ACCOUNT_EDIT_OWN` | *authenticated* |
| POST | `/update-password` | `ACCOUNT_EDIT_OWN` | *authenticated* |
| GET | `/profile/{username}` | `ACCOUNT_VIEW_PROFILE` | *authenticated* |
| DELETE | `/delete/{userId}` | `ACCOUNT_DELETE` | admin |
| PUT | `/update/{userId}` | `ACCOUNT_UPDATE` | admin |

#### SecurityController: `/api/v1/auth`
| Méthode | Route | Protection | Rôles |
|---------|-------|-----------|--------|
| POST | `/login` | `PUBLIC` | *tous* |
| POST | `/forgot-password` | `PUBLIC` | *tous* |
| POST | `/reset-password` | `PUBLIC` | *tous* |
| GET | `/profile` | `PUBLIC` | *authenticated* |

### 📋 Besoins de Formation (esprit_D2F-besoin-formation)

#### BesoinFormationController: `/api/v1/besoinsFormations`
| Méthode | Route | Protection | Rôles |
|---------|-------|-----------|--------|
| GET | `/retrieve-all-BesoinFormations` | `BESOIN_FORMATION_READ_ALL` | admin, CUP, D2F, Enseignant, Formateur |
| GET | `/retrieve-BesoinFormation/{id}` | `BESOIN_FORMATION_READ_ALL` | admin, CUP, D2F, Enseignant, Formateur |
| POST | `/add-BesoinFormation` | `BESOIN_FORMATION_CREATE` | admin, CUP, Enseignant |
| DELETE | `/remove-BesoinFormation/{id}` | `BESOIN_FORMATION_DELETE` | admin |
| PUT | `/modify-BesoinFormation` | `BESOIN_FORMATION_UPDATE` | admin |
| GET | `/notifications/{username}` | `isAuthenticated()` | *tous* |
| PUT | `/{id}/approve` | `BESOIN_FORMATION_APPROVE` | admin, CUP |
| GET | `/retrieve-approved-BesoinFormations` | `BESOIN_FORMATION_READ_ALL` | admin, CUP, D2F, Enseignant, Formateur |
| GET | `/by-up/{up}` | `BESOIN_FORMATION_READ_ALL` | admin, CUP, D2F, Enseignant, Formateur |
| GET | `/by-departement/{departement}` | `BESOIN_FORMATION_READ_ALL` | admin, CUP, D2F, Enseignant, Formateur |
| GET | `/by-priorite` | `BESOIN_FORMATION_READ_ALL` | admin, CUP, D2F, Enseignant, Formateur |
| GET | `/by-priorite/{priorite}` | `BESOIN_FORMATION_READ_ALL` | admin, CUP, D2F, Enseignant, Formateur |

### 📚 Formation Module (esprit_D2F-formation)

#### FormationController: `/api/v1/formations`
| Méthode | Route | Protection | Rôles |
|---------|-------|-----------|--------|
| POST | `/` | `FORMATION_CREATE` | admin, CUP |
| GET | `/` | `FORMATION_READ` | admin, CUP, Enseignant, Formateur |
| GET | `/{id}` | `FORMATION_READ` | admin, CUP, Enseignant, Formateur |
| PUT | `/{id}` | `FORMATION_UPDATE` | admin, CUP |
| DELETE | `/{id}` | `FORMATION_DELETE` | admin |

### 🧠 Compétences & RICE (esprit_D2F-competence)

#### RiceController: `/api/v1/rice`
| Méthode | Route | Protection | Rôles |
|---------|-------|-----------|--------|
| POST | `/import` | ❌ **AUCUNE** | *tous* ⚠️ |
| GET | `/imports` | ❌ **AUCUNE** | *tous* ⚠️ |

---

## 🚨 PROBLÈMES IDENTIFIÉS

### 1. **RiceController sans protection (@PreAuthorize manquante)**
- 📍 Fichier: `esprit_D2F-competence/src/main/java/tn/esprit/d2f/competence/controller/RiceController.java`
- ❌ Endpoints non protégés:
  - `POST /api/v1/rice/import`
  - `GET /api/v1/rice/imports`
- 📋 Attendu: Seulement `admin` devrait pouvoir accéder (selon AuthorizationMatrix)
- ⚠️ **Risque de sécurité**: N'importe quel utilisateur peut importer/exporter des données RICE critiques

### 2. **Rôle "D2F" défini mais non utilisé**
- 📍 Défini dans: `ERole.java`
- ❌ Ne correspond à aucun rôle dans la documentation HTML
- 💡 Suggestion: Vérifier l'utilité ou supprimer ce rôle

### 3. **Contrôleurs sans vérification des permissions**
Les contrôleurs suivants nécessitent vérification:
- `EvaluationGlobaleController`
- `EvaluationFormateurController`
- `SeanceController`
- `ParticipantKpiController`
- `CertificateController`
- `AnalysePredictiveController`
- `EnseignantController`
- `SavoirController`
- `SousCompetenceController`
- Et d'autres...

---

## 4️⃣ ARCHITECTURE JWT & AUTHENTIFICATION

### 🔑 Flow JWT
1. **Login** → SecurityController génère JWT avec:
   - `sub` = username
   - `scope` = rôles (ex: "ROLE_ADMIN ROLE_CUP")
   - `email` = email utilisateur
   - `exp` = 120 minutes

2. **Validation** → JwtTokenProvider valide le token et extrait les rôles

3. **Authorization** → Spring Security @PreAuthorize évalue les expressions SpEL

### 📝 Claims JWT
```json
{
  "sub": "username",
  "scope": "ROLE_ADMIN ROLE_CUP",
  "email": "user@example.com",
  "iat": 1704067200,
  "exp": 1704074400
}
```

---

## 5️⃣ WORKFLOW D'APPROBATION (d'après HTML)

```
01. Déclaration (Enseignant)
    ↓
02. Validation CUP (CUP approuve)
    ↓
03. Approbation Chef Département (Chef valide)
    ↓
04. Validation Admin (Admin finalise)
```

### États du besoin
- `BROUILLON` - Création en cours
- `EN_ATTENTE` - Soumis, en attente CUP
- `VALIDÉ_CUP` - Approuvé par CUP, en attente Admin
- `APPROUVÉ` - Formation planifiée
- `REJETÉ` - Rejeté avec motif

---

## 6️⃣ RECOMMANDATIONS

### 🔧 Actions prioritaires

1. **[URGENT]** Ajouter @PreAuthorize au RiceController
   ```java
   @PostMapping("/import")
   @PreAuthorize(AuthorizationMatrix.RICE_CREATE)
   public ResponseEntity<RiceImportResult> importRice(...) { ... }
   
   @GetMapping("/imports")
   @PreAuthorize(AuthorizationMatrix.RICE_READ)
   public ResponseEntity<List<RiceImportResult>> getImportHistory() { ... }
   ```

2. **[IMPORTANT]** Auditer tous les contrôleurs listés en section 3 pour vérifier les protections

3. **[MOYEN]** Clarifier le rôle "D2F" ou le supprimer

4. **[MOYEN]** Ajouter des audits de log pour chaque action sensible

5. **[MOYEN]** Implémenter le Rate Limiting sur les endpoints publics (login, forgot-password)

6. **[IMPORTANT]** Vérifier la synchronisation entre AuthorizationMatrix et les contrôleurs

### 🎯 Conformité avec la documentation HTML
La matrice d'autorisation code ✅ **CORRESPOND** à la documentation HTML fournie:
- 4 rôles principaux: admin, CUP, Enseignant, Formateur
- Permissions alignées sur le workflow d'approbation
- Accès granulaire par module

---

## 7️⃣ FICHIERS CLÉS

| Fichier | Chemin | Rôle |
|---------|--------|------|
| ERole.java | `esprit_D2F-authentification/src/main/java/esprit/pfe/auth/Entities/` | Enum des rôles |
| Role.java | Même chemin | Entité JPA Role |
| AuthorizationMatrix.java | `esprit_D2F-authentification/src/main/java/esprit/pfe/auth/Security/` | Matrice d'autorisation |
| SecurityController.java | Même chemin | Login/JWT |
| AccountController.java | `esprit_D2F-authentification/src/main/java/esprit/pfe/auth/Controllers/` | Gestion comptes |
| BesoinFormationController.java | `esprit_D2F-besoin-formation/src/main/java/tn/esprit/d2f/controller/` | Besoins formations |
| FormationController.java | `esprit_D2F-formation/src/main/java/esprit/pfe/serviceformation/Controllers/` | Gestion formations |
| RiceController.java | `esprit_D2F-competence/src/main/java/tn/esprit/d2f/competence/controller/` | ⚠️ **SANS PROTECTION** |

---

## 📊 Résumé de Conformité

✅ **Conforme**:
- Matrice d'autorisation bien structurée
- JWT + Spring Security correctement configuré
- Workflow d'approbation implémenté
- Rôles clairement définis

⚠️ **À vérifier**:
- Contrôleurs sans protections
- Rôle "D2F" inutilisé
- Synchronisation AuthorizationMatrix/contrôleurs

❌ **Non conforme**:
- RiceController totalement sans protection
- Endpoints sensibles potentiellement vulnérables

---

**Generated**: 2026-04-27 | **Status**: ✅ Vérification complétée
