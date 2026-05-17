# Rapport d'audit Frontend — Module Formations (D2F Enseignants)
**Projet :** PFE – D2F Enseignants (Esprit School)  
**Stack :** React 18 + Ant Design 5.x + react-big-calendar + Framer Motion + XLSX  
**Date :** 2026-05-16  
**Périmètre :** Toutes les pages et composants liés à la gestion des formations

---

## 1. Cartographie du module

### 1.1 Routes et rôles

| Route | Composant | Rôles autorisés |
|---|---|---|
| `/home/Formation` | `FormationPage` | admin |
| `/home/Formation/Creer` | `FormationCreationPage` | admin |
| `/home/Formation/Consulter` | `FormationConsultationPage` | admin, ResponsableDossier, CHEF_DEPARTEMENT |
| `/home/ListeFormation` | `FormationCards` | tous authentifiés |
| `/home/ListeFormation/:id` | `FicheFormation` | tous authentifiés |
| `/home/ListeFormation/:id/demandes` | `DemandesList` | admin, CUP |
| `/home/animateur-formations` | `FormationList` (présences) | Formateur, Enseignant, admin |
| `/home/animateur-formations/:id` | `FormationDetail` | Formateur, Enseignant, admin |
| `/home/Calendrier` | `CalendrierPage` | admin, CHEF_DEPARTEMENT |
| `/home/calendar/:enseignantId` | `CalendarEnseignant` | admin, CHEF_DEPARTEMENT |
| `/home/Evaluations` | `EvaluationListEnriched` | admin, CUP, CHEF_DEPARTEMENT |

### 1.2 Fichiers principaux

```
src/pages/
├── formation/
│   ├── FormationPage.jsx + FormationPage.css
│   ├── FormationCreationPage.jsx + FormationCreationPage.css
│   └── FormationConsultationPage.jsx + FormationConsultationPage.css
├── FormationWorkflowForm.jsx + FormationWorkflowForm.css      ← formulaire création (5 étapes)
├── FormationWorkflowEditForm.jsx + FormationWorkflowEditForm.css  ← formulaire édition
├── FormationTable.jsx                                           ← LEGACY (doublon)
├── presence/
│   ├── FormationList.jsx       ← liste formations pour formateur
│   ├── FormationDetail.jsx     ← détail formation (onglets présences/éval)
│   ├── SeanceCard.jsx
│   ├── PresenceList.jsx        ← feuille de présence par séance
│   ├── FormationEvaluationsTab.jsx
│   └── EvaluationListEnriched.jsx
├── inscription/
│   ├── FormationCards.jsx + FormationCards.css  ← catalogue self-service enseignants
│   ├── FicheFormation.jsx                       ← fiche détaillée
│   └── DemandesList.jsx                         ← gestion inscriptions
├── CalendrierPage.jsx + CalendrierPage.css
└── enseignant/CalendarEnseignant.jsx + CalendarEnseignant.css
```

### 1.3 Service principal

**`FormationWorkflowService.ts`** — Endpoint : `${FORMATION_URL}/formation/formations-workflow`

Méthodes exposées :
- `createFormationWorkflow(data)` · `updateFormationWorkflow(id, data)` · `deleteFormationWorkflow(id)`
- `getAllFormationWorkflows()` · `getFormationWorkflowById(id)`
- `getFormationsByAnimateur()` · `getFormationsAchevees()` · `getFormationsVisibles()`
- `getFormationsParUp(upId)` · `getFormationsParDepartement(deptId)`
- `getFormationsForCalendar(enseignantId)`
- `exportFormations(start, end)` → Blob Excel
- `updatePresence(id, isPresent, commentaire)` · `getPresencesBySeance(seanceId)`
- `updateInscriptionsOuvertes(id, ouvert)`

---

## 2. Description fonctionnelle de chaque composant

### 2.1 `FormationPage.jsx` — Hub de navigation
Affiche 3 cartes de navigation : **Nouvelle Formation**, **Catalogue**, **Gestion Documentaire**.  
Aucun appel API. Point d'entrée réservé aux admins.

