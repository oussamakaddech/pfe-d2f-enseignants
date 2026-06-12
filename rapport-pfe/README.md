# Rapport PFE — Plateforme D2F (LaTeX)

Rapport de Projet de Fin d'Études — **Oussama KADDECH**, ESPRIT 2025-2026.
Généré à partir de l'analyse du code source réel de la plateforme D2F (12 microservices
Java/Spring + Python/FastAPI, frontend React/TypeScript).

## Contenu du dossier
```
rapport-pfe/
├── rapport.tex        # Document principal (≈ 40 pages de corps)
├── references.bib     # Bibliographie (style IEEE / biblatex+biber)
├── FIGURES.md         # Liste des figures à fournir (captures + diagrammes UML)
├── README.md          # Ce fichier
└── figures/           # Déposer ici les PNG (voir FIGURES.md)
```

## Compilation
Le document utilise **biblatex+biber** (pas BibTeX). Chaîne complète :

```bash
pdflatex rapport.tex
biber rapport
pdflatex rapport.tex
pdflatex rapport.tex
```

ou, plus simplement, avec **latexmk** :

```bash
latexmk -pdf rapport.tex
```

> **Prérequis paquets** : `biblatex`, `biblatex-ieee`, `pgfgantt`, `tikz`, `titlesec`,
> `tocloft`, `mdframed`, `enumitem`, `tabularx`, `booktabs`, `listings`. Sous MiKTeX,
> ils s'installent automatiquement à la première compilation ; sous TeX Live, utiliser
> la distribution complète (`texlive-full`).

## Figures
Le rapport **compile sans aucune image** : chaque figure absente est remplacée par un
cadre de réservation portant le nom du fichier attendu. Déposez les PNG dans `figures/`
(noms exacts dans `FIGURES.md`) ; ils sont alors intégrés automatiquement.

Deux figures sont déjà **générées nativement** dans le `.tex` (aucune image requise) :
- l'**architecture logique** (diagramme TikZ) ;
- le **diagramme de Gantt** des sprints (pgfgantt).

## Note de fidélité au code
Tous les noms de classes, points d'accès REST, entités et rôles cités proviennent du
code source réel :
- rôles `ERole` (ADMIN, CUP, ENSEIGNANT, ANIMATEUR, CHEF_DEPARTEMENT, RESPONSABLE_DOSSIER) ;
- matrice d'autorisation `AuthorizationMatrix` (`esprit_D2F-common-security`) ;
- hiérarchie `Domaine → Competence → SousCompetence → Savoir`, niveaux `NiveauMaitrise` N1–N5 ;
- pipeline d'analyse prédictive (FastAPI) : `GradientBoostingRegressor`, score de risque
  à 5 facteurs pondérés, moteurs `FeatureEngine/GapEngine/RecommendationEngine/AlertEngine` ;
- module RICE (FastAPI) : `/rice/analyze`, `/rice/validate`, extraction NLP locale
  (pdfplumber, Tesseract OCR, rapidfuzz, embeddings, validation humaine).

> La messagerie inter-services réellement utilisée est **RabbitMQ** (AMQP), et non
> ActiveMQ ; le rapport reflète fidèlement le code (`docker-compose.yml`,
> `RabbitMqConfig`).
