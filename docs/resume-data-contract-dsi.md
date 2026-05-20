# Résumé — Spécification de données API de consultation ESPRIT
## Data Contract v1.0 — Plateforme D2F

**Date :** 20 mai 2026 | **Émetteur :** Équipe PFE D2F | **Destinataire :** DSI ESPRIT

---

## Objet

Ce document formalise le **data contract** de la plateforme D2F avant la mise en place des endpoints API en lecture. Il décrit les entités métier, leurs champs, les relations, les règles de gestion et les endpoints GET proposés pour exposition derrière l'API Gateway. **Aucune opération d'écriture n'est couverte.**

---

## Architecture

Tous les appels transitent par un **point d'entrée unique** : l'API Gateway (port 8080), qui assure la validation JWT, le rate limiting et le circuit breaker. Elle route vers **8 microservices** indépendants.

| Service | Port | Rôle |
|---------|------|------|
| API Gateway | 8080 | Point d'entrée — sécurité, routage |
| Authentification | 8085 | Comptes, rôles, audit |
| Besoin de formation | 8004 | Saisie et validation des besoins |
| Formation | 8088 | Formations, séances, inscriptions |
| Compétence | 8005 | Référentiel domaines / compétences / savoirs |
| Évaluation | 8087 | Évaluations formateurs |
| Certificat | 8086 | Attestations PDF |
| Analyse | 8089 | Agrégation et IA |

---

## Entités métier couvertes

| # | Entité | Service | Champs clés |
|---|--------|---------|-------------|
| 1 | **User** | Auth | id, username, nom, prénom, email, rôles, actif |
| 2 | **BesoinFormation** | Besoin | titre, type, priorité, approbations (CUP/Chef/Admin), UP, département |
| 3 | **Formation** | Formation | titre, type, état, dates, objectifs, charge horaire, UP, département |
| 4 | **SeanceFormation** | Formation | date, horaires, type (théorique/pratique/mixte), salle, contenus |
| 5 | **Domaine** | Compétence | code, nom, description, actif |
| 6 | **Competence** | Compétence | code, nom, description, domaine parent |
| 7 | **SousCompetence** | Compétence | code, nom, niveau hiérarchique, compétence parente |
| 8 | **Savoir** | Compétence | code, nom, type (théorique/pratique), niveau N1→N5 |
| 9 | **EnseignantCompetence** | Compétence | enseignantId, savoir, niveau de maîtrise, date d'acquisition |
| 10 | **EvaluationFormateur** | Évaluation | enseignantId, formationId, note, satisfaisant |
| 11 | **EvaluationGlobale** | Évaluation | formationId, noteGlobale, recommandation, date |
| 12 | **Certificate** | Certificat | titreFormation, type, dates, enseignantId, nom, département, remis |
| 13 | **Up / Dept** | Formation | id, libellé (unités pédagogiques et départements) |

---

## Rôles utilisateurs

| Rôle | Description |
|------|-------------|
| `ADMIN` | Administrateur plateforme |
| `CUP` | Coordinateur Unité Pédagogique |
| `D2F` | Gestionnaire D2F |
| `ENSEIGNANT` | Enseignant |
| `ANIMATEUR` | Animateur de formation (interne ou externe) |
| `CHEF_DEPARTEMENT` | Chef de département |
| `RESPONSABLE_DOSSIER` | Responsable dossier RH |

---

## Endpoints GET proposés — 35 endpoints en 6 domaines

| Domaine | Nb | Accès |
|---------|----|-------|
| Annuaire enseignants | 3 | ADMIN, D2F, CUP |
| Besoins de formation | 6 | CUP, Chef Département, ADMIN, D2F |
| Formations & séances | 6 | Tous les authentifiés (selon ressource) |
| Référentiel de compétences | 10 | Tous les authentifiés |
| Évaluations | 3 | ADMIN, D2F, Animateur |
| Certificats | 4 | Selon rôle / self |

Tous les endpoints sont **versionnés** (`/api/v1/`), **paginés** (page, size, sort), **filtrables** et **sécurisés par JWT**.

---

## Règles de gestion essentielles

- **Besoin de formation :** validation en 3 niveaux successifs (Chef Département → CUP → Admin). Un seul refus stoppe le processus.
- **Formation :** états `NOUVEAU → ENREGISTRE → PLANIFIE → EN_COURS → ACHEVE`, annulable à tout moment. Le passage à `ACHEVE` génère automatiquement les certificats.
- **Savoir :** rattaché soit à une Compétence, soit à une Sous-compétence — jamais les deux.
- **Niveau enseignant :** un enseignant n'a qu'un niveau par savoir (contrainte unique).
- **Certificat :** généré automatiquement pour chaque inscrit approuvé à l'achèvement de la formation.

---

## Sécurité

| Point | Détail |
|-------|--------|
| Authentification | JWT Bearer Token — validé par l'API Gateway |
| Contrôle d'accès | RBAC par rôle sur chaque endpoint |
| Rate limiting | 5 req/min (auth), 3 req/5min (reset pwd), 20 req/min (autres) |
| Données masquées | password, tentatives connexion, emails personnels, chemins serveur, URLs Teams |

---

## Format des erreurs

```json
{
  "timestamp": "2026-05-20T10:30:00.000+00:00",
  "status": 404,
  "error": "Not Found",
  "message": "Formation introuvable : id=99",
  "path": "/api/v1/formations/99"
}
```

Codes HTTP : `200` Succès · `400` Paramètre invalide · `401` Token expiré · `403` Rôle insuffisant · `404` Introuvable · `429` Rate limit · `503` Service indisponible

---

*Résumé généré le 20 mai 2026 — Équipe PFE D2F — ESPRIT*