### 2.2 `FormationCreationPage.jsx` — Page de création
Wrapper autour de `FormationWorkflowForm`. Affiche un tag "Lié au besoin" si l'utilisateur arrive depuis un besoin de formation. Transmet `besoinInfo` et `onFormationCreated` au formulaire.

### 2.3 `FormationWorkflowForm.jsx` — Formulaire multi-étapes (CRÉATION)
Stepper custom 5 étapes :

| Étape | Nom | Contenu |
|---|---|---|
| 0 | Général | Titre, type (INTERNE/EXTERNE/EN_LIGNE), état, dates, période, charge horaire, UP, département, inscriptions ouvertes |
| 1 | Pédagogie | Domaine, population cible, objectifs, objectifs pédagogiques, méthodes d'évaluation |
| 2 | Planning & Acteurs | Séances (date/heure/salle/type), animateurs internes (FORMATEUR), animateur externe, participants avec filtres UP/Dept + import/export Excel |
| 3 | Compétences RICE | Cartographie domaine → compétence → savoir |
| 4 | Coûts | Formation, transport, hébergement, repas + total calculé |

**Fonctionnalités avancées :**
- Détection de chevauchements (salle, animateur, participant) avec formations existantes
- Pré-remplissage depuis un besoin de formation
- Animateurs : filtrés uniquement parmi les comptes role=FORMATEUR
- Participants : filtrés par UP/Département, import Excel (colonnes Email/email/Mail/mail/EMAIL/MAIL/email_address), export Excel stylisé
- Custom stepper accessible (role="list/listitem", aria-current, progressbar avec aria-valuenow)

**API appelées au chargement :**
`UpService.getAllUps()` · `DeptService.getAllDepts()` · `EnseignantService.getAllEnseignants()` · `FormationWorkflowService.getAllFormationWorkflows()` · `CompetenceService.domaine.getAll()` · `CompetenceService.competence.getAll()` · `accountService.getAllAccounts()`

### 2.4 `FormationWorkflowEditForm.jsx` — Formulaire ÉDITION
Formulaire similaire au création mais simplifié. Gère le rôle `ResponsableDossier` (lecture seule + gestion dossier). Inclut une section "Plus d'infos" (prérequis, acquis, indicateurs). Déclenche `DocumentListModal` et `DocumentUploadPanel`.

### 2.5 `FormationConsultationPage.jsx` — Catalogue admin
- Table avec pagination (10 par page), sélection radio
- Filtres : texte libre, origine (avec/sans besoin), type, état, UP, département, plage de dates
- Actions : éditer (Drawer avec `FormationWorkflowEditForm`), supprimer, envoyer email, exporter Excel
- Expansion de ligne pour afficher les séances
- Chef Département : voit uniquement ses formations

### 2.6 `FormationCards.jsx` — Catalogue enseignants (self-service)
Vue cards pour les enseignants. Filtres UP/Dept/type/dates/statut ouverture. Différents endpoints selon rôle (CUP → `getFormationsParUp`, Formateur → `getFormationsByAnimateur`, autres → `getFormationsVisibles`).

### 2.7 `FicheFormation.jsx` — Fiche détail
Affiche toutes les informations d'une formation (Descriptions AntD, Timeline des séances, badges, etc.). Bouton de retour.

### 2.8 `DemandesList.jsx` — Gestion des inscriptions
Liste les demandes d'inscription avec statut APPROVED/PENDING. Approve/Reject unitaire ou en masse. Export Excel des approuvées.

### 2.9 `FormationList.jsx` (présences) — Formations du formateur
Cards filtrables pour le formateur. Appel différent selon rôle (D2F vs Formateur). Navigation vers `FormationDetail`.

### 2.10 `FormationDetail.jsx` / `SeanceCard.jsx` / `PresenceList.jsx`
Gestion de la présence par séance. Export Excel de la feuille de présence. Évaluations.

