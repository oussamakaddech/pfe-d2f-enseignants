# Vérification « Identification des acteurs » vs code

Vérification des revendications du chapitre « Identification des acteurs » du rapport
PFE contre la source. **Date : 2026-08-19.**

## Méthode
Chaque revendication a été confrontée à :
- `esprit_D2F-common-security/.../AuthorizationMatrix.java` (matrice source backend),
- `esprit_D2F-api-gateway/.../security/AuthorizationFilter.java` (durcissement HTTP par verbe),
- `esprit_D2F-authentification/.../entities/ERole.java` + migration `V19`,
- frontend `roles.ts`, `SideMenu.tsx`, `sideMenuData.ts`, `tokens.ts`, `guards.tsx`.

## Verdict global
**14/16 revendications confirmées.** 2 formulations contredites par le code :
- « DOCUMENT_CREATE/UPDATE/DELETE exclusivement accordées au RESPONSABLE_DOSSIER » ;
- « modification des champs métier d'une formation réservée à l'ADMIN et au CUP ».

## Tableau de vérification

| # | Revendication (rapport) | Référence code | Verdict |
|---|--------------------------|----------------|---------|
| 1 | Sept rôles : ADMIN, CUP, ENSEIGNANT, ANIMATEUR, FORMATEUR, CHEF_DEPARTEMENT, RESPONSABLE_DOSSIER | `ERole.java:6` | ✅ exact |
| 2 | ADMIN = accès total | superuser `AuthorizationFilter.java:264-268` + ADMIN présent dans toutes les règles | ✅ |
| 3 | CUP : création/suivi formations, approbation inscriptions | `FORMATION_CREATE`=ADMIN,CUP (`AuthorizationMatrix.java:30`) ; `INSCRIPTION_APPROVE`=ADMIN,CUP (`:116`) ; `BESOIN_FORMATION_APPROVE`=ADMIN,CUP,CHEF_DEP (`:27`) | ✅ |
| 4 | ENSEIGNANT : profil/passeport, exprime besoins, s'inscrit | `SKILL_PASSPORT_READ_OWN` toutes (*:80-81*) ; `BESOIN_FORMATION_CREATE` inclut ENSEIGNANT (`:24`) ; `INSCRIPTION_CREATE` inclut ENSEIGNANT (`:115`) | ✅ |
| 5 | ANIMATEUR : anime les sessions, exprime besoins, s'inscrit | `EVALUATION_CREATE`=ADMIN,FORMATEUR,ANIMATEUR,ENSEIGNANT (`:49`) ; `BESOIN_FORMATION_CREATE` inclut ANIMATEUR (`:24`) ; `INSCRIPTION_CREATE` inclut ANIMATEUR (`:115`) | ✅ |
| 6 | FORMATEUR = legacy consolidé dans ANIMATEUR (rassemblement via migration V19) | `V19__consolidate_formateur_into_animateur.sql` : `UPDATE user_roles SET role_id=ANIMATEUR WHERE role_id=FORMATEUR` + suppression doublons | ✅ |
| 6b | FORMATEUR conservé comme alias pour les JWT valides | `AuthorizationMatrix.java` garde `ROLE_FORMATEUR` dans FORMATION_READ/EVALUATION_*/INSCRIPTION_* ; `AuthorizationFilter.ROLE_FORMATEUR` toujours accepté | ✅ |
| 7 | Frontend n'expose plus qu'un seul menu « Animateur » | `roles.ts:5` (ANIMATEUR, pas FORMATEUR) ; `SideMenu.tsx:22` label « Animateur » ; `sideMenuData.ts` menu `animateur` uniquement ; `tokens.ts:82-83` FORMATEUR → label « Animateur » | ✅ |
| 8 | CHEF_DEPARTEMENT : lecture + approbation besoins de son périmètre ; supervision compétences | `BESOIN_FORMATION_APPROVE` inclut CHEF_DEP (`:27`) ; `COMPETENCE_READ` inclut CHEF_DEP (`:7`) | ✅ |
| 9 | RESPONSABLE_DOSSIER (1) : CRUD documents via `/api/v1/documents` | endpoints `DocumentController.java` `@RequestMapping("/api/v1/documents")` + `@PreAuthorize(DOCUMENT_*)` | ✅ |
| 9b | RESPONSABLE_DOSSIER (2) : consultation en lecture seule du catalogue formations | `DOCUMENT_READ = FORMATION_READ` (`:40`) inclut RESPONSABLE_DOSSIER (`:29`) | ✅ |
| 9c | RESPONSABLE_DOSSIER (3) : gestion de son propre profil | `ACCOUNT_VIEW_PROFILE`/`ACCOUNT_EDIT_OWN` = `isAuthenticated()` (`:72-73`) ; gateway `/profile`+`/edit-profile` = `ALL_ROLES` | ✅ |
| 10 | « DOCUMENT_CREATE, DOCUMENT_UPDATE et DOCUMENT_DELETE lui sont **exclusivement** accordées » | `AuthorizationMatrix.java:41-43` = ADMIN, CUP, **et** RESPONSABLE_DOSSIER. Pas exclusif. | ❌ **contredit** |
| 11 | « modification des champs métier d'une formation **réservée à l'ADMIN et au CUP** » | `FORMATION_UPDATE` = ADMIN, CUP, **RESPONSABLE_DOSSIER** (`AuthorizationMatrix.java:31`) ; gateway PUT/PATCH = `ROLE_ADMIN, ROLE_CUP, ROLE_RESPONSABLE_DOSSIER` (`AuthorizationFilter.java:212-213`) ; `FormationServiceImpl.updateFormation` sans restriction par rôle | ❌ **contredit** |

