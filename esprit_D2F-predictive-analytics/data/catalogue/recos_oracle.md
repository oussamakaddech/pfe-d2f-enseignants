# Oracle de recommandations — Catalogue D2F

Référence des recommandations **attendues** (oracle) pour valider la personnalisation du
service `predictive-analytics` sur le catalogue (`data/catalogue/*.csv`).

## Règle de score composite V1

```
score = 0.45 * couverture + 0.25 * sévérité + 0.15 * fraîcheur + 0.10 * complétion + 0.05 * proximité
```

- **couverture** : fraction des savoirs manquants de l'enseignant couverte par la formation
  (savoirs du référentiel liés via `formation_competences.savoir_id`).
- **sévérité** : écart moyen `(niveau requis − niveau actuel)` normalisé sur `5`.
- **fraîcheur** : `1.0` si formation PLANIFIÉE/EN_COURS, décroît avec l'ancienneté de la date de fin.
- **complétion** : moyenne d'évaluation (`note_globale / 5`), valeur par défaut `0.5` sans évaluation.
- **proximité** : adéquation domaine du profil ↔ domaine de la formation (`1.0` si identique).

## Éligibilité (appliquée en amont)

Sont éligibles les formations dont :
1. `etat_formation IN ('PLANIFIE','EN_COURS','ACHEVE')` et `deleted_at IS NULL` ;
2. la date de fin n'est pas révolue (**non expirée** : `date_fin >= 2026-08-01`) ;
3. l'enseignant n'a pas déjà été **APPROVED** sur la formation (`inscriptions`) ;
4. la formation couvre **≥ 1 compétence manquante** (gap) ;
5. prérequis satisfait : `niveau_actuel >= prerequis` **ou** `prerequis = 1`.

Le référentiel cible par compétence est `niveau_requis = 5` (aligné sur `data/clean/teacher_competencies.csv`).

---

## Profil A — Pédagogie (ENS024, UP-SUP)

Gaps : **COMP01** (niv. 2/5), **COMP02** (niv. 2/5), **COMP03** (niv. 3/5).

| Rang | Formation | Titre | Score | Justification |
|-----:|-----------|-------|------:|---------------|
| 1 | FOR-PED-01 (1001) | Scénarisation pédagogique active | 0.86 | Couvre COMP01 (2 savoirs), futur, domaine pédagogie |
| 2 | FOR-PED-02 (1002) | Évaluation par compétences (LMS) | 0.83 | Couvre COMP02 (2 savoirs), futur, domaine pédagogie |
| 3 | FOR-PED-03 (1003) | Classe inversée & numérique éducatif | 0.79 | Couvre COMP03 (2 savoirs), futur, domaine pédagogie |

---

## Profil B — DevOps (ENS019, UP-GL)

Gaps : **COMP04** (niv. 2/5), **COMP05** (niv. 3/5), **COMP06** (niv. 2/5).

| Rang | Formation | Titre | Score | Justification |
|-----:|-----------|-------|------:|---------------|
| 1 | FOR-DEV-01 (1009) | CI/CD Pipelines GitLab | 0.87 | Couvre COMP04 (2 savoirs), futur, domaine génie logiciel |
| 2 | FOR-DEV-02 (1010) | Qualité & revue de code | 0.84 | Couvre COMP05 (2 savoirs), futur, domaine génie logiciel |
| 3 | FOR-DEV-03 (1011) | Sécurité applicative OWASP | 0.81 | Couvre COMP06 (2 savoirs), futur, domaine génie logiciel |

---

## Profil C — Data & IA (ENS026, UP-INFO)

Gaps : **COMP07** (niv. 2/5), **COMP08** (niv. 2/5), **COMP09** (niv. 3/5).

| Rang | Formation | Titre | Score | Justification |
|-----:|-----------|-------|------:|---------------|
| 1 | FOR-DAT-01 (1016) | Data engineering & pipelines | 0.88 | Couvre COMP07 (2 savoirs), futur, domaine data |
| 2 | FOR-DAT-02 (1017) | Machine learning appliqué | 0.85 | Couvre COMP08 (2 savoirs), futur, domaine data |
| 3 | FOR-DAT-03 (1018) | IA générative responsable | 0.80 | Couvre COMP09 (2 savoirs), futur, domaine data |

---

## Profil D — Senior sans gap (ENS010, UP-GC)

Niveaux : COMP10 = 5/5, COMP11 = 5/5, COMP12 = 5/5, et aucune compétence en écart
(gap = 0 partout).

**Aucune formation requise.** Le service doit retourner une liste vide avec le motif
`MAINTIEN_PREVU` (« aucun écart de compétence détecté, maintien recommandé »).

---

## Profil E — Gaps multiples (ENS006, UP-SUP)

Gaps : **COMP03** (niv. 2/5), **COMP05** (niv. 3/5), **COMP09** (niv. 2/5)
(profil transversal : pédagogie + qualité + IA).

| Rang | Formation | Titre | Score | Justification |
|-----:|-----------|-------|------:|---------------|
| 1 | FOR-PED-09 (1030) | IA générative dans la pédagogie | 0.77 | Couvre COMP03 + COMP09 (2 gaps), futur |
| 2 | FOR-DEV-05 (1013) | Revue de code & sécurité en pratique | 0.71 | Couvre COMP05 (1 gap), futur |
| 3 | FOR-PED-04 (1004) | Scénariser un module hybride | 0.68 | Couvre COMP03 (1 gap), futur |

---

## Contrôle de non-redondance (Top-3 ≤ 25 % de recouvrement)

Intersections 2 à 2 des Top-3 :

| Paire | Intersection | Recouvrement |
|-------|--------------|-------------:|
| A ∩ B | ∅ | 0 % |
| A ∩ C | ∅ | 0 % |
| A ∩ E | ∅ | 0 % |
| B ∩ C | ∅ | 0 % |
| B ∩ E | ∅ | 0 % |
| C ∩ E | ∅ | 0 % |

Aucun Top-3 identique entre deux profils. ✅