### 2.11 `CalendrierPage.jsx` / `CalendarEnseignant.jsx`
Vues calendrier `react-big-calendar`. Admin voit toutes les formations. Vue enseignant individuelle.

---

## 3. Points forts ✅

### 3.1 Architecture et organisation
- Séparation claire par dossier fonctionnel (`formation/`, `presence/`, `inscription/`)
- Service centralisé `FormationWorkflowService.ts` avec toutes les méthodes API
- Fichier CSS dédié par composant (pas de styles globaux contaminants)
- Utilitaire partagé `src/utils/excelExport.js` pour tous les exports Excel

### 3.2 UX Formulaire création (après refactoring)
- Stepper custom entièrement accessible (ARIA roles, keyboard nav, progressbar)
- Sélection du type de formation via cartes visuelles cliquables (meilleur que dropdown)
- Sélection de l'état via badges radio colorés par contexte (EN_COURS = orange, ACHEVE = vert)
- Filtres UP/Département pour animateurs ET participants
- Séparation stricte animateurs (FORMATEUR) vs participants (tous enseignants)
- Import Excel participants avec fallback et feedback (message.success/warning)
- Export Excel participants avec sélection dynamique
- Détection de chevauchements de séances en temps réel
- Pré-remplissage depuis besoin de formation (besoinInfo)
- Charge horaire globale auto-calculée depuis les séances

### 3.3 RBAC (Role-Based Access Control)
- Routes protégées selon rôle dans AppRoutes
- Chef Département voit uniquement ses formations
- ResponsableDossier : accès dossier uniquement
- CUP : voit les formations de son UP
- Animateurs/Formateurs : uniquement leurs propres formations

### 3.4 Export Excel
- Design cohérent marque Esprit (rouge `#B51200`) sur tous les exports
- En-tête titre fusionné, sous-titre date, en-têtes colonnes colorés
- Lignes alternées, bordures fines, largeurs auto-calculées
- Export depuis : BesoinList, DemandesList, PresenceList, FormationEvaluationsTab, EvaluationListEnriched, TeachersDataGrid, FormationWorkflowForm (participants)

### 3.5 Détection de conflits
- Chevauchements de plages horaires inter-formations
- Conflits de salle (même salle, même créneau)
- Conflits animateur et participant avec formations existantes
- Affichage via Alert warning avec liste détaillée

---

## 4. Points faibles et problèmes identifiés ⚠️

### 4.1 CRITIQUE — Composant obsolète `FormationTable.jsx`
**Problème :** `FormationTable.jsx` est un doublon de `FormationConsultationPage.jsx`. Il existe toujours mais n'est plus utilisé activement dans les routes.  
**Impact :** Confusion pour les développeurs, code mort à maintenir.  
**Fix :** Supprimer `FormationTable.jsx` et `ExportExcelButton.jsx` (standalone) ou les marquer `@deprecated`.

### 4.2 IMPORTANT — `FormationList.jsx` (présences) sans CSS dédié
**Problème :** `FormationList.jsx` utilise uniquement des styles inline (`style={{ ... }}`). Aucun fichier CSS importé.  
**Impact :** Couleurs hardcodées, dark mode impossible, incohérence visuelle avec le reste.  
**Fix :** Créer `FormationList.css` avec classes BEM et importer.

### 4.3 IMPORTANT — Étape Compétences RICE (Step 3) non mise à jour
**Problème :** L'étape 3 (Compétences) du formulaire de création utilise encore l'ancien pattern Row/Col avec `<Text type="secondary">` au lieu du pattern `.creation-section-box` + `.creation-field` + `.creation-competence-row` introduit dans le CSS.  
**Impact :** Incohérence visuelle entre les étapes 0-2 et l'étape 3.  
**Fix :** Refactoriser l'étape 3 pour utiliser `.creation-competence-card` + `.creation-competence-row` + `.creation-competence-num`.

