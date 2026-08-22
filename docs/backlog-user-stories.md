# Backlog global du produit D2F — User Stories

42 user stories, 65 tâches techniques, 303 Story Points.
Chaque user story est tracée comme issue GitHub.

## Sprint 1 — Authentification & référentiel de compétences

| ID | Issue | Module | User story | Priorité |
|----|-------|--------|------------|----------|
| 1 | [#27](#27) | Authentification | En tant que visiteur, je m'inscris sur la plateforme avec un rôle ENSEIGNANT imposé | Haute |
| 2 | [#28](#28) | Gestion des comptes | En tant qu'administrateur, je crée, modifie et gère les comptes utilisateurs et leurs rôles | Haute |
| 3 | [#29](#29) | Gestion des comptes | En tant qu'administrateur, je bannis ou réactive un compte utilisateur en cas de comportement anormal | Moyenne |
| 4 | [#30](#30) | Référentiel de compétences | En tant qu'administrateur, je construis et administre l'arborescence Domaine → Compétence → Sous-compétence → Savoir | Haute |
| 5 | [#31](#31) | Affectation des savoirs | En tant qu'administrateur, j'affecte des savoirs aux enseignants avec niveau de maîtrise (N1–N5) et date d'acquisition | Moyenne |
| 6 | [#32](#32) | Authentification | En tant qu'utilisateur, je me connecte de manière sécurisée via JWT HS512 avec protection contre la force brute | Haute |
| 7 | [#33](#33) | Authentification | En tant qu'utilisateur, je réinitialise mon mot de passe par courriel de manière sécurisée | Moyenne |
| 8 | [#34](#34) | Affectation des savoirs | En tant qu'enseignant, je consulte visuellement mon profil de compétences sous forme arborescente | Haute |
| 9 | [#35](#35) | Prérequis | En tant qu'administrateur, je définis les relations de prérequis entre compétences (une compétence peut en nécessiter une autre comme préalable) | Moyenne |
## Sprint 2 — Module RICE : extraction NLP du référentiel

| ID | Issue | Module | User story | Priorité |
|----|-------|--------|------------|----------|
| 10 | [#36](#36) | Module RICE | En tant qu'administrateur, je téléverse des fiches pédagogiques (PDF/DOCX) et l'IA génère automatiquement une arborescence de compétences par traitement du langage naturel | Haute |
| 11 | [#37](#37) | Module RICE | En tant qu'administrateur, je révise et valide les propositions de l'IA avant toute persistance en base de données | Haute |
| 12 | [#38](#38) | Module RICE | En tant qu'administrateur ou CUP, je lance une recherche par texte libre pour apparier des fragments au référentiel existant par similarité sémantique | Moyenne |
| 13 | [#39](#39) | Module RICE | En tant qu'administrateur, j'exporte le référentiel de compétences extrait par RICE au format CSV | Moyenne |
| 14 | [#40](#40) | Module RICE | En tant qu'administrateur, je consulte l'historique des analyses RICE précédentes (fiches traitées, résultats, dates) | Basse |
| 15 | [#41](#41) | Module RICE | En tant qu'administrateur, je déclenche le rafraîchissement du cache d'embeddings sémantiques (Sentence-BERT) pour un département | Basse |
| 16 | [#42](#42) | Référentiel de compétences | En tant qu'administrateur, j'importe en masse des compétences dans le référentiel sans passer par le pipeline RICE (bulk-import) | Moyenne |
## Sprint 3 — Cycle de vie des formations

| ID | Issue | Module | User story | Priorité |
|----|-------|--------|------------|----------|
| 17 | [#43](#43) | Formation | En tant qu'administrateur ou CUP, je crée une formation (interne ou externe), planifie les séances et rattache les compétences visées | Haute |
| 18 | [#44](#44) | Formation | En tant qu'enseignant, je m'inscris à une formation ; le CUP valide ou refuse mon inscription | Haute |
| 19 | [#45](#45) | Formation | En tant que formateur, je saisis la présence et les évaluations (globale et du formateur) ; les participants reçoivent des certificats | Moyenne |
| 20 | [#46](#46) | Formation | En tant qu'administrateur ou CUP, je gère le calendrier des ateliers : import planning Excel, détection de conflits de salles/animateurs, export iCal, envoi d'invitations Outlook | Haute |
| 21 | [#47](#47) | Formation | En tant qu'administrateur, CUP ou responsable dossier, je gère les documents associés aux formations (téléverser, consulter, supprimer) | Moyenne |
| 22 | [#48](#48) | Formation | En tant qu'administrateur ou CUP, je consulte les KPI et le tableau de bord des formations (taux de participation, évolution, métriques clés) | Moyenne |
| 23 | [#49](#49) | Formation | En tant qu'administrateur, j'importe en masse les départements, unités pédagogiques et enseignants depuis un fichier Excel | Moyenne |
| 24 | [#50](#50) | Formation | En tant qu'administrateur ou CUP, j'exporte les données de formation au format Excel ou iCalendar (.ics) | Basse |
| 25 | [#51](#51) | Organisation | En tant qu'administrateur, je gère les départements et les unités pédagogiques (création, modification, affectation) | Haute |
| 26 | [#52](#52) | Organisation | En tant qu'administrateur, je gère les animateurs externes et les bureaux qui les emploient | Moyenne |
| 27 | [#53](#53) | Catalogue | En tant qu'enseignant, responsable dossier ou formateur, je consulte le catalogue des formations disponibles avec leurs détails | Haute |
## Sprint 4 — Besoins en formation & communication asynchrone

| ID | Issue | Module | User story | Priorité |
|----|-------|--------|------------|----------|
| 38 | [#54](#54) | Besoins en formation | En tant qu'enseignant ou CUP, j'exprime un besoin de formation (individuel, collectif ou lié à l'animation) avec type, thème, objectifs, priorité et compétences visées | Haute |
| 39 | [#55](#55) | Besoins en formation | En tant que CUP ou chef de département, je consulte, priorise et approuve les besoins ; l'approbation finale déclenche automatiquement la création de la formation via RabbitMQ | Haute |
| 40 | [#56](#56) | Besoins en formation | En tant qu'enseignant, je consulte la liste de mes besoins de formation exprimés avec leur état d'approbation | Moyenne |
| 41 | [#57](#57) | Besoins en formation | En tant qu'administrateur, CUP ou chef de département, je consulte et trie les besoins de formation par unité pédagogique, par département ou par niveau de priorité | Moyenne |
| 42 | [#58](#58) | Notifications | En tant qu'enseignant ou CUP, je reçois des notifications asynchrones pour les événements clés (approbation de besoin, création de formation, changement d'état) | Haute |
## Sprint 5 — Analyse prédictive & recommandation

| ID | Issue | Module | User story | Priorité |
|----|-------|--------|------------|----------|
| 28 | [#59](#59) | Analyse prédictive | En tant qu'administrateur ou CUP, je lance une analyse des écarts de compétences et le système recommande des formations personnalisées | Haute |
| 29 | [#60](#60) | Analyse prédictive | En tant qu'administrateur ou CUP, je consulte le tableau de bord des enseignants à risque, les alertes et la carte de chaleur des écarts | Haute |
| 30 | [#61](#61) | Analyse prédictive | En tant qu'enseignant, je génère mon passeport de compétences au format PDF synthétisant mes compétences, formations et score de risque | Haute |
| 31 | [#62](#62) | Analyse prédictive | En tant qu'administrateur ou CUP, je consulte les passeports de compétences consolidés d'une équipe ou d'un département | Moyenne |
| 32 | [#63](#63) | Analyse prédictive | En tant qu'enseignant, je consulte mon parcours de formation personnalisé avec les étapes, niveaux visés et probabilité de réussite | Moyenne |
| 33 | [#64](#64) | Analyse prédictive | En tant qu'enseignant, j'accepte ou rejette une formation recommandée par le système, ce qui met à jour mon profil et améliore les futures recommandations | Moyenne |
| 34 | [#65](#65) | Analyse prédictive | En tant qu'administrateur, je consulte des rapports descriptifs : enseignants inactifs > N mois, formations par période, formations par UP/département avec comparaison radar | Moyenne |
| 35 | [#66](#66) | Analyse prédictive | En tant qu'administrateur, j'exporte les rapports d'analyse prédictive au format Excel ou PDF | Moyenne |
| 36 | [#67](#67) | Analyse prédictive | En tant qu'administrateur, je déclenche le réentraînement du modèle de machine learning avec les données les plus récentes | Basse |
| 37 | [#68](#68) | Analyse prédictive | En tant qu'administrateur, je configure les variantes du cadre d'expérimentation A/B (MSAS, filtrage collaboratif, risk-based) pour valider les recommandations | Basse |