## Écarts détaillés

### Écart 1 — DOCUMENT_* non exclusifs (revendication 10)
`AuthorizationMatrix.java:41-43` :
```java
DOCUMENT_CREATE = hasAnyRole('ROLE_ADMIN','ROLE_CUP','ROLE_RESPONSABLE_DOSSIER');
DOCUMENT_UPDATE = hasAnyRole('ROLE_ADMIN','ROLE_CUP','ROLE_RESPONSABLE_DOSSIER');
DOCUMENT_DELETE = hasAnyRole('ROLE_ADMIN','ROLE_CUP','ROLE_RESPONSABLE_DOSSIER');
```
ADMIN et CUP peuvent aussi créer/modifier/supprimer des documents. Le commentaire du
rapport devrait dire : « les permissions DOCUMENT_* font partie du périmètre du
RESPONSABLE_DOSSIER (partagées avec ADMIN et CUP) ».

### Écart 2 — La mise à jour formation n'est pas réservée à ADMIN/CUP (revendication 11)
- Matrice (`AuthorizationMatrix.java:31`) : `FORMATION_UPDATE` = ADMIN, CUP, RESPONSABLE_DOSSIER.
- Gateway (`AuthorizationFilter.java:212-213`) : PUT/PATCH → `ROLE_ADMIN, ROLE_CUP, ROLE_RESPONSABLE_DOSSIER`.
- Service (`FormationServiceImpl.updateFormation`) : mapper + `save()`, aucun garde-fou
  champ-métier par rôle.
- Frontend (`guards.tsx:43`) : `FORMATION.UPDATE = ['admin','CUP','ResponsableDossier']`.

Le RESPONSABLE_DOSSIER **peut** modifier les champs métier d'une formation via l'API.
Correspondances à rectifier dans le rapport.

## Note method
- Le gateway applique un durcissement **supplémentaire** par verbe HTTP (ex. `DELETE`
  formation = ADMIN seul, `POST` formation = ADMIN/CUP/D2F) et la règle superuser ADMIN —
  cohérent avec la matrice, ne créant pas d'écart.
- Règle BYPASS : dans les deux couches, ADMIN court-circuite (superuser) — conforme à la
  revendication 2.

## Sources exactes
- `esprit_D2F-common-security/src/main/java/esprit/d2f/common/security/AuthorizationMatrix.java`
- `esprit_D2F-api-gateway/src/main/java/com/example/servicegateway/security/AuthorizationFilter.java`
- `esprit_D2F-authentification/src/main/java/esprit/pfe/auth/entities/ERole.java`
- `esprit_D2F-authentification/src/main/resources/db/migration/V19__consolidate_formateur_into_animateur.sql`
- `esprit_D2F-formation/src/main/java/esprit/pfe/serviceformation/controllers/DocumentController.java`
- `esprit_D2F-formation/src/main/java/esprit/pfe/serviceformation/services/FormationServiceImpl.java`
- `esprit_D2F-webapp/src/utils/constants/roles.ts`
- `esprit_D2F-webapp/src/routes/guards.tsx`
- `esprit_D2F-webapp/src/components/layout/SideMenu.tsx` + `sideMenuData.ts`
- `esprit_D2F-webapp/src/styles/themes/tokens.ts`