### 4.4 IMPORTANT — `FormationWorkflowEditForm.jsx` non refactorisé
**Problème :** Le formulaire d'édition n'a pas bénéficié du refactoring UI du formulaire de création. Il utilise encore l'ancien stepper Ant Design, les Select pour type/état, les Row/Col bruts.  
**Impact :** Deux formulaires visuellement très différents pour la même entité. UX incohérente.  
**Fix :** Aligner `FormationWorkflowEditForm` sur le design de `FormationWorkflowForm` (section-box, type cartes, état badges, stepper custom).

### 4.5 IMPORTANT — `FicheFormation.jsx` design non aligné
**Problème :** La fiche détail utilise `<Descriptions>` Ant Design brut sans override CSS. Le design ne suit pas le design system du projet.  
**Impact :** Contraste insuffisant, espacement non cohérent avec les autres pages.  
**Fix :** Appliquer les variables CSS design system (couleurs, radius, shadow).

### 4.6 MODÉRÉ — `FormationCards.jsx` design cartes non harmonisé
**Problème :** Les cards d'inscription utilisent des styles inline et des hex hardcodés (`#f0f2f5`, `#1890ff`, `#52c41a`). Elles ne suivent pas le design system.  
**Impact :** Dark mode cassé, couleurs Ant Design 4.x résiduelles.  
**Fix :** Migrer vers les variables CSS (`--primary-500`, `--bg-card`, `--color-success`, etc.).

### 4.7 MODÉRÉ — Validation formulaire inexistante
**Problème :** `FormationWorkflowForm.jsx` ne valide pas les champs avant de passer à l'étape suivante (pas de contrôle sur titre vide, dates incohérentes dateDebut > dateFin, séances sans date, etc.). Le submit final fait une validation superficielle.  
**Impact :** Données incohérentes peuvent être envoyées en base.  
**Fix :** Ajouter validation par étape dans `handleNext()` : min 5 caractères pour titre, dateDebut < dateFin, au moins 1 séance à l'étape 2.

### 4.8 MODÉRÉ — Charge horaire non synchronisée
**Problème :** `chargeH` est un champ `InputNumber` éditable manuellement mais la valeur calculée depuis les séances est affichée séparément. Aucune synchronisation automatique ne s'effectue.  
**Impact :** L'utilisateur peut saisir une charge horaire incohérente avec les séances réelles.  
**Fix :** Calculer automatiquement `chargeH` depuis `sum(seances.map(s => durationMinutes(s.heureDebut, s.heureFin)))` et rendre le champ read-only ou afficher les deux.

### 4.9 MODÉRÉ — Performance : chargement initial lourd
**Problème :** `FormationWorkflowForm` charge en parallèle au montage : UP, Depts, Enseignants, toutes les formations existantes (pour conflits), tous les domaines, toutes les compétences, tous les comptes. Sur de gros volumes, cela représente 7 requêtes simultanées bloquantes.  
**Impact :** Temps de chargement élevé, mauvaise expérience sur réseau lent.  
**Fix :** Lazy-load les données par étape (compétences au Step 3, formations pour conflits au Step 2).

### 4.10 MODÉRÉ — `FormationConsultationPage` : absence de pagination serveur
**Problème :** `getAllFormationWorkflows()` charge TOUTES les formations en une seule requête. La pagination est client-side.  
**Impact :** Sur 500+ formations, la réponse API devient très lourde.  
**Fix :** Ajouter des paramètres de pagination/filtrage à l'API et paginer côté serveur.

### 4.11 MINEUR — Import Excel participants : pas de feedback colonne manquante
**Problème :** Si le fichier Excel importé n'a aucune colonne Email/email/Mail, la fonction échoue silencieusement et n'affiche qu'un message "Aucun enseignant trouvé".  
**Fix :** Détecter les colonnes disponibles et afficher un message indiquant quelles colonnes sont attendues.

### 4.12 MINEUR — `EvaluationListEnriched.jsx` : nom de fichier sans date
**Problème :** Était `evaluations_enriched.xlsx` (sans date). Corrigé en `evaluations_enriched_2026-05-16.xlsx` mais la route n'est pas liée à une formation spécifique.  
**Fix :** Inclure le contexte (formation ou période) dans le nom de fichier.

