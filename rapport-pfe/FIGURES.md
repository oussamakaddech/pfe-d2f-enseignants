# Liste des figures à fournir — `figures/`

Le rapport compile **immédiatement** sans ces fichiers : chaque figure manquante est
remplacée par un cadre de réservation indiquant le nom de fichier attendu. Dès que
vous déposez le PNG correspondant dans le dossier `figures/`, il est automatiquement
intégré (macro `\figplace` + `\IfFileExists`).

> Format recommandé : **PNG** (captures d'écran) ou **PNG exporté** (diagrammes UML
> faits sous StarUML). Largeur ≥ 1200 px pour les captures pleine page.

## Logo
| Fichier | Description |
|---|---|
| `esprit_logo.png` | Logo officiel ESPRIT (page de garde). |

## Diagrammes UML / architecture (à modéliser sous StarUML puis exporter)
| Fichier | Description |
|---|---|
| `uc_global.png` | Diagramme de cas d'utilisation **global** (tous acteurs / tous modules). |
| `archi_physique.png` | Architecture **physique** : conteneurs Docker + réseau `d2f-network` (l'architecture *logique* est déjà dessinée en TikZ dans le rapport). |
| `uc_sprint1.png` | Cas d'utilisation sprint 1 : s'enregistrer, gérer utilisateurs/domaines/compétences/sous-compétences/savoirs. |
| `class_sprint1.png` | Diagramme de classe sprint 1 : `User`, `Role`, `Domaine`, `Competence`, `SousCompetence`, `Savoir`, `EnseignantCompetence`. |
| `uc_sprint3.png` | Cas d'utilisation sprint 3 : exprimer / consulter / prioriser / approuver un besoin. |
| `class_sprint3.png` | Diagramme de classe sprint 3 : `BesoinFormation`, `BesoinCompetence`, enums `TypeBesoin`/`Priorite`/`PeriodCode`. |
| `uc_sprint4.png` | Cas d'utilisation sprint 4 : lancer analyse, consulter gaps, lister recommandations, enseignants à risque, dashboard. |
| `seq_auth.png` | Séquence : login → JWT → cookie HttpOnly (annexe A). |
| `seq_besoin_formation.png` | Séquence : approbation besoin → événement RabbitMQ → création formation (annexe A). |
| `db_schema.png` | Schéma relationnel consolidé (annexe B). |

## Captures d'écran de l'application (frontend React)
| Fichier | Page source (`esprit_D2F-webapp/src/pages/...`) | Description |
|---|---|---|
| `screen_login.png` | `auth/Register.tsx` + écran de login | Connexion / inscription. |
| `screen_gestion_comptes.png` | `admin/GestionComptesPage.tsx` | Gestion des comptes (vue ADMIN). |
| `screen_competence_tree.png` | `competence/StructureArbrePage.tsx` | Arbre Domaine→Compétence→Savoir. |
| `screen_savoirs.png` | `competence/EnseignantCompetencePage.tsx` | Affectation des savoirs aux enseignants. |
| `screen_besoin_form.png` | `besoin/BesoinForm.tsx` | Formulaire d'expression d'un besoin. |
| `screen_besoin_list.png` | `besoin/BesoinList.tsx` | Suivi / priorisation des besoins. |
| `screen_reco_list.png` | `analyse/TeacherAnalyticsPage.tsx` | Formations recommandées. |
| `screen_gaps.png` | `analyse/AnalysePredictivePage.tsx` | Écarts de compétences (gaps). |
| `screen_at_risk.png` | `analyse/AnalyticsDashboardPage.tsx` | Enseignants à risque. |
| `screen_dashboard.png` | `dashboard/ExecutiveDashboard.tsx` | Tableau de bord décisionnel. |
| `screen_rice_upload.png` | `competence/RicePage.tsx` | Téléversement de fiches (RICE). |
| `screen_rice_proposals.png` | `competence/RicePage.tsx` | Arborescence générée par l'IA. |
| `screen_rice_validation.png` | `competence/CompetenceMatchingPage.tsx` | Révision / validation humaine. |

## Astuce captures
Lancer la stack puis capturer en 1280×800 minimum :
```powershell
docker compose up -d          # ou .\launch-all.ps1
# Frontend : http://localhost:3000   API : http://localhost:8080
```