### 4.13 MINEUR — `CalendrierPage` : création de formation en modal non alignée
**Problème :** `FormationWorkflowForm` est rendu dans un `Modal` depuis le calendrier. Le stepper custom occupe toute la largeur mais le modal a une largeur fixe. L'overflow est géré mais le scroll à l'intérieur du modal peut désorienter.  
**Fix :** Fixer le `min-height` du modal et utiliser `overflow-y: auto` uniquement sur `.creation-step-content`.

### 4.14 MINEUR — Accessibility : `FormationCards.jsx`
**Problème :** Les cartes sont cliquables via `onClick` mais ne sont pas `<button>` ou ne possèdent pas `role="button"` + `tabIndex={0}` + `onKeyDown`.  
**Fix :** Ajouter les attributs ARIA ou wrapper dans un bouton accessible.

---

## 5. Tableau de priorités

| # | Problème | Sévérité | Effort | Priorité |
|---|---|---|---|---|
| 4.3 | Étape RICE (Step 3) non alignée visuellement | High | Faible | 🔴 P1 |
| 4.7 | Absence de validation par étape | High | Moyen | 🔴 P1 |
| 4.4 | EditForm non refactorisé | Medium | Élevé | 🟠 P2 |
| 4.8 | Charge horaire non synchronisée | Medium | Faible | 🟠 P2 |
| 4.2 | FormationList sans CSS | Medium | Faible | 🟠 P2 |
| 4.9 | Chargement initial lourd | Medium | Moyen | 🟠 P2 |
| 4.5 | FicheFormation design | Low | Faible | 🟡 P3 |
| 4.6 | FormationCards hex hardcodés | Low | Faible | 🟡 P3 |
| 4.1 | FormationTable.jsx obsolète | Low | Très faible | 🟡 P3 |
| 4.10 | Pas de pagination serveur | Low | Élevé | 🟡 P3 |
| 4.11 | Import Excel sans diagnostic colonnes | Low | Faible | 🟢 P4 |
| 4.13 | Modal calendrier scroll | Low | Faible | 🟢 P4 |
| 4.14 | Accessibility FormationCards | Low | Faible | 🟢 P4 |

---

## 6. État du design system

### Variables CSS utilisées (correctement)
```css
--primary-500, --primary-400, --primary-300, --primary-200, --primary-100, --primary-50
--bg-card, --bg-subtle, --border-color, --border-color-soft, --border-color-strong
--text-main, --text-body, --text-muted, --text-on-dark
--color-success, --color-success-bg, --color-success-border
--color-warning, --color-warning-bg, --color-warning-border
--color-error, --color-error-bg, --color-error-border
--color-info, --color-info-bg, --color-info-border
--shadow-xs, --shadow-sm, --shadow-md, --shadow-lg, --shadow-brand
--radius-sm, --radius-md, --radius-lg, --radius-xl, --radius-full
--btn-primary-gradient, --btn-primary-gradient-hover, --btn-primary-shadow
--btn-success-gradient, --btn-success-gradient-hover, --btn-success-shadow
--space-2 à --space-10, --max-page-width
```

### Hex hardcodés résiduels à migrer
- `FormationCards.jsx` : `#f0f2f5`, `#1890ff`, `#52c41a`, `#faad14`, `#ff4d4f`
- `FormationList.jsx` : tous les styles inline
- `FormationWorkflowEditForm.css` : quelques couleurs directes

---

## 7. Modèle de données Formation (côté frontend)

```typescript
interface FormationWorkflow {
  idFormation: number;
  titreFormation: string;
  typeFormation: "INTERNE" | "EXTERNE" | "EN_LIGNE";
  etatFormation: "ENREGISTRE" | "PLANIFIE" | "EN_COURS" | "ACHEVE" | "ANNULE" | "VISIBLE";
  dateDebut: string;           // "yyyy-MM-dd"
  dateFin: string;
  periodeFormation: string;    // label affiché
  periodCode: string;          // P1/P2/P3/P4/SUMMER/WINTER/OTHER
  customPeriodLabel: string;
  chargeHoraireGlobal: number;
  ouverte: boolean;            // inscriptions ouvertes
  coutFormation: number;
  coutTransport: number;
  coutHebergement: number;
  coutRepas: number;
  externeFormateurNom: string;
  externeFormateurPrenom: string;
  externeFormateurEmail: string;
  organismeRefExterne: string;
  up1: number | null;          // id UP
  departement1: number | null; // id département
  domaine: string;
  populationCible: string;
  objectifs: string;
  objectifsPedago: string;
  evalMethods: string;
  prerequis: string;
  acquis: string;
  indicateurs: string;
  idBesoinFormation: number | null;
  seances: Seance[];
  participants: Enseignant[];
  animateurs: Enseignant[];
}

interface Seance {
  id: number;
  dateSeance: string;
  heureDebut: string;   // "HH:mm:ss"
  heureFin: string;
  salle: string;
  onlineMeetingUrl: string;
  typeSeance: "THEORIQUE" | "PRATIQUE";
  contenus: string;
  methodes: string;
  animateurs: Enseignant[];
  participants: Enseignant[];
}
```

---

## 8. Recommandations prioritaires (quick wins)

### Q1 — Valider par étape dans `handleNext()` (~30 min)
```jsx
const handleNext = () => {
  if (activeStep === 0) {
    if (!titre || titre.trim().length < 5)
      return message.error("Le titre doit faire au moins 5 caractères");
    if (dateDebut && dateFin && dateDebut > dateFin)
      return message.error("La date de fin doit être après la date de début");
  }
  if (activeStep === 2 && seances.length === 0)
    return message.error("Ajoutez au moins une séance");
  setActiveStep(prev => prev + 1);
};
```

### Q2 — Synchroniser chargeH depuis séances (~20 min)
```jsx
const calculatedChargeH = seances.reduce((acc, s) => {
  const start = toMinutes(s.heureDebut) ?? 0;
  const end = toMinutes(s.heureFin) ?? 0;
  return acc + Math.max(0, end - start);
}, 0);
// Afficher en lecture seule : `${(calculatedChargeH / 60).toFixed(1)}h`
```

### Q3 — Lazy-load des compétences seulement au Step 3
```jsx
useEffect(() => {
  if (activeStep === 3 && compDomaines.length === 0) {
    Promise.all([CompetenceService.domaine.getAll(), CompetenceService.competence.getAll()])
      .then(([d, c]) => { setCompDomaines(d); setCompCompetences(c); });
  }
}, [activeStep]);
```

### Q4 — Supprimer `FormationTable.jsx` (~5 min)
Vérifier qu'aucune route ne pointe dessus, puis supprimer le fichier.

### Q5 — Créer `FormationList.css` et remplacer les styles inline (~45 min)
Migrer tous les `style={{ ... }}` de `FormationList.jsx` vers des classes CSS utilisant les variables design system.

---

## 9. Résumé exécutif

Le module formations est **fonctionnellement complet** et couvre le cycle de vie entier : création multi-étapes, catalogue admin, self-service enseignants, présences, évaluations, exports Excel, calendrier.

Le **formulaire de création** (`FormationWorkflowForm`) a été significativement amélioré avec :  
un stepper custom accessible, des sélecteurs de type/état modernes, la séparation stricte animateurs (FORMATEUR) vs participants (ENSEIGNANT), des filtres UP/Dept fonctionnels, et un export Excel stylisé cohérent avec la marque Esprit.

Les **principaux axes d'amélioration restants** sont :
1. **Validation par étape** (aucune validation bloquante actuellement)
2. **Alignement visuel du formulaire d'édition** sur le formulaire de création
3. **Performance** : lazy-loading des données par étape
4. **Migration des couleurs hardcodées** dans `FormationCards.jsx` et `FormationList.jsx`
5. **Suppression du code mort** (`FormationTable.jsx`